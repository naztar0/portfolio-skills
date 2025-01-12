import * as THREE from 'three';
import { MeshStandardMaterial } from 'three';

interface TextureAnimatorData {
  texture: THREE.Texture;
  offsets: number[];
  duration: number;
  currentOffset: number;
  lastTime: number;
}

export class TextureAnimator {
  private readonly data: TextureAnimatorData[];

  constructor() {
    this.data = [];
  };

  public add(texture: THREE.Texture, offsets: number | number[], duration: number, numFrames?: number) {
    if (typeof offsets === 'number') {
      offsets = Array.from({ length: numFrames ?? 1 }, (_, i) => offsets as number * i);
    }
    this.data.push({
      texture,
      offsets,
      duration,
      currentOffset: 0,
      lastTime: 0,
    });
  };

  public update(delta: number) {
    this.data.forEach((data) => {
      data.lastTime += delta;
      if (data.lastTime >= data.duration) {
        data.lastTime = 0;
        data.currentOffset = (data.currentOffset + 1) % data.offsets.length;
        data.texture.offset.y = data.offsets[data.currentOffset];
      }
    });
  };
}

export const parseTexture = (object: any) => {
  return ((object as THREE.Mesh).material as MeshStandardMaterial).map!;
}
