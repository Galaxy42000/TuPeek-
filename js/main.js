import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRoom } from './roomBuilder.js';
import { buildHouse } from './houseBuilder.js';
import { ROOMS } from '../rooms/index.js';
import { IN, fmtIn, fmtFtIn } from './units.js';

const $ = (s) => document.querySelector(s);
const viewport = $('#viewport');

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true; // single-room views clip the house model
viewport.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.className = 'label-layer';
viewport.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e4e9ee');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.02, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 30;

const hemi = new THREE.HemisphereLight('#ffffff', '#b8a68e', 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e6', 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const highlight = new THREE.BoxHelper(undefined, 0x2f7de1);
highlight.visible = false;
highlight.material.depthTest = false;
highlight.renderOrder = 10;
scene.add(highlight);

// ---------- state ----------
let room = null; // result of buildRoom + config
let selected = null;
const opts = { cutaway: true, ceiling: true, dims: true };

// ---------- room loading ----------
async function loadRoom(id) {
  const entry = ROOMS.find((r) => r.id === id) || ROOMS[0];
  const cfg = (await entry.load()).default;
  if (room) {
    scene.remove(room.root);
    room.root.traverse((o) => {
      if (o.isCSS2DObject) o.element.remove();
      if (o.geometry) o.geometry.dispose();
    });
  }
  const built = cfg.kind === 'house' ? buildHouse(cfg, entry.focus) : buildRoom(cfg);
  built.root.scale.setScalar(IN);
  scene.add(built.root);
  if (built.clip) clipTo(built);
  room = { ...built, cfg };
  document.title = `${entry.name} · TuPeek`;
  $('#room-select').value = entry.id;

  const { H, floor: f } = built.bounds;
  const c = new THREE.Vector3((f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2).multiplyScalar(IN);
  const span = Math.max(f.x1 - f.x0, f.z1 - f.z0) * IN;
  sun.position.set(c.x - span * 0.4, H * IN * 3.2, c.z - span * 0.9);
  sun.target.position.copy(c);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -span;
  sc.right = sc.top = span;
  sc.near = 0.1;
  sc.far = 30;
  sc.updateProjectionMatrix();

  select(null);
  applyLabelVisibility();
  setView('overview', false);
}

// Show only what is inside a box (inches): clip every material, hide labels outside it.
function clipTo(built) {
  const c = built.clip;
  const planes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -c.x0 * IN),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), c.x1 * IN),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -c.z0 * IN),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), c.z1 * IN),
  ];
  built.root.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  built.root.traverse((o) => {
    for (const m of [o.material].flat()) if (m) { m.clippingPlanes = planes; m.clipShadows = true; }
    if (o.isLight && !insideClip(c, o.getWorldPosition(p).divideScalar(IN), 0)) o.visible = false;
  });
  for (const l of built.labels) if (!insideClip(c, l.getWorldPosition(p).divideScalar(IN), 2)) l.visible = false;
}
const insideClip = (c, v, tol) => v.x >= c.x0 - tol && v.x <= c.x1 + tol && v.z >= c.z0 - tol && v.z <= c.z1 + tol;

// ---------- camera views ----------
// Defaults are derived from the floor area; a room config can override any of them
// with views: { name: { pos: [x, y, z], target: [x, y, z] } } in inches.
function viewPresets() {
  const { W, D, H, floor: f } = room.bounds;
  const fw = f.x1 - f.x0, fd = f.z1 - f.z0, m = Math.max(fw, fd);
  const v = (x, y, z) => new THREE.Vector3(x, y, z).multiplyScalar(IN);
  const presets = {
    overview: { pos: v(f.x0 - 0.35 * fw, H + 0.95 * m, f.z0 + fd * 1.65), target: v(f.x0 + fw * 0.55, 24, f.z0 + fd * 0.42) },
    eye: { pos: v(f.x0 + fw * 0.1, 64, f.z1 - 14), target: v(f.x0 + fw * 0.62, 40, f.z0 + D * 0.15) },
    top: { pos: v(f.x0 + fw / 2, 2.4 * m, f.z0 + fd / 2 + 1), target: v(f.x0 + fw / 2, 0, f.z0 + fd / 2) },
  };
  for (const [name, p] of Object.entries(room.views || room.cfg.views || {})) presets[name] = { pos: v(...p.pos), target: v(...p.target) };
  return presets;
}

let tween = null;
function setView(name, animate = true) {
  exitWalk();
  const p = viewPresets()[name];
  if (!p) return;
  if (!animate) {
    camera.position.copy(p.pos);
    controls.target.copy(p.target);
    controls.update();
    return;
  }
  tween = { t0: performance.now(), dur: 900, fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: p.pos, toTarget: p.target };
}

function stepTween(now) {
  if (!tween) return;
  const k = Math.min(1, (now - tween.t0) / tween.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
  if (k >= 1) tween = null;
}

// ---------- walk mode (first person) ----------
const walk = { on: false, yaw: 0, pitch: 0, keys: new Set(), eye: 64 };

function enterWalk() {
  if (walk.on) return;
  tween = null;
  walk.on = true;
  controls.enabled = false;
  const start = viewPresets().eye;
  camera.position.copy(start.pos).setY(walk.eye * IN);
  const dir = start.target.clone().sub(start.pos);
  walk.yaw = Math.atan2(-dir.x, -dir.z);
  walk.pitch = -0.12;
  document.body.classList.add('walking');
  $('#walk-btn').classList.add('active');
}

function exitWalk() {
  if (!walk.on) return;
  walk.on = false;
  controls.enabled = true;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  controls.target.copy(camera.position).addScaledVector(dir, 1.2);
  controls.update();
  document.body.classList.remove('walking');
  $('#walk-btn').classList.remove('active');
}

function stepWalk(dt) {
  if (!walk.on) return;
  const k = walk.keys;
  const f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
  const s = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
  const speed = (k.has('shift') ? 2.6 : 1.3) * dt;
  const fwd = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
  const right = new THREE.Vector3(Math.cos(walk.yaw), 0, -Math.sin(walk.yaw));
  camera.position.addScaledVector(fwd, f * speed).addScaledVector(right, s * speed);
  const fb = room.bounds.floor;
  const pad = 10; // inches
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, (fb.x0 + pad) * IN, (fb.x1 - pad) * IN);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, (fb.z0 + pad) * IN, (fb.z1 - pad) * IN);
  camera.position.y = walk.eye * IN;
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
}

const keyName = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase());
window.addEventListener('keydown', (e) => {
  if (e.target.closest('select, input')) return;
  if (e.key === 'Escape') { exitWalk(); select(null); return; }
  if (walk.on) { walk.keys.add(keyName(e)); if (e.key.startsWith('Arrow')) e.preventDefault(); }
});
window.addEventListener('keyup', (e) => walk.keys.delete(keyName(e)));
window.addEventListener('blur', () => walk.keys.clear());

// on-screen movement pad for touch screens
document.querySelectorAll('#walk-pad button').forEach((b) => {
  const key = b.dataset.key;
  const on = (e) => { e.preventDefault(); walk.keys.add(key); };
  const off = () => walk.keys.delete(key);
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointerleave', off);
  b.addEventListener('pointercancel', off);
});

// ---------- pointer: look (walk mode) and click-to-inspect ----------
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
});
window.addEventListener('pointermove', (e) => {
  if (!down) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
  if (walk.on) {
    walk.yaw -= (e.clientX - down.lx) * 0.004;
    walk.pitch = THREE.MathUtils.clamp(walk.pitch - (e.clientY - down.ly) * 0.004, -1.4, 1.4);
  }
  down.lx = e.clientX;
  down.ly = e.clientY;
});
window.addEventListener('pointerup', (e) => {
  if (down && !down.moved && e.target === renderer.domElement) pick(e.clientX, e.clientY);
  down = null;
});

const raycaster = new THREE.Raycaster();
function visibleInScene(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function pick(cx, cy) {
  if (!room) return;
  const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  const shown = (h) => !room.clip || insideClip(room.clip, p.copy(h.point).divideScalar(IN), 0);
  const hit = raycaster.intersectObject(room.root, true).find((h) => visibleInScene(h.object) && !h.object.material?.transparent && shown(h));
  let o = hit?.object;
  while (o && !o.userData.info) o = o.parent;
  select(o || null);
}

function select(obj) {
  selected = obj;
  const panel = $('#info');
  if (!obj) {
    highlight.visible = false;
    panel.hidden = true;
    return;
  }
  highlight.setFromObject(obj);
  highlight.visible = true;
  const i = obj.userData.info;
  const rows = [];
  const row = (k, v) => v !== undefined && v !== null && rows.push(`<dt>${k}</dt><dd>${v}</dd>`);
  row('Type', i.type);
  row('Plan code', i.code);
  if (i.wall) row('On wall', `${i.wall[0].toUpperCase()}${i.wall.slice(1)}`);
  if (i.start !== undefined && i.wall) row('Starts at', `${fmtFtIn(i.start)} from the wall's left corner`);
  else if (i.start !== undefined) row('Starts at', fmtFtIn(i.start));
  row('Width', i.width !== undefined ? fmtFtIn(i.width) : undefined);
  row('Height', i.height !== undefined ? fmtFtIn(i.height) : undefined);
  row('Depth', i.depth !== undefined ? fmtFtIn(i.depth) : undefined);
  row('Bottom at', i.bottom !== undefined ? `${fmtIn(i.bottom)} above floor` : undefined);
  row('Fronts', i.fronts);
  $('#info-title').textContent = i.id;
  $('#info-body').innerHTML = `<dl>${rows.join('')}</dl>${i.notes ? `<p class="note">${i.notes}</p>` : ''}`;
  panel.hidden = false;
}
$('#info-close').addEventListener('click', () => select(null));

// ---------- cutaway walls & ceiling ----------
const camIn = new THREE.Vector3();
const tmp = new THREE.Vector3();
function updateVisibility() {
  if (!room) return;
  camIn.copy(camera.position).divideScalar(IN);
  for (const w of room.walls) {
    const outside = tmp.copy(camIn).sub(w.center).dot(w.normal) < -2;
    w.group.visible = !(opts.cutaway && outside);
  }
  room.ceiling.visible = opts.ceiling && camIn.y < room.bounds.H;
}

function applyLabelVisibility() {
  labelRenderer.domElement.style.display = opts.dims ? '' : 'none';
}

// ---------- UI wiring ----------
const sel = $('#room-select');
for (const r of ROOMS) sel.add(new Option(r.name, r.id));
sel.addEventListener('change', () => (location.hash = sel.value));
window.addEventListener('hashchange', () => loadRoom(location.hash.slice(1)));

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#walk-btn').addEventListener('click', () => (walk.on ? exitWalk() : enterWalk()));
$('#t-dims').addEventListener('change', (e) => { opts.dims = e.target.checked; applyLabelVisibility(); });
$('#t-cutaway').addEventListener('change', (e) => (opts.cutaway = e.target.checked));
$('#t-ceiling').addEventListener('change', (e) => (opts.ceiling = e.target.checked));
$('#hud-toggle').addEventListener('click', () => document.body.classList.toggle('hud-collapsed'));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- loop ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.1);
  stepTween(now);
  if (walk.on) stepWalk(dt);
  else controls.update();
  updateVisibility();
  if (selected) highlight.setFromObject(selected);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

loadRoom(location.hash.slice(1) || ROOMS[0].id)
  .then(() => document.body.classList.add('ready'))
  .catch((err) => {
    console.error(err);
    $('#loading').textContent = `Could not load the room: ${err.message}`;
  });

// handy for debugging from the browser console
window.tupeek = { scene, camera, controls, setView, get room() { return room; } };
