import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { AudioBuffer3D } from '@/types';
import { AUDIO, TEXTURE, SCENE_FILE } from '@/config';

export class Loader {
  private gtlfLoader: GLTFLoader;
  private gtlfBuffer: GLTF | null = null;
  private textureLoader: THREE.TextureLoader;
  private textureBuffers: Record<string, THREE.Texture> = {};
  private audioLoader: THREE.AudioLoader;
  private audioBuffers: Record<string, AudioBuffer3D> = {};
  private progressEvents: Record<string, ProgressEvent> = {};

  constructor(
    private onProgress: (event: { loaded: number; total: number }) => void,
    private onComplete: (
      gtlf: GLTF,
      textures: Record<string, THREE.Texture>,
      audio: Record<string, AudioBuffer3D>,
    ) => void,
  ) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    this.gtlfLoader = new GLTFLoader();
    this.gtlfLoader.setDRACOLoader(dracoLoader);
    this.audioLoader = new THREE.AudioLoader();
    this.textureLoader = new THREE.TextureLoader();
  };

  public loadAssets = () => {
    this.gtlfLoader.loadAsync(SCENE_FILE, (e) => this.mergeProgress(e, SCENE_FILE)).then((gltf) => {
      this.gtlfBuffer = gltf;
      this.mergeComplete();
    });
    Object.entries(TEXTURE).forEach(([key, value]) => {
      this.textureLoader.loadAsync(value.file, (e) => this.mergeProgress(e, key)).then((texture) => {
        texture.flipY = false;
        texture.colorSpace = value.colorSpace as THREE.ColorSpace;
        this.textureBuffers[key] = texture;
        this.mergeComplete();
      });
    });
    Object.entries(AUDIO).forEach(([key, value]) => {
      this.audioLoader.loadAsync(value.file, (e) => this.mergeProgress(e, key)).then((buffer) => {
        const audioBuffer3D = buffer as AudioBuffer3D;
        audioBuffer3D.volume = value.volume;
        audioBuffer3D.loop = value.loop;
        audioBuffer3D.click = value.click;
        audioBuffer3D.refDistance = value.refDistance;
        audioBuffer3D.rolloffFactor = value.rolloffFactor;
        this.audioBuffers[key] = audioBuffer3D;
        this.mergeComplete();
      });
    });
  };

  private mergeProgress(event: ProgressEvent, name: string) {
    this.progressEvents[name] = event;
    const totalLoaded = Object.values(this.progressEvents).reduce((acc, curr) => acc + curr.loaded, 0);
    const totalSize = Object.values(this.progressEvents).reduce((acc, curr) => acc + curr.total, 0);
    this.onProgress({
      loaded: totalLoaded,
      total: totalSize,
    });
  };

  private mergeComplete() {
    if (
      this.gtlfBuffer &&
      Object.keys(TEXTURE).length === Object.keys(this.textureBuffers).length &&
      Object.keys(AUDIO).length === Object.keys(this.audioBuffers).length
    ) {
      this.onComplete(this.gtlfBuffer, this.textureBuffers, this.audioBuffers);
    }
  };
}
