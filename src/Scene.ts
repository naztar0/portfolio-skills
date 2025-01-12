import * as THREE from 'three';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { parseTexture, TextureAnimator } from '@/TextureAnimator';
import { Ocean } from '@/Ocean';
import { WaterEmitter } from '@/WaterEmitter';
import { findObjects } from '@/utils';
import { AudioBuffer3D, Scene as TScene, Speaker3D } from '@/types';
import { BG_COLOR } from '@/config';
import textureMixShaderVertex from '@/assets/shaders/textureMixVertex.glsl?raw';
import textureMixShaderFragment from '@/assets/shaders/textureMixFragment.glsl?raw';

const BLENDER_LIGHT_COEFFICIENT = 20;

const clipTypes: ClipType[] = ['MAIN', 'ONCE', 'NEXT', 'EMIT', 'CLICK'];

// https://github.com/KhronosGroup/glTF-Blender-IO/issues/564
// https://discourse.threejs.org/t/luminous-intensity-calculation/19242
const candelaToWats = (candela: number) => (candela * 4 * Math.PI) / 683;

export class Scene {
  public readonly instance: THREE.Scene;
  public readonly listener: THREE.AudioListener;
  private readonly textureAnimator: TextureAnimator;
  private mixer!: THREE.AnimationMixer;
  private gtlf!: GLTF;
  private ocean!: Ocean;
  private waterEmitters: WaterEmitter[] = [];

  public hoverAudio!: THREE.Audio;
  public trackObjects: THREE.Object3D[] = [];
  public speakerObjects: Speaker3D[] = [];
  public clickAnimations: Record<string, THREE.AnimationAction> = {};
  public clickTextures: Record<string, ClickTexture> = {};
  public clickAudios: Record<string, THREE.Audio<GainNode | PannerNode>> = {};

  constructor() {
    this.instance = new THREE.Scene();
    this.listener = new THREE.AudioListener();
    this.textureAnimator = new TextureAnimator();
  };

  public initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);

    this.instance.add(ambientLight);
    this.instance.background = new THREE.Color(BG_COLOR);
  };

  public initGLTF(
    gltf: GLTF,
    textures: Record<string, THREE.Texture>,
    audio: Record<string, AudioBuffer3D>,
  ) {
    this.gtlf = gltf;
    this.instance.add(this.gtlf.scene);

    this.setupGTLFLights();
    this.setupGTLFObjects(textures);
    this.setupGTLFAnimations();
    this.setupGTLFSpeakers(audio);
  };

  private setupGTLFLights() {
    const lights = this.gtlf.scene.children.filter((child) =>
      ['SpotLight', 'PointLight', 'DirectionalLight'].includes(child.type)) as THREE.Light[];

    lights.forEach((light) => {
      if (light.name === 'Sun') {
        light.visible = false;
      }
      light.intensity = candelaToWats(light.intensity) / BLENDER_LIGHT_COEFFICIENT;
    });
  };

  private setupGTLFAnimations() {
    this.mixer = new THREE.AnimationMixer(this.gtlf.scene);

    let prevClipName: string = '';
    const animationSequence: Map<string, THREE.AnimationClip> = new Map();

    this.gtlf.animations.forEach((clip) => {
      this.mixer.clipAction(clip).loop = THREE.LoopOnce;
      this.mixer.clipAction(clip).clampWhenFinished = true;
      if (!clip.name.includes('MAIN')) {
        THREE.AnimationUtils.makeClipAdditive(clip);
      }
      if (!clip.name.includes('ONCE')) {
        animationSequence.set(clip.name, clip);
      }
      if (clip.name.includes('NEXT')) {
        animationSequence.set(prevClipName, clip);
      } else if (clip.name.includes('CLICK')) {
        this.clickAnimations[clip.name] = this.mixer.clipAction(clip);
        if (clip.name.includes('init')) {
          this.mixer.clipAction(clip).play();
        }
      } else {
        setTimeout(() => {
          this.mixer.clipAction(clip).play();
          const { name, type } = this.getAnimationClipData(clip.name);
          if (type !== 'EMIT') {
            this.playAnimationDependencies(name, type, animationSequence);
          }
        }, 100);
      }
      prevClipName = clip.name;
    });

    this.mixer.addEventListener('finished', (event) => {
      const clip = event.action.getClip();
      if (!animationSequence.has(clip.name)) {
        return;
      }

      const { name, type } = this.getAnimationClipData(clip.name);

      if (type !== 'EMIT') {
        this.mixer.clipAction(animationSequence.get(clip.name)!).reset();
      }

      this.playAnimationDependencies(name, type, animationSequence);
    });
  };

  private setupGTLFSpeakers(audioBuffers: Record<string, AudioBuffer3D>) {
    const speakers: THREE.Object3D[] = [];
    findObjects(this.gtlf.scene, '_SPEAKER', speakers);

    Object.entries(audioBuffers).forEach(([name, buffer]) => {
      const speaker = speakers.find((speaker) => speaker.name.includes(name.split('_')[0]));
      if (['main', 'hover'].includes(name)) {
        return;
      }
      const audio = new THREE.PositionalAudio(this.listener);
      audio.setBuffer(buffer);
      audio.setRefDistance(buffer.refDistance);
      audio.setRolloffFactor(buffer.rolloffFactor);
      audio.setVolume(buffer.volume);
      audio.setLoop(buffer.loop);

      if (buffer.click) {
        this.clickAudios[name] = audio;
      } else {
        audio.play();
      }

      speaker?.add(audio);
      this.speakerObjects.push(this.convertToSpeaker3D(speaker!));
    });

    const mainAudio = new THREE.Audio(this.listener);
    mainAudio.setBuffer(audioBuffers.main);
    mainAudio.setLoop(audioBuffers.main.loop);
    mainAudio.setVolume(audioBuffers.main.volume);
    mainAudio.play();
    this.instance.add(mainAudio);

    this.hoverAudio = new THREE.Audio(this.listener);
    this.hoverAudio.setBuffer(audioBuffers.hover);
    this.hoverAudio.setVolume(audioBuffers.hover.volume);
    this.instance.add(this.hoverAudio);
  };

  private setupGTLFObjects(textures: Record<string, THREE.Texture>) {
    const oceanObj = this.getSceneObject('Ocean');
    oceanObj.visible = false;
    this.ocean = new Ocean(oceanObj.position, textures.ocean);
    this.instance.add(this.ocean.water);

    const mysqlObj = this.getSceneArmObject('MySQL');
    mysqlObj.traverse((node) => {
      node.frustumCulled = false;
      node.applyOutline = true;
      node.outlineColor = new THREE.Color('#007bb0');
      node.outlineThickness = 5.0;
    });
    const mysqlEmitterObj = mysqlObj.children[1];
    const mysqlEmitterPosition = new THREE.Vector3();
    const mysqlEmitterQuaternion = new THREE.Quaternion();
    mysqlEmitterObj.getWorldPosition(mysqlEmitterPosition);
    mysqlEmitterObj.getWorldQuaternion(mysqlEmitterQuaternion);
    const mysqlWaterEmitter = new WaterEmitter('MySQL', mysqlEmitterPosition, mysqlEmitterQuaternion, textures.waterDrop, 300);
    this.waterEmitters.push(mysqlWaterEmitter);
    this.instance.add(mysqlWaterEmitter.emitterGroup.mesh);

    const phpObj = this.getSceneArmObject('PHP');
    phpObj.traverse((node) => node.frustumCulled = false);
    this.textureAnimator.add(parseTexture(phpObj.children[2].children[1]), -0.34, 5, 3);
    const phpEmitterObj = phpObj.children[1];
    const phpEmitterPosition = new THREE.Vector3();
    const phpEmitterQuaternion = new THREE.Quaternion();
    phpEmitterObj.getWorldPosition(phpEmitterPosition);
    phpEmitterObj.getWorldQuaternion(phpEmitterQuaternion);
    const phpWaterEmitter = new WaterEmitter('PHP', phpEmitterPosition, phpEmitterQuaternion, textures.waterDrop, 1500);
    this.waterEmitters.push(phpWaterEmitter);
    this.instance.add(phpWaterEmitter.emitterGroup.mesh);

    const ferrisObj = this.getSceneArmObject('Ferris');
    ferrisObj.traverse((node) => node.frustumCulled = false);
    this.textureAnimator.add(parseTexture(ferrisObj.children[5].children[1]), [0, -0.42, -0.7], 10);
    const ferrisEmitterObj = ferrisObj.children[4];
    const ferrisEmitterPosition = new THREE.Vector3();
    const ferrisEmitterQuaternion = new THREE.Quaternion();
    ferrisEmitterObj.getWorldPosition(ferrisEmitterPosition);
    ferrisEmitterObj.getWorldQuaternion(ferrisEmitterQuaternion);
    const ferrisWaterEmitter = new WaterEmitter('Ferris', ferrisEmitterPosition, ferrisEmitterQuaternion, textures.waterDrop, 200);
    this.waterEmitters.push(ferrisWaterEmitter);
    this.instance.add(ferrisWaterEmitter.emitterGroup.mesh);

    const dockerObj = this.getSceneArmObject('Docker');
    dockerObj.traverse((node) => node.frustumCulled = false);
    this.textureAnimator.add(parseTexture(dockerObj.children[1].children[1]), [0, -0.32, -0.68], 5);

    const jsTux = this.instance.children.find((child) => child.name === 'Scene')
      ?.children.find((child) => child.name === 'JS_Tux');
    const react = this.getSceneArmObject('React', jsTux?.children[0].children[0]);
    this.trackObjects.push(react);

    const tuxObj = this.getSceneArmObject('Tux', jsTux);
    tuxObj.traverse((node) => node.frustumCulled = false);
    this.textureAnimator.add(parseTexture(tuxObj.children[1].children[3]), [0, -0.36, -0.68], 5);

    const gitlabObj = this.getSceneArmObject('GitLab');
    gitlabObj.traverse((node) => node.frustumCulled = false);

    const javaLaravel = this.instance.children.find((child) => child.name === 'Scene')
      ?.children.find((child) => child.name === 'Java_Laravel');
    const java = this.getSceneArmObject('Java', javaLaravel);
    java.traverse((node) => node.frustumCulled = false);

    const umbObj = this.getSceneArmObject('Umbrella').children.find((child) => child.name === 'Umbrella_obj') as THREE.SkinnedMesh;
    umbObj.material = new THREE.ShaderMaterial({
      uniforms: {
        texture1: { value: textures.umbrellaOut },
        texture2: { value: textures.umbrellaIn },
        rotation: { value: Math.PI },
        transition: { value: 0.0 },
      },
      vertexShader: textureMixShaderVertex,
      fragmentShader: textureMixShaderFragment,
    });
    this.clickTextures['Umbrella'] = {
      material: umbObj.material as THREE.ShaderMaterial,
      state: 'out',
      speed: 1.3,
    };
  };

  private getSceneObject(name: string, obj?: THREE.Object3D): TScene {
    return (obj ?? this.gtlf.scene)?.children.find((child) => child.name === name) as TScene;
  };

  private getSceneArmObject(name: string, obj?: THREE.Object3D): TScene {
    return this.getSceneObject(name, obj)?.children.find((child) => child.name === `${name}_1`) as TScene;
  };

  private convertToSpeaker3D(object: THREE.Object3D): Speaker3D {
    (object as Speaker3D).getAudio = () => (object as Speaker3D).children[0] as THREE.Audio<GainNode | PannerNode>;
    (object as Speaker3D).getBuffer = () => (object as Speaker3D).getAudio().buffer as AudioBuffer3D;
    return object as Speaker3D;
  };

  private getAnimationClipData(clipName: string) {
    const [param1, param2, param3] = clipName.split('_') as [string, string, string | undefined];
    let [type, name] = [param1, param2]; // e.g. 'MAIN_Action'
    if (param3 && clipTypes.includes(param2 as ClipType)) { // e.g. 'MAIN_NEXT_Action'
      [type, name] = [param2 as ClipType, param3];
    }
    return { type, name } as { type: ClipType, name: string };
  };

  private playAnimationDependencies(name: string, type: ClipType, animationSequence: Map<string, THREE.AnimationClip>) {
    switch (type) {
      case 'MAIN': {
        const speaker = this.speakerObjects.find((speaker) => speaker.name.slice(0, -8) === name); // remove '_SPEAKER'
        if (speaker && !speaker.getAudio().loop) {
          speaker.getAudio().stop();
          speaker.getAudio().play();
        }
        const emitterAnimation = animationSequence.get(`MAIN_EMIT_${name}`);
        if (emitterAnimation) {
          this.mixer.clipAction(emitterAnimation).reset();
        }
        break;
      }
      case 'EMIT': {
        const waterEmitter = this.waterEmitters.find((waterDrop) => waterDrop.name === name);
        if (waterEmitter) {
          waterEmitter.enable();
        }
        break;
      }
    }
  };

  private updateTexture(delta: number, texture: ClickTexture) {
    if (
      (texture.material.uniforms.transition.value === 0.0 && texture.state === 'out') ||
      (texture.material.uniforms.transition.value === 1.0 && texture.state === 'in')
    ) {
      return;
    }
    const add = delta * (texture.state === 'in' ? 1 : -1);
    texture.material.uniforms.transition.value += add * texture.speed;
    if (texture.state === 'in' && texture.material.uniforms.transition.value >= 1.0) {
      texture.material.uniforms.transition.value = 1.0;
    } else if (texture.state === 'out' && texture.material.uniforms.transition.value <= 0.0) {
      texture.material.uniforms.transition.value = 0.0;
    }
  };

  public update(delta: number) {
    this.mixer?.update(delta);
    this.textureAnimator.update(delta);
    this.ocean?.update(delta);
    this.waterEmitters.forEach((waterDrop) => waterDrop.update(delta));
    Object.values(this.clickTextures).forEach((texture) => this.updateTexture(delta, texture));
  };
}
