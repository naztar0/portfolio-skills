import * as THREE from 'three';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { BrightnessContrastShader } from 'three/addons/shaders/BrightnessContrastShader.js';
import { OrbitCameraControls } from '@/controls/OrbitCameraControls';
import { WalkingCameraControls } from '@/controls/WalkingCameraControls';
import { OutlineTransPass } from '@/OutlineTransPass';
import { Speaker3D } from '@/types';
import { AUDIO } from '@/config';

export class Controller {
  private readonly outputPass: OutputPass;
  private readonly effectFXAAShaderPass: ShaderPass;
  private readonly brightnessContrastShaderPass: ShaderPass;
  private readonly outlinePass: OutlinePass;

  public readonly composer: EffectComposer;
  public cameraControls: OrbitCameraControls | WalkingCameraControls;

  private renderPass: RenderPass;
  private outlineTransPass: OutlineTransPass;

  private readonly orbitCameraControls: OrbitCameraControls;
  private readonly walkingCameraControls: WalkingCameraControls;

  private forceMute = false;

  constructor(
    readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    readonly listener: THREE.AudioListener,
    readonly trackObjects: THREE.Object3D[],
    readonly speakerObjects: Speaker3D[],
    readonly setShowMessages: (show?: boolean) => void,
  ) {
    this.orbitCameraControls = new OrbitCameraControls(renderer, trackObjects, listener);
    this.walkingCameraControls = new WalkingCameraControls(renderer, trackObjects, listener);
    this.cameraControls = this.orbitCameraControls;
    this.cameraControls.enableListener();

    this.composer = new EffectComposer(renderer);
    this.outputPass = new OutputPass();
    this.renderPass = new RenderPass(scene, this.cameraControls.camera);
    this.outlineTransPass = new OutlineTransPass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, this.cameraControls.camera);
    this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, this.cameraControls.camera);
    this.outlinePass.hiddenEdgeColor = new THREE.Color(0);
    this.effectFXAAShaderPass = new ShaderPass(FXAAShader);
    this.effectFXAAShaderPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    this.brightnessContrastShaderPass = new ShaderPass(BrightnessContrastShader);
    this.brightnessContrastShaderPass.uniforms['contrast'].value = 0.1;

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.outlineTransPass);
    this.composer.addPass(this.outlinePass);
    this.composer.addPass(this.brightnessContrastShaderPass);
    this.composer.addPass(this.effectFXAAShaderPass);
    this.composer.addPass(this.outputPass);
  };

  private refreshPasses(cameraControls: CameraControlsType) {
    this.composer.removePass(this.renderPass);
    this.composer.removePass(this.outlineTransPass);
    this.composer.removePass(this.outlinePass);

    this.renderPass = new RenderPass(this.scene, this.cameraControls.camera);
    this.outlineTransPass = new OutlineTransPass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.cameraControls.camera);

    this.composer.insertPass(this.renderPass, 0);
    this.composer.insertPass(this.outlineTransPass, 1);
    if (cameraControls === 'Orbit') {
      this.composer.insertPass(this.outlinePass, 2);
    }
  };

  private addEventListeners(cameraControls: OrbitCameraControls | WalkingCameraControls) {
    document.addEventListener('keydown', cameraControls.onKeyDown);
    document.addEventListener('keyup', cameraControls.onKeyUp);
  };

  private removeEventListeners(cameraControls: OrbitCameraControls | WalkingCameraControls) {
    document.removeEventListener('keydown', cameraControls.onKeyDown);
    document.removeEventListener('keyup', cameraControls.onKeyUp);
  };

  public updateCameraControls(cameraControls: CameraControlsType) {
    switch (cameraControls) {
      case 'Walking':
        this.removeEventListeners(this.cameraControls);
        this.cameraControls.controls.unlock();
        this.cameraControls.disableListener();
        this.cameraControls = this.orbitCameraControls;
        this.cameraControls.enableListener();
        this.setShowMessages(true);
        cameraControls = 'Orbit';
        break;
      case 'Orbit':
        this.cameraControls.disableListener();
        this.cameraControls = this.walkingCameraControls;
        this.addEventListeners(this.cameraControls);
        this.cameraControls.controls.lock();
        this.cameraControls.enableListener();
        this.setShowMessages(false);
        cameraControls = 'Walking';
        break;
      default:
        throw new Error('Invalid camera controls type');
    }
    this.refreshPasses(cameraControls);
  };

  public toggleCameraControls() {
    this.updateCameraControls(this.getCameraControlsType());
  };

  public getCameraControlsType() {
    return this.cameraControls instanceof OrbitCameraControls ? 'Orbit' : 'Walking';
  };

  public outlineObjects(objects: THREE.Object3D[]) {
    this.outlinePass.selectedObjects = objects;
  };

  public toggleMute({ mute, force }: { mute?: boolean; force?: boolean } = {}) {
    let setMute = mute ?? !this.speakerObjects.some((speaker) => speaker.getAudio().getVolume() === 0);
    if (force) {
      this.forceMute = setMute;
    }
    setMute = this.forceMute || setMute;
    this.speakerObjects.forEach((speaker) => speaker.getAudio().setVolume(setMute ? 0 : speaker.getBuffer().volume));
    (this.scene.children.find((child) => child.type === 'Audio') as THREE.Audio).setVolume(setMute ? 0 : AUDIO.main.volume);
  };
}