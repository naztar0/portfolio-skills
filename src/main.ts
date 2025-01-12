import * as THREE from 'three';
import { Texture } from 'three';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { Loader } from '@/Loader';
import { Controller } from '@/Controller';
import { Scene } from '@/Scene';
import { Transitions } from '@/Transitions';
import { RayCaster } from '@/RayCaster';
import { Stats } from '@/Stats';
import { PointerLockControls } from '@/controls/Controls';
import { Sky } from '@/Sky';
import { MessageBox } from '@/MessageBox';
import { AudioBuffer3D } from '@/types';
import { BG_COLOR } from '@/config';
import '@/styles/style.css';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(BG_COLOR);
document.body.appendChild(renderer.domElement);

const onComplete = (
  gltf: GLTF,
  textures: Record<string, Texture>,
  audio: Record<string, AudioBuffer3D>,
) => {
  animate();
  sky.finish();
  messageBox.start();
  scene.initLights();
  scene.initGLTF(gltf, textures, audio);
  rayCaster.initialize(scene.hoverAudio, scene.clickAnimations, scene.clickTextures, scene.clickAudios);
  controller.cameraControls.moveCameraPosition(
    Transitions.initCameraTransition(controller.cameraControls.defaultPosition), 'intro',
  );
};

const onLoading = (event: { loaded: number; total: number }) => {
  sky.updateLoader(event.loaded / event.total * 100);
};

const stats = new Stats();
const clock = new THREE.Clock();
const scene = new Scene();
const sky = new Sky();
const messageBox = new MessageBox();
const loader = new Loader(onLoading, onComplete);
const controller = new Controller(
  renderer,
  scene.instance,
  scene.listener,
  scene.trackObjects,
  scene.speakerObjects,
  (v) => messageBox.toggleShowMessages(v),
);
const rayCaster = new RayCaster(
  controller.cameraControls,
  scene.instance,
  () => controller.getCameraControlsType(),
  (o) => controller.outlineObjects(o),
  (o) => messageBox.show(o),
);

const animate = () => {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  stats.update();
  scene.update(delta);
  controller.cameraControls.update(delta);
  controller.composer.render();
};

loader.loadAssets();
sky.start();

document.addEventListener('pointerdown', () => controller.cameraControls.controls.lock());
document.addEventListener('pointerdown', (e) => rayCaster.onPointerDown(e), false);
document.addEventListener('pointerup', (e) => rayCaster.onPointerUp(e), false);
document.addEventListener('pointermove', (e) => rayCaster.onPointerMove(e), false);

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'Escape': rayCaster.resetParent(); break;
    case 'KeyC': controller.toggleCameraControls(); break;
    case 'KeyM': controller.toggleMute({ force: true }); break;
  }
});

document.addEventListener('pointerlockchange', () => {
  if (
    document.pointerLockElement === null &&
    controller.cameraControls.controls instanceof PointerLockControls
  ) {
    const element = document.createElement('div');
    element.classList.add('pointer-lock');
    document.body.appendChild(element);
    setTimeout(() => element.classList.add('unlock'), 50);
    setTimeout(() => document.body.removeChild(element), 1e3);
  }
});

document.addEventListener('visibilitychange', () => {
  controller.toggleMute({ mute: document.visibilityState === 'hidden' });
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  controller.cameraControls.camera.aspect = width / height;
  controller.cameraControls.camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
