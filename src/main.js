import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#app');
const valueEl = document.querySelector('#value');
const clearBtn = document.querySelector('#clear');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#020617');

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.4, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 8;

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 64),
  new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.35;
scene.add(floor);

const phone = new THREE.Group();
scene.add(phone);

const body = new THREE.Mesh(
  new THREE.BoxGeometry(2, 4.1, 0.6, 6, 12, 3),
  new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7, metalness: 0.15 })
);
phone.add(body);

const bezel = new THREE.Mesh(
  new THREE.BoxGeometry(1.45, 1.2, 0.07),
  new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2 })
);
bezel.position.set(0, 1, 0.33);
phone.add(bezel);

let inputValue = '';

const screenCanvas = document.createElement('canvas');
screenCanvas.width = 512;
screenCanvas.height = 256;
const screenCtx = screenCanvas.getContext('2d');
const screenTexture = new THREE.CanvasTexture(screenCanvas);

function drawScreen() {
  screenCtx.fillStyle = '#95e9ff';
  screenCtx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
  screenCtx.fillStyle = '#083344';
  screenCtx.font = 'bold 36px monospace';
  screenCtx.fillText('NOKIA', 20, 50);
  screenCtx.font = 'bold 56px monospace';
  screenCtx.fillText(inputValue || '-', 20, 140);
  screenCtx.font = '28px monospace';
  screenCtx.fillText('Input Number', 20, 205);
  screenTexture.needsUpdate = true;
  valueEl.textContent = inputValue || '-';
}

drawScreen();

const screen = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 0.9),
  new THREE.MeshStandardMaterial({ map: screenTexture })
);
screen.position.set(0, 1, 0.37);
phone.add(screen);

const buttonDefs = [
  ['1', -0.48, -0.1], ['2', 0, -0.1], ['3', 0.48, -0.1],
  ['4', -0.48, -0.58], ['5', 0, -0.58], ['6', 0.48, -0.58],
  ['7', -0.48, -1.06], ['8', 0, -1.06], ['9', 0.48, -1.06],
  ['*', -0.48, -1.54], ['0', 0, -1.54], ['#', 0.48, -1.54]
];

function makeButtonTexture(label) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, 122, 122);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 60px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 64);
  return new THREE.CanvasTexture(c);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickableButtons = [];

for (const [label, x, y] of buttonDefs) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.3, 0.1),
    new THREE.MeshStandardMaterial({ map: makeButtonTexture(label), roughness: 0.4, metalness: 0.15 })
  );
  button.position.set(x, y, 0.35);
  button.userData = { label };
  clickableButtons.push(button);
  phone.add(button);
}

function onPointerDown(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickableButtons)[0];
  if (!hit) return;
  const { label } = hit.object.userData;
  if (/\d/.test(label) && inputValue.length < 12) {
    inputValue += label;
    drawScreen();
  }
}

window.addEventListener('pointerdown', onPointerDown);
clearBtn.addEventListener('click', () => {
  inputValue = '';
  drawScreen();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  phone.rotation.y += 0.003;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
