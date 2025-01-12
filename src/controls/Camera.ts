import * as THREE from 'three';

export class Camera {
  public readonly camera: THREE.PerspectiveCamera;

  protected constructor() {
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  public onKeyUp(_: KeyboardEvent) {
    // stub
  }

  public onKeyDown(_: KeyboardEvent) {
    // stub
  }

  public moveCameraPosition(_a: any, _b: CameraAnimationType) {
    // stub
  }

  public moveCameraTarget(_a: any, _b: CameraAnimationType) {
    // stub
  }
}