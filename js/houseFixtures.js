import * as THREE from 'three';
import { addBox, addMesh } from './geometry.js';
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
  if (item.mirror !== false) addBox(parent, M.mirror, 1, top + 7, 0, w - 2, 30, 0.5);
}

// Neo-angle shower in a corner: local x runs along one wall, z along the other.
export function cornerShower(parent, ctx, a, { returnLen = 12, height = 72 } = {}) {
  const M = ctx.M, r = returnLen, base = 4;
  parent.add(slab([[0, 0], [a, 0], [a, r], [r, a], [0, a]], base, 0, M.porcelain));
  const panel = (x0, z0, x1, z1, door) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const p = new THREE.Group();
    p.position.set(x0, base, z0);
    p.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    parent.add(p);
    addBox(p, M.glass, 0, 0, -0.2, len, height, 0.4, { cast: false });
    addBox(p, M.steel, 0, height - 0.75, -0.45, len, 0.75, 0.9);
    addBox(p, M.steel, 0, 0, -0.45, len, 0.75, 0.9);
    if (door) addBox(p, M.steel, len - 4, 34, 0.2, 0.75, 14, 1.5); // pull
  };
  panel(a, 0, a, r);
  panel(a, r, r, a, true);
  panel(r, a, 0, a);
  // shower head on the wall along local x
  addBox(parent, M.steel, a / 2 - 0.4, 76, 0, 0.8, 0.8, 7);
  addMesh(parent, new THREE.CylinderGeometry(3, 3, 0.6, 24), M.steel, a / 2, 75.6, 7);
  addMesh(parent, new THREE.CylinderGeometry(2.2, 2.2, 0.6, 20).rotateX(Math.PI / 2), M.steel, a / 2, 46, 0.3);
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

// Plain box in a given color (water heater, panel, A/C...). Optional round grille on the +z face.
export function box(parent, ctx, w, h, d, bottom, item = {}) {
  const mat = ctx.color(item.color || '#f2f2ef', item.metal);
  addBox(parent, mat, 0, bottom, 0, w, h, d);
  if (item.grille) {
    const r = Math.min(w, h) * 0.38;
    addMesh(parent, new THREE.CylinderGeometry(r, r, 0.4, 32).rotateX(Math.PI / 2), ctx.M.black, w / 2, bottom + h / 2, d + 0.2, { cast: false });
  }
}
