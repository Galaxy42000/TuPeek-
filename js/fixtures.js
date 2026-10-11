import * as THREE from 'three';
import { addBox, addMesh } from './geometry.js';

// Every fixture is built in a local frame, in inches:
//   x runs left → right along the wall (as you face it), y is up from the floor,
//   z comes out of the wall toward the room. Cabinet fronts sit at z = depth.

const GAP = 0.125; // reveal between doors/drawers
const T = 0.75; // door / panel thickness

// ---------- hardware & fronts ----------

export function handle(parent, ctx, cx, cy, zf, orient, len) {
  const M = ctx.M;
  if (ctx.handle === 'knob' || len <= 0) {
    addMesh(parent, new THREE.SphereGeometry(0.6, 16, 12), M.hardware, cx, cy, zf + 1.0);
    addMesh(parent, new THREE.CylinderGeometry(0.22, 0.22, 1, 8).rotateX(Math.PI / 2), M.hardware, cx, cy, zf + 0.5);
    return;
  }
  const bar = 0.45, proj = 1.1;
  if (orient === 'h') {
    addBox(parent, M.hardware, cx - len / 2, cy - bar / 2, zf + proj - bar, len, bar, bar);
    for (const s of [-1, 1]) addBox(parent, M.hardware, cx + s * (len / 2 - 0.7) - 0.2, cy - 0.2, zf, 0.4, 0.4, proj - bar);
  } else {
    addBox(parent, M.hardware, cx - bar / 2, cy - len / 2, zf + proj - bar, bar, len, bar);
    for (const s of [-1, 1]) addBox(parent, M.hardware, cx - 0.2, cy + s * (len / 2 - 0.7) - 0.2, zf, 0.4, 0.4, proj - bar);
  }
}

// A single door or drawer front with its lower-left corner at (x, y) on plane z = zf.
export function frontPanel(parent, ctx, mat, x, y, zf, w, h, { glass = false } = {}) {
  const M = ctx.M;
  const shaker = ctx.style === 'shaker' || glass;
  if (shaker && w >= 6 && h >= 5) {
    const r = Math.min(2.25, w / 4, h / 4);
    addBox(parent, mat, x, y, zf, r, h, T);
    addBox(parent, mat, x + w - r, y, zf, r, h, T);
    addBox(parent, mat, x + r, y, zf, w - 2 * r, r, T);
    addBox(parent, mat, x + r, y + h - r, zf, w - 2 * r, r, T);
    if (glass) addBox(parent, M.glass, x + r, y + r, zf + 0.3, w - 2 * r, h - 2 * r, 0.15, { cast: false });
    else addBox(parent, mat, x + r, y + r, zf, w - 2 * r, h - 2 * r, T - 0.3);
  } else {
    addBox(parent, mat, x, y, zf, w, h, T);
  }
}

// Front layouts, top row first. abs = fixed height (in), flex = share of the remainder.
const LAYOUTS = {
  doors: [{ type: 'doors', flex: 1 }],
  glass: [{ type: 'glass', flex: 1 }],
  'door-drawer': [{ type: 'drawer', abs: 6 }, { type: 'doors', flex: 1 }],
  sink: [{ type: 'false', abs: 6 }, { type: 'doors', flex: 1 }],
  drawers2: [{ type: 'drawer', flex: 1 }, { type: 'drawer', flex: 1 }],
  drawers3: [{ type: 'drawer', abs: 6.5 }, { type: 'drawer', flex: 1 }, { type: 'drawer', flex: 1.25 }],
  drawers4: [{ type: 'drawer', flex: 1 }, { type: 'drawer', flex: 1 }, { type: 'drawer', flex: 1 }, { type: 'drawer', flex: 1 }],
  stacked: [{ type: 'doors', flex: 1 }, { type: 'doors', flex: 1.5 }],
};

export function fronts(parent, ctx, mat, w, yb, yt, zf, layoutName, item = {}, { upper = false, tall = false } = {}) {
  const rows = LAYOUTS[layoutName] || LAYOUTS.doors;
  const H = yt - yb - GAP * (rows.length + 1);
  const absSum = rows.reduce((s, r) => s + (r.abs || 0), 0);
  const flexSum = rows.reduce((s, r) => s + (r.flex || 0), 0);
  let top = yt - GAP;
  rows.forEach((row, i) => {
    const h = row.abs || ((H - absSum) * row.flex) / flexSum;
    const y = top - h;
    if (row.type === 'drawer' || row.type === 'false') {
      frontPanel(parent, ctx, mat, GAP, y, zf, w - 2 * GAP, h);
      if (row.type === 'drawer') {
        const len = Math.min(12, Math.max(4, (w - 2 * GAP) * 0.4));
        handle(parent, ctx, w / 2, h < 9 ? y + h / 2 : top - 3, zf + T, 'h', len);
      }
    } else {
      const n = item.doors || (w > 24 ? 2 : 1);
      const dw = (w - GAP * (n + 1)) / n;
      // where the handle goes vertically: low on uppers, high on bases
      const lowHandle = upper || (tall && i === 0 && rows.length > 1);
      const hy = lowHandle ? y + 3.5 : top - 3.5;
      for (let d = 0; d < n; d++) {
        const x = GAP + d * (dw + GAP);
        frontPanel(parent, ctx, mat, x, y, zf, dw, h, { glass: row.type === 'glass' });
        // single doors open on the side opposite the hinge; pairs open in the middle
        let openRight;
        if (n === 1) openRight = item.hinge !== 'right';
        else openRight = d % 2 === 0;
        const hx = openRight ? x + dw - 1.5 : x + 1.5;
        handle(parent, ctx, hx, hy, zf + T, 'v', tall && h > 40 ? 12 : 5);
      }
    }
    top = y - GAP;
  });
}

// ---------- cabinets ----------

export function baseCabinet(parent, ctx, w, run, layout, item) {
  const { depth, height, toeKick } = run;
  const mat = item.material === 'island' ? ctx.M.island : ctx.M.cabinet;
  addBox(parent, mat, 0, toeKick, 0, w, height - toeKick, depth);
  addBox(parent, ctx.M.toeKick, 0, 0, 0, w, toeKick, depth - 3);
  if (layout === 'open') {
    for (const y of [toeKick + 1, (height + toeKick) / 2]) addBox(parent, ctx.M.interior, 0.75, y, 0, w - 1.5, 0.75, depth + 0.01);
    return;
  }
  fronts(parent, ctx, mat, w, toeKick, height, depth, layout, item);
}

export function upperCabinet(parent, ctx, w, bottom, h, depth, layout, item) {
  const mat = ctx.M.cabinet;
  if (layout === 'open') {
    addBox(parent, mat, 0, bottom, 0, 0.75, h, depth);
    addBox(parent, mat, w - 0.75, bottom, 0, 0.75, h, depth);
    addBox(parent, mat, 0.75, bottom, 0, w - 1.5, 0.75, depth);
    addBox(parent, mat, 0.75, bottom + h - 0.75, 0, w - 1.5, 0.75, depth);
    addBox(parent, ctx.M.interior, 0.75, bottom, 0, w - 1.5, h, 0.5);
    const shelves = item.shelves ?? 2;
    for (let i = 1; i <= shelves; i++) addBox(parent, mat, 0.75, bottom + (h * i) / (shelves + 1), 0.5, w - 1.5, 0.75, depth - 0.5);
    return;
  }
  addBox(parent, mat, 0, bottom, 0, w, h, depth);
  fronts(parent, ctx, mat, w, bottom, bottom + h, depth, layout, item, { upper: true });
}

export function tallCabinet(parent, ctx, w, h, depth, toeKick, item) {
  const mat = ctx.M.cabinet;
  addBox(parent, mat, 0, toeKick, 0, w, h - toeKick, depth);
  addBox(parent, ctx.M.toeKick, 0, 0, 0, w, toeKick, depth - 3);
  fronts(parent, ctx, mat, w, toeKick, h, depth, item.fronts || 'stacked', item, { tall: true });
}

// ---------- appliances ----------

export function dishwasher(parent, ctx, w, run) {
  const M = ctx.M;
  const { depth, height, toeKick } = run;
  addBox(parent, M.black, 0.25, toeKick, 0, w - 0.5, height - toeKick - 0.25, depth - 0.2);
  addBox(parent, M.toeKick, 0, 0, 0, w, toeKick, depth - 3);
  addBox(parent, M.steel, GAP, toeKick + GAP, depth - 0.2, w - 2 * GAP, height - toeKick - 0.5, T);
  addBox(parent, M.black, GAP, height - 2.5, depth + T - 0.15, w - 2 * GAP, 0.05, 0.2, { cast: false });
  handle(parent, ctx, w / 2, height - 4, depth - 0.2 + T, 'h', w - 6);
}

export function range(parent, ctx, w, run) {
  const M = ctx.M;
  const top = run.height + run.counterThickness; // cooktop flush with counter
  const d = run.depth + 1; // slide-in ranges sit proud of the cabinets
  addBox(parent, M.steel, 0.2, 0, 0, w - 0.4, top - 0.4, d);
  addBox(parent, M.blackGlass, 0.2, top - 0.4, 0, w - 0.4, 0.4, d);
  // burners + continuous grates
  for (const bx of [0.27, 0.73]) {
    for (const bz of [0.3, 0.72]) {
      addMesh(parent, new THREE.CylinderGeometry(2.2, 2.4, 0.6, 24), M.black, w * bx, top + 0.3, d * bz);
      addMesh(parent, new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), M.steel, w * bx, top + 0.4, d * bz);
    }
  }
  const gy = top + 0.9, gh = 0.5;
  for (const gz of [d * 0.08, d * 0.5, d * 0.92]) addBox(parent, M.black, 0.8, gy, gz - 0.25, w - 1.6, gh, 0.5);
  for (const gx of [0.04, 0.5, 0.96]) addBox(parent, M.black, w * gx - 0.25, gy, d * 0.08, 0.5, gh, d * 0.84);
  // oven door with window, drawer, knobs
  addBox(parent, M.steel, 0.4, 7, d, w - 0.8, 22, 0.9);
  addBox(parent, M.blackGlass, 6, 12, d + 0.9, w - 12, 9, 0.05, { cast: false });
  handle(parent, ctx, w / 2, 27.5, d + 0.9, 'h', w - 5);
  addBox(parent, M.steel, 0.4, 0.8, d, w - 0.8, 5.6, 0.9);
  handle(parent, ctx, w / 2, 5, d + 0.9, 'h', w * 0.5);
  addBox(parent, M.black, 0.4, 29.6, d, w - 0.8, top - 30.4, 0.6);
  for (let i = 0; i < 5; i++) {
    const kx = w * (0.15 + i * 0.175);
    addMesh(parent, new THREE.CylinderGeometry(0.85, 0.85, 1.1, 20).rotateX(Math.PI / 2), M.steel, kx, (29.6 + top) / 2, d + 1.1);
  }
}

export function fridge(parent, ctx, w, h, d) {
  const M = ctx.M;
  const body = d - 2.5;
  addBox(parent, M.steel, 0, 0, 0, w, h, body);
  const split = h * 0.38;
  const dz = body;
  // French doors
  const dw = (w - 3 * 0.2) / 2;
  addBox(parent, M.steel, 0.2, split + 0.2, dz, dw, h - split - 0.4, 2.2);
  addBox(parent, M.steel, 0.4 + dw, split + 0.2, dz, dw, h - split - 0.4, 2.2);
  // freezer drawer
  addBox(parent, M.steel, 0.2, 3.5, dz, w - 0.4, split - 3.5, 2.2);
  addBox(parent, M.black, 1, 0, 0, w - 2, 3.5, body + 1);
  const hz = dz + 2.2;
  const hl = (h - split) * 0.55;
  handle(parent, ctx, w / 2 - 2, split + (h - split) / 2, hz, 'v', hl);
  handle(parent, ctx, w / 2 + 2, split + (h - split) / 2, hz, 'v', hl);
  handle(parent, ctx, w / 2, split - 3, hz, 'h', w * 0.6);
}

export function hood(parent, ctx, w, bottom, ceiling, depth = 20) {
  const M = ctx.M;
  const canopyH = 10, chimney = 12;
  addBox(parent, M.steel, 0, bottom, 0, w, 2.5, depth);
  const rb = w / Math.SQRT2, rt = chimney / Math.SQRT2;
  const geo = new THREE.CylinderGeometry(rt, rb, canopyH, 4, 1, false, Math.PI / 4).toNonIndexed();
  geo.computeVertexNormals();
  const canopy = addMesh(parent, geo, M.steel, w / 2, bottom + 2.5 + canopyH / 2, depth / 2);
  canopy.scale.z = depth / w;
  const cTop = bottom + 2.5 + canopyH;
  if (ceiling > cTop) addBox(parent, M.steel, (w - chimney) / 2, cTop, 0, chimney, ceiling - cTop, Math.max(8, (depth * chimney) / w));
}

// ---------- sink ----------

export function sinkBasin(parent, ctx, x, z, w, d, topY, bowl = 9) {
  const s = ctx.M.steel, th = 0.15, by = topY - bowl;
  const o = { cast: false };
  addBox(parent, s, x, by, z, w, th, d, o);
  addBox(parent, s, x, by, z, th, bowl, d, o);
  addBox(parent, s, x + w - th, by, z, th, bowl, d, o);
  addBox(parent, s, x, by, z, w, bowl, th, o);
  addBox(parent, s, x, by, z + d - th, w, bowl, th, o);
  addMesh(parent, new THREE.CylinderGeometry(1.4, 1.4, 0.1, 20), ctx.M.black, x + w / 2, by + th + 0.05, z + d / 2, o);
}

export function faucet(parent, ctx, x, z, counterTop) {
  const M = ctx.M;
  const R = 4.5, rise = 11;
  addMesh(parent, new THREE.CylinderGeometry(1.1, 1.2, 1.2, 20), M.steel, x, counterTop + 0.6, z);
  addMesh(parent, new THREE.CylinderGeometry(0.55, 0.55, rise, 16), M.steel, x, counterTop + rise / 2, z);
  const arc = addMesh(parent, new THREE.TorusGeometry(R, 0.55, 12, 32, Math.PI), M.steel, x, counterTop + rise, z + R);
  arc.rotation.y = Math.PI / 2;
  addMesh(parent, new THREE.CylinderGeometry(0.6, 0.55, 2.5, 16), M.steel, x, counterTop + rise - 1.25, z + 2 * R);
  addMesh(parent, new THREE.CylinderGeometry(0.3, 0.3, 3, 10).rotateZ(Math.PI / 2.4), M.steel, x + 1.8, counterTop + 4, z);
}

// ---------- furniture & lighting ----------

export function stool(parent, ctx, x, z, seat = 25) {
  const M = ctx.M;
  addMesh(parent, new THREE.CylinderGeometry(7, 6.6, 1.6, 32), M.stoolSeat, x, seat - 0.8, z);
  const legGeo = new THREE.CylinderGeometry(0.45, 0.45, seat - 1.6, 10);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    addMesh(parent, legGeo, M.stoolLeg, x + Math.cos(a) * 5, (seat - 1.6) / 2, z + Math.sin(a) * 5);
  }
  const ring = addMesh(parent, new THREE.TorusGeometry(5, 0.35, 8, 32), M.stoolLeg, x, 9, z);
  ring.rotation.x = Math.PI / 2;
}

export function pendant(parent, ctx, x, bottom, z, ceiling) {
  const M = ctx.M;
  const h = 7;
  addMesh(parent, new THREE.CylinderGeometry(2.2, 6, h, 32, 1, true), M.pendant, x, bottom + h / 2, z, { receive: false });
  addMesh(parent, new THREE.CylinderGeometry(0.12, 0.12, ceiling - bottom - h, 6), M.black, x, (ceiling + bottom + h) / 2, z, { cast: false });
  addMesh(parent, new THREE.CylinderGeometry(2.3, 2.3, 0.6, 20), M.pendant, x, bottom + h + 0.3, z);
  addMesh(parent, new THREE.SphereGeometry(1.6, 16, 12), M.bulb, x, bottom + 1.8, z, { cast: false });
  const light = new THREE.PointLight('#ffd9a8', 1.4, 0, 2);
  light.position.set(x, bottom + 1.5, z);
  parent.add(light);
}

export function recessedLight(parent, ctx, x, z, ceiling) {
  addMesh(parent, new THREE.CylinderGeometry(3.4, 3.4, 0.3, 24), ctx.M.trim, x, ceiling - 0.15, z, { cast: false });
  addMesh(parent, new THREE.CylinderGeometry(2.6, 2.6, 0.32, 24), ctx.M.canLens, x, ceiling - 0.17, z, { cast: false });
  const light = new THREE.PointLight('#fff1dc', 2.2, 0, 2);
  light.position.set(x, ceiling - 3, z);
  parent.add(light);
}

// ---------- wall openings (built in the wall's frame; wall occupies z ∈ [-t, 0]) ----------

export function opening(parent, ctx, o, t) {
  const M = ctx.M;
  const { start: x, width: w, bottom: y, height: h } = o;
  const jamb = o.type === 'opening' ? M.wall : M.trim;
  // jamb liners through the wall thickness
  addBox(parent, jamb, x, y + h - 0.75, -t, w, 0.75, t, { cast: false });
  addBox(parent, jamb, x, y, -t, 0.75, h, t, { cast: false });
  addBox(parent, jamb, x + w - 0.75, y, -t, 0.75, h, t, { cast: false });
  if (o.type === 'opening') return;

  const cw = 3.5; // casing width
  addBox(parent, M.trim, x - cw, y, 0, cw, h + cw, 0.75);
  addBox(parent, M.trim, x + w, y, 0, cw, h + cw, 0.75);
  addBox(parent, M.trim, x - cw - 0.5, y + h, 0, w + 2 * cw + 1, cw + 0.5, 0.9);

  if (o.type === 'window') {
    // stool (interior sill) + apron
    addBox(parent, M.trim, x - cw - 1, y - 0.75, -t + 0.5, w + 2 * cw + 2, 0.75, t + 1);
    addBox(parent, M.trim, x - cw, y - 3.75, 0, w + 2 * cw, 3, 0.75);
    // sash frame, glass and grid
    const fz = -t / 2 - 0.75, fw = 1.75;
    addBox(parent, M.trim, x + 0.75, y, fz, fw, h - 0.75, 1.5);
    addBox(parent, M.trim, x + w - 0.75 - fw, y, fz, fw, h - 0.75, 1.5);
    addBox(parent, M.trim, x + 0.75, y, fz, w - 1.5, fw, 1.5);
    addBox(parent, M.trim, x + 0.75, y + h - 0.75 - fw, fz, w - 1.5, fw, 1.5);
    const [cols, rows] = o.grid || [1, 1];
    for (let c = 1; c < cols; c++) addBox(parent, M.trim, x + (w * c) / cols - 0.6, y, fz + 0.2, 1.2, h - 0.75, 1.1);
    for (let r = 1; r < rows; r++) addBox(parent, M.trim, x + 0.75, y + (h * r) / rows - 0.6, fz + 0.2, w - 1.5, 1.2, 1.1);
    addBox(parent, M.glass, x + 0.75, y, -t / 2, w - 1.5, h - 0.75, 0.1, { cast: false });
  } else if (o.type === 'door' && o.slab) {
    // closed door slab, hinged on the left by default
    addBox(parent, M.trim, x + 0.75, y, -t / 2 - 0.875, w - 1.5, h - 0.875, 1.75);
    handle(parent, ctx, o.hinge === 'right' ? x + 3 : x + w - 3, 36, -t / 2 + 0.875, 'h', 0);
  }
}
