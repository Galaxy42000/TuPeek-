import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { addBox, panelRects, freeIntervals } from './geometry.js';
import { createMaterials } from './materials.js';
import * as F from './fixtures.js';
import { fmtIn, fmtFtIn } from './units.js';
import { trueDir, capDir } from './compass.js';

const WALL_NAMES = ['north', 'east', 'south', 'west'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Each wall gets a local frame: origin at its LEFT corner (as seen from inside the room),
// u runs along the wall to the right, n points from the wall into the room.
function wallFrames(W, D) {
  const f = (ox, oz, ux, uz, nx, nz, len, rot) => ({
    origin: new THREE.Vector3(ox, 0, oz), u: new THREE.Vector3(ux, 0, uz), n: new THREE.Vector3(nx, 0, nz), len, rot,
  });
  return {
    north: f(0, 0, 1, 0, 0, 1, W, 0),
    east: f(W, 0, 0, 1, -1, 0, D, -Math.PI / 2),
    south: f(W, D, -1, 0, 0, -1, W, Math.PI),
    west: f(0, D, 0, -1, 1, 0, D, Math.PI / 2),
  };
}

// Rotation that turns a fixture's front (+z local) toward a compass direction.
export const FACING = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };

// Corner frames: origin at the room corner, local x and z both run along a wall away from it.
function cornerFrames(W, D) {
  return {
    'north-west': { x: 0, z: 0, rot: 0, walls: (a) => ({ north: [0, a], west: [D - a, D] }) },
    'north-east': { x: W, z: 0, rot: -Math.PI / 2, walls: (a) => ({ north: [W - a, W], east: [0, a] }) },
    'south-east': { x: W, z: D, rot: Math.PI, walls: (a) => ({ east: [D - a, D], south: [0, a] }) },
    'south-west': { x: 0, z: D, rot: Math.PI / 2, walls: (a) => ({ south: [W - a, W], west: [0, a] }) },
  };
}

// Flat shape (x, z) → horizontal slab of thickness h whose underside sits at y.
export function slab(points, h, y, mat) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y;
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Group for a free-standing item whose footprint covers world x ∈ [x, x+w'], z ∈ [z, z+d']
// (w along the fronts, d deep) with its fronts facing `facing`.
export function placeFootprint(x, z, w, d, facing) {
  const rot = FACING[facing] ?? 0;
  const ux = Math.cos(rot), uz = -Math.sin(rot), nx = Math.sin(rot), nz = Math.cos(rot);
  const pts = [[0, 0], [w, 0], [0, d], [w, d]].map(([a, b]) => [a * ux + b * nx, a * uz + b * nz]);
  const g = new THREE.Group();
  g.rotation.y = rot;
  g.position.set(x - Math.min(...pts.map((p) => p[0])), 0, z - Math.min(...pts.map((p) => p[1])));
  return g;
}

export function buildRoom(cfg) {
  const { width: W, depth: D, height: H, wallThickness: t = 4.5 } = cfg.room;
  const M = createMaterials(cfg.palette);
  const ctx = { M, style: cfg.style?.doorStyle || 'shaker', handle: cfg.style?.handle || 'bar', room: cfg.room };
  const frames = wallFrames(W, D);
  const root = new THREE.Group();
  root.name = cfg.id;
  const walls = [];
  const labels = [];
  const occupied = { north: [], east: [], south: [], west: [] };
  const counters = {};
  const nextId = (p) => `${p}${(counters[p] = (counters[p] || 0) + 1)}`;

  // Which walls exist (open sides of the kitchen are simply left out).
  const wallSpecs = cfg.room.walls || Object.fromEntries(WALL_NAMES.map((n) => [n, {}]));
  // Floor/ceiling can extend past the room box on open sides.
  const fm = { north: 0, east: 0, south: 0, west: 0, ...(cfg.room.floorMargin || {}) };
  const floorBox = { x0: -fm.west, x1: W + fm.east, z0: -fm.north, z1: D + fm.south };

  const wallGroup = (wall, start = 0) => {
    const fr = frames[wall];
    if (!fr) throw new Error(`Unknown wall "${wall}" (use north, east, south or west)`);
    const g = new THREE.Group();
    g.rotation.y = fr.rot;
    g.position.copy(fr.origin).addScaledVector(fr.u, start);
    return g;
  };

  const label = (parent, text, x, y, z, cls = '') => {
    const el = document.createElement('div');
    el.className = `dim-label ${cls}`;
    el.textContent = text;
    const o = new CSS2DObject(el);
    o.position.set(x, y, z);
    parent.add(o);
    labels.push(o);
    return o;
  };

  const tag = (obj, info) => {
    obj.userData.info = info;
    return obj;
  };
  // an element's own materials, else the config's default for that kind of surface
  const mats = (own, surface) => own ?? cfg.surfaces?.[surface];
  const pair = (planDirs) => trueDir(planDirs).replace('-', '/');

  // ---------- floor & ceiling ----------
  const fw = floorBox.x1 - floorBox.x0, fd = floorBox.z1 - floorBox.z0;
  const floor = addBox(root, M.floor, floorBox.x0 - t, -1, floorBox.z0 - t, fw + 2 * t, 1, fd + 2 * t, { cast: false });
  floor.name = 'floor';
  tag(floor, { id: 'Floor', type: 'Floor', materials: mats(undefined, 'floor'), notes: `Kitchen is ${fmtFtIn(W)} along the ${pair('north-south')} walls and ${fmtFtIn(D)} along the ${pair('east-west')} walls.` });

  const ceiling = new THREE.Group();
  addBox(ceiling, M.ceiling, floorBox.x0 - t, H, floorBox.z0 - t, fw + 2 * t, 1, fd + 2 * t, { cast: false }).name = 'ceiling';
  tag(ceiling, { id: 'Ceiling', type: 'Ceiling', height: H, materials: mats(undefined, 'ceiling') });
  root.add(ceiling);

  // ---------- walls, windows, doors ----------
  const openings = (cfg.openings || []).map((o) => ({
    bottom: 0,
    ...o,
    id: o.id || nextId(o.type === 'window' ? 'W' : 'D'),
  }));

  for (const name of WALL_NAMES) {
    const spec = wallSpecs[name];
    if (!spec) continue;
    const fr = frames[name];
    const g = wallGroup(name);
    // Walls run past their corners (into the neighboring wall, or on into the next room).
    const lo = -(spec.extendLeft ?? (name === 'north' || name === 'south' ? t : 0));
    const hi = fr.len + (spec.extendRight ?? (name === 'north' || name === 'south' ? t : 0));
    const ops = openings.filter((o) => o.wall === name);
    for (const r of panelRects(hi - lo, H, ops.map((o) => ({ ...o, start: o.start - lo })))) {
      addBox(g, M.wall, r.x + lo, r.y, -t, r.w, r.h, t, { cast: false });
    }
    tag(g, { id: `${capDir(name)} wall`, type: 'Wall', width: fr.len, height: H, materials: mats(spec.materials, 'walls'), notes: 'Length is the kitchen section of the wall, corner to corner.' });
    label(g, `${capDir(name)} wall · ${fmtFtIn(fr.len)}`, fr.len / 2, H - 6, 1, 'wall');

    for (const o of ops) {
      const og = new THREE.Group();
      F.opening(og, ctx, o, t);
      g.add(og);
      const kind = { window: 'Window', door: 'Doorway', opening: 'Cased opening' }[o.type] || 'Opening';
      tag(og, { id: o.id, type: kind, wall: trueDir(name), start: o.start, width: o.width, height: o.height, bottom: o.bottom || undefined, materials: mats(o.materials, { window: 'windows', door: 'doors' }[o.type]), notes: o.notes });
      label(og, `${o.id} · ${fmtIn(o.width)}`, o.start + o.width / 2, o.bottom + o.height / 2, 1);
      if (o.bottom === 0) occupied[name].push([o.start, o.start + o.width]);
    }
    root.add(g);
    const center = fr.origin.clone().addScaledVector(fr.u, fr.len / 2).setY(H / 2);
    walls.push({ name, group: g, center, normal: fr.n.clone(), lo, hi });
  }

  // tile behind a counter, split around windows/doors on that wall
  const backsplash = (g, wall, runStart, a, b, counterTop, height) => {
    const rel = openings
      .filter((o) => o.wall === wall)
      .map((o) => {
        const trim = o.type === 'opening' ? 0 : 3.5; // stop tile at the casing
        return { start: o.start - trim - runStart - a, width: o.width + 2 * trim, bottom: o.bottom - counterTop - (o.type === 'window' ? 3.75 : 0), height: o.height + 2 * trim + 3.75 };
      });
    const bs = new THREE.Group();
    for (const r of panelRects(b - a, height, rel)) addBox(bs, M.backsplash, a + r.x, counterTop + r.y, 0, r.w, r.h, 0.375, { cast: false });
    g.add(bs);
    return bs;
  };

  // ---------- base cabinet runs (with countertop, sink, backsplash) ----------
  for (const spec of cfg.baseRuns || []) {
    const run = { depth: 24, height: 34.5, toeKick: 4, counterThickness: 1.5, overhang: 1, backsplash: 18, extendLeft: 0, extendRight: 0, ...spec };
    const g = wallGroup(run.wall, run.start);
    root.add(g);
    let x = 0;
    const segs = [];
    const sinks = [];
    let seg = null;
    for (const it of run.items) {
      const kind = it.kind || 'cabinet';
      const ig = new THREE.Group();
      ig.position.x = x;
      g.add(ig);
      const id = it.id || nextId({ dishwasher: 'DW', range: 'RANGE' }[kind] || 'B');
      if (kind === 'dishwasher') F.dishwasher(ig, ctx, it.width, run);
      else if (kind === 'range') F.range(ig, ctx, it.width, run);
      else if (kind === 'panel') addBox(ig, M.cabinet, 0, 0, 0, it.width, run.height, run.depth + 0.75);
      else if (kind === 'gap') { /* empty space, e.g. for a trash can or seating knee space */ }
      else F.baseCabinet(ig, ctx, it.width, run, kind === 'sink' ? 'sink' : it.fronts || 'door-drawer', it);
      if (kind === 'sink') sinks.push({ x, w: it.width, it });

      const hasCounter = kind !== 'range' && it.counter !== false;
      if (hasCounter) {
        if (!seg) segs.push((seg = { a: x, b: x }));
        seg.b = x + it.width;
      } else seg = null;

      const typeName = { cabinet: 'Base cabinet', sink: 'Sink base', dishwasher: 'Dishwasher', range: 'Range', gap: 'Open space', panel: 'End panel' }[kind];
      tag(ig, { id, type: typeName, wall: trueDir(run.wall), start: run.start + x, width: it.width, height: kind === 'range' ? run.height + run.counterThickness : run.height, depth: run.depth, fronts: kind === 'cabinet' ? it.fronts || 'door-drawer' : undefined, code: it.code, materials: mats(it.materials, kind === 'cabinet' || kind === 'sink' || kind === 'panel' ? 'cabinets' : null), notes: it.notes });
      if (kind !== 'panel') label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, run.height * 0.5, run.depth + 2);
      x += it.width;
    }
    const total = x;
    const counterTop = run.height + run.counterThickness;

    for (const s of segs) {
      const a = s.a === 0 ? -run.extendLeft : s.a;
      const b = s.b === total ? total + run.extendRight : s.b;
      const dz = run.depth + run.overhang;
      const shape = new THREE.Shape();
      shape.moveTo(a, 0);
      shape.lineTo(b, 0);
      shape.lineTo(b, -dz);
      shape.lineTo(a, -dz);
      shape.closePath();
      for (const sk of sinks) {
        if (sk.x < s.a || sk.x + sk.w > s.b) continue;
        const bw = sk.it.bowlWidth ?? sk.w - 6;
        const bd = sk.it.bowlDepth ?? 17;
        const hx = sk.x + (sk.w - bw) / 2;
        const zFront = dz - 3.5, zBack = zFront - bd;
        const hole = new THREE.Path();
        hole.moveTo(hx, -zBack);
        hole.lineTo(hx + bw, -zBack);
        hole.lineTo(hx + bw, -zFront);
        hole.lineTo(hx, -zFront);
        hole.closePath();
        shape.holes.push(hole);
        F.sinkBasin(g, ctx, hx, zBack, bw, bd, run.height);
        F.faucet(g, ctx, sk.x + sk.w / 2, Math.max(2, zBack - 2.5), counterTop);
      }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: run.counterThickness, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const top = new THREE.Mesh(geo, M.counter);
      top.position.y = run.height;
      top.castShadow = top.receiveShadow = true;
      tag(top, { id: `${run.id || 'Run'} countertop`, type: 'Countertop', wall: trueDir(run.wall), start: run.start + a, width: b - a, depth: dz, height: run.counterThickness, materials: mats(run.counterMaterials, 'counter'), notes: `Top of counter is ${fmtIn(counterTop)} from the floor.` });
      g.add(top);
    }

    if (run.backsplash > 0) {
      const a = -run.extendLeft, b = total + run.extendRight;
      const bs = backsplash(g, run.wall, run.start, a, b, counterTop, run.backsplash);
      tag(bs, { id: `${run.id || 'Run'} backsplash`, type: 'Backsplash', wall: trueDir(run.wall), start: run.start + a, width: b - a, height: run.backsplash, materials: mats(run.backsplashMaterials, 'backsplash') });
    }
    occupied[run.wall].push([run.start - run.extendLeft, run.start + total + run.extendRight]);
  }

  // ---------- diagonal corner cabinets ----------
  const cframes = cornerFrames(W, D);
  for (const spec of cfg.corners || []) {
    const cf = cframes[spec.corner];
    if (!cf) throw new Error(`Unknown corner "${spec.corner}"`);
    const upper = spec.kind === 'wall';
    const c = upper
      ? { size: 24, depth: 12, bottom: 54, height: 30, ...spec }
      : { size: 36, depth: 24, height: 34.5, toeKick: 4, counterThickness: 1.5, overhang: 1, backsplash: 18, ...spec };
    const id = c.id || nextId(upper ? 'U' : 'B');
    const g = new THREE.Group();
    g.position.set(cf.x, 0, cf.z);
    g.rotation.y = cf.rot;
    root.add(g);
    const a = c.size, d = c.depth;
    const pent = (dd) => [[0, 0], [a, 0], [a, dd], [dd, a], [0, a]];
    const mat = M.cabinet;
    // the door sits on the 45° face between (d, a) and (a, d)
    const front = new THREE.Group();
    front.position.set(d, 0, a);
    front.rotation.y = Math.PI / 4;
    g.add(front);
    const L = (a - d) * Math.SQRT2;
    if (upper) {
      g.add(slab(pent(d), c.height, c.bottom, mat));
      F.fronts(front, ctx, mat, L, c.bottom, c.bottom + c.height, 0, 'doors', { doors: 1, hinge: c.hinge }, { upper: true });
    } else {
      g.add(slab(pent(d), c.height - c.toeKick, c.toeKick, mat));
      g.add(slab(pent(d - 3), c.toeKick, 0, M.toeKick));
      F.fronts(front, ctx, mat, L, c.toeKick, c.height, 0, c.fronts || 'door-drawer', { doors: 1, hinge: c.hinge });
      const top = slab(pent(d + c.overhang), c.counterThickness, c.height, M.counter);
      tag(top, { id: `${id} countertop`, type: 'Countertop (corner)', width: a, depth: a, materials: mats(c.counterMaterials, 'counter') });
      g.add(top);
      const ct = c.height + c.counterThickness;
      if (c.backsplash > 0) {
        addBox(g, M.backsplash, 0, ct, 0, a, c.backsplash, 0.375, { cast: false });
        addBox(g, M.backsplash, 0, ct, 0.375, 0.375, c.backsplash, a - 0.375, { cast: false });
      }
      for (const [wall, span] of Object.entries(cf.walls(a))) occupied[wall].push(span);
    }
    const yMid = upper ? c.bottom + c.height / 2 : c.height * 0.5;
    tag(g, { id, type: upper ? 'Diagonal corner wall cabinet' : 'Diagonal corner base cabinet', code: c.code, width: a, depth: d, height: c.height, bottom: upper ? c.bottom : undefined, materials: mats(c.materials, 'cabinets'), notes: `${cap(trueDir(spec.corner))} corner. Runs ${fmtIn(a)} along each wall; the door is on the 45° face.${c.notes ? ' ' + c.notes : ''}` });
    label(g, `${id} · ${fmtIn(a)}`, (a + d) / 2 + 2, yMid, (a + d) / 2 + 2);
  }

  // ---------- wall cabinet runs (uppers, hoods, microwaves) ----------
  for (const spec of cfg.wallRuns || []) {
    const run = { depth: 12, height: 30, bottom: 54, ...spec };
    const g = wallGroup(run.wall, run.start);
    root.add(g);
    let x = 0;
    for (const it of run.items) {
      const kind = it.kind || 'cabinet';
      const ig = new THREE.Group();
      ig.position.x = x;
      g.add(ig);
      const bottom = it.bottom ?? run.bottom, h = it.height ?? run.height, d = it.depth ?? run.depth;
      if (kind === 'hood') {
        const id = it.id || nextId('HOOD');
        const hb = it.bottom ?? 66;
        F.hood(ig, ctx, it.width, hb, H, it.depth ?? 20);
        tag(ig, { id, type: 'Range hood', wall: trueDir(run.wall), start: run.start + x, width: it.width, bottom: hb, depth: it.depth ?? 20, materials: it.materials });
        label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, hb + 6, (it.depth ?? 20) + 1);
      } else if (kind === 'microwave') {
        const id = it.id || nextId('MW');
        F.microwave(ig, ctx, it.width, bottom, h, d);
        tag(ig, { id, type: 'Over-the-range microwave', code: it.code, wall: trueDir(run.wall), start: run.start + x, width: it.width, height: h, depth: d, bottom, materials: it.materials, notes: it.notes });
        label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, bottom + h / 2, d + 2);
      } else if (kind !== 'gap') {
        const id = it.id || nextId('U');
        F.upperCabinet(ig, ctx, it.width, bottom, h, d, it.fronts || 'doors', it);
        tag(ig, { id, type: 'Wall cabinet', wall: trueDir(run.wall), start: run.start + x, width: it.width, height: h, depth: d, bottom, fronts: it.fronts || 'doors', code: it.code, materials: mats(it.materials, 'cabinets'), notes: it.notes });
        label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, bottom + h / 2, d + 2);
      }
      x += it.width;
    }
  }

  // ---------- tall items (fridge, pantry) — on a wall, or free-standing with x/z/facing ----------
  for (const it of cfg.tall || []) {
    const g = it.wall ? wallGroup(it.wall, it.start) : placeFootprint(it.x, it.z, it.width, it.depth, it.facing);
    root.add(g);
    const type = it.type || 'pantry';
    const id = it.id || nextId(type === 'fridge' ? 'REF' : 'T');
    if (type === 'fridge') F.fridge(g, ctx, it.width, it.height, it.depth);
    else F.tallCabinet(g, ctx, it.width, it.height, it.depth, it.toeKick ?? 4, it);
    const where = it.wall ? {} : { notes: `${it.notes ? it.notes + ' ' : ''}Doors face ${trueDir(it.facing)}.` };
    tag(g, { id, type: type === 'fridge' ? 'Refrigerator' : 'Tall cabinet', code: it.code, wall: it.wall && trueDir(it.wall), materials: mats(it.materials, type === 'fridge' ? null : 'cabinets'), start: it.wall ? it.start : undefined, width: it.width, height: it.height, depth: it.depth, notes: it.notes, ...where });
    label(g, `${id} · ${fmtIn(it.width)}`, it.width / 2, it.height * 0.6, it.depth + 2);
    if (it.wall) occupied[it.wall].push([it.start, it.start + it.width]);
  }

  // ---------- plain panels (end panels, fillers): world-aligned boxes ----------
  for (const p of cfg.panels || []) {
    const m = addBox(root, M[p.material || 'cabinet'], p.x, p.bottom ?? 0, p.z, p.width, p.height, p.depth);
    tag(m, { id: p.id || 'Panel', type: 'Panel', code: p.code, width: p.width, depth: p.depth, height: p.height, materials: mats(p.materials, 'cabinets'), notes: p.notes });
  }

  // ---------- islands ----------
  const islands = {};
  for (const spec of cfg.islands || []) {
    const isl = { height: 34.5, toeKick: 4, counterThickness: 1.5, ...spec };
    const id = isl.id || nextId('ISLAND');
    const c = isl.counter;
    const g = new THREE.Group();
    root.add(g);
    islands[id] = c;

    for (const row of isl.rows || []) {
      const w = row.items.reduce((s, i) => s + i.width, 0);
      const rg = placeFootprint(row.x, row.z, w, row.depth, row.facing);
      g.add(rg);
      const run = { depth: row.depth, height: isl.height, toeKick: isl.toeKick };
      let x = 0;
      for (const it of row.items) {
        const ig = new THREE.Group();
        ig.position.x = x;
        rg.add(ig);
        const iid = it.id || nextId('B');
        F.baseCabinet(ig, ctx, it.width, run, it.fronts || 'door-drawer', { ...it, material: 'island' });
        tag(ig, { id: iid, type: 'Island cabinet', code: it.code, width: it.width, height: isl.height, depth: row.depth, fronts: it.fronts || 'door-drawer', materials: mats(it.materials, 'cabinets'), notes: `${it.notes ? it.notes + ' ' : ''}Faces ${trueDir(row.facing)}.` });
        label(ig, `${iid} · ${fmtIn(it.width)}`, it.width / 2, isl.height * 0.5, row.depth + 2);
        x += it.width;
      }
    }

    const top = slab([[c.x, c.z], [c.x + c.width, c.z], [c.x + c.width, c.z + c.depth], [c.x, c.z + c.depth]], isl.counterThickness, isl.height, M.counter);
    g.add(top);
    for (const p of isl.posts || []) {
      const s = p.size ?? 3;
      const post = addBox(g, M.island, p.x, 0, p.z, s, isl.height, s);
      tag(post, { id: p.id || 'Post', type: 'Support post', code: p.code, width: s, depth: s, height: isl.height, materials: p.materials });
    }
    tag(g, { id, type: 'Island', width: c.width, depth: c.depth, height: isl.height + isl.counterThickness, materials: mats(isl.counterMaterials, 'counter'), notes: `Counter's ${trueDir('north-west')} corner is ${fmtIn(c.x)} ${trueDir('east')} of the ${trueDir('west')} reference line and ${fmtIn(c.z)} from the ${trueDir('north')} wall.${isl.notes ? ' ' + isl.notes : ''}` });
    label(g, `${id} · ${fmtIn(c.width)} × ${fmtIn(c.depth)}`, c.x + c.width / 2, isl.height + isl.counterThickness + 3, c.z + c.depth / 2, 'island');

    const st = isl.stools;
    if (st?.count) {
      const along = st.side === 'north' || st.side === 'south';
      const len = along ? c.width : c.depth;
      for (let i = 0; i < st.count; i++) {
        const s = (len * (i + 0.5)) / st.count;
        const out = st.offset ?? 4;
        const sx = along ? c.x + s : st.side === 'east' ? c.x + c.width + out : c.x - out;
        const sz = along ? (st.side === 'south' ? c.z + c.depth + out : c.z - out) : c.z + s;
        F.stool(g, ctx, sx, sz, st.height ?? 25);
      }
    }
  }

  // ---------- lighting fixtures ----------
  const Lc = cfg.lighting || {};
  for (const p of Lc.pendants || []) {
    const c = islands[p.over];
    if (!c) continue;
    const n = p.count ?? 2;
    const alongX = c.width >= c.depth;
    const len = alongX ? c.width : c.depth;
    const span = p.spacing ? p.spacing * (n - 1) : len * 0.6;
    const pg = new THREE.Group();
    root.add(pg);
    for (let i = 0; i < n; i++) {
      const o = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1);
      const px = c.x + c.width / 2 + (alongX ? o : 0);
      const pz = c.z + c.depth / 2 + (alongX ? 0 : o) + (p.offset ?? 0);
      F.pendant(pg, ctx, px, p.bottom ?? 68, pz, H);
    }
    tag(pg, { id: 'Pendants', type: `${n} pendant lights`, bottom: p.bottom ?? 68, materials: p.materials, notes: `Spaced ${fmtIn(n > 1 ? span / (n - 1) : 0)} apart over ${p.over}.` });
  }
  for (const [cx, cz] of Lc.cans || []) F.recessedLight(ceiling, ctx, cx, cz, H);

  // ---------- baseboards ----------
  if (cfg.style?.baseboard !== false) {
    const bh = cfg.style?.baseboardHeight ?? 4.5;
    for (const w of walls) {
      const taken = occupied[w.name].map(([a, b]) => [a - w.lo, b - w.lo]);
      for (const [a, b] of freeIntervals(w.hi - w.lo, taken)) addBox(w.group, M.trim, a + w.lo, 0, 0, b - a, bh, 0.6, { cast: false });
    }
  }

  return { root, walls, ceiling, labels, bounds: { W, D, H, floor: floorBox } };
}
