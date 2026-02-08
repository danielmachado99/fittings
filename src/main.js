import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import initWasm, { generate_adapter_mesh } from '../wasm/pkg/fitting_wasm.js';
import { buildControls, defaultParams, sanitizeParams } from './params.js';
import { exportBinaryStl } from './stl.js';

const params = structuredClone(defaultParams);
const controlsHost = document.getElementById('controls');
const viewport = document.getElementById('viewport');

let scene, camera, renderer, controls, mesh, markerA, markerB;
let geometry;

boot().catch((err) => {
  const message = document.createElement('p');
  message.className = 'warning';
  message.textContent = `WASM module not ready. Build wasm/pkg first (wasm-pack build --target web --out-dir pkg). Error: ${err.message}`;
  controlsHost.replaceChildren(message);
});

async function boot() {
  await initWasm();
  initScene();
  buildControls(controlsHost, params, regenerate);
  document.getElementById('exportStl').addEventListener('click', () => geometry && exportBinaryStl(geometry));
  regenerate();
  animate();
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14161c);
  camera = new THREE.PerspectiveCamera(50, viewport.clientWidth / viewport.clientHeight, 0.1, 2000);
  camera.position.set(50, 30, 60);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  viewport.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(30, 60, 20);
  scene.add(dir);

  const markerGeo = new THREE.SphereGeometry(1.4, 24, 16);
  markerA = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({ color: 0x4aa3ff }));
  markerB = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({ color: 0xff8f3f }));
  markerA.userData.label = 'End A';
  markerB.userData.label = 'End B';
  scene.add(markerA, markerB);

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (ev) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects([markerA, markerB])[0];
    if (hit) alert(hit.object.userData.label);
  });

  window.addEventListener('resize', () => {
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  });
}

function regenerate() {
  const p = sanitizeParams(params);
  const m = generate_adapter_mesh(JSON.stringify(p));
  const vertices = m.vertices;
  const indices = m.indices;

  if (mesh) {
    scene.remove(mesh);
    geometry.dispose();
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xbec7d6, metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide })
  );
  scene.add(mesh);

  const halfL = p.body.length_mm / 2;
  markerA.position.set(0, 0, -halfL);
  markerB.position.set(0, 0, halfL);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
