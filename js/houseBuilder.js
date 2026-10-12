import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { addBox, panelRects, freeIntervals, vaultHeight, vaultCeiling, vaultEnd } from './geometry.js';
import { createMaterials } from './materials.js';
import * as F from './fixtures.js';
import * as HF from './houseFixtures.js';
import { buildRoom, placeFootprint } from './roomBuilder.js';
import { buildDecks } from './deckBuilder.js';
import { sidingTexture, shingleTexture, stoneTexture } from './materials.js';
import { buildRoof } from './roofBuilder.js';
import { fmtIn, fmtFt, fmtFtIn } from './units.js';
import { trueDir, capDir } from './compass.js';

// Builds the whole building from a house config (see rooms/house.js): straight wall
// segments with doors and windows, floors, ceiling, room labels, plan dimensions and
// fixtures. Rooms modeled in detail (the kitchen) are built with buildRoom and dropped
// in without their own walls, floor and ceiling.
//
// With `focus` set to a room name, the same model is built but cut down to that one
// room: `clip` is the box (inches) the viewer clips everything to, and the cut-away
// walls are the ones around the room.

// A wall's local frame depends on which side its room ("inside") is on. Local x runs
// along the wall, local z = 0 is the inside face and the wall body is z ∈ [-t, 0].
const SIDES = {
  south: { rot: 0, origin: (w) => [w.x0, w.z1], along: 'x', flip: false, normal: [0, 1], leftEnd: 'west' },
  north: { rot: Math.PI, origin: (w) => [w.x1, w.z0], along: 'x', flip: true, normal: [0, -1], leftEnd: 'east' },
  west: { rot: -Math.PI / 2, origin: (w) => [w.x0, w.z0], along: 'z', flip: false, normal: [-1, 0], leftEnd: 'north' },
  east: { rot: Math.PI / 2, origin: (w) => [w.x1, w.z1], along: 'z', flip: true, normal: [1, 0], leftEnd: 'south' },
};
const insideFace = (w) => ({ south: w.z1, north: w.z0, west: w.x0, east: w.x1 })[w.inside];

const CORNER_ROT = { 'north-west': 0, 'north-east': -Math.PI / 2, 'south-east': Math.PI, 'south-west': Math.PI / 2 };

export function buildHouse(cfg, focus) {
  const H = cfg.height;
  const M = createMaterials(cfg.palette);
  const std = (color, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  Object.assign(M, {
    porcelain: std('#fbfbf8', 0.18),
    porcelainSeat: std('#f4f4f1', 0.3),
    porcelainShade: std('#e3e4e2', 0.25),
    appliance: std('#f3f3f1', 0.35),
    mirror: std('#dfe6ea', 0.04, 1),
    beam: std('#3a302b', 0.6, 0.5),
    door: std(cfg.palette.doors || cfg.palette.trim, 0.45),
    tileFloor: std(cfg.palette.tileFloor || '#c9c7c2', 0.5),
    ground: std(cfg.palette.ground || '#d3d8cf', 0.95),
    stone: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, map: stoneTexture(cfg.palette.stone || '#6e737c') }),
    stoneCap: std(cfg.palette.stoneCap || '#8d929a', 0.85),
    siding: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, map: sidingTexture(cfg.palette.siding || '#78838f') }),
    exteriorTrim: std(cfg.palette.exteriorTrim || '#f4f2ea', 0.5),
    windowFrame: std(cfg.palette.windowFrame || '#1f1d1c', 0.45),
    shingles: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide, map: shingleTexture(cfg.palette.shingles || '#45474b') }),
    roofUnder: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.9, side: THREE.DoubleSide }),
    soffit: std(cfg.palette.soffit || '#f2f0e8', 0.6),
    fascia: new THREE.MeshStandardMaterial({ color: cfg.palette.fascia || '#f4f2ea', roughness: 0.5, side: THREE.DoubleSide }),
    wood: std('#b48a5a', 0.8),
    dimension: new THREE.MeshBasicMaterial({ color: '#3d4b5c' }),
  });
  const colors = {};
  const ctx = {
    M, style: cfg.style?.doorStyle || 'shaker', handle: cfg.style?.handle || 'bar', room: { height: H },
    windowTrim: cfg.style?.windowTrim, windowSill: cfg.style?.windowSill,
    color: (c, metal) => (colors[c + metal] ??= std(c, metal ? 0.35 : 0.5, metal ? 0.7 : 0)),
  };

  const root = new THREE.Group();
  root.name = cfg.id;
  const walls = [];
  const wallGroups = new Map();
  const labels = [];
  const tag = (obj, info) => ((obj.userData.info = info), obj);
  // an element's own materials, else the config's default for that kind of surface
  const mats = (own, surface) => own ?? cfg.surfaces?.[surface];
  const label = (parent, html, x, y, z, cls = '') => {
    const el = document.createElement('div');
    el.className = `dim-label ${cls}`;
    el.innerHTML = html;
    const o = new CSS2DObject(el);
    o.position.set(x, y, z);
    parent.add(o);
    labels.push(o);
    return o;
  };

  const xs = cfg.footprint.flatMap((r) => [r[0], r[2]]), zs = cfg.footprint.flatMap((r) => [r[1], r[3]]);
  const bbox = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };

  // ---------- ground, floors, ceiling ----------
  const gm = 240;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(bbox.x1 - bbox.x0 + 2 * gm, bbox.z1 - bbox.z0 + 2 * gm).rotateX(-Math.PI / 2), M.ground);
  const grade = cfg.grade ?? 0; // ground level relative to the floor inside
  ground.position.set((bbox.x0 + bbox.x1) / 2, grade - 0.6, (bbox.z0 + bbox.z1) / 2);
  ground.receiveShadow = true;
  root.add(ground);

  const ceiling = new THREE.Group();
  root.add(ceiling);
  tag(ceiling, { id: 'Ceiling', type: 'Ceiling', height: H, materials: mats(undefined, 'ceiling'), notes: 'Ceiling height is an estimate until it is measured.' });
  const vaults = cfg.vaults || [];
  for (const [x0, z0, x1, z1] of cfg.footprint) {
    // subfloor sits a hair below the room floors so it only shows under walls and doorways
    tag(addBox(root, M.floor, x0, -1.05, z0, x1 - x0, 1, z1 - z0, { cast: false }), { id: 'Floor', type: 'Floor', materials: mats(undefined, 'floor') });
    // stone skirt from the ground up to the cap at floor level (1½″ proud of the wall)
    if (grade < -1.05) tag(addBox(root, M.stone, x0 - 1.5, grade - 0.6, z0 - 1.5, x1 - x0 + 3, -2.5 - grade + 0.6, z1 - z0 + 3), { id: 'Stone skirt', type: 'Stone veneer skirt', height: -grade, materials: mats(undefined, 'stone'), notes: `From the ground up to the floor, about ${fmtIn(-grade)}. ⚠ Height estimated from the photos.` });
    // flat ceiling everywhere except under the vaults
    let flat = [{ x: x0, y: z0, w: x1 - x0, h: z1 - z0 }];
    for (const v of [...vaults, ...(cfg.ceilings || [])]) flat = carve(flat, { x: v.x0, y: v.z0, w: v.x1 - v.x0, h: v.z1 - v.z0 });
    for (const r of flat) addBox(ceiling, M.ceiling, r.x, H, r.y, r.w, 1, r.h, { cast: false });
  }
  // rooms with a lower flat ceiling (the walls carry on up behind it)
  for (const c of cfg.ceilings || []) {
    tag(addBox(ceiling, M.ceiling, c.x0, c.height, c.z0, c.x1 - c.x0, 1, c.z1 - c.z0, { cast: false }), { id: c.id || 'Ceiling', type: 'Ceiling', height: c.height, materials: mats(c.materials, 'ceiling'), notes: c.notes });
  }

  // vaulted ceilings: rise from H at x0 and x1 to the peak over the middle (ridge along z)
  const ceilingAt = (x, z) => {
    const v = vaults.find((a) => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1);
    return v ? vaultHeight(v, H, x) : H;
  };
  for (const v of vaults) {
    const vg = new THREE.Group();
    ceiling.add(vg);
    vaultCeiling(vg, M.ceiling, v, H, v.z0, v.z1 - v.z0);
    // end walls above the plate (or above a beam), up to the sloped ceiling
    for (const e of v.ends || []) vg.add(vaultEnd(M.wall, v, H, e.base, e.z, e.t));
    tag(vg, { id: v.id, type: v.type || 'Vaulted ceiling', width: v.x1 - v.x0, height: v.peak, materials: mats(v.materials, 'ceiling'), notes: v.notes });
  }

  for (const r of cfg.rooms || []) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const f = addBox(root, r.floor === 'tile' ? M.tileFloor : M.floor, r.x0, r.floor === 'tile' ? -0.75 : -1, r.z0, w, 1, d, { cast: false });
    tag(f, { id: r.name, type: 'Room', width: w, depth: d, materials: mats(r.materials, r.floor === 'tile' ? 'tileFloor' : 'floor'), notes: `${fmtFt(w)} ${trueDir('east–west')} × ${fmtFt(d)} ${trueDir('north–south')}, wall to wall.${r.notes ? ' ' + r.notes : ''}` });
    if (r.label !== false) label(root, `<b>${r.name}</b><br>${fmtFt(w)} × ${fmtFt(d)}`, (r.x0 + r.x1) / 2, 2, (r.z0 + r.z1) / 2, 'room');
  }

  // ---------- rooms built in detail (kitchen) ----------
  const imported = [];
  for (const inc of cfg.include || []) {
    const rc = inc.config;
    const sub = buildRoom(rc, { ceilingAt: (x, z) => ceilingAt(inc.x + x, inc.z + z) });
    for (const w of sub.walls) w.group.removeFromParent();
    sub.root.getObjectByName('floor')?.removeFromParent();
    sub.ceiling.getObjectByName('ceiling')?.removeFromParent();
    sub.root.position.set(inc.x, 0, inc.z);
    root.add(sub.root);
    // keep the room's ceiling lights, hung from the house ceiling
    sub.ceiling.removeFromParent();
    sub.ceiling.position.set(inc.x, 0, inc.z);
    ceiling.add(sub.ceiling);
    if (inc.labels === false) sub.labels.forEach((l) => l.removeFromParent());
    else labels.push(...sub.labels);

    // the room's windows/doors move onto the house wall they sit in
    const { width: W, depth: D } = rc.room;
    for (const o of rc.openings || []) {
      const s = {
        north: { inside: 'south', face: inc.z, a: inc.x + o.start },
        east: { inside: 'west', face: inc.x + W, a: inc.z + o.start },
        south: { inside: 'north', face: inc.z + D, a: inc.x + W - o.start - o.width },
        west: { inside: 'east', face: inc.x, a: inc.z + D - o.start - o.width },
      }[o.wall];
      imported.push({ ...o, ...s, from: rc.name });
    }
  }

  // ---------- roof (only drawn when there is one; walls run up to it) ----------
  const roof = cfg.roof ? buildRoof(cfg, M) : null;
  if (roof) {
    root.add(roof.group);
    tag(roof.group, { id: 'Roof', type: 'Roof', materials: mats(cfg.roof.materials, 'roof'), notes: cfg.roof.notes });
  }

  // ---------- walls, doors, windows ----------
  for (const spec of cfg.walls) {
    const fr = SIDES[spec.inside];
    const L = fr.along === 'x' ? spec.x1 - spec.x0 : spec.z1 - spec.z0;
    const t = fr.along === 'x' ? spec.z1 - spec.z0 : spec.x1 - spec.x0;
    const min = fr.along === 'x' ? spec.x0 : spec.z0;
    const g = new THREE.Group();
    const [ox, oz] = fr.origin(spec);
    g.position.set(ox, 0, oz);
    g.rotation.y = fr.rot;
    root.add(g);
    wallGroups.set(spec, g);

    const own = (spec.openings || []).map((o) => ({ ...o }));
    for (const o of imported) {
      if (o.inside === spec.inside && Math.abs(o.face - insideFace(spec)) < 0.5 && o.a >= min - 0.01 && o.a + o.width <= min + L + 0.01) {
        own.push({ ...o, at: o.a - min, notes: o.notes });
        o.used = true;
      }
    }
    const ops = own.map((o) => ({
      bottom: 0,
      height: o.type === 'window' ? 48 : 80,
      ...o,
      start: fr.flip ? L - o.at - o.width : o.at,
      hingeSide: o.hinge === fr.leftEnd ? 'left' : 'right',
    }));

    // steel beams running inside this wall are left exposed: cut the wall away around them
    let rects = panelRects(L, H, ops);
    for (const b of cfg.beams || []) {
      const [bx0, bz0] = b.from, [bx1, bz1] = b.to;
      const [p0, p1, q0, q1] = fr.along === 'x' ? [bx0, bx1, bz0, bz1] : [bz0, bz1, bx0, bx1];
      const [w0, w1] = fr.along === 'x' ? [spec.z0, spec.z1] : [spec.x0, spec.x1];
      if (Math.abs(q1 - q0) > 0.01 || q0 <= w0 || q0 >= w1) continue; // not running along inside this wall
      const a = Math.max(Math.min(p0, p1), min), e = Math.min(Math.max(p0, p1), min + L);
      if (e <= a) continue;
      const at = a - min, w = e - a;
      rects = carve(rects, { x: fr.flip ? L - at - w : at, w, y: b.bottom ?? H - b.depth, h: b.depth });
    }
    for (const r of rects) addBox(g, M.wall, r.x, r.y, -t, r.w, r.h, t, { cast: false });
    if (spec.exterior && roof) {
      // siding on the outside face, up to the roof; the stone cap runs along the bottom
      const skin = new THREE.Group();
      for (const r of panelRects(L, H, ops)) sidingBox(skin, M.siding, r.x, r.y, -t - 0.6, r.w, r.h, 0.6);
      const toWorld = (lx, lz) => [ox + lx * Math.cos(fr.rot) + lz * Math.sin(fr.rot), oz - lx * Math.sin(fr.rot) + lz * Math.cos(fr.rot)];
      const prof = [];
      for (let lx = 0; lx <= L; lx = Math.min(L, lx + 3) + (lx === L ? 1 : 0)) prof.push([lx, roof.heightAt(...toWorld(lx, -t - 0.6))]);
      if (Math.max(...prof.map((q) => q[1])) > H + 0.5) {
        const sh = new THREE.Shape([new THREE.Vector2(0, H), new THREE.Vector2(L, H), ...prof.reverse().map(([x, y]) => new THREE.Vector2(x, Math.max(H, y)))]);
        const band = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }), M.siding);
        band.position.z = -t - 0.6;
        band.castShadow = band.receiveShadow = true;
        skin.add(band);
      }
      tag(skin, { id: `${spec.id} (outside)`, type: 'Siding', materials: mats(spec.outsideMaterials, 'siding') });
      g.add(skin);
      const cap = addBox(g, M.stoneCap, -3, -2.5, -t - 3, L + 6, 2.5, 3.2);
      tag(cap, { id: 'Stone cap', type: 'Stone skirt cap', materials: mats(undefined, 'stone') });
    }
    const endA = fr.along === 'x' ? 'west' : 'north';
    tag(g, { id: spec.id, type: spec.exterior ? 'Exterior wall' : 'Interior wall', width: L, height: H, depth: t, materials: mats(spec.materials, 'walls'), notes: spec.notes });

    for (const o of ops) {
      const og = new THREE.Group();
      g.add(og);
      F.opening(og, ctx, o, t);
      if (!spec.exterior && o.type !== 'opening' && o.casing !== false) backCasing(og, M, o, t);
      if (o.type === 'door') doorLeaf(og, ctx, o, t);
      if (spec.exterior && roof && o.type !== 'opening') exteriorTrim(og, M, o, t);
      const kind = o.type === 'window' ? 'Window' : o.type === 'opening' ? 'Cased opening' : { swing: 'Hinged door', pocket: 'Pocket door', bypass: 'Bypass (sliding) doors', slider: 'Sliding glass door' }[o.door] || 'Doorway';
      tag(og, {
        id: o.id, type: kind, wall: spec.id, width: o.width, height: o.height, bottom: o.bottom || undefined,
        materials: mats(o.materials, { window: 'windows', door: 'doors' }[o.type]),
        notes: `Starts ${fmtIn(o.at)} from the ${trueDir(endA)} end of the wall.${o.from ? ` (From the ${o.from} plan.)` : ''}${o.notes ? ' ' + o.notes : ''}`,
      });
      label(og, `${o.id} · ${fmtIn(o.width)}`, o.start + o.width / 2, o.bottom + o.height / 2, 1);
    }

    // baseboards on finished faces, broken at doorways
    if (cfg.style?.baseboard !== false) {
      const doors = ops.filter((o) => o.bottom === 0).map((o) => [o.start, o.start + o.width]);
      for (const [a, b] of freeIntervals(L, doors)) {
        addBox(g, M.trim, a, 0, 0, b - a, 4.5, 0.6, { cast: false });
        if (!spec.exterior) addBox(g, M.trim, a, 0, -t - 0.6, b - a, 4.5, 0.6, { cast: false });
      }
    }

    if (spec.exterior) {
      const [nx, nz] = fr.normal;
      const center = new THREE.Vector3((spec.x0 + spec.x1) / 2, H / 2, (spec.z0 + spec.z1) / 2);
      center.x += (nx * t) / 2;
      center.z += (nz * t) / 2;
      walls.push({ name: spec.id, group: g, center, normal: new THREE.Vector3(nx, 0, nz) });
    }
  }
  for (const o of imported) if (!o.used) console.warn(`No house wall found for ${o.from} opening ${o.id}`);

  // white corner boards on the outside corners; each is cut away like a wall
  if (roof) {
    for (const [cx, cz, sx, sz] of cfg.roof.corners || []) {
      const cg = new THREE.Group();
      const top = roof.heightAt(cx + sx, cz + sz), w = 6.5;
      addBox(cg, M.exteriorTrim, sx > 0 ? cx - w : cx - 1.4, 0, sz > 0 ? cz - w : cz - 1.4, w + 1.4, top, w + 1.4);
      root.add(cg);
      walls.push({ name: 'corner', group: cg, center: new THREE.Vector3(cx, H / 2, cz), normal: new THREE.Vector3(-sx, 0, -sz).normalize() });
    }
    // entry porch floor and step
    const pr = cfg.roof.porch;
    if (pr?.floor) {
      const pf = new THREE.Group();
      const [f0, f1] = pr.floorZ || [pr.z0, pr.z1];
      addBox(pf, M.wood, pr.wall - pr.depth, pr.floor - 1.5, f0, pr.depth, 1.5, f1 - f0);
      addBox(pf, M.wood, pr.wall - pr.depth, pr.floor - 7.25, f0, 1.5, 5.75, f1 - f0);
      addBox(pf, M.wood, pr.wall - pr.depth - 12, pr.floor - 8.75, f0 + 12, 12, 1.5, 36);
      tag(pf, { id: 'Entry porch', type: 'Porch', width: f1 - f0, depth: pr.depth, notes: pr.notes });
      root.add(pf);
    }
  }

  // ---------- fixtures ----------
  for (const it of cfg.fixtures || []) {
    let g;
    if (it.kind === 'cornerShower') {
      g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      g.rotation.y = CORNER_ROT[it.corner] ?? 0;
      HF.cornerShower(g, ctx, it.size, it);
    } else if (it.kind === 'box') {
      // world-aligned: width runs east–west, depth north–south
      g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      HF.box(g, ctx, it.width, it.height, it.depth, it.bottom ?? 0, it);
    } else {
      g = placeFootprint(it.x, it.z, it.width, it.depth, it.facing || 'south');
      if (it.kind === 'toilet') HF.toilet(g, ctx, it.width, it.depth);
      else if (it.kind === 'vanity') HF.vanity(g, ctx, it.width, it.depth, it);
      else if (it.kind === 'laundry') HF.laundry(g, ctx, it.width, it.depth, it.height);
      else if (it.kind === 'cabinet') F.tallCabinet(g, ctx, it.width, it.height, it.depth, 4, { fronts: 'doors', ...it });
    }
    root.add(g);
    const size = it.kind === 'cornerShower' ? { width: it.size, depth: it.size } : { width: it.width, depth: it.depth, height: it.height };
    tag(g, { id: it.id, type: it.type, code: it.code, ...size, bottom: it.bottom || undefined, materials: it.materials, notes: it.notes });
    if (it.label !== false) {
      g.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
      label(root, it.id, c.x, it.kind === 'cornerShower' ? 40 : (it.bottom ?? 0) + (it.height ?? 30) + 3, c.z);
    }
  }

  // ---------- structural steel ----------
  for (const b of cfg.beams || []) {
    const [x0, z0] = b.from, [x1, z1] = b.to;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    const bottom = b.bottom ?? H - b.depth; // default: top at the ceiling
    g.position.set(x0, bottom, z0);
    g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    HF.steelBeam(g, ctx, len, b.depth, b.flange);
    root.add(g);
    tag(g, { id: b.id, type: b.type || 'Steel beam', length: len, width: b.flange, height: b.depth, bottom, materials: mats(b.materials, 'steel'), notes: b.notes });
    label(g, `${b.id} · ${fmtIn(b.flange)} × ${fmtIn(b.depth)}`, len / 2, -3, 0);
  }

  // ---------- plan dimensions (drawn on the ground) ----------
  for (const dm of cfg.dimensions || []) {
    const [x0, z0] = dm.from, [x1, z1] = dm.to;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    g.position.set(x0, grade, z0);
    g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    root.add(g);
    addBox(g, M.dimension, 0, -0.4, -0.4, len, 0.3, 0.8, { cast: false, receive: false });
    for (const e of [0, len]) {
      const tick = addBox(g, M.dimension, -0.4, -0.4, -6, 0.8, 0.3, 12, { cast: false, receive: false });
      tick.position.x = e;
      tick.rotation.y = Math.PI / 4;
    }
    tag(g, { id: dm.text, type: 'Plan dimension', width: len, notes: dm.notes });
    label(g, dm.text, len / 2, 1, 0, `dimension${dm.estimate ? ' estimate' : ''}`);
  }

  // ---------- decks (framing is a separate line drawing the viewer can toggle) ----------
  const framing = buildDecks(root, ctx, cfg.decks, tag, label, grade);

  if (focus) {
    if (roof) roof.group.visible = false; // single-room views have no roof
    return focusRoom(cfg, focus, { root, ceiling, labels, wallGroups, label, H });
  }
  const roofInfo = roof && { group: roof.group, top: roof.top + 6, footprint: cfg.footprint };
  return { root, walls, ceiling, labels, framing, roof: roofInfo, views: cfg.views, bounds: { W: bbox.x1 - bbox.x0, D: bbox.z1 - bbox.z0, H, floor: bbox } };
}

// Cut the model down to one room (plus any rooms listed in its `with`): the clip box reaches through the walls around it
// (but not past them), and those walls become the ones that cut away.
function focusRoom(cfg, name, { root, ceiling, labels, wallGroups, label, H }) {
  const find = (n) => {
    const rm = cfg.rooms.find((x) => x.name === n);
    if (!rm) throw new Error(`No room named "${n}" in the house plan`);
    return rm;
  };
  // a room open to another (no wall between them) can show both: with: ['Other room']
  const own = find(name), all = [own, ...(own.with || []).map(find)];
  const r = { x0: Math.min(...all.map((a) => a.x0)), x1: Math.max(...all.map((a) => a.x1)), z0: Math.min(...all.map((a) => a.z0)), z1: Math.max(...all.map((a) => a.z1)), views: own.views };
  const overlaps = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 1;
  const sides = {
    north: { inward: [0, 1], edge: [r.x0, r.z0, r.x1, r.z0], find: (w) => Math.abs(w.z1 - r.z0) < 0.5 && overlaps(w.x0, w.x1, r.x0, r.x1), t: (w) => w.z1 - w.z0 },
    south: { inward: [0, -1], edge: [r.x0, r.z1, r.x1, r.z1], find: (w) => Math.abs(w.z0 - r.z1) < 0.5 && overlaps(w.x0, w.x1, r.x0, r.x1), t: (w) => w.z1 - w.z0 },
    west: { inward: [1, 0], edge: [r.x0, r.z0, r.x0, r.z1], find: (w) => Math.abs(w.x1 - r.x0) < 0.5 && overlaps(w.z0, w.z1, r.z0, r.z1), t: (w) => w.x1 - w.x0 },
    east: { inward: [-1, 0], edge: [r.x1, r.z0, r.x1, r.z1], find: (w) => Math.abs(w.x0 - r.x1) < 0.5 && overlaps(w.z0, w.z1, r.z0, r.z1), t: (w) => w.x1 - w.x0 },
  };
  const margin = {};
  const walls = [];
  for (const [side, s] of Object.entries(sides)) {
    const found = cfg.walls.filter(s.find);
    // stop just inside the wall's far face so nothing from the next room shows; open sides are cut at the room edge
    margin[side] = found.length ? Math.max(...found.map(s.t)) - 0.05 : 0;
    const [x0, z0, x1, z1] = s.edge;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const center = new THREE.Vector3((x0 + x1) / 2, H / 2, (z0 + z1) / 2);
    for (const w of found) walls.push({ name: w.id, group: wallGroups.get(w), center, normal: new THREE.Vector3(s.inward[0], 0, s.inward[1]) });
    if (found.length) label(root, `${capDir(side)} wall · ${fmtFtIn(len)}`, center.x + s.inward[0] * 2, H - 6, center.z + s.inward[1] * 2, 'wall');
    else label(root, `Open to ${trueDir(side)} · ${fmtFtIn(len)}`, center.x, 2, center.z, 'wall');
  }
  const clip = { x0: r.x0 - margin.west, x1: r.x1 + margin.east, z0: r.z0 - margin.north, z1: r.z1 + margin.south };
  // the house's camera presets are for the whole building; by default a room's eye
  // view looks from its south-west corner to the far corner, and a room can set its own
  return { root, walls, ceiling, labels, clip, views: { eye: { pos: [r.x0 + 10, 64, r.z1 - 10], target: [r.x1, 44, r.z0] }, ...r.views }, bounds: { W: r.x1 - r.x0, D: r.z1 - r.z0, H, floor: clip } };
}

// Remove rectangle c from a list of rectangles {x, y, w, h} (wall x/y, or plan x/z).
function carve(rects, c) {
  const out = [];
  for (const r of rects) {
    const x0 = Math.max(r.x, c.x), x1 = Math.min(r.x + r.w, c.x + c.w);
    const y0 = Math.max(r.y, c.y), y1 = Math.min(r.y + r.h, c.y + c.h);
    if (x1 <= x0 || y1 <= y0) { out.push(r); continue; }
    if (x0 > r.x) out.push({ x: r.x, y: r.y, w: x0 - r.x, h: r.h });
    if (x1 < r.x + r.w) out.push({ x: x1, y: r.y, w: r.x + r.w - x1, h: r.h });
    if (y0 > r.y) out.push({ x: x0, y: r.y, w: x1 - x0, h: y0 - r.y });
    if (y1 < r.y + r.h) out.push({ x: x0, y: y1, w: x1 - x0, h: r.y + r.h - y1 });
  }
  return out;
}

// Box whose UVs follow the wall (u = x, v = y), so siding battens line up across boxes.
function sidingBox(parent, mat, x, y, z, w, h, d) {
  const m = addBox(parent, mat, x, y, z, w, h, d, { cast: false });
  const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) + x + w / 2, pos.getY(i) + y + h / 2);
  return m;
}

// Outside of a window or door in an exterior wall: white casing on the siding, and the
// window's dark exterior frame.
function exteriorTrim(parent, M, o, t) {
  const cw = 3.5, z = -t - 0.6 - 0.75, { start: x, width: w, bottom: y, height: h } = o;
  const T = M.exteriorTrim;
  addBox(parent, T, x - cw, y, z, cw, h + cw, 0.75);
  addBox(parent, T, x + w, y, z, cw, h + cw, 0.75);
  addBox(parent, T, x - cw, y + h, z, w + 2 * cw, cw, 0.75);
  if (o.type === 'window') {
    addBox(parent, T, x - cw - 0.5, y - cw, z - 0.5, w + 2 * cw + 1, cw, 1.25); // sill
    const fz = -t / 2 - 1.6, fw = 1.75, Fm = M.windowFrame;
    addBox(parent, Fm, x, y, fz, fw, h, 0.8);
    addBox(parent, Fm, x + w - fw, y, fz, fw, h, 0.8);
    addBox(parent, Fm, x, y, fz, w, fw, 0.8);
    addBox(parent, Fm, x, y + h - fw, fz, w, fw, 0.8);
    const [cols, rows] = o.grid || [1, 1];
    for (let c = 1; c < cols; c++) addBox(parent, Fm, x + (w * c) / cols - 1, y, fz, 2, h, 0.8);
    for (let r = 1; r < rows; r++) addBox(parent, Fm, x, y + (h * r) / rows - 1, fz, w, 2, 0.8);
  }
}

// Casing on the second face of an interior wall (fixtures.opening trims the inside face).
function backCasing(parent, M, o, t) {
  const cw = 3.5, { start: x, width: w, bottom: y, height: h } = o;
  addBox(parent, M.trim, x - cw, y, -t - 0.75, cw, h + cw, 0.75);
  addBox(parent, M.trim, x + w, y, -t - 0.75, cw, h + cw, 0.75);
  addBox(parent, M.trim, x - cw - 0.5, y + h, -t - 0.9, w + 2 * cw + 1, cw + 0.5, 0.9);
}

function doorLeaf(parent, ctx, o, t) {
  const M = ctx.M, x = o.start, w = o.width;
  const lw = w - 1.5, lh = o.height - 0.875, th = 1.75;
  const knob = (p, kx, kz) => {
    const k = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), M.hardware);
    k.position.set(kx, 36, kz);
    p.add(k);
  };
  if (o.door === 'swing') {
    const right = o.hingeSide === 'right', out = o.swing === 'out';
    const pivot = new THREE.Group();
    pivot.position.set(right ? x + w - 0.75 : x + 0.75, 0, out ? -t : 0);
    const ang = THREE.MathUtils.degToRad(o.open ?? 80);
    pivot.rotation.y = (right ? 1 : -1) * (out ? -1 : 1) * ang;
    const zf = out ? 0 : -th;
    addBox(pivot, M.door, right ? -lw : 0, 0, zf, lw, lh, th);
    const kx = right ? -lw + 2.75 : lw - 2.75;
    knob(pivot, kx, zf - 1);
    knob(pivot, kx, zf + th + 1);
    parent.add(pivot);
  } else if (o.door === 'bypass') {
    const pw = lw / 2 + 1;
    addBox(parent, M.door, x + 0.75, 0, -t / 2 - 1.5, pw, lh, 1.25);
    addBox(parent, M.door, x + w - 0.75 - pw, 0, -t / 2 + 0.25, pw, lh, 1.25);
  } else if (o.door === 'slider') {
    // sliding patio door: two glass panels in white frames, one fixed and one sliding
    const pw = (w - 1.5) / 2 + 1, fh = o.height - 0.75;
    for (const [px, pz] of [[x + 0.75, -t / 2 - 1.75], [x + w - 0.75 - pw, -t / 2 + 0.25]]) {
      addBox(parent, M.trim, px, 0, pz, 2.75, fh, 1.5);
      addBox(parent, M.trim, px + pw - 2.75, 0, pz, 2.75, fh, 1.5);
      addBox(parent, M.trim, px + 2.75, 0, pz, pw - 5.5, 3.5, 1.5);
      addBox(parent, M.trim, px + 2.75, fh - 2.75, pz, pw - 5.5, 2.75, 1.5);
      addBox(parent, M.glass, px + 2.75, 3.5, pz + 0.7, pw - 5.5, fh - 6.25, 0.1, { cast: false });
    }
  }
  // pocket doors are shown open (slid into the wall)
}
