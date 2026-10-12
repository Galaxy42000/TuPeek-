import * as THREE from 'three';

// Plumbing (see `plumbing` in rooms/house.js): each run is a path of [x, y, z] points
// (plan inches, y up from the floor) drawn as a pipe. The whole layer is hidden until
// the viewer's "Plumbing" checkbox turns it on, and it draws through walls and floors
// (x-ray) because most of it is inside them.

const KINDS = {
  hot: { color: '#d8322f', d: 0.625, type: 'Hot water line (PEX)' },
  cold: { color: '#2a62d6', d: 0.625, type: 'Cold water line (PEX)' },
  main: { color: '#2a62d6', d: 1, type: 'Main water line' },
  drain: { color: '#f2f2ee', d: 2.375, type: 'Drain (PVC)' },
  vent: { color: '#f2f2ee', d: 1.9, type: 'Vent (PVC)' },
};

export function buildPlumbing(root, runs, tag) {
  if (!runs?.length) return null;
  const layer = new THREE.Group();
  layer.name = 'plumbing';
  layer.visible = false;
  root.add(layer);
  const mats = {};
  const mat = (c) => (mats[c] ??= new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, depthTest: false, transparent: true, opacity: 0.95 }));
  const up = new THREE.Vector3(0, 1, 0);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  for (const run of runs) {
    const k = KINDS[run.kind] || KINDS.cold, r = (run.d ?? k.d) / 2, m = mat(run.color || k.color);
    const g = new THREE.Group();
    const pts = run.path.map((p) => new THREE.Vector3(...p));
    pts.forEach((a, i) => {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(r * 1.15, 12, 8), m);
      joint.position.copy(a);
      g.add(joint);
      const b = pts[i + 1];
      if (!b) return;
      const len = a.distanceTo(b);
      if (len < 0.01) return;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), m);
      seg.position.copy(a).lerp(b, 0.5);
      seg.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      g.add(seg);
      // invisible, fatter copy so thin lines are easy to click
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(r, 1.5), Math.max(r, 1.5), len, 8), hitMat);
      hit.position.copy(seg.position);
      hit.quaternion.copy(seg.quaternion);
      g.add(hit);
    });
    g.traverse((o) => (o.renderOrder = 15));
    tag(g, { id: run.id, type: run.type || k.type, materials: run.materials, notes: run.notes });
    layer.add(g);
  }
  return layer;
}
