import * as THREE from 'three';

// Electrical wiring (see `wiring` in rooms/house.js and rooms/houseWiring.js): each run is
// a cable following a path of [x, y, z] points (plan inches, y up from the floor), and each
// device is a box (receptacle, switch, junction, data jack, smoke alarm). Like the plumbing,
// the layer is hidden until the viewer's "Wiring" checkbox turns it on, and it draws through
// walls, ceilings and floors (x-ray) because most of it is inside them.

// Cable jacket colours follow the NM-B code seen in the photos: yellow 12 AWG, white
// 14 AWG, orange 10 AWG, black 6–8 AWG; blue is Cat6 data.
export const CABLES = {
  '14/2': { color: '#f1f0ea', d: 0.45, type: 'NM-B 14/2 cable (15 A)' },
  '14/3': { color: '#f1f0ea', d: 0.5, type: 'NM-B 14/3 cable (15 A, interconnect)' },
  '12/2': { color: '#f2c72a', d: 0.5, type: 'NM-B 12/2 cable (20 A)' },
  '12/3': { color: '#f2c72a', d: 0.55, type: 'NM-B 12/3 cable (20 A)' },
  '10/3': { color: '#f07a2a', d: 0.65, type: 'NM-B 10/3 cable (30 A)' },
  '8/2': { color: '#2a2a2a', d: 0.8, type: 'NM-B 8/2 cable (40 A)' },
  '6/3': { color: '#2a2a2a', d: 0.95, type: 'NM-B 6/3 cable (50 A)' },
  '14/4': { color: '#8f9499', d: 0.55, type: 'Mini-split interconnect cable 14/4' },
  service: { color: '#3a3a3a', d: 1.6, type: 'Service entrance cable' },
  cat6: { color: '#2f7fd6', d: 0.35, type: 'Cat6 data cable' },
};

// device boxes: size across the face (w × h) and depth into the wall; colour
const DEVICES = {
  outlet: { w: 2.25, h: 3.75, d: 2.75, color: '#2f6fd0', type: 'Receptacle (duplex)' },
  gfci: { w: 2.25, h: 3.75, d: 2.75, color: '#2f6fd0', type: 'GFCI receptacle' },
  r240: { w: 4, h: 4, d: 2.75, color: '#2f6fd0', type: '240 V receptacle' },
  switch: { w: 2.25, h: 3.75, d: 2.75, color: '#2f6fd0', type: 'Switch box' },
  junction: { w: 4, h: 4, d: 2, color: '#9aa0a6', type: 'Junction box' },
  data: { w: 2.25, h: 3.75, d: 1.5, color: '#e9eef6', type: 'Low-voltage data box (Cat6)' },
  smoke: { w: 4, h: 4, d: 1.5, color: '#f4f4f2', type: 'Smoke / CO alarm (hard-wired)', round: true },
  disconnect: { w: 6, h: 9, d: 3, color: '#a7abaf', type: 'A/C disconnect' },
};

export function buildWiring(root, wiring, tag) {
  if (!wiring?.runs?.length) return null;
  const layer = new THREE.Group();
  layer.name = 'wiring';
  layer.visible = false;
  root.add(layer);
  const mats = {};
  const mat = (c) => (mats[c] ??= new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, depthTest: false, transparent: true, opacity: 0.95 }));
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  for (const run of wiring.runs) {
    const k = CABLES[run.cable] || CABLES['12/2'], r = (run.d ?? k.d) / 2;
    const pts = run.path.map((p) => new THREE.Vector3(...p)).filter((p, i, a) => i === 0 || p.distanceTo(a[i - 1]) > 0.05);
    if (pts.length < 2) continue;
    const curve = new THREE.CurvePath();
    for (let i = 0; i + 1 < pts.length; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    const segs = Math.min(2000, pts.length * 3);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 8, false), mat(run.color || k.color)));
    // invisible, fatter copy so thin cables are easy to click
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, Math.max(r, 1.2), 5, false), hitMat));
    g.traverse((o) => (o.renderOrder = 16));
    tag(g, { id: run.id, type: k.type, notes: run.notes, materials: run.materials });
    layer.add(g);
  }

  for (const dv of wiring.devices || []) {
    const k = DEVICES[dv.kind] || DEVICES.junction;
    const gang = dv.gang ?? 1, w = k.w * gang + (gang > 1 ? 0.5 * (gang - 1) : 0);
    // face: the axis the box faces along ('x' on walls running north–south, 'z' on walls
    // running east–west, 'y' in a ceiling)
    const dims = dv.face === 'x' ? [k.d, k.h, w] : dv.face === 'y' ? [w, k.d, k.h] : [w, k.h, k.d];
    const geo = k.round ? new THREE.CylinderGeometry(k.w / 2 + 1, k.w / 2 + 1, k.d, 20) : new THREE.BoxGeometry(...dims);
    const m = new THREE.Mesh(geo, mat(k.color));
    m.position.set(...dv.at);
    m.renderOrder = 17;
    const g = new THREE.Group();
    g.add(m);
    tag(g, { id: dv.id, type: dv.type || (gang > 1 ? `${k.type}, ${gang}-gang` : k.type), notes: dv.notes, materials: dv.materials });
    layer.add(g);
  }
  return layer;
}
