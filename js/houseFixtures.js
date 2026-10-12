import * as THREE from 'three';
import { addBox, addMesh, panelRects } from './geometry.js';
import { slab } from './roomBuilder.js';
import * as F from './fixtures.js';

// Bath, laundry and mechanical fixtures for the whole-house view.
// Same conventions as fixtures.js: inches, back of the fixture at z = 0, front facing +z.

// Elliptical cylinder (rx across, rz deep) centered at x, y, z; rBottom tapers the bottom.
const ellipse = (rx, rz, h, mat, x, y, z, rBottom = 1) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rx, rx * rBottom, h, 32), mat);
  m.scale.z = rz / rx;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};

export function toilet(parent, ctx, w = 19, d = 28) {
  const P = ctx.M.porcelain, cx = w / 2;
  addBox(parent, P, cx - 9.5, 15, 0.5, 19, 14.5, 7.5); // tank
  addBox(parent, P, cx - 10, 29.5, 0.25, 20, 1, 8); // lid
  addBox(parent, P, cx - 4, 0, 4, 8, 15, 8); // neck under the tank
  parent.add(ellipse(7.5, 9.5, 15, P, cx, 7.5, d - 9.75, 0.72)); // bowl
  parent.add(ellipse(7.6, 9.6, 0.9, ctx.M.porcelainSeat, cx, 15.45, d - 9.75)); // seat
}

export function vanity(parent, ctx, w, d, item = {}) {
  const M = ctx.M;
  const h = item.height ?? 31; // cabinet box; top adds 1½″
  F.baseCabinet(parent, ctx, w, { depth: d - 1, height: h, toeKick: 4 }, 'doors', { doors: w >= 24 ? 2 : 1, ...item });
  addBox(parent, M.counter, 0, h, 0, w, 1.5, d);
  const top = h + 1.5;
  parent.add(ellipse(Math.min(8, w / 2 - 3), Math.min(6, d / 2 - 4), 0.2, M.porcelain, w / 2, top + 0.1, d / 2 + 1));
  parent.add(ellipse(Math.min(7, w / 2 - 4), Math.min(5, d / 2 - 5), 0.22, M.porcelainShade, w / 2, top + 0.12, d / 2 + 1));
  const tap = new THREE.Group();
  tap.scale.setScalar(0.6);
  tap.position.set(w / 2, top, 1.5);
  F.faucet(tap, ctx, 0, 0, 0);
  parent.add(tap);
  if (item.mirror === 'led') {
    // LED-backlit mirror: lit bars set into the glass near its edges
    const mw = item.mirrorWidth ?? 24, mh = item.mirrorHeight ?? 32, mx = (w - mw) / 2, my = item.mirrorBottom ?? top + 9;
    addBox(parent, M.black, mx, my, 0, mw, mh, 0.6);
    addBox(parent, M.mirror, mx + 0.3, my + 0.3, 0.6, mw - 0.6, mh - 0.6, 0.1);
    const bar = (x, y, bw, bh) => addBox(parent, M.ledStrip, mx + x, my + y, 0.72, bw, bh, 0.05, { cast: false });
    for (const y of [2.5, mh - 3.2]) { bar(2.5, y, mw / 2 - 4, 0.7); bar(mw / 2 + 1.5, y, mw / 2 - 4, 0.7); }
    for (const x of [2.5, mw - 3.2]) { bar(x, 2.5, 0.7, mh / 2 - 4); bar(x, mh / 2 + 1.5, 0.7, mh / 2 - 4); }
  } else if (item.mirror !== false) addBox(parent, M.mirror, 1, top + 7, 0, w - 2, 30, 0.5);
}

// Neo-angle shower in a corner: local x runs along one wall, z along the other.
// Frameless glass (two returns and a hinged door on the angled front, handle on its
// local-x end), an acrylic base, and optionally a tile surround up to `tile` inches
// with recessed niches: niches = [{ wall: 'x' | 'z', at, bottom, width, height }].
export function cornerShower(parent, ctx, a, { returnLen = 12, height = 72, tile = 0, niches = [] } = {}) {
  const M = ctx.M, r = returnLen, base = 4;
  parent.add(slab([[0, 0], [a, 0], [a, r], [r, a], [0, a]], base, 0, M.porcelain));
  const panel = (x0, z0, x1, z1, door) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const p = new THREE.Group();
    p.position.set(x0, base, z0);
    p.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    parent.add(p);
    addBox(p, M.glass, 0.25, 0, -0.19, len - 0.5, height, 0.375, { cast: false });
    for (const y of [0, height - 1.5]) addBox(p, M.steel, -0.4, y, -0.6, 0.6, 1.5, 1.2); // clips at the ends
    if (door) {
      for (const y of [6, height - 10]) addBox(p, M.steel, 0.2, y, -0.7, 2.6, 4, 1.4); // hinges
      addBox(p, M.steel, len - 3, 24, 1, 0.75, 22, 0.75); // pull bar, both sides
      addBox(p, M.steel, len - 3, 24, -1.75, 0.75, 22, 0.75);
    }
  };
  panel(r, a, 0, a);
  panel(a, r, r, a, true);
  panel(a, 0, a, r);
  if (tile > 0) {
    // tile on both walls, a little wider than the base; niches are recessed into the wall
    const w = a + 2, h = tile - base;
    for (const wall of ['x', 'z']) {
      const g = new THREE.Group();
      if (wall === 'z') { g.rotation.y = -Math.PI / 2; g.scale.z = -1; } // run along local z, facing +x
      parent.add(g);
      const ns = niches.filter((n) => n.wall === wall).map((n) => ({ start: n.at, width: n.width, bottom: n.bottom - base, height: n.height }));
      for (const q of panelRects(w, h, ns)) addBox(g, M.wallTile, q.x, base + q.y, 0, q.w, q.h, 0.4, { cast: false });
      for (const n of ns) {
        addBox(g, M.wallTileShade, n.start, base + n.bottom, -3.5, n.width, n.height, 0.4, { cast: false }); // back
        addBox(g, M.wallTile, n.start, base + n.bottom, -3.5, n.width, 0.4, 3.9, { cast: false }); // shelf
        addBox(g, M.wallTileShade, n.start, base + n.bottom + n.height - 0.4, -3.5, n.width, 0.4, 3.9, { cast: false });
        addBox(g, M.wallTileShade, n.start, base + n.bottom, -3.5, 0.4, n.height, 3.9, { cast: false });
        addBox(g, M.wallTileShade, n.start + n.width - 0.4, base + n.bottom, -3.5, 0.4, n.height, 3.9, { cast: false });
      }
    }
  }
  // valve and shower head on the wall along local z, in the photo's left-hand wall
  const sz = a / 2, wz = tile > 0 ? 0.4 : 0;
  addMesh(parent, new THREE.CylinderGeometry(2.6, 2.6, 0.5, 24).rotateZ(Math.PI / 2), M.steel, wz + 0.25, 46, sz);
  addBox(parent, M.steel, wz, 76, sz - 0.4, 7, 0.8, 0.8);
  addMesh(parent, new THREE.CylinderGeometry(3, 3, 0.6, 24), M.steel, wz + 7, 75.6, sz);
}

// Stacked washer + dryer.
export function laundry(parent, ctx, w = 27, d = 30, h = 77) {
  const M = ctx.M, split = Math.min(39, h / 2);
  for (const [y0, hh] of [[0, split], [split + 0.5, h - split - 0.5]]) {
    addBox(parent, M.appliance, 0, y0, 0, w, hh, d);
    addBox(parent, M.black, 1.5, y0 + hh - 4.5, d, w - 3, 3.25, 0.3, { cast: false }); // control strip
    const r = Math.min(8, w / 2 - 4);
    addMesh(parent, new THREE.CylinderGeometry(r, r, 1, 36).rotateX(Math.PI / 2), M.trim, w / 2, y0 + (hh - 5) / 2, d + 0.5);
    addMesh(parent, new THREE.CylinderGeometry(r - 1.8, r - 1.8, 1.1, 36).rotateX(Math.PI / 2), M.blackGlass, w / 2, y0 + (hh - 5) / 2, d + 0.6);
  }
}

// Wide-flange (I) steel beam along local x from 0 to len, bottom at y = 0, centered on z = 0.
export function steelBeam(parent, ctx, len, depth = 8, flange = 4, { web = 0.25, tf = 0.35 } = {}) {
  const S = ctx.M.beam;
  addBox(parent, S, 0, 0, -flange / 2, len, tf, flange);
  addBox(parent, S, 0, depth - tf, -flange / 2, len, tf, flange);
  addBox(parent, S, 0, tf, -web / 2, len, depth - 2 * tf, web);
}

// Upright pressure tank (well system): cylinder with domed ends on a short base ring,
// diameter w across, h tall; x/z of the group = its footprint's north-west corner.
export function tank(parent, ctx, w, h, item = {}) {
  const r = w / 2, mat = ctx.color(item.color || '#2f6fb7');
  const dome = r * 0.35;
  addMesh(parent, new THREE.CylinderGeometry(r * 0.9, r * 0.9, 2, 32), ctx.M.black, r, 1, r);
  addMesh(parent, new THREE.CylinderGeometry(r, r, h - 2 - 2 * dome, 40), mat, r, 2 + dome + (h - 2 - 2 * dome) / 2, r);
  for (const [y, s] of [[h - dome, 1], [2 + dome, -1]]) {
    const d = addMesh(parent, new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, s > 0 ? 0 : Math.PI / 2, Math.PI / 2), mat, r, y, r);
    d.scale.y = dome / r;
  }
}

// Plain box in a given color (water heater, panel, A/C...). Optional round grille on the +z face.
export function box(parent, ctx, w, h, d, bottom, item = {}) {
  const mat = ctx.color(item.color || '#f2f2ef', item.metal);
  addBox(parent, mat, 0, bottom, 0, w, h, d);
  if (item.grille) {
    // on the +z face, or the -z face with grille: 'north' (plan direction)
    const r = Math.min(w, h) * 0.38;
    addMesh(parent, new THREE.CylinderGeometry(r, r, 0.4, 32).rotateX(Math.PI / 2), ctx.M.black, w / 2, bottom + h / 2, item.grille === 'north' ? -0.2 : d + 0.2, { cast: false });
  }
}
