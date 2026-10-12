import * as THREE from 'three';

// BoxGeometry whose UVs are measured in inches, so tiling textures keep a real-world
// scale no matter how big the box is (textures set repeat = 1 / tileSizeInches).
export function inchBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  return g;
}

// Add a box by its minimum corner (x, y, z) and size (w, h, d).
export function addBox(parent, mat, x, y, z, w, h, d, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(inchBox(w, h, d), mat);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

export function addMesh(parent, geo, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

// Split a w×h panel into solid rectangles around rectangular openings
// ({ start, width, bottom, height } in panel coordinates).
export function panelRects(w, h, openings) {
  const ops = openings
    .map((o) => {
      const a = Math.max(0, o.start), b = Math.min(w, o.start + o.width);
      const lo = Math.max(0, o.bottom), hi = Math.min(h, o.bottom + o.height);
      return { a, b, lo, hi };
    })
    .filter((o) => o.b > o.a && o.hi > o.lo)
    .sort((p, q) => p.a - q.a);
  const rects = [];
  let cursor = 0;
  for (const o of ops) {
    if (o.a > cursor) rects.push({ x: cursor, y: 0, w: o.a - cursor, h });
    const a = Math.max(o.a, cursor);
    if (o.b > a) {
      if (o.lo > 0) rects.push({ x: a, y: 0, w: o.b - a, h: o.lo });
      if (o.hi < h) rects.push({ x: a, y: o.hi, w: o.b - a, h: h - o.hi });
    }
    cursor = Math.max(cursor, o.b);
  }
  if (cursor < w) rects.push({ x: cursor, y: 0, w: w - cursor, h });
  return rects;
}

// Subtract intervals from [0, len]; returns the free [a, b] pieces.
export function freeIntervals(len, taken) {
  const sorted = taken.map(([a, b]) => [Math.max(0, a), Math.min(len, b)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const out = [];
  let cursor = 0;
  for (const [a, b] of sorted) {
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < len) out.push([cursor, len]);
  return out;
}

// ---------- vaulted ceilings ----------
// A vault { x0, x1, peak } rises from height h at x0 and x1 to `peak` midway between
// them; the ridge runs along z.
export function vaultHeight({ x0, x1, peak }, h, x) {
  const half = (x1 - x0) / 2;
  return peak - ((peak - h) * Math.abs(x - (x0 + half))) / half;
}

// The two sloped ceiling surfaces, from z0 for a depth of d.
export function vaultCeiling(parent, mat, { x0, x1, peak }, h, z0, d) {
  const half = (x1 - x0) / 2, rise = peak - h;
  const len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  for (const side of [1, -1]) {
    const g = new THREE.Group();
    g.position.set(side > 0 ? x0 : x1, h, z0);
    g.rotation.z = side * ang;
    addBox(g, mat, side > 0 ? 0 : -len, 0, 0, len, 1, d, { cast: false });
    parent.add(g);
  }
}

// Triangular wall closing the end of a vault: from `base` (the wall top, or a beam's
// top) up to the sloped ceiling, t thick starting at z.
export function vaultEnd(mat, { x0, x1, peak }, h, base, z, t) {
  const half = (x1 - x0) / 2, xm = x0 + half;
  const inset = ((base - h) * half) / (peak - h);
  // above the wall tops it is a triangle; starting lower (a beam below the plate) it is a pentagon
  const pts = base >= h
    ? [[x0 + inset, base], [x1 - inset, base], [xm, peak + 1]]
    : [[x0, base], [x1, base], [x1, h], [xm, peak + 1], [x0, h]];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false }), mat);
  m.position.z = z;
  m.castShadow = m.receiveShadow = true;
  return m;
}
