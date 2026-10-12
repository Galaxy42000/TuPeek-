import * as THREE from 'three';
import { addBox } from './geometry.js';

// Roof for the house (see `roof` in rooms/house.js), in plan x/z inches:
//  • main: a roof with its ridge along z over x0..x1, a gable at the z0 end and a hip
//    at the z1 end;
//  • wing: a shed roof over x0..x1, z0..z1 of the wing, sloping down to its x0 side and
//    rising until it meets the main roof's slope;
//  • white fascia on every roof edge, vinyl soffits under the eaves with recessed
//    lights, and a small gable roof over the entry porch.
// heightAt(x, z) is the height of the roof surface at a point, used to run the siding
// up to the roof.

// Planar polygon [[x, y, z], ...] → mesh; uv: u along `along` (unit plan vector), v up the slope.
function face(pts, mat, along) {
  const pos = [], uv = [];
  const [o] = pts;
  for (let i = 1; i + 1 < pts.length; i++) {
    for (const p of [pts[0], pts[i], pts[i + 1]]) {
      pos.push(...p);
      const dx = p[0] - o[0], dz = p[2] - o[2];
      const u = dx * along[0] + dz * along[1];
      const flat = -dx * along[1] + dz * along[0];
      uv.push(u, Math.hypot(flat, p[1] - o[1]) * Math.sign(p[1] - o[1] || 1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// A board hanging below the line a → b (plan points with heights), `drop` deep, 1″ thick,
// on the side given by out = outward plan unit vector.
function board(parent, mat, a, b, drop, out) {
  const d = 1, ox = out[0] * d, oz = out[1] * d;
  const p = (q, dy, s) => [q[0] + ox * s, q[1] + dy, q[2] + oz * s];
  const quads = [
    [p(a, 0.5, 1), p(b, 0.5, 1), p(b, -drop, 1), p(a, -drop, 1)], // outer face
    [p(a, -drop, 0), p(b, -drop, 0), p(b, -drop, 1), p(a, -drop, 1)], // bottom
    [p(a, 0.5, 0), p(b, 0.5, 0), p(b, 0.5, 1), p(a, 0.5, 1)], // top
  ];
  const along = [b[0] - a[0], b[2] - a[2]], len = Math.hypot(...along) || 1;
  for (const q of quads) {
    const m = face(q, mat, [along[0] / len, along[1] / len]);
    m.material = mat;
    parent.add(m);
  }
}

export function buildRoof(cfg, M) {
  const R = cfg.roof;
  const group = new THREE.Group();
  group.name = 'roof';
  const { plate: P, overhang: O, rake, fascia: F } = R;
  const mn = R.main, wg = R.wing;
  const m = mn.pitch, mw = wg.pitch;
  const xa = mn.x0, xb = mn.x1, xm = (xa + xb) / 2, z1 = mn.z1;
  const zg = mn.z0 - rake; // gable-end overhang
  const zr = z1 - (xm - xa); // where the ridge ends at the hip
  const ridge = P + m * (xm - xa);
  const S = (x) => P + m * (xb - x);
  const N = (x) => P + m * (x - xa);
  const Hp = (z) => P + m * (z1 - z);
  const W = (x) => P + mw * (x - wg.x0);
  const xk = (m * xa - mw * wg.x0) / (m - mw); // where the wing roof meets the main roof
  const zw = wg.z1 + rake; // end of the wing roof
  const heightAt = (x, z) => (x <= xk && z <= zw && x >= wg.x0 - O ? W(x) : Math.min(S(x), N(x), Hp(z)));

  const shingle = M.shingles, under = M.soffit;
  const top = new THREE.Group();
  const roofFace = (pts, along) => {
    top.add(face(pts, shingle, along));
    const u = face(pts.map(([x, y, z]) => [x, y - 4, z]), under, along);
    u.material = M.roofUnder;
    top.add(u);
  };
  const pt = (x, z, f) => [x, f(x, z), z];
  const s3 = (x, z) => [x, S(x), z], n3 = (x, z) => [x, N(x), z], w3 = (x, z) => [x, W(x), z];
  // main roof
  roofFace([s3(xb + O, zg), s3(xb + O, z1 + O), [xm, ridge, zr], [xm, ridge, zg]], [0, 1]); // south side of the ridge (plan +x)
  roofFace([[xb + O, Hp(z1 + O), z1 + O], [xm, ridge, zr], [xa - O, Hp(z1 + O), z1 + O]], [1, 0]); // hip end
  roofFace([n3(xk, zg), [xm, ridge, zg], [xm, ridge, zw], n3(xk, zw)], [0, 1]); // north side above the wing
  roofFace([n3(xa - O, zw), n3(xm, zw), [xm, ridge, zr], n3(xa - O, z1 + O)], [0, 1]); // north side past the wing
  // wing shed and the wall closing the step between it and the main roof
  roofFace([w3(wg.x0 - O, zg), w3(xk, zg), w3(xk, zw), w3(wg.x0 - O, zw)], [0, 1]);
  const step = new THREE.Shape([new THREE.Vector2(xa - O, N(xa - O)), new THREE.Vector2(xk, W(xk)), new THREE.Vector2(xa - O, W(xa - O))]);
  const stepMesh = new THREE.Mesh(new THREE.ShapeGeometry(step), M.siding);
  stepMesh.position.z = zw - 1;
  stepMesh.material = M.siding.clone();
  stepMesh.material.side = THREE.DoubleSide;
  top.add(stepMesh);
  group.add(top);

  // fascia: eaves (level) and rakes (sloped)
  const fas = M.fascia;
  board(group, fas, s3(xb + O, zg), s3(xb + O, z1 + O), F, [1, 0]);
  board(group, fas, [xa - O, Hp(z1 + O), z1 + O], [xb + O, Hp(z1 + O), z1 + O], F, [0, 1]);
  board(group, fas, n3(xa - O, zw), n3(xa - O, z1 + O), F, [-1, 0]);
  board(group, fas, w3(wg.x0 - O, zg), w3(wg.x0 - O, zw), F, [-1, 0]);
  for (const [a, b] of [[w3(wg.x0 - O, zg), w3(xk, zg)], [n3(xk, zg), [xm, ridge, zg]], [[xm, ridge, zg], s3(xb + O, zg)]]) board(group, fas, a, b, F, [0, -1]);
  board(group, fas, w3(wg.x0 - O, zw), w3(xk, zw), F, [0, 1]);

  // soffits under the eaves (from the fascia's bottom back to the wall) and their lights
  const soffitY = (y) => y - F;
  const sof = (x0, z0, x1, z1s, y) => addBox(group, M.soffit, x0, y - 0.5, z0, x1 - x0, 0.5, z1s - z0, { cast: false });
  const yMain = soffitY(S(xb + O)), yWing = soffitY(W(wg.x0 - O));
  sof(xb, mn.z0, xb + O, z1 + O, yMain); // south
  sof(xa - O, z1, xb, z1 + O, yMain); // west (hip end)
  sof(xa - O, wg.z1, xa, z1, yMain); // north, past the wing
  sof(wg.x0 - O, mn.z0, wg.x0, wg.z1, yWing); // wing
  for (const [x, z] of R.lights || []) {
    const y = x < wg.x0 + 1 ? yWing : yMain;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 20), M.canLens);
    l.position.set(x, y - 0.6, z);
    group.add(l);
  }

  // entry porch roof: small gable over the door, ridge running out from the wall
  const pr = R.porch;
  if (pr) {
    const pg = new THREE.Group();
    const zc = (pr.z0 + pr.z1) / 2, half = (pr.z1 - pr.z0) / 2 + pr.overhang;
    const xOut = pr.wall - pr.depth - pr.overhang, peak = pr.eave + pr.pitch * half;
    const ps = (z) => pr.eave + pr.pitch * (half - Math.abs(z - zc));
    for (const side of [-1, 1]) {
      const ze = zc + side * half;
      const pts = [[xOut, pr.eave, ze], [pr.wall, pr.eave, ze], [pr.wall, peak, zc], [xOut, peak, zc]];
      pg.add(face(pts, shingle, [1, 0]));
      pg.add(face(pts.map(([x, y, z]) => [x, y - 3, z]), M.wood, [1, 0]));
      board(pg, fas, [xOut, pr.eave, ze], [pr.wall, pr.eave, ze], 5, [0, side]);
      board(pg, fas, [xOut, ps(ze), ze], [xOut, peak, zc], 5, [-1, 0]);
    }
    // wood beam across the front of the porch
    addBox(pg, M.wood, xOut + pr.overhang, pr.eave - 9, pr.z0, 3.5, 9, pr.z1 - pr.z0 + pr.overhang);
    group.add(pg);
  }

  return { group, heightAt, top: ridge };
}
