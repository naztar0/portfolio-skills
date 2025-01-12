import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

export class Ocean {
  private readonly geometrySize = 13.1;
  private readonly materialSize = 10;
  private readonly distortionScale = 3.7;
  private readonly colorTimeout = 5;
  private readonly speed = 0.4;
  private readonly color1 = new THREE.Color('#244059');
  private readonly color2 = new THREE.Color('#001e0f');
  private readonly sunDirection1 = new THREE.Vector3(0, 0, 0);
  private readonly sunDirection2 = new THREE.Vector3(-5, 0, -5);
  private colorChanged = false;

  public water: Water;

  constructor(position: THREE.Vector3, texture: THREE.Texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    const geometry = new THREE.PlaneGeometry(this.geometrySize, this.geometrySize);

    this.water = new Water(
      geometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: texture,
        sunColor: 0xffffff,
        sunDirection: this.sunDirection1,
        waterColor: this.color1,
        distortionScale: this.distortionScale,
      }
    );

    this.water.material.uniforms.size.value = this.materialSize;
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.copy(position);
  };

  public update(delta: number) {
    this.water.material.uniforms.time.value -= delta * this.speed;

    if (!this.colorChanged && this.water.material.uniforms.time.value > this.colorTimeout) {
      this.water.material.uniforms.waterColor.value = this.color2;
      this.water.material.uniforms.sunDirection.value = this.sunDirection2;
      this.colorChanged = true;
    }
  };
}
