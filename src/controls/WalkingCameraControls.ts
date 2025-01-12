import * as THREE from 'three';

import { Camera } from '@/controls/Camera';
import { PointerLockControls } from '@/controls/Controls';

export class WalkingCameraControls extends Camera {
  public readonly defaultPosition = new THREE.Vector3(0, 0.9, 0.5);
  public readonly defaultTarget = new THREE.Vector3(3, 0, -3);
  public readonly controls: PointerLockControls;
  private moveForward: boolean;
  private moveBackward: boolean;
  private moveLeft: boolean;
  private moveRight: boolean;
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;

  private readonly cameraConstraints = [
    new THREE.Vector2(4, -3),
    new THREE.Vector2(7, -3),
    new THREE.Vector2(7, 3),
    new THREE.Vector2(4, 3),
    new THREE.Vector2(4, 6),
    new THREE.Vector2(-3.5, 6),
    new THREE.Vector2(-3.5, 0.5),
    new THREE.Vector2(-2.5, -0.2),
    new THREE.Vector2(2.5, -0.2),
    new THREE.Vector2(4, -1.7),
  ];

  constructor(
    readonly renderer: THREE.WebGLRenderer,
    private readonly trackObjects: THREE.Object3D[],
    private readonly listener: THREE.AudioListener,
  ) {
    super();

    this.controls = new PointerLockControls(this.camera, renderer.domElement);

    this.camera.position.set(this.defaultPosition.x, this.defaultPosition.y, this.defaultPosition.z);
    this.camera.lookAt(this.defaultTarget.x, this.defaultTarget.y, this.defaultTarget.z);

    this.controls.pointerSpeed = 1;

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
  };

  public debugCameraConstraints(scene: THREE.Scene) {
    const points = this.cameraConstraints.map(p => new THREE.Vector3(p.x, 0.5, p.y));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    points.push(points[0]);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.LineLoop(geometry, material);
    scene.add(line);
  };

  private pointInPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]): boolean {
    let inside = false;

    for (let i = 0; i <= polygon.length - 1; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];

      if (a.y > point.y !== b.y > point.y && point.x < a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y)) {
        inside = !inside;
      }
    }

    return inside;
  };

  private closestPointOnSegment(point: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    const ab = b.clone().sub(a);
    const ap = point.clone().sub(a);
    const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)));
    return a.clone().add(ab.multiplyScalar(t));
  };

  private getClosestPointOnPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]): THREE.Vector2 {
    let closestPoint = polygon[0];
    let minDistance = Infinity;

    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const closestPointOnEdge = this.closestPointOnSegment(point, a, b);

      const distance = closestPointOnEdge.distanceTo(point);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = closestPointOnEdge;
      }
    }

    return closestPoint;
  };

  public enableListener() {
    this.camera.add(this.listener);
  };

  public disableListener() {
    this.camera.remove(this.listener);
  };

  public onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        break;
    }
  };

  public onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = false;
        break;
    }
  };

  public update(delta: number) {
    if (this.controls.isLocked) {
      this.velocity.x -= this.velocity.x * 10.0 * delta;
      this.velocity.z -= this.velocity.z * 10.0 * delta;

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize(); // this ensures consistent movements in all directions

      if (this.moveForward || this.moveBackward) {
        this.velocity.z -= this.direction.z * 20.0 * delta;
      }
      if (this.moveLeft || this.moveRight) {
        this.velocity.x -= this.direction.x * 20.0 * delta;
      }

      const cameraPosition = new THREE.Vector2(this.camera.position.x, this.camera.position.z);

      if (!this.pointInPolygon(cameraPosition, this.cameraConstraints)) {
        const closestPoint = this.getClosestPointOnPolygon(cameraPosition, this.cameraConstraints);
        this.camera.position.x = closestPoint.x;
        this.camera.position.z = closestPoint.y;
      }

      this.controls.moveRight(-this.velocity.x * delta);
      this.controls.moveForward(-this.velocity.z * delta);

      this.trackObjects.forEach((obj) => obj.lookAt(this.camera.position));
    }
  };
}