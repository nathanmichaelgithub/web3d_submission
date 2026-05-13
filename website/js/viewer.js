// viewer.js — standalone GLB viewer used by the models page
// loads one of three court models on demand and shows it in the canvas
import * as THREE from 'three';
import { OrbitControls }  from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }     from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js';

// available models, each with the file path and the rotation needed to make Blender's Z-up match Three.js Y-up
const MODELS = {
  basketball: { file: '../assets/models/basketball_court.glb', label: 'Basketball Court', rotX: Math.PI/2 },
  football:   { file: '../assets/models/football_pitch.glb',   label: 'Football Pitch',   rotX: Math.PI/2, rotZ: Math.PI/2 },
  tennis:     { file: '../assets/models/tennis_court.glb',      label: 'Tennis Court',     rotY: Math.PI },
};

// Renderer, antialiased and capped at 2x pixel ratio so retina screens stay smooth
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
//PCF soft shadows for nicer edges instead of the default hard ones
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// ACES tone mapping gives a more cinematic colour response
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// Scene with a dark background and a bit of fog to add depth in the distance
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d18);
scene.fog = new THREE.Fog(0x0d0d18, 60, 180);

// Camera, default position is back and up looking down at the origin
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 30, 50);
camera.lookAt(0, 0, 0);

// Orbit controls with damping so the camera glides instead of snapping
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 200;

// Lighting, soft white ambient plus a strong directional "sun" and a cool fill from behind
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xfff8e0, 1.5);
sun.position.set(20, 40, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);  //higher res shadow map for sharper edges
scene.add(sun);
const fill = new THREE.DirectionalLight(0xaaccff, 0.4);
fill.position.set(-15, 10, -20);
scene.add(fill);

// Post-processing pipeline, adds a subtle bloom to make bright surfaces glow
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.8, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// shared state at module scope so the toggle functions further down can see them
const clock = new THREE.Clock();
let mixer = null;
let attachedCams = [];
let initialCamPose = null;
let currentModel = null;
let wireframe = false;
const allMats = [];  //collects every material so wireframe toggle can flip them all at once

// Load a GLB model from the MODELS table by key
function loadModel(key) {
  const cfg = MODELS[key];
  if (!cfg) return;

  // Tear down the previous model, mixer and any cameras that came in with the old GLB
  if (mixer) { mixer.stopAllAction(); mixer = null; }
  attachedCams.forEach(c => scene.remove(c));
  attachedCams = [];
  if (currentModel) {
    scene.remove(currentModel);
    allMats.length = 0;
  }

  document.getElementById('status').textContent = `Loading ${cfg.label}…`;
  document.querySelectorAll('.model-btn').forEach(b => b.classList.toggle('active', b.dataset.model === key));

  new GLTFLoader().load(cfg.file, gltf => {
    const model = gltf.scene;

    // Apply the per-model rotation so Blender's coordinate system lines up with Three.js
    if (cfg.rotX) model.rotation.x = cfg.rotX;
    if (cfg.rotZ) model.rotation.z = cfg.rotZ;
    if (cfg.rotY) model.rotation.y = cfg.rotY;

    // walk every mesh, turn shadows on and stash the materials for the wireframe toggle
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => {
          m.wireframe = wireframe;
          allMats.push(m);
        });
      }
    });

    scene.add(model);
    model.updateMatrixWorld(true);
    currentModel = model;

    // If the GLB ships with its own camera use that for the initial framing
    const camNodes = [];
    model.traverse(n => { if (n.isCamera) camNodes.push(n); });

    if (camNodes.length > 0) {
      // copy the position, rotation and lens from the GLB camera onto our PerspectiveCamera
      camNodes.forEach(c => scene.attach(c));
      attachedCams = camNodes;
      const glbCam = camNodes[0];
      camera.position.copy(glbCam.position);
      camera.quaternion.copy(glbCam.quaternion);
      if (glbCam.fov) camera.fov = glbCam.fov;
      camera.near = glbCam.near;
      camera.far = glbCam.far;
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      // figure out where the camera is looking and put the orbit target there
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      controls.target.copy(camera.position.clone().addScaledVector(dir, 20));
      // remember this pose so the Reset View button can come back to it later
      initialCamPose = {
        position: camera.position.clone(), quaternion: camera.quaternion.clone(),
        fov: camera.fov, near: camera.near, far: camera.far,
      };
    } else {
      // fallback when the GLB has no camera, auto-fit by measuring the bounding box
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(center.x, center.y + maxDim * 0.6, center.z + maxDim * 1.1);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.minDistance = maxDim * 0.1;
      controls.maxDistance = maxDim * 5;
      initialCamPose = null;
    }
    controls.update();

    // Set up the AnimationMixer and play every clip that came with the GLB
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
    }

    console.log(`${cfg.label}: ${gltf.cameras.length} camera(s), ${gltf.animations.length} animation(s)`);
    document.getElementById('status').textContent = `${cfg.label} — ${allMats.length} materials | drag to orbit · scroll to zoom`;
  },
  xhr => {
    // progress callback, shows the percent loaded in the status bar
    const pct = Math.round(xhr.loaded / xhr.total * 100);
    document.getElementById('status').textContent = `Loading ${cfg.label}… ${pct}%`;
  },
  err => {
    document.getElementById('status').textContent = `Error loading ${cfg.label}: ${err.message}`;
    console.error(err);
  });
}

// exposed controls, hooked up to the buttons in the HTML
window.selectModel = key => loadModel(key);

// toggles wireframe on every material in the current model
window.toggleWireframe = () => {
  wireframe = !wireframe;
  allMats.forEach(m => { m.wireframe = wireframe; });
  document.getElementById('wireBtn').classList.toggle('active', wireframe);
};

// toggles the bloom post-processing pass on and off
window.toggleBloom = () => {
  const on = bloom.strength > 0.1;
  bloom.strength = on ? 0 : 0.35;
  document.getElementById('bloomBtn').classList.toggle('active', !on);
};

// returns the camera to its original pose, either the GLB camera or the auto-fit framing
window.resetCamera = () => {
  if (!currentModel) return;
  if (initialCamPose) {
    camera.position.copy(initialCamPose.position);
    camera.quaternion.copy(initialCamPose.quaternion);
    camera.fov = initialCamPose.fov;
    camera.near = initialCamPose.near;
    camera.far = initialCamPose.far;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    controls.target.copy(camera.position.clone().addScaledVector(dir, 20));
  } else {
    // no stored pose, re-fit from the bounding box like the fallback in loadModel
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y + maxDim * 0.6, center.z + maxDim * 1.1);
    controls.target.copy(center);
  }
  controls.update();
};

// main animation loop, runs every frame
(function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  controls.update();
  if (mixer) mixer.update(dt);
  composer.render();
})();

// keep the canvas filling the window when the browser is resized
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// load the basketball court as the default when the page first opens
loadModel('basketball');
