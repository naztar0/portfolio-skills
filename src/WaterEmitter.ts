import * as THREE from 'three';
import * as ParticleSystem from '@zappar/threejs-particle-system';
import { degToRad } from '@/utils';

const EMITTERS: Record<string, ParticleSystem.IEmitterOptions> = {
  PHP: {
    particleCount: 1000,
    maxAge: {
      value: 3,
    },
    rotation: {
      axis: new THREE.Vector3(0, 0, 1),
      axisSpread: new THREE.Vector3(0.5, 0.5, 0),
      angle: degToRad(180),
    },
    size: {
      value: 0.04,
      spread: 0.04,
    },
    velocity: {
      value: new THREE.Vector3(0, 0.6, 0),
      spread: new THREE.Vector3(0.2, 0.3, 0.2),
    },
    acceleration: {
      value: new THREE.Vector3(0, 0.5, 0),
    },
    position: {
      value: new THREE.Vector3(0, 0, 0),
      spread: new THREE.Vector3(0.02, 0, 0.02),
    },
  },
  MySQL: {
    particleCount: 2000,
    maxAge: {
      value: 2,
    },
    rotation: {
      axis: new THREE.Vector3(0, 0, 0),
      axisSpread: new THREE.Vector3(1, 0, 1),
      angle: degToRad(230),
    },
    size: {
      value: 0.03,
      spread: 0.04,
    },
    velocity: {
      value: new THREE.Vector3(0, 4, 0),
      spread: new THREE.Vector3(1, 1, 1),
    },
  },
  Ferris: {
    particleCount: 2000,
    maxAge: {
      value: 2,
    },
    rotation: {
      axis: new THREE.Vector3(0, 0, 0),
      axisSpread: new THREE.Vector3(1, 0, 1),
      angle: degToRad(280),
    },
    size: {
      value: 0.03,
      spread: 0.04,
    },
    velocity: {
      value: new THREE.Vector3(0, 2, 0),
      spread: new THREE.Vector3(0.1, 0.5, 0.1),
    },
    position: {
      value: new THREE.Vector3(0, 0, 0),
      spread: new THREE.Vector3(0.3, 0, 0.3),
    },
  },
};

export class WaterEmitter {
  public readonly emitterGroup: ParticleSystem.EmitterGroup;
  private startTime = 0;
  private enabled = true;

  constructor(
    public readonly name: keyof typeof EMITTERS,
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
    texture: THREE.Texture,
    public timeout = 0,
  ) {
    this.emitterGroup = this.setupEmitterGroup(texture);
    this.emitterGroup.mesh.position.copy(position);
    this.emitterGroup.mesh.setRotationFromQuaternion(rotation);
  };

  private setupEmitterGroup = (texture: THREE.Texture) => {
    const emitterGroup = new ParticleSystem.EmitterGroup({
      billboard: 'spherical',
      maxParticleCount: 2000,
      texture: { value: texture },
      blending: THREE.NormalBlending,
      frustumCulled: false,
    });

    const emitter = new ParticleSystem.Emitter(EMITTERS[this.name]);

    emitterGroup.addEmitter(emitter);

    return emitterGroup;
  };

  public update = (delta: number) => {
    this.emitterGroup.tick(delta);
    if (this.timeout && this.enabled && Date.now() - this.startTime > this.timeout) {
      this.disable();
    }
  };

  public enable = () => {
    this.emitterGroup.emitters[0].enable();
    this.startTime = Date.now();
    this.enabled = true;
  };

  public disable = () => {
    this.emitterGroup.emitters[0].disable();
    this.enabled = false;
  };
}