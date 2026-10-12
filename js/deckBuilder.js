import * as THREE from 'three';
import { woodTexture } from './materials.js';
import { slab } from './roomBuilder.js';
import { fmtIn, fmtFt } from './units.js';

// Decks (see `decks` in rooms/house.js). Each level is a polygon in plan (x, z) giving
// the outside faces of its framing; edges along the house wall (x = wallX) get a ledger
// and no border or skirt. Builds:
//  • composite decking: a picture-frame border board on every exposed edge (mitered),
//    field boards inside it running parallel to the house, and a skirt (fascia) below
//    the border;
//  • the framing as a line drawing (ledger, rims, joists, beams, blocking) in `framing`,
//    which the viewer can switch on and off.

const BOARD = 5.36, GAP = 0.1875, THICK = 1; // composite deck board, 5.36″ actual × 1″
const JOIST = 1.5, DEPTH = 7.25; // 2×8 framing

// ---------- polygon helpers (plan x/z) ----------
const area = (p) => p.reduce((s, [x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; return s + x * z2 - x2 * z; }, 0) / 2;

// Move each edge i inward by d[i] (negative = outward) and rejoin the corners.
function offset(p, d) {
  const sgn = area(p) > 0 ? 1 : -1, n = p.length;
  const lines = p.map(([x, z], i) => {
    const [x2, z2] = p[(i + 1) % n];
    const len = Math.hypot(x2 - x, z2 - z), ex = (x2 - x) / len, ez = (z2 - z) / len;
    const nx = -ez * sgn, nz = ex * sgn; // inward normal
    return { x: x + nx * d[i], z: z + nz * d[i], ex, ez };
  });
  return lines.map((b, i) => {
    const a = lines[(i - 1 + n) % n];
    const den = a.ex * b.ez - a.ez * b.ex;
    if (Math.abs(den) < 1e-9) return [b.x, b.z];
    const t = ((b.x - a.x) * b.ez - (b.z - a.z) * b.ex) / den;
    return [a.x + a.ex * t, a.z + a.ez * t];
  });
}

// Keep the part of polygon p where axis (0 = x, 1 = z) is >= v (keep = 1) or <= v (keep = -1).
function clip(p, axis, v, keep) {
  const inside = (q) => (q[axis] - v) * keep >= -1e-9;
  const out = [];
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (v - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

// Where the line axis = v crosses the polygon: sorted values of the other coordinate.
function crossings(p, axis, v) {
  const o = 1 - axis, hits = [];
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length];
    if ((a[axis] - v) * (b[axis] - v) < 0) hits.push(a[o] + ((b[o] - a[o]) * (v - a[axis])) / (b[axis] - a[axis]));
  });
  return hits.sort((m, n) => m - n);
}

// ---------- line drawing of framing members ----------
// A member whose plan centerline runs a → b, w wide, from yTop down d.
function member(pos, a, b, w, yTop, d) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 0.5) return;
  const nx = (-(b[1] - a[1]) / len) * (w / 2), nz = ((b[0] - a[0]) / len) * (w / 2);
  const c = [];
  for (const [px, pz] of [a, b]) for (const s of [1, -1]) for (const y of [yTop, yTop - d]) c.push([px + nx * s, y, pz + nz * s]);
  // corners: 0 a+ top, 1 a+ bot, 2 a- top, 3 a- bot, 4 b+ top, 5 b+ bot, 6 b- top, 7 b- bot
  for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) pos.push(...c[i], ...c[j]);
}

export function buildDecks(root, ctx, decks, tag, label, grade = 0) {
  const framing = new THREE.Group();
  framing.name = 'deck framing';
  framing.visible = false;
  root.add(framing);
  if (!decks?.length) return null;

  const color = decks[0].color || '#b1aca4';
  const tex = woodTexture(color, BOARD + GAP);
  const boardMats = {};
  // board material with its streaks running at `angle` (radians, plan) so each board's grain follows it
  const boardMat = (angle) => {
    const k = angle.toFixed(3);
    if (!boardMats[k]) {
      const t = tex.clone();
      t.rotation = angle;
      boardMats[k] = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, map: t });
    }
    return boardMats[k];
  };
  const skirtMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const shadowMat = new THREE.MeshStandardMaterial({ color: '#2a2a28', roughness: 1 });
  const lineMat = new THREE.LineBasicMaterial({ color: '#1d4f91', depthTest: false, transparent: true, opacity: 0.85 });
  const blockMat = new THREE.MeshStandardMaterial({ color: '#9c9a94', roughness: 0.95 });
  const postMat = new THREE.MeshStandardMaterial({ color: '#b99d6c', roughness: 0.8 });

  for (const dk of decks) {
    const g = new THREE.Group();
    root.add(g);
    const P = dk.outline, n = P.length, top = dk.top;
    const atHouse = P.map(([x], i) => Math.abs(x - dk.wallX) < 0.01 && Math.abs(P[(i + 1) % n][0] - dk.wallX) < 0.01);
    const exposed = (v, house = 0) => atHouse.map((h) => (h ? house : v));

    // decking: overhangs the skirt by 1″; border boards on exposed edges, field boards inside
    const deckEdge = offset(P, exposed(-1.5));
    const borderIn = offset(deckEdge, exposed(BOARD));
    const field = offset(deckEdge, exposed(BOARD + GAP, 0.5));
    deckEdge.forEach((a, i) => {
      if (atHouse[i]) return;
      const b = deckEdge[(i + 1) % n];
      const piece = [a, b, borderIn[(i + 1) % n], borderIn[i]];
      g.add(slab(piece, THICK, top - THICK, boardMat(Math.atan2(-(b[1] - a[1]), b[0] - a[0]))));
    });
    const xs = field.map((q) => q[0]);
    for (let x = Math.min(...xs); x < Math.max(...xs) - 0.5; x += BOARD + GAP) {
      const strip = clip(clip(field, 0, x, 1), 0, x + BOARD, -1);
      if (strip.length >= 3) g.add(slab(strip, THICK, top - THICK, boardMat(-Math.PI / 2)));
    }
    g.add(slab(offset(deckEdge, exposed(0.3)), 0.2, top - THICK - 0.3, shadowMat)); // dark gaps between boards

    // skirt (fascia) on the exposed edges, under the border
    const skirt = new THREE.Group();
    const skirtOut = offset(P, exposed(-0.5));
    P.forEach((a, i) => {
      if (atHouse[i]) return;
      skirt.add(slab([a, P[(i + 1) % n], skirtOut[(i + 1) % n], skirtOut[i]], dk.skirt, top - THICK - dk.skirt, skirtMat));
    });
    g.add(skirt);

    // 4×4 posts on concrete deck blocks, up to the bottom of the framing
    for (const [o, z] of dk.posts || []) {
      const x = dk.wallX + o, bottom = top - THICK - DEPTH;
      const post = new THREE.Group();
      const block = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 11), blockMat);
      block.position.set(x, grade + 4, z);
      const p = new THREE.Mesh(new THREE.BoxGeometry(3.5, bottom - grade - 8, 3.5), postMat);
      p.position.set(x, (bottom + grade + 8) / 2, z);
      for (const m of [block, p]) { m.castShadow = m.receiveShadow = true; post.add(m); }
      tag(post, { id: `${dk.id} post`, type: '4×4 post on a concrete deck block', height: bottom - grade, notes: '⚠ Position estimated from the photos.' });
      g.add(post);
    }

    const zs = P.map((q) => q[1]), px = P.map((q) => q[0]);
    const along = Math.max(...zs) - Math.min(...zs), out = Math.max(...px) - Math.min(...px);
    tag(g, { id: dk.id, type: 'Deck', width: along, depth: out, materials: dk.materials, notes: `${fmtFt(along)} along the house × ${fmtFt(out)} out (outside of the framing). Surface ${fmtIn(-top)} below the floor inside.${dk.notes ? ' ' + dk.notes : ''}` });
    tag(skirt, { id: `${dk.id} skirt`, type: 'Deck skirt (fascia)', height: dk.skirt, materials: dk.skirtMaterials });
    const cx = px.reduce((s, v) => s + v, 0) / n, cz = zs.reduce((s, v) => s + v, 0) / n;
    label(g, `<b>${dk.id}</b><br>${fmtFt(along)} × ${fmtFt(out)}`, cx, top + 2, cz, 'room');

    // framing line drawing
    const pos = [], yTop = top - THICK;
    const rim = offset(P, P.map(() => JOIST / 2));
    rim.forEach((a, i) => member(pos, a, rim[(i + 1) % n], JOIST, yTop, DEPTH)); // ledger + rim joists
    const z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let z = z0 + (dk.spacing || 16); z < z1 - JOIST; z += dk.spacing || 16) {
      const c = crossings(P, 1, z);
      for (let k = 0; k + 1 < c.length; k += 2) member(pos, [c[k] + JOIST, z], [c[k + 1] - JOIST, z], JOIST, yTop, DEPTH);
    }
    for (const [list, w] of [[dk.beams || [], 2 * JOIST], [dk.blocking || [], JOIST]]) {
      for (const bx of list) {
        const x = dk.wallX + bx, c = crossings(P, 0, x);
        for (let k = 0; k + 1 < c.length; k += 2) member(pos, [x, c[k] + JOIST], [x, c[k + 1] - JOIST], w, yTop, DEPTH);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, lineMat);
    lines.renderOrder = 20;
    lines.raycast = () => {}; // not clickable
    framing.add(lines);
  }
  return framing;
}
