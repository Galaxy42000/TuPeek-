import * as THREE from 'three';
import { addBox } from './geometry.js';

// Roof for the house (see `roof` in rooms/house.js), in plan x/z inches:
//  • main: the kitchen/bathroom roof, ridge along z over x0..x1, with a gable at both
//    ends (z0 = bathroom end, z1 = its end over the living room). Together with the
//    wing it is a double-pitch roof: steep over the kitchen, shallow over the bedrooms;
//  • low: the living room roof, lower and shallower, hipped at z1 and running in under
//    the kitchen roof's gable end;
//  • wing: a shed roof over the wing, sloping down to its x0 side and rising until it
//    meets the main roof's slope, with straight (rake) ends;
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
  const mn = R.main, lo = R.low, wg = R.wing;
  const m = mn.pitch, ml = lo.pitch, mw = wg.pitch;
  const xa = mn.x0, xb = mn.x1, xm = (xa + xb) / 2, z1 = lo.z1;
  const zk0 = mn.z0 - rake; // gable overhang at the bathroom end
  const zw = wg.z1 + rake; // end of the wing roof
  const zk1 = Math.max(mn.z1 + rake, zw); // the kitchen roof's gable end overhang, over the living room roof
  const zr = z1 - (xm - xa); // where the living room ridge ends at the hip
  // Double-pitch (broken) roof: the wing's shallow slope rises from its eave to the line
  // of the old outside wall (xa), and the kitchen's steeper slope carries on from there
  // up to the ridge; the other side of the ridge comes down at the kitchen pitch to the
  // main eave. Both eaves sit on the walls (plate P), so the ridge ends up off-centre.
  const xk = xa; // where the pitch breaks
  const Hb = P + mw * (xa - wg.x0); // roof height at the break
  const xr = (P - Hb + m * (xb + xa)) / (2 * m); // ridge line
  const ridgeK = P + m * (xb - xr), ridgeL = P + ml * (xm - xa);
  const SK = (x) => P + m * (xb - x), NK = (x) => Hb + m * (x - xa);
  const SL = (x) => P + ml * (xb - x), NL = (x) => P + ml * (x - xa), Hp = (z) => P + ml * (z1 - z);
  const W = (x) => P + mw * (x - wg.x0);
  const heightAt = (x, z) => {
    if (x <= xk && z <= zw && x >= wg.x0 - O) return W(x);
    if (z <= zk1) return Math.min(SK(x), NK(x));
    return Math.min(SL(x), NL(x), Hp(z));
  };

  const shingle = M.shingles;
  const top = new THREE.Group();
  const roofFace = (pts, along) => {
    top.add(face(pts, shingle, along));
    const u = face(pts.map(([x, y, z]) => [x, y - 4, z]), M.roofUnder, along);
    top.add(u);
  };
  const sk = (x, z) => [x, SK(x), z], nk = (x, z) => [x, NK(x), z];
  const sl = (x, z) => [x, SL(x), z], nl = (x, z) => [x, NL(x), z], w3 = (x, z) => [x, W(x), z];
  // kitchen roof: a gable at both ends, ridge along z
  roofFace([sk(xb + O, zk0), sk(xb + O, zk1), [xr, ridgeK, zk1], [xr, ridgeK, zk0]], [0, 1]);
  roofFace([nk(xk, zk0), [xr, ridgeK, zk0], [xr, ridgeK, zk1], nk(xk, zk1)], [0, 1]);
  // living room roof: lower and shallower, hipped at the far end; its near end runs in
  // under the kitchen roof, so the two meet along the kitchen roof's slopes
  const zl0 = mn.z1;
  roofFace([sl(xb + O, zl0), sl(xb + O, z1 + O), [xm, ridgeL, zr], [xm, ridgeL, zl0]], [0, 1]);
  roofFace([[xb + O, Hp(z1 + O), z1 + O], [xm, ridgeL, zr], [xa - O, Hp(z1 + O), z1 + O]], [1, 0]);
  // (no overhang where the entry porch roof is: the wall runs up to the porch roof there;
  // the outline starts at that notch's inside corner so the fan stays inside it)
  const zn = R.porch ? Math.min(Math.max(zl0, R.porch.z1 + R.porch.overhang), z1) : zl0;
  roofFace(zn > zl0
    ? [nl(xa, zn), nl(xa, zl0), [xm, ridgeL, zl0], [xm, ridgeL, zr], nl(xa - O, z1 + O), nl(xa - O, zn)]
    : [nl(xa - O, zl0), [xm, ridgeL, zl0], [xm, ridgeL, zr], nl(xa - O, z1 + O)], [0, 1]);
  // wing: a plain shed roof sloping down to its outside wall, with straight ends
  roofFace([w3(wg.x0 - O, zk0), w3(xk, zk0), w3(xk, zw), w3(wg.x0 - O, zw)], [0, 1]);
  // walls closing the gaps: the kitchen's gable end above the living room roof, and the
  // end of the wing roof above the living room roof
  const tri = (pts, z) => {
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))), M.sidingBoth);
    mesh.position.z = z;
    top.add(mesh);
  };
  tri([[xa, P], [xb, P], [xr, ridgeK], [xa, Hb]], mn.z1);
  tri([[xa - O, NL(xa - O)], [xk, NL(xk)], [xk, W(xk)], [xa - O, W(xa - O)]], zw - 1); // shed end above the living room roof
  group.add(top);

  // fascia: eaves (level) and rakes (sloped)
  const fas = M.fascia;
  // under the entry porch roof the wall runs straight up to the roof, so the eave's fascia
  // and soffit along that wall stop where the porch roof starts
  const pr = R.porch, zPorch = pr ? Math.max(zw, pr.z1 + pr.overhang) : zw;
  board(group, fas, sk(xb + O, zk0), sk(xb + O, zk1), F, [1, 0]);
  board(group, fas, sl(xb + O, zk1), sl(xb + O, z1 + O), F, [1, 0]);
  board(group, fas, [xa - O, Hp(z1 + O), z1 + O], [xb + O, Hp(z1 + O), z1 + O], F, [0, 1]);
  board(group, fas, nl(xa - O, zPorch), nl(xa - O, z1 + O), F, [-1, 0]);
  board(group, fas, w3(wg.x0 - O, zk0), w3(wg.x0 - O, zw), F, [-1, 0]);
  for (const [a, b] of [[w3(wg.x0 - O, zk0), w3(xk, zk0)], [nk(xk, zk0), [xr, ridgeK, zk0]], [[xr, ridgeK, zk0], sk(xb + O, zk0)]]) board(group, fas, a, b, F, [0, -1]);
  for (const [a, b] of [[w3(wg.x0 - O, zw), w3(xk, zw)], [nk(xk, zk1), [xr, ridgeK, zk1]], [[xr, ridgeK, zk1], sk(xb + O, zk1)]]) board(group, fas, a, b, F, [0, 1]);

  // soffits under the eaves (from the fascia's bottom back to the wall) and their lights
  const sof = (x0, z0, x1, z1s, y) => addBox(group, M.soffit, x0, y - 0.5, z0, x1 - x0, 0.5, z1s - z0, { cast: false });
  const yK = SK(xb + O) - F, yL = SL(xb + O) - F, yWing = W(wg.x0 - O) - F;
  sof(xb, mn.z0, xb + O, zk1, yK); // south, kitchen
  sof(xb, zk1, xb + O, z1 + O, yL); // south, living room
  sof(xa - O, z1, xb, z1 + O, yL); // west (hip end)
  sof(xa - O, Math.max(wg.z1, zPorch), xa, z1, yL); // north, past the wing (and the porch)
  sof(wg.x0 - O, mn.z0, wg.x0, wg.z1, yWing); // wing
  for (const [x, z] of R.lights || []) {
    const y = x < wg.x0 + 1 ? yWing : z > zk1 ? yL : yK;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 20), M.canLens);
    l.position.set(x, y - 0.6, z);
    group.add(l);
  }

  // entry porch roof: gable over the door, ridge running out from the wall. Its side over
  // the bedroom wing comes down onto the wing roof, and its ridge runs back into the main
  // roof (`back` inches past the wall; that part only above the ceilings).
  if (pr) {
    const pg = new THREE.Group();
    const zc = (pr.z0 + pr.z1) / 2, half = (pr.z1 - pr.z0) / 2 + pr.overhang;
    const xOut = pr.wall - pr.depth - pr.overhang, peak = pr.eave + pr.pitch * half;
    const ps = (z) => pr.eave + pr.pitch * (half - Math.abs(z - zc));
    const yb = Math.max(pr.eave, (R.ceilingClear ?? 98)), hw = half - (yb - pr.eave) / pr.pitch;
    for (const side of [-1, 1]) {
      const ze = zc + side * half;
      const pts = [[xOut, pr.eave, ze], [pr.wall, pr.eave, ze], [pr.wall, peak, zc], [xOut, peak, zc]];
      pg.add(face(pts, shingle, [1, 0]));
      pg.add(face(pts.map(([x, y, z]) => [x, y - 3, z]), M.wood, [1, 0]));
      if (pr.back) pg.add(face([[pr.wall, yb, zc + side * hw], [pr.wall + pr.back, yb, zc + side * hw], [pr.wall + pr.back, peak, zc], [pr.wall, peak, zc]], shingle, [1, 0]));
      board(pg, fas, [xOut, pr.eave, ze], [pr.wall, pr.eave, ze], 5, [0, side]);
      board(pg, fas, [xOut, ps(ze), ze], [xOut, peak, zc], 5, [-1, 0]);
    }
    // the wall above the door is closed: siding from below the eave line straight up to
    // the underside of the porch roof (from the bedroom wing's end, where the wing roof is)
    const za = Math.max(zc - half, wg.z1), zb = zc + half, under = (z) => ps(z) - 3, x = pr.wall - 0.6;
    pg.add(face([[x, 90, zb], [x, 90, za], [x, under(za), za], [x, peak - 3, zc], [x, under(zb), zb]], M.sidingGable ??= Object.assign(M.siding.clone(), { side: THREE.DoubleSide }), [0, 1]));
    group.add(pg);
  }

  return { group, heightAt, top: ridgeK };
}
