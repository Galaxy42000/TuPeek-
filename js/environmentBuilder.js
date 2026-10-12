import * as THREE from 'three';

// Surroundings outside the house (see `environment` in rooms/house.js), in plan inches
// with y up from the floor: a lawn, beds of pine needles / bare dirt with soft edges,
// the gravel parking spot, trees (broadleaf and white pine), shrubs, hostas and a
// split-rail fence. Everything is low-poly and generated from a seeded random
// sequence, so it looks the same on every load. Plants and fence are merged into a
// few meshes (leaves, bark/wood) to keep it cheap to draw. The whole group is hidden
// until the viewer's "Surroundings" checkbox turns it on.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// smooth value noise in 2D, roughly -1..1, for patchy lawn colour
function noise2(seed) {
  const h = (i, j) => {
    let n = (i * 374761393 + j * 668265263 + seed * 2246822519) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
  };
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = s(x - i), fy = s(y - j);
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function canvasTexture(px, size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  paint(c.getContext('2d'), px);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / size, 1 / size);
  t.anisotropy = 8;
  return t;
}

const hsl = (hex, dh, ds, dl) => new THREE.Color(hex).offsetHSL(dh, ds, dl);

// short strokes in random directions (grass blades, needles, gravel)
function strokes(ctx, px, r, n, colors, len, width) {
  for (let i = 0; i < n; i++) {
    const x = r() * px, y = r() * px, a = r() * Math.PI * 2, l = len[0] + r() * (len[1] - len[0]);
    ctx.strokeStyle = colors[Math.floor(r() * colors.length)];
    ctx.globalAlpha = 0.35 + r() * 0.5;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const TEXTURES = {
  grass: () => canvasTexture(512, 60, (ctx, px) => {
    const r = rng(5);
    ctx.fillStyle = '#5b7f3a';
    ctx.fillRect(0, 0, px, px);
    strokes(ctx, px, r, 9000, ['#4a6d2e', '#6d9445', '#7fa452', '#557a35', '#3f5f28'], [3, 9], 1.4);
  }),
  needles: () => canvasTexture(512, 48, (ctx, px) => {
    const r = rng(8);
    ctx.fillStyle = '#76654f';
    ctx.fillRect(0, 0, px, px);
    strokes(ctx, px, r, 7000, ['#94805f', '#a38c69', '#7d6a52', '#5c4d3c', '#b09872'], [8, 22], 1.2);
  }),
  dirt: () => canvasTexture(512, 40, (ctx, px) => {
    const r = rng(9);
    ctx.fillStyle = '#6c6052';
    ctx.fillRect(0, 0, px, px);
    strokes(ctx, px, r, 4000, ['#7d7061', '#5c5145', '#8b7f70', '#544a3f'], [1, 3], 2.2);
    strokes(ctx, px, r, 1500, ['#94805f', '#66553f'], [6, 16], 1);
  }),
  gravel: () => canvasTexture(512, 36, (ctx, px) => {
    const r = rng(10);
    ctx.fillStyle = '#8d877c';
    ctx.fillRect(0, 0, px, px);
    strokes(ctx, px, r, 9000, ['#a39c90', '#6f695f', '#b5afa3', '#7c766b', '#5d584f'], [1, 3], 2.6);
  }),
};

// ---------- merged geometry ----------
// A bucket of non-indexed triangles with per-vertex colours; add() takes any geometry
// plus a matrix and a colour.
class Bucket {
  constructor() { this.pos = []; this.col = []; }
  add(geo, matrix, color, shadeY = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      // a little darker towards the bottom of each blob
      const k = shadeY ? 1 - shadeY * (0.5 - v.y / (2 * (g.boundingSphere?.radius || 1))) : 1;
      v.applyMatrix4(matrix);
      this.pos.push(v.x, v.y, v.z);
      this.col.push(color.r * k, color.g * k, color.b * k);
    }
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

// a lumpy low-poly ball: an icosahedron pushed in and out by a smooth function of
// direction, so neighbouring triangles still share their corners
function blob(detail, seed, rough = 0.18) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, v = new THREE.Vector3();
  const a = seed * 1.7, b = seed * 2.3, c = seed * 0.9;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const d = 1 + rough * (Math.sin(v.x * 3.1 + a) * Math.sin(v.y * 2.7 + b) + 0.6 * Math.sin(v.z * 4.3 + c + v.x * 2));
    p.setXYZ(i, v.x * d, v.y * d, v.z * d);
  }
  g.computeBoundingSphere();
  return g;
}
const BLOBS = Array.from({ length: 6 }, (_, i) => blob(1, i + 1));
const SMALL = Array.from({ length: 4 }, (_, i) => blob(0, i + 7, 0.12));
const TRUNK = new THREE.CylinderGeometry(0.45, 1, 1, 7, 1, true).translate(0, 0.5, 0);
const BOX = new THREE.BoxGeometry(1, 1, 1);

const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
const place = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => M4.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));

// a trunk or branch from point a, `len` long, leaning by (tilt, heading), radius r at its foot
function limb(bark, x, y, z, len, r, tilt, heading, color) {
  bark.add(TRUNK, place(x, y, z, r, len, r, 0, heading, tilt), color);
  return [x - Math.sin(tilt) * len * Math.cos(heading), y + Math.cos(tilt) * len, z + Math.sin(tilt) * len * Math.sin(heading)];
}

function broadleaf(t, base, leaves, bark, r) {
  const h = t.height, R = (t.spread ?? h * 0.6) / 2;
  const leaf = new THREE.Color(t.color || '#4f7a32');
  const lean = t.lean ?? r() * 0.08, dir = t.leanDir ?? r() * Math.PI * 2;
  const tr = t.trunk ?? Math.max(5, h * 0.016);
  const barkCol = hsl('#5b5048', 0, 0, (r() - 0.5) * 0.06);
  const top = limb(bark, t.x, base, t.z, h * 0.62, tr, lean, dir, barkCol);
  const cy = base + h * 0.7, [cx, , cz] = top;
  // a few big limbs up into the crown
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2;
    limb(bark, t.x + (top[0] - t.x) * 0.6, base + h * 0.4, t.z + (top[2] - t.z) * 0.6, R * 0.9, tr * 0.45, 0.6 + r() * 0.3, a, barkCol);
  }
  const n = 8 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.62, s = R * (0.38 + r() * 0.22);
    const y = cy + (r() - 0.35) * R * 0.7;
    const c = hsl(leaf, (r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08 + (y - cy) / R * 0.05);
    leaves.add(BLOBS[i % BLOBS.length], place(cx + Math.cos(a) * d, y, cz + Math.sin(a) * d, s, s * 0.8, s, 0, r() * 6, 0), c, 0.5);
  }
}

// eastern white pine: tall straight trunk, bare low down, with irregular flat layers of
// needles sticking out to the sides
function pine(t, base, leaves, bark, r) {
  const h = t.height, R = (t.spread ?? h * 0.42) / 2;
  const leaf = new THREE.Color(t.color || '#2f4a34');
  const tr = t.trunk ?? Math.max(6, h * 0.015);
  limb(bark, t.x, base, t.z, h * 0.94, tr, r() * 0.03, r() * 6, hsl('#5a4a3f', 0, 0, (r() - 0.5) * 0.05));
  const y0 = base + h * (t.clear ?? 0.38), tiers = 7 + Math.floor(r() * 3);
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1), y = y0 + (base + h - y0) * k * 0.95;
    const w = R * (1 - k * 0.75) * (0.8 + r() * 0.3);
    const clumps = 2 + Math.floor(r() * 3 * (1 - k * 0.6));
    for (let j = 0; j < clumps; j++) {
      const a = r() * Math.PI * 2, d = w * (0.25 + r() * 0.45), s = w * (0.45 + r() * 0.25);
      const c = hsl(leaf, (r() - 0.5) * 0.04, (r() - 0.5) * 0.08, (r() - 0.5) * 0.07);
      leaves.add(BLOBS[(i + j) % BLOBS.length], place(t.x + Math.cos(a) * d, y, t.z + Math.sin(a) * d, s, s * 0.32, s * 0.85, 0, a, 0), c, 0.6);
      // a branch out to the clump
      if (j < 2 && k < 0.8) limb(bark, t.x, y - 6, t.z, d, tr * 0.25, 1.35, -a + Math.PI, hsl('#5a4a3f', 0, 0, 0));
    }
  }
  leaves.add(SMALL[0], place(t.x, base + h * 0.97, t.z, R * 0.12, R * 0.22, R * 0.12), hsl(leaf, 0, 0, 0.02), 0.4);
}

function shrub(s, base, leaves, r) {
  const n = s.kind === 'hosta' ? 6 : 4 + Math.floor(r() * 3);
  const w = s.size ?? (s.kind === 'hosta' ? 30 : 60), hgt = s.height ?? (s.kind === 'hosta' ? 18 : w * 0.8);
  const col = new THREE.Color(s.color || (s.kind === 'hosta' ? '#6f9b45' : '#3f6532'));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r(), d = w * (i === 0 ? 0 : 0.22 + r() * 0.12), sz = w * (0.3 + r() * 0.12);
    const c = hsl(col, (r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08);
    if (s.kind === 'hosta') {
      // broad leaves splayed out low
      leaves.add(SMALL[i % SMALL.length], place(s.x + Math.cos(a) * d, base + hgt * 0.35, s.z + Math.sin(a) * d, sz, hgt * 0.4, sz * 0.7, 0, -a, 0.35), c, 0.4);
    } else {
      leaves.add(BLOBS[i % BLOBS.length], place(s.x + Math.cos(a) * d, base + hgt * (0.35 + r() * 0.25), s.z + Math.sin(a) * d, sz, hgt * 0.45, sz, 0, r() * 6, 0), c, 0.5);
    }
  }
}

function fence(f, base, wood, r) {
  const [a, b] = [f.from, f.to], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / (f.span ?? 96))), heading = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const hgt = f.height ?? 48, rails = f.rails ?? [20, 38];
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, z = a[1] + ((b[1] - a[1]) * i) / n;
    wood.add(BOX, place(x, base + hgt / 2, z, 6, hgt, 6, 0, -heading + (r() - 0.5) * 0.2, 0), hsl('#8a7762', 0, 0, (r() - 0.5) * 0.06));
    if (i === n) continue;
    for (const y of rails) {
      const x2 = a[0] + ((b[0] - a[0]) * (i + 0.5)) / n, z2 = a[1] + ((b[1] - a[1]) * (i + 0.5)) / n;
      wood.add(BOX, place(x2, base + y + (r() - 0.5) * 2, z2, len / n + 8, 4, 3.5, 0, -heading, (r() - 0.5) * 0.03), hsl('#937f69', 0, 0, (r() - 0.5) * 0.08));
    }
  }
}

// ---------- ground ----------
// a filled outline whose edge fades out over `feather` inches, so beds blend into the lawn
function bed(outline, feather, mat, y) {
  const ctr = outline.reduce((s, [x, z]) => [s[0] + x / outline.length, s[1] + z / outline.length], [0, 0]);
  const inner = outline.map(([x, z]) => {
    const dx = x - ctr[0], dz = z - ctr[1], d = Math.hypot(dx, dz) || 1, k = Math.max(0, d - feather) / d;
    return [ctr[0] + dx * k, ctr[1] + dz * k];
  });
  const pos = [], col = [], uv = [];
  // one triangle of [[x, z], alpha] corners, wound to face up (+y)
  const tri = (p, q, s) => {
    if ((q[0][1] - p[0][1]) * (s[0][0] - p[0][0]) - (q[0][0] - p[0][0]) * (s[0][1] - p[0][1]) < 0) [q, s] = [s, q];
    for (const [[x, z], a] of [p, q, s]) { pos.push(x, y, z); uv.push(x, -z); col.push(1, 1, 1, a); }
  };
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(inner.map(([x, z]) => new THREE.Vector2(x, z)), [])) tri([inner[i], 1], [inner[j], 1], [inner[k], 1]);
  // the feathered edge, fading from opaque (inner outline) to clear (outline)
  for (let i = 0, n = outline.length; i < n; i++) {
    const i2 = (i + 1) % n, a = [inner[i], 1], b = [inner[i2], 1], A = [outline[i], 0], B = [outline[i2], 0];
    tri(a, A, B);
    tri(a, B, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}

// a wobbly closed outline around an ellipse/box: [cx, cz, rx, rz] or a list of points
function wobble(shape, seed, amount = 0.12, steps = 40) {
  const r = rng(seed), ph = [r() * 6, r() * 6, r() * 6];
  if (Array.isArray(shape[0])) return shape;
  const [cx, cz, rx, rz, square = 0] = shape;
  const out = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    // `square` pushes the ellipse towards a rounded rectangle
    const k = square ? 1 / Math.pow(Math.pow(Math.abs(c), 2 + square * 6) + Math.pow(Math.abs(s), 2 + square * 6), 1 / (2 + square * 6)) : 1;
    const w = 1 + amount * (Math.sin(a * 3 + ph[0]) * 0.5 + Math.sin(a * 5 + ph[1]) * 0.3 + Math.sin(a * 9 + ph[2]) * 0.2);
    out.push([cx + c * rx * k * w, cz + s * rz * k * w]);
  }
  return out;
}

export function buildEnvironment(env, grade = 0) {
  const group = new THREE.Group();
  group.name = 'environment';
  const base = grade - 0.6; // the lawn, level with the plain ground plate it replaces
  const [cx, cz] = env.center;

  // lawn: a large subdivided disc with patchy colour (vertex colours times the texture)
  const lawnR = env.radius ?? 2200;
  // (a ring with a pinhole, for its rings of vertices: the colour varies across them)
  const lawnGeo = new THREE.RingGeometry(0.01, lawnR, 96, 48).rotateX(-Math.PI / 2);
  const nz = noise2(3), nz2 = noise2(4), lp = lawnGeo.attributes.position, lc = [];
  const lawnUv = lawnGeo.attributes.uv;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), z = lp.getZ(i);
    lawnUv.setXY(i, x + cx, -(z + cz));
    const v = nz(x / 420, z / 420) * 0.6 + nz2(x / 130, z / 130) * 0.4; // -1..1
    const dry = Math.max(0, v) * 0.35; // yellower, drier patches
    lc.push(1 + dry * 0.25 - Math.max(0, -v) * 0.18, 1 - Math.max(0, -v) * 0.12, 1 - dry * 0.6 - Math.max(0, -v) * 0.15);
  }
  lawnGeo.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  const lawn = new THREE.Mesh(lawnGeo, new THREE.MeshStandardMaterial({ map: TEXTURES.grass(), vertexColors: true, roughness: 1 }));
  lawn.position.set(cx, base, cz);
  lawn.receiveShadow = true;
  group.add(lawn);

  const bedMat = (tex) => new THREE.MeshStandardMaterial({
    map: tex, vertexColors: true, transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
  const beds = {};
  (env.beds || []).forEach((b, i) => {
    const mat = (beds[b.kind] ??= bedMat(TEXTURES[b.kind]()));
    const m = bed(wobble(b.shape, 20 + i, b.wobble ?? 0.12), b.feather ?? 40, mat, base + 0.2 * (i + 1));
    m.renderOrder = 1 + i;
    group.add(m);
  });

  // plants and fence, merged into one mesh of leaves and one of bark/wood
  const leaves = new Bucket(), bark = new Bucket();
  const r = rng(env.seed ?? 42);
  const trees = [...(env.trees || [])];
  if (env.woods) {
    // fill a ring of woods around the lot, keeping clear of the trees placed by hand
    const w = env.woods, wr = rng(w.seed ?? 7);
    for (let tries = 0, made = 0; made < w.count && tries < w.count * 30; tries++) {
      const a = wr() * Math.PI * 2, d = w.r0 + wr() * (w.r1 - w.r0);
      if ((w.gaps || []).some(([g0, g1]) => {
        const deg = ((Math.atan2(Math.sin(a), Math.cos(a)) * 180) / Math.PI + 360) % 360;
        return g0 <= g1 ? deg >= g0 && deg <= g1 : deg >= g0 || deg <= g1;
      }) && d < w.r1 * 0.92) continue;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < (w.spacing ?? 200))) continue;
      const isPine = wr() < (w.pines ?? 0.5);
      trees.push({ kind: isPine ? 'pine' : 'broadleaf', x, z, height: (isPine ? 600 : 480) + wr() * 300, color: isPine ? undefined : ['#4f7a32', '#5a8236', '#466d2e', '#61883c'][Math.floor(wr() * 4)] });
      made++;
    }
  }
  for (const t of trees) (t.kind === 'pine' ? pine : broadleaf)(t, base, leaves, bark, r);
  for (const s of env.shrubs || []) {
    if (s.row) {
      // a row of plants from `from` to `to`, `every` inches apart with some jitter
      const [a, b] = s.row, len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / (s.every ?? 50)));
      for (let i = 0; i <= n; i++) {
        if (s.skip && r() < s.skip) continue;
        shrub({ ...s, x: a[0] + ((b[0] - a[0]) * i) / n + (r() - 0.5) * 10, z: a[1] + ((b[1] - a[1]) * i) / n + (r() - 0.5) * 10 }, base, leaves, r);
      }
    } else shrub(s, base, leaves, r);
  }
  for (const f of env.fences || []) fence(f, base, bark, r);

  const leafMesh = leaves.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  const barkMesh = bark.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  group.add(leafMesh, barkMesh);
  group.visible = false;
  return group;
}
