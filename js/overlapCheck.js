import * as THREE from 'three';

// Finds overlapping coplanar faces: two surfaces lying in (almost) the same plane draw
// at the same depth, so the depth buffer can't tell which is in front and they flicker
// ("z-fighting") as the camera moves. Run it from the browser console with
// tupeek.checkOverlaps(), or load the page with ?check to log a report after loading.
//
// How it works: every triangle is put into world space (inches) and keyed by its plane
// (normal + distance from the origin). Triangles from different meshes whose planes
// match within `tol` inches are projected onto that plane and clipped against each
// other; any shared area bigger than `minArea` square inches is a clash. Faces that
// sit back to back (facing opposite ways) only clash when a material draws both sides.

const key = (o) => {
  for (let p = o; p; p = p.parent) if (p.userData.info) return p.userData.info.id || p.userData.info.type;
  return o.name || o.parent?.name || o.type;
};
const matName = (m) => m.name || (m.map ? `${m.type} (textured)` : m.color ? `#${m.color.getHexString()}` : m.type);

// Triangles of every mesh under root that draws into the depth buffer.
function triangles(root, scale, only) {
  const tris = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || (only && !only.has(o))) return;
    const mats = [o.material].flat();
    const g = o.geometry, pos = g.attributes.position;
    if (!pos) return;
    const idx = g.index, n = idx ? idx.count : pos.count;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    for (const grp of groups) {
      const mat = Array.isArray(o.material) ? mats[grp.materialIndex ?? 0] : o.material;
      if (!mat || !mat.visible || !mat.depthTest || !mat.depthWrite && mat.transparent) continue;
      for (let i = grp.start; i + 2 < Math.min(n, grp.start + grp.count); i += 3) {
        const [ia, ib, ic] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
        a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld).multiplyScalar(scale);
        b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld).multiplyScalar(scale);
        c.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld).multiplyScalar(scale);
        const nrm = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
        const area2 = nrm.length();
        if (area2 < 1e-6) continue;
        nrm.divideScalar(area2);
        tris.push({ mesh: o, mat, pts: [a.clone(), b.clone(), c.clone()], n: nrm, d: nrm.dot(a), area: area2 / 2 });
      }
    }
  });
  return tris;
}

// Area of the overlap of two convex polygons in 2D (Sutherland–Hodgman clipping).
function overlapArea(p, q) {
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const ccw = (poly) => (cross(poly[0], poly[1], poly[2]) < 0 ? [...poly].reverse() : poly);
  let out = ccw(p);
  const clip = ccw(q);
  for (let i = 0; i < clip.length && out.length; i++) {
    const e0 = clip[i], e1 = clip[(i + 1) % clip.length], inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const s = inp[j], t = inp[(j + 1) % inp.length];
      const sIn = cross(e0, e1, s) >= 0, tIn = cross(e0, e1, t) >= 0;
      if (sIn) out.push(s);
      if (sIn !== tIn) {
        const ds = cross(e0, e1, s), dt = cross(e0, e1, t), k = ds / (ds - dt);
        out.push([s[0] + (t[0] - s[0]) * k, s[1] + (t[1] - s[1]) * k]);
      }
    }
  }
  let A = 0;
  for (let i = 0; i < out.length; i++) A += out[i][0] * out[(i + 1) % out.length][1] - out[(i + 1) % out.length][0] * out[i][1];
  return Math.abs(A) / 2;
}

// `only` (a Set of meshes) limits the search to those meshes.
export function findOverlaps(root, { scale = 1, tol = 0.01, minArea = 0.25, angle = 0.001, only } = {}) {
  const tris = triangles(root, scale, only);
  // canonical plane: normal flipped to point into the positive half-space
  for (const t of tris) {
    const n = t.n, s = n.x < -1e-9 || (Math.abs(n.x) <= 1e-9 && (n.y < -1e-9 || (Math.abs(n.y) <= 1e-9 && n.z < 0))) ? -1 : 1;
    t.cn = n.clone().multiplyScalar(s);
    t.cd = t.d * s;
    t.flip = s;
  }
  // group by normal direction, then sweep along the plane distance
  const byNormal = new Map();
  const q = (v) => Math.round(v / (angle * 4));
  for (const t of tris) {
    const k = `${q(t.cn.x)},${q(t.cn.y)},${q(t.cn.z)}`;
    (byNormal.get(k) || byNormal.set(k, []).get(k)).push(t);
  }
  const clashes = new Map();
  const u = new THREE.Vector3(), v = new THREE.Vector3();
  for (const [nk, list] of byNormal) {
    if (list.length < 2) continue;
    list.sort((p, r) => p.cd - r.cd);
    const n = list[0].cn;
    u.set(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0).cross(n).normalize();
    v.crossVectors(n, u);
    for (const t of list) {
      const [a, b, c] = t.pts.map((p) => [p.dot(u), p.dot(v)]);
      t.p2 = [a, b, c];
      t.box = [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1])];
    }
    // slabs of planes within tol of each other; inside a slab, sweep along u
    for (let s0 = 0; s0 < list.length; ) {
      let s1 = s0 + 1;
      while (s1 < list.length && list[s1].cd - list[s1 - 1].cd <= tol) s1++;
      const slab = list.slice(s0, s1).sort((p, r) => p.box[0] - r.box[0]);
      s0 = s1;
      for (let i = 0; i < slab.length; i++) {
        const A = slab[i];
        for (let j = i + 1; j < slab.length && slab[j].box[0] < A.box[2]; j++) {
          const B = slab[j];
          if (A.mesh === B.mesh || Math.abs(B.cd - A.cd) > tol || A.cn.dot(B.cn) < 1 - angle) continue;
          const sameWay = A.flip === B.flip;
          if (!sameWay && A.mat.side !== THREE.DoubleSide && B.mat.side !== THREE.DoubleSide) continue;
          if (A.box[3] <= B.box[1] || B.box[3] <= A.box[1]) continue;
          const area = overlapArea(A.p2, B.p2);
          if (area < 1e-3) continue;
          const [P, Q] = A.mesh.id < B.mesh.id ? [A, B] : [B, A];
          const id = `${P.mesh.id}/${Q.mesh.id}/${nk}/${Math.round(Math.min(A.cd, B.cd) * 10)}`;
          const c = clashes.get(id) || clashes.set(id, { a: P.mesh, b: Q.mesh, matA: P.mat, matB: Q.mat, area: 0, gap: Math.abs(B.cd - A.cd), at: A.pts[0].clone(), normal: A.n.clone(), na: P.n.clone(), nb: Q.n.clone(), da: P.d, db: Q.d }).get(id);
          c.area += area;
        }
      }
    }
  }
  return [...clashes.values()].filter((c) => c.area >= minArea).sort((p, r) => r.area - p.area);
}

// Readable report: one line per clashing pair of meshes and plane.
export function overlapReport(root, opts) {
  const list = findOverlaps(root, opts);
  const f = (x) => Math.round(x * 10) / 10;
  return list.map((c) => ({
    a: `${key(c.a)} · ${matName(c.matA)}`,
    b: `${key(c.b)} · ${matName(c.matB)}`,
    sqin: f(c.area),
    gap: Math.round(c.gap * 1000) / 1000,
    at: [f(c.at.x), f(c.at.y), f(c.at.z)],
    facing: [f(c.normal.x), f(c.normal.y), f(c.normal.z)],
    meshes: [c.a, c.b],
  }));
}

// Settle every clash for good: in each pair of faces sharing a plane, the smaller piece
// (trim, sill, tile, a cabinet) has that face pushed out in front of the bigger one's
// (wall, floor) by `nudge` inches, so the depth buffer always sees it first. Only the
// vertices lying in that plane move, so a box that clashes on its top and its bottom just
// grows a hair both ways. A piece that has to clear one that was already pushed goes a
// step further. (Polygon offset can't do this: a fixed offset is too small at grazing
// angles, and a slope-scaled one lets hidden layers show through from far away.)
export function resolveOverlaps(root, opts = {}) {
  // pushing a face out can line its edges up with something new, so go round again
  // (later passes only look at what moved and whatever it touches)
  const total = { clashes: 0, moved: 0, steps: 0, passes: [] };
  let only;
  for (let pass = 0; pass < 6; pass++) {
    const r = resolvePass(root, { ...opts, only });
    if (!r.clashes) break;
    only = near(root, r.meshes);
    total.passes.push(r.clashes);
    total.clashes += r.clashes;
    total.moved += r.moved;
    total.steps = Math.max(total.steps, r.steps);
  }
  return total;
}

function resolvePass(root, { nudge = 0.03, scale = 1, ...opts }) {
  const front = (m) => [m.material].flat().every((x) => x.side === THREE.FrontSide);
  const clashes = findOverlaps(root, { scale, ...opts }).filter((c) => c.gap < nudge / 2 && (c.na.dot(c.nb) > 0 || !front(c.a) || !front(c.b)));
  const size = new Map(), box = new THREE.Box3(), dim = new THREE.Vector3();
  const sizeOf = (m) => {
    if (!size.has(m)) {
      box.setFromObject(m).getSize(dim);
      size.set(m, dim.x * dim.y + dim.y * dim.z + dim.z * dim.x);
    }
    return size.get(m);
  };
  // order by size (ties by id), so there are no cycles. For each way a face can point,
  // each piece sits one step above the highest one it has to clear (longest path).
  const smaller = (p, q) => sizeOf(p) - sizeOf(q) || p.id - q.id;
  const byDir = new Map();
  for (const c of clashes) {
    const [win, lose, nw, dw, nl] = smaller(c.a, c.b) < 0 ? [c.a, c.b, c.na, c.da, c.nb] : [c.b, c.a, c.nb, c.db, c.na];
    // push toward the side the clash is seen from: a double-sided face shows both ways,
    // so a one-sided partner decides
    const n = !front(win) && front(lose) ? nl : nw, d = dw * n.dot(nw);
    const k = n.toArray().map((v) => Math.round(v * 100)).join();
    const g = byDir.get(k) || byDir.set(k, { n, beats: new Map(), planes: new Map() }).get(k);
    (g.beats.get(win) || g.beats.set(win, new Set()).get(win)).add(lose);
    (g.planes.get(win) || g.planes.set(win, new Set()).get(win)).add(Math.round(d * 1000) / 1000);
  }
  const pushes = new Map(); // mesh → [{ n, d, by }]
  let steps = 0;
  for (const { n, beats, planes } of byDir.values()) {
    const level = new Map();
    const lv = (m) => level.get(m) || 0;
    for (const m of [...beats.keys()].sort((p, q) => smaller(q, p))) {
      const k = 1 + Math.max(...[...beats.get(m)].map(lv));
      level.set(m, k);
      steps = Math.max(steps, k);
      const list = pushes.get(m) || pushes.set(m, []).get(m);
      for (const d of planes.get(m)) list.push({ n, d, by: k * nudge });
    }
  }
  // geometry used by more than one mesh is copied before it is changed
  const users = new Map();
  root.traverse((o) => o.isMesh && users.set(o.geometry, (users.get(o.geometry) || 0) + 1));
  const v = new THREE.Vector3(), inv = new THREE.Matrix4();
  for (const [m, list] of pushes) {
    if (users.get(m.geometry) > 1) m.geometry = m.geometry.clone();
    const pos = m.geometry.attributes.position;
    inv.copy(m.matrixWorld).invert();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).multiplyScalar(scale);
      let moved = false;
      for (const { n, d, by } of list) {
        if (Math.abs(n.dot(v) - d) < 0.01) { v.addScaledVector(n, by); moved = true; }
      }
      if (moved) pos.setXYZ(i, ...v.divideScalar(scale).applyMatrix4(inv).toArray());
    }
    pos.needsUpdate = true;
    m.geometry.computeBoundingBox();
    m.geometry.computeBoundingSphere();
  }
  return { clashes: clashes.length, moved: pushes.size, steps, meshes: [...pushes.keys()] };
}

// The given meshes plus every mesh whose bounding box touches one of theirs.
function near(root, meshes) {
  const boxes = meshes.map((m) => new THREE.Box3().setFromObject(m).expandByScalar(0.01));
  const out = new Set(meshes), b = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh || out.has(o)) return;
    b.setFromObject(o);
    if (boxes.some((x) => x.intersectsBox(b))) out.add(o);
  });
  return out;
}
