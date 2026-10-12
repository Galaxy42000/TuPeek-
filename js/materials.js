import * as THREE from 'three';

// Procedural textures are drawn on canvases so the site needs no image assets.
// Each texture's repeat is 1 / (real-world size in inches) because geometry UVs are in inches.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade(hex, dl, ds = 0) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, ds, dl);
  return '#' + c.getHexString();
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, sizeX, sizeY = sizeX) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / sizeX, 1 / sizeY);
  t.anisotropy = 8;
  return t;
}

export function woodTexture(base, plankWidth = 5) {
  const S = 96, PX = 1024, k = PX / S;
  const [c, ctx] = canvas(PX, PX);
  const r = rng(11);
  const rows = Math.max(1, Math.round(S / plankWidth));
  const rowH = PX / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 48 * k;
    while (x < PX) {
      const len = (30 + r() * 42) * k;
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.09, (r() - 0.5) * 0.06);
      ctx.fillRect(x, i * rowH, len, rowH);
      ctx.globalAlpha = 0.13;
      ctx.strokeStyle = shade(base, -0.15);
      for (let g = 0; g < 8; g++) {
        ctx.lineWidth = 0.6 + r() * 1.4;
        ctx.beginPath();
        const y = i * rowH + 2 + r() * (rowH - 4);
        const amp = r() * 2.5, ph = r() * 6;
        ctx.moveTo(x, y);
        for (let xx = x; xx <= x + len; xx += 16) ctx.lineTo(xx, y + Math.sin(xx * 0.012 + ph) * amp);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(45,28,12,0.5)';
      ctx.fillRect(x, i * rowH, 2, rowH);
      x += len;
    }
    ctx.fillStyle = 'rgba(45,28,12,0.5)';
    ctx.fillRect(0, i * rowH, PX, 1.5);
  }
  return toTexture(c, S);
}

export function tileTexture(color, grout, tileW = 6, tileH = 3) {
  const cols = 4, rows = 4, k = 24;
  const SX = tileW * cols, SY = tileH * rows;
  const [c, ctx] = canvas(SX * k, SY * k);
  const r = rng(5);
  const g = 0.14 * k;
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, SX * k, SY * k);
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * tileW / 2;
    for (let col = -1; col <= cols; col++) {
      const x = (col * tileW + off) * k, y = row * tileH * k;
      const w = tileW * k, h = tileH * k;
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      const base = shade(color, (r() - 0.5) * 0.03);
      grad.addColorStop(0, shade(base, 0.03));
      grad.addColorStop(1, shade(base, -0.02));
      ctx.fillStyle = grad;
      ctx.fillRect(x + g / 2, y + g / 2, w - g, h - g);
    }
  }
  return toTexture(c, SX, SY);
}

export function speckleTexture(color) {
  const S = 30, PX = 512;
  const [c, ctx] = canvas(PX, PX);
  const r = rng(3);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, PX, PX);
  for (let i = 0; i < 2600; i++) {
    const dark = r() < 0.55;
    ctx.fillStyle = shade(color, dark ? -0.08 - r() * 0.18 : 0.05 + r() * 0.08);
    ctx.globalAlpha = 0.25 + r() * 0.5;
    const s = 0.6 + r() * 2.2;
    ctx.fillRect(r() * PX, r() * PX, s, s);
  }
  ctx.globalAlpha = 1;
  return toTexture(c, S);
}

// A photo of a real material (made seamless beforehand), tiled.
// size = [width, height] in inches that the photo covers.
function photoTexture(url, [w, h]) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / w, 1 / h);
  t.anisotropy = 8;
  return t;
}

export function createMaterials(p) {
  const std = (color, roughness = 0.6, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  // planks are drawn running along x (plan east–west); turn them for north–south
  const floorMap = woodTexture(p.floor, p.floorPlankWidth);
  if (p.floorBoards === 'north-south') floorMap.rotation = Math.PI / 2;
  // countertop stone: a photo of the actual slab when there is one, else a speckle pattern
  const stone = p.counterPhoto
    ? std('#ffffff', 0.18, 0, { map: photoTexture(p.counterPhoto, p.counterPhotoSize || [16, 12]) })
    : std('#ffffff', 0.22, 0, { map: speckleTexture(p.counter) });
  return {
    wall: std(p.walls, 0.92),
    ceiling: std(p.ceiling, 0.95),
    trim: std(p.trim, 0.45),
    floor: std('#ffffff', 0.55, 0, { map: floorMap }),
    cabinet: std(p.cabinets, 0.42),
    island: std(p.island, 0.42),
    interior: std(shade(p.cabinets, -0.04), 0.8),
    toeKick: std('#3a3734', 0.85),
    counter: stone,
    cherry: std('#ffffff', 0.3, 0, { map: woodTexture(p.cherry || '#8a4a2c', 6) }), // varnished cherry
    granite: p.counterPhoto ? stone : std('#ffffff', 0.2, 0, { map: speckleTexture(p.granite || p.counter) }),
    // 'counter' = the countertop stone carried up the wall; otherwise a tile color
    backsplash: p.backsplash === 'counter' ? stone : std('#ffffff', 0.18, 0, { map: tileTexture(p.backsplash, p.grout) }),
    hardware: std(p.hardware, 0.3, 0.85),
    steel: std('#d6d9db', 0.28, 1.0),
    black: std('#1a1a1a', 0.45, 0.2),
    blackGlass: std('#0a0a0b', 0.06, 0.3),
    glass: new THREE.MeshStandardMaterial({ color: '#e3f1f7', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false }),
    stoolSeat: std(p.stoolSeat, 0.55),
    stoolLeg: std(p.stoolLegs, 0.35, 0.85),
    pendant: std(p.pendant, 0.3, 0.85, { side: THREE.DoubleSide }),
    bulb: std('#ffffff', 0.4, 0, { emissive: '#ffe0b0', emissiveIntensity: 2.5 }),
    canLens: std('#ffffff', 0.4, 0, { emissive: '#fff4e2', emissiveIntensity: 1.6 }),
  };
}
