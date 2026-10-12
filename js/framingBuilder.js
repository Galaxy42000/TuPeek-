import * as THREE from 'three';
import { vaultHeight } from './geometry.js';

// Wood framing, shown with the viewer's "Framing" checkbox (the drywall, siding, ceilings
// and roofing are hidden while it is on):
//  • wallFraming: studs 16″ on centre, a bottom plate (broken at doorways), a double top
//    plate, and king studs, jack studs, headers, sills and cripples around each opening.
//    Built in the wall's own frame (x along the wall, y up, wall body z ∈ [-t, 0]) and
//    added to the wall's group, so it cuts away with the wall. Where a wall closes a
//    vault, a sloped ceiling or a gable, studs carry on up to `topAt(x)` under a raked plate;
//  • roofFraming: trusses 24″ on centre across the house (scissor trusses under the
//    kitchen/bathroom vault, common and step-down hip trusses over the living room),
//    shed rafters and ceiling joists over the bedroom wing, and the living room's hips.
// Every member is one instance of a unit box, so each wall (and the roof) is a single draw.

const T = 1.5; // thickness of a 2× member
const box = new THREE.BoxGeometry(1, 1, 1);
const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
const mtx = new THREE.Matrix4();

// Collects members: each runs from a to b (centreline), `w` thick along n and `h` deep
// along n × (b − a).
class Members {
  constructor() { this.list = []; }
  add(a, b, n, w, h) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    if (len < 0.3) return;
    X.subVectors(B, A).divideScalar(len);
    Z.set(...n).normalize();
    Y.crossVectors(Z, X).normalize();
    Z.crossVectors(X, Y);
    mtx.makeBasis(X.clone().multiplyScalar(len), Y.clone().multiplyScalar(h), Z.clone().multiplyScalar(w));
    mtx.setPosition(A.add(B).multiplyScalar(0.5));
    this.list.push(mtx.clone());
  }
  mesh(mat, name) {
    const m = new THREE.InstancedMesh(box, mat, this.list.length);
    this.list.forEach((x, i) => m.setMatrixAt(i, x));
    m.computeBoundingSphere();
    m.castShadow = m.receiveShadow = true;
    m.name = name;
    return m;
  }
}

export function framingMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.85 });
}

// ops: the wall's openings ({start, width, bottom, height, type}); topAt(x): height of the
// framing's top along the wall (H, or higher under a rake).
export function wallFraming(mat, L, t, H, ops, topAt, cuts = []) {
  const fm = new Members();
  const d = t >= 5.5 ? 5.5 : Math.min(3.5, t), zc = -t / 2;
  const up = [0, 1, 0], along = [1, 0, 0], across = [0, 0, 1];
  const stud = (x, y0, y1) => y1 - y0 > 0.3 && fm.add([x, y0, zc], [x, y1, zc], along, T, d); // x = stud centre
  const flat = (x0, x1, y) => x1 - x0 > 0.3 && fm.add([x0, y, zc], [x1, y, zc], up, T, d); // plate, y = its centre
  const plateTop = H - 2 * T;

  // Steel beams: one running along inside the wall replaces the top plates, sitting on a
  // single plate with a doubled post under each end (as under BEAM-1 in the photo); one
  // crossing the wall rests on a doubled post, with short studs above it.
  const beamAlong = (x) => cuts.find((c) => c.along && x > c.a - T / 2 && x < c.b + T / 2);
  const beamAcross = (x) => cuts.find((c) => !c.along && x > c.a - T && x < c.b + T);
  const topOf = (x) => { const c = beamAlong(x); return c ? c.y0 - T : plateTop; };
  const tall = (x, y0, y1 = topOf(x)) => {
    const c = beamAcross(x);
    if (!c) return stud(x, y0, y1);
    stud(x, y0, Math.min(y1, c.y0));
    if (c.y1 + 1 < y1) stud(x, c.y1, y1);
  };

  // rough openings: 3″ of king + jack stud either side
  const rough = ops.filter((o) => o.type !== 'opening' || o.height < H - 6).map((o) => {
    const top = topOf(o.start + o.width / 2);
    const head = Math.min(o.bottom + o.height, top - 1);
    // an opening that reaches the beam above it needs no header (the beam is its header)
    const hh = top - (o.bottom + o.height) < 1 ? 0 : Math.min(o.width > 48 ? 11.25 : 7.25, top - head);
    const j = o.width >= 72 ? 2 : 1; // jack studs each side (doubled under a wide header, as at the slider)
    return { ...o, j, top, a: Math.max(0, o.start - (1 + j) * T), b: Math.min(L, o.start + o.width + (1 + j) * T), head: hh ? head : top, hh };
  });
  // cased openings without a door get the same framing (they are rough openings too)
  const inOpening = (x) => rough.find((o) => x > o.a - T / 2 && x < o.b + T / 2);

  // bottom plate, broken at doorways
  let x0 = 0;
  for (const o of [...rough].filter((o) => o.bottom === 0).sort((p, q) => p.a - q.a)) {
    flat(x0, o.a + (1 + o.j) * T, T / 2);
    x0 = o.b - (1 + o.j) * T;
  }
  flat(x0, L, T / 2);
  // double top plate, broken where a beam runs along the wall (a single plate under it)
  let p0 = 0;
  for (const c of cuts.filter((c) => c.along).sort((p, q) => p.a - q.a)) {
    flat(p0, c.a, H - 1.5 * T);
    flat(p0, c.a, H - T / 2);
    // under the beam, except over an opening that runs up to it
    let u0 = c.a;
    for (const o of rough.filter((o) => !o.hh && o.a < c.b && o.b > c.a).sort((p, q) => p.a - q.a)) {
      flat(u0, o.a + (1 + o.j) * T, c.y0 - T / 2);
      u0 = o.b - (1 + o.j) * T;
    }
    flat(u0, c.b, c.y0 - T / 2);
    for (const x of [c.a + T / 2, c.a + 1.5 * T, c.b - T / 2, c.b - 1.5 * T]) if (x > T && x < L - T && !inOpening(x)) stud(x, T, c.y0 - T);
    p0 = c.b;
  }
  flat(p0, L, H - 1.5 * T);
  flat(p0, L, H - T / 2);
  // doubled post under a beam crossing the wall
  for (const c of cuts.filter((c) => !c.along)) {
    stud(c.a + T / 2, T, c.y0);
    stud(c.b - T / 2, T, c.y0);
    if (c.y1 + 1 < plateTop) for (const x of [c.a + T / 2, c.b - T / 2]) stud(x, c.y1, plateTop);
  }

  // common studs: both ends, then 16″ on centre
  const xs = [T / 2, L - T / 2];
  for (let x = 16; x < L - T; x += 16) xs.push(x);
  for (const x of xs) {
    const o = inOpening(x);
    if (!o) tall(x, T);
    else {
      // cripples above the header and below the sill
      if (x > o.a + (1 + o.j) * T && x < o.b - (1 + o.j) * T) {
        if (o.hh) tall(x, o.head + o.hh, o.top);
        if (o.bottom > 0) stud(x, T, o.bottom - T);
      }
    }
  }
  for (const o of rough) {
    // king studs full height, jack studs up to the header
    tall(o.a + T / 2, T);
    tall(o.b - T / 2, T);
    for (let k = 1; k <= o.j; k++) {
      stud(o.a + (k + 0.5) * T, o.bottom === 0 ? 0 : T, o.head);
      stud(o.b - (k + 0.5) * T, o.bottom === 0 ? 0 : T, o.head);
    }
    // header (on edge, the full wall thickness) and the rough sill under a window
    if (o.hh) fm.add([o.a + T, o.head + o.hh / 2, zc], [o.b - T, o.head + o.hh / 2, zc], across, d, o.hh);
    if (o.bottom > 0) flat(o.a + (1 + o.j) * T, o.b - (1 + o.j) * T, o.bottom - T / 2);
  }

  // above the top plate: gable / rake studs up to topAt, under a sloped plate
  if (topAt) {
    const pts = [];
    for (const x of [...new Set([0, ...xs, L])].sort((p, q) => p - q)) pts.push([x, topAt(x)]);
    // corners of the rake (where the slope changes) need a plate joint too
    for (let i = 1; i < 200; i++) {
      const x = (L * i) / 200, y = topAt(x), [pa, pb] = [topAt(x - L / 200), topAt(x + L / 200)];
      if (Math.abs(pa + pb - 2 * y) > 0.05) pts.push([x, y]);
    }
    pts.sort((p, q) => p[0] - q[0]);
    if (pts.some(([, y]) => y > H + 4)) {
      for (const x of xs) {
        const y = topAt(Math.min(L, Math.max(0, x)));
        if (y > H + 3) stud(x, H, y - T);
      }
      for (let i = 0; i + 1 < pts.length; i++) {
        const [xa, ya] = pts[i], [xb, yb] = pts[i + 1];
        if (Math.max(ya, yb) > H + 3) fm.add([xa, Math.max(ya, H + T) - T / 2, zc], [xb, Math.max(yb, H + T) - T / 2, zc], rakeNormal(xa, ya, xb, yb), T, d);
      }
    }
  }
  const m = fm.mesh(mat, 'wall framing');
  return m;
}

// A raked plate lies flat on the studs: its thickness is perpendicular to the slope,
// in the wall's plane.
function rakeNormal(xa, ya, xb, yb) {
  const len = Math.hypot(xb - xa, yb - ya) || 1;
  return [-(yb - ya) / len, (xb - xa) / len, 0];
}

// Trusses, rafters and joists for the house roof (see roofBuilder for the shapes).
export function roofFraming(cfg, mat) {
  const R = cfg.roof, H = cfg.height;
  const fm = new Members();
  const { plate: P, overhang: O } = R;
  const mn = R.main, lo = R.low, wg = R.wing;
  const m = mn.pitch, ml = lo.pitch, mw = wg.pitch;
  const xa = mn.x0, xb = mn.x1, xm = (xa + xb) / 2, z1 = lo.z1;
  const Hb = P + mw * (xa - wg.x0);
  const xr = (P - Hb + m * (xb + xa)) / (2 * m);
  const SK = (x) => P + m * (xb - x), NK = (x) => Hb + m * (x - xa);
  const SL = (x) => P + ml * (xb - x), NL = (x) => P + ml * (x - xa), Hp = (z) => P + ml * (z1 - z);
  const W = (x) => P + mw * (x - wg.x0);
  const zr = z1 - (xm - xa);
  const depth = 3.5, c = 0.75 + depth / 2 + 0.6; // top chord centre below the roof surface
  const n = [0, 0, 1];

  // a truss in the plane z: top and bottom chords as polylines [[x, y], ...], plus webs
  const truss = (z, top, bottom, webs) => {
    for (const line of [top, bottom]) for (let i = 0; i + 1 < line.length; i++) fm.add([...line[i], z], [...line[i + 1], z], n, T, depth);
    for (const [a, b] of webs) fm.add([...a, z], [...b, z], n, T, depth);
  };
  const along = (line, x) => {
    for (let i = 0; i + 1 < line.length; i++) {
      const [x0, y0] = line[i], [x1, y1] = line[i + 1];
      if (x >= x0 - 1e-6 && x <= x1 + 1e-6) return y0 + ((y1 - y0) * (x - x0)) / ((x1 - x0) || 1);
    }
    return line[line.length - 1][1];
  };
  const layout = (z0, z1, step = 24) => {
    const out = [];
    for (let z = z0; z <= z1 + 0.01; z += step) out.push(z);
    if (z1 - out[out.length - 1] > 4) out.push(z1);
    return out;
  };

  // kitchen/bathroom: scissor trusses from the old outside wall to the long outside wall.
  // The bottom chords follow the vault (and the bathroom's sloped ceiling).
  const v = cfg.vaults?.[0];
  const vx0 = v ? v.x0 : xa, vx1 = v ? v.x1 : xb, peak = v ? v.peak : H, xv = (vx0 + vx1) / 2;
  const B = (x) => Math.max(H, vaultHeight({ x0: vx0, x1: vx1, peak }, H, x)) + depth / 2;
  // blocking between the truss heels on top of the eave walls (seen over the sink wall)
  const blocking = (zs, xw, roofY) => {
    const h = roofY(xw) - c - depth / 2 - H;
    if (h < 1) return;
    for (let i = 0; i + 1 < zs.length; i++) fm.add([xw, H + h / 2, zs[i] + T / 2], [xw, H + h / 2, zs[i + 1] - T / 2], [1, 0, 0], T, h);
  };
  const zMain = layout(T / 2, mn.z1 - T / 2), zLiving = layout(mn.z1 + 24, z1 - 12);
  blocking(zMain, xb - 3, SK);
  blocking([mn.z1 - T / 2, ...zLiving], xb - 3, SL);
  blocking([mn.z1 - T / 2, ...zLiving].filter((z) => z > wg.z1), xa + 3, NL);
  for (const z of zMain) {
    const top = [[xa + T / 2, NK(xa + T / 2) - c], [xr, NK(xr) - c], [xb + O, SK(xb + O) - c]];
    const bottom = [[xa + T / 2, B(xa)], [vx0, B(vx0)], [xv, B(xv)], [vx1, B(vx1)], [xb, B(xb)]];
    const L = (f) => xa + (xv - xa) * f, Rt = (f) => xv + (xb - xv) * f;
    truss(z, top, bottom, [
      [[xa + T / 2, B(xa)], [xa + T / 2, along(top, xa + T / 2)]], // heel post over the old wall
      [[xv, B(xv)], [xv, along(top, xv)]], // post at the vault's peak
      [[L(0.55), along(bottom, L(0.55))], [L(0.25), along(top, L(0.25))]],
      [[L(0.55), along(bottom, L(0.55))], [L(0.8), along(top, L(0.8))]],
      [[Rt(0.45), along(bottom, Rt(0.45))], [Rt(0.2), along(top, Rt(0.2))]],
      [[Rt(0.45), along(bottom, Rt(0.45))], [Rt(0.75), along(top, Rt(0.75))]],
    ]);
  }

  // living room: common trusses with a flat bottom chord at the wall plates; toward the
  // hipped end they step down (flat top) under the hip
  const xL = xa, xR = xb, yB = H + depth / 2;
  for (const z of zLiving) {
    const top0 = (x) => Math.min(SL(x), NL(x), Hp(z)) - c;
    const xs = [xa - O, xL, xm, xR, xb + O];
    const flatY = Hp(z);
    if (flatY < Math.min(SL(xm), NL(xm))) xs.push(xa + (flatY - P) / ml, xb - (flatY - P) / ml);
    const top = [...new Set(xs)].sort((p, q) => p - q).map((x) => [x, top0(x)]);
    if (top0(xm) - yB < 3) continue;
    const bottom = [[xL, yB], [xR, yB]];
    const webs = [[[xm, yB], [xm, top0(xm)]]];
    for (const f of [0.33, 0.67]) {
      const x = xL + (xR - xL) * f;
      if (top0(x) - yB > 5) webs.push([[x, yB], [f < 0.5 ? xL + (xR - xL) * 0.18 : xL + (xR - xL) * 0.82, top0(f < 0.5 ? xL + (xR - xL) * 0.18 : xL + (xR - xL) * 0.82)]], [[x, yB], [xm, top0(xm) - (top0(xm) - yB) * 0.3]]);
    }
    truss(z, top, bottom, webs);
  }
  // hip rafters from the end of the living room ridge down to the corners, and a ridge board
  const yr = (y) => y - c;
  fm.add([xm, yr(P + ml * (xm - xa)), zr], [xa - O, yr(Hp(z1 + O)), z1 + O], [1, 0, 1], T, depth);
  fm.add([xm, yr(P + ml * (xm - xa)), zr], [xb + O, yr(Hp(z1 + O)), z1 + O], [1, 0, -1], T, depth);
  fm.add([xm, yr(P + ml * (xm - xa)), mn.z1], [xm, yr(P + ml * (xm - xa)), zr], [1, 0, 0], T, depth + 2);
  // jack rafters on the hipped end, from the end wall up to the hips
  for (let x = xa + 16; x < xb - 4; x += 24) {
    const zt = z1 - Math.min(x - xa, xb - x); // where the jack meets the hip
    if (zt > z1 - 4) continue;
    fm.add([x, yr(Hp(z1 + O)), z1 + O], [x, yr(Hp(Math.max(zt, zr))), Math.max(zt, zr)], [1, 0, 0], T, depth);
  }

  // bedroom wing: shed rafters 24″ on centre from the outside wall up to the old outside
  // wall (where they meet the trusses), over flat ceiling joists
  for (const z of layout(T / 2, wg.z1 - T / 2)) {
    fm.add([wg.x0 - O, W(wg.x0 - O) - c, z], [xa, W(xa) - c, z], n, T, 5.5);
    fm.add([wg.x0, H + 2.75, z], [xa, H + 2.75, z], n, T, 5.5);
  }
  return fm.mesh(mat, 'roof framing');
}
