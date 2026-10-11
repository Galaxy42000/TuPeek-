import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { addBox, panelRects, freeIntervals } from './geometry.js';
import { createMaterials } from './materials.js';
import * as F from './fixtures.js';
import { fmtIn, fmtFtIn } from './units.js';

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

const FACING = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };

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

  // ---------- floor & ceiling ----------
  const floor = addBox(root, M.floor, -t, -1, -t, W + 2 * t, 1, D + 2 * t, { cast: false });
  tag(floor, { id: 'Floor', type: 'Floor', width: W, depth: D, notes: `Room is ${fmtFtIn(W)} (north/south walls) by ${fmtFtIn(D)} (east/west walls)` });

  const ceiling = new THREE.Group();
  addBox(ceiling, M.ceiling, -t, H, -t, W + 2 * t, 1, D + 2 * t, { cast: false });
  tag(ceiling, { id: 'Ceiling', type: 'Ceiling', height: H });
  root.add(ceiling);

  // ---------- walls, windows, doors ----------
  const openings = (cfg.openings || []).map((o) => ({
    bottom: 0,
    ...o,
    id: o.id || nextId(o.type === 'window' ? 'W' : 'D'),
  }));

  for (const name of WALL_NAMES) {
    const fr = frames[name];
    const g = wallGroup(name);
    // north/south walls run past the corners so the corners are closed
    const ext = name === 'north' || name === 'south' ? t : 0;
    const ops = openings.filter((o) => o.wall === name);
    for (const r of panelRects(fr.len + 2 * ext, H, ops.map((o) => ({ ...o, start: o.start + ext })))) {
      addBox(g, M.wall, r.x - ext, r.y, -t, r.w, r.h, t, { cast: false });
    }
    tag(g, { id: `${cap(name)} wall`, type: 'Wall', width: fr.len, height: H, notes: 'Length is the inside face, corner to corner.' });
    label(g, `${cap(name)} wall · ${fmtFtIn(fr.len)}`, fr.len / 2, H - 6, 1, 'wall');

    for (const o of ops) {
      const og = new THREE.Group();
      F.opening(og, ctx, o, t);
      g.add(og);
      const kind = { window: 'Window', door: 'Doorway', opening: 'Cased opening' }[o.type] || 'Opening';
      tag(og, { id: o.id, type: kind, wall: name, start: o.start, width: o.width, height: o.height, bottom: o.bottom || undefined });
      label(og, `${o.id} · ${fmtIn(o.width)}`, o.start + o.width / 2, o.bottom + o.height / 2, 1);
      if (o.bottom === 0) occupied[name].push([o.start, o.start + o.width]);
    }
    root.add(g);
    const center = fr.origin.clone().addScaledVector(fr.u, fr.len / 2).setY(H / 2);
    walls.push({ name, group: g, center, normal: fr.n.clone() });
  }

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
      else if (kind === 'gap') { /* empty space, e.g. for a trash can or seating knee space */ }
      else F.baseCabinet(ig, ctx, it.width, run, kind === 'sink' ? 'sink' : it.fronts || 'door-drawer', it);
      if (kind === 'sink') sinks.push({ x, w: it.width, it });

      const hasCounter = kind !== 'range' && it.counter !== false;
      if (hasCounter) {
        if (!seg) segs.push((seg = { a: x, b: x }));
        seg.b = x + it.width;
      } else seg = null;

      const typeName = { cabinet: 'Base cabinet', sink: 'Sink base', dishwasher: 'Dishwasher', range: 'Range', gap: 'Open space' }[kind];
      tag(ig, { id, type: typeName, wall: run.wall, start: run.start + x, width: it.width, height: kind === 'range' ? run.height + run.counterThickness : run.height, depth: run.depth, fronts: kind === 'cabinet' ? it.fronts || 'door-drawer' : undefined, notes: it.notes });
      label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, run.height * 0.5, run.depth + 2);
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
      tag(top, { id: `${run.id || 'Run'} countertop`, type: 'Countertop', wall: run.wall, start: run.start + a, width: b - a, depth: dz, height: run.counterThickness, notes: `Top of counter is ${fmtIn(counterTop)} from the floor.` });
      g.add(top);
    }

    if (run.backsplash > 0) {
      const a = -run.extendLeft, b = total + run.extendRight;
      const rel = openings
        .filter((o) => o.wall === run.wall)
        .map((o) => {
          const trim = o.type === 'opening' ? 0 : 3.5; // stop tile at the casing
          return { start: o.start - trim - run.start - a, width: o.width + 2 * trim, bottom: o.bottom - counterTop - (o.type === 'window' ? 3.75 : 0), height: o.height + 2 * trim + 3.75 };
        });
      const bs = new THREE.Group();
      for (const r of panelRects(b - a, run.backsplash, rel)) addBox(bs, M.backsplash, a + r.x, counterTop + r.y, 0, r.w, r.h, 0.375, { cast: false });
      tag(bs, { id: `${run.id || 'Run'} backsplash`, type: 'Backsplash', wall: run.wall, start: run.start + a, width: b - a, height: run.backsplash });
      g.add(bs);
    }
    occupied[run.wall].push([run.start - run.extendLeft, run.start + total + run.extendRight]);
  }

  // ---------- wall cabinet runs (uppers, hoods) ----------
  for (const spec of cfg.wallRuns || []) {
    const run = { depth: 12, height: 36, bottom: 54, ...spec };
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
        tag(ig, { id, type: 'Range hood', wall: run.wall, start: run.start + x, width: it.width, bottom: hb, depth: it.depth ?? 20 });
        label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, hb + 6, (it.depth ?? 20) + 1);
      } else if (kind !== 'gap') {
        const id = it.id || nextId('U');
        F.upperCabinet(ig, ctx, it.width, bottom, h, d, it.fronts || 'doors', it);
        tag(ig, { id, type: 'Wall cabinet', wall: run.wall, start: run.start + x, width: it.width, height: h, depth: d, bottom, fronts: it.fronts || 'doors', notes: it.notes });
        label(ig, `${id} · ${fmtIn(it.width)}`, it.width / 2, bottom + h / 2, d + 2);
      }
      x += it.width;
    }
  }

  // ---------- tall items (fridge, pantry) ----------
  for (const it of cfg.tall || []) {
    const g = wallGroup(it.wall, it.start);
    root.add(g);
    const type = it.type || 'pantry';
    const id = it.id || nextId(type === 'fridge' ? 'REF' : 'T');
    if (type === 'fridge') F.fridge(g, ctx, it.width, it.height, it.depth);
    else F.tallCabinet(g, ctx, it.width, it.height, it.depth, it.toeKick ?? 4, it);
    tag(g, { id, type: type === 'fridge' ? 'Refrigerator' : 'Tall cabinet', wall: it.wall, start: it.start, width: it.width, height: it.height, depth: it.depth, notes: it.notes });
    label(g, `${id} · ${fmtIn(it.width)}`, it.width / 2, it.height * 0.6, it.depth + 2);
    occupied[it.wall].push([it.start, it.start + it.width]);
  }

  // ---------- islands ----------
  const islandGroups = {};
  for (const spec of cfg.islands || []) {
    const isl = { height: 34.5, depth: 24, toeKick: 4, counterThickness: 1.5, facing: 'north', ...spec };
    const ov = { front: 1, back: 12, sides: 1, ...(spec.overhang || {}) };
    const id = isl.id || nextId('ISLAND');
    const w = isl.items.reduce((s, i) => s + i.width, 0);
    const g = new THREE.Group();
    g.position.set(isl.center.x, 0, isl.center.z);
    g.rotation.y = FACING[isl.facing] ?? 0;
    root.add(g);
    islandGroups[id] = { group: g, w, isl, ov };

    const cab = new THREE.Group();
    cab.position.set(-w / 2, 0, -isl.depth / 2);
    g.add(cab);
    let x = 0;
    for (const it of isl.items) {
      const ig = new THREE.Group();
      ig.position.x = x;
      cab.add(ig);
      const iid = it.id || nextId('B');
      F.baseCabinet(ig, ctx, it.width, isl, it.fronts || 'door-drawer', { ...it, material: 'island' });
      tag(ig, { id: iid, type: 'Island cabinet', start: x, width: it.width, height: isl.height, depth: isl.depth, fronts: it.fronts || 'door-drawer', notes: `Measured from the left end of island ${id}.` });
      label(ig, `${iid} · ${fmtIn(it.width)}`, it.width / 2, isl.height * 0.5, isl.depth + 2);
      x += it.width;
    }
    // finished back and ends
    addBox(g, M.island, -w / 2, 0, -isl.depth / 2 - 0.75, w, isl.height, 0.75);
    const shape = new THREE.Shape();
    const x0 = -w / 2 - ov.sides, x1 = w / 2 + ov.sides;
    const zf = isl.depth / 2 + ov.front, zb = -isl.depth / 2 - 0.75 - ov.back;
    shape.moveTo(x0, -zb);
    shape.lineTo(x1, -zb);
    shape.lineTo(x1, -zf);
    shape.lineTo(x0, -zf);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: isl.counterThickness, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(geo, M.counter);
    top.position.y = isl.height;
    top.castShadow = top.receiveShadow = true;
    g.add(top);
    tag(g, { id, type: 'Island', width: x1 - x0, depth: zf - zb, height: isl.height + isl.counterThickness, notes: `Center is ${fmtIn(isl.center.x)} from the west wall and ${fmtIn(isl.center.z)} from the north wall. Cabinet fronts face ${isl.facing}; seating overhang ${fmtIn(ov.back)}.` });
    label(g, `${id} · ${fmtIn(x1 - x0)} × ${fmtIn(zf - zb)}`, 0, isl.height + isl.counterThickness + 3, (zf + zb) / 2, 'island');

    const n = isl.stools ?? 0;
    for (let i = 0; i < n; i++) F.stool(g, ctx, -w / 2 + (w * (i + 0.5)) / n, zb + 8, isl.stoolHeight ?? 25);
  }

  // ---------- lighting fixtures ----------
  const L = cfg.lighting || {};
  for (const p of L.pendants || []) {
    const target = islandGroups[p.over];
    if (!target) continue;
    const { group, w, isl, ov } = target;
    const zc = ((isl.depth / 2 + ov.front) + (-isl.depth / 2 - 0.75 - ov.back)) / 2;
    const n = p.count ?? 2;
    const span = p.spacing ? p.spacing * (n - 1) : w * 0.66;
    const pg = new THREE.Group();
    pg.position.copy(group.position);
    pg.rotation.copy(group.rotation);
    root.add(pg);
    for (let i = 0; i < n; i++) {
      const px = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1);
      F.pendant(pg, ctx, px, p.bottom ?? 68, zc, H);
    }
    tag(pg, { id: 'Pendants', type: `${n} pendant lights`, bottom: p.bottom ?? 68, notes: `Spaced ${fmtIn(n > 1 ? span / (n - 1) : 0)} apart over ${p.over}.` });
  }
  const cans = L.cans || [];
  for (const [cx, cz] of cans) F.recessedLight(ceiling, ctx, cx, cz, H);

  // ---------- baseboards ----------
  if (cfg.style?.baseboard !== false) {
    const bh = cfg.style?.baseboardHeight ?? 4.5;
    for (const w of walls) {
      for (const [a, b] of freeIntervals(frames[w.name].len, occupied[w.name])) addBox(w.group, M.trim, a, 0, 0, b - a, bh, 0.6, { cast: false });
    }
  }

  return { root, walls, ceiling, labels, bounds: { W, D, H } };
}
