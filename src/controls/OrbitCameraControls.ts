import * as THREE from 'three';
import { Tween, Group } from '@tweenjs/tween.js';
import { Camera } from '@/controls/Camera';
import { OrbitControls } from '@/controls/Controls';
import { MoveProps } from '@/types';


export class OrbitCameraControls extends Camera {
  public readonly defaultPosition = new THREE.Vector3(-2, 2, 3);
  public readonly defaultTarget = new THREE.Vector3(0, 1, 0);
  public readonly controls: OrbitControls;
  private readonly tweenGroupIntro: Group;
  private readonly tweenGroupObjectSelect: Group;
  private readonly maxDistance = 5;

  constructor(
    readonly renderer: THREE.WebGLRenderer,
    private readonly trackObjects: THREE.Object3D[],
    private readonly listener: THREE.AudioListener,
  ) {
    super();

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.tweenGroupIntro = new Group();
    this.tweenGroupObjectSelect = new Group();

    this.camera.position.set(this.defaultPosition.x, this.defaultPosition.y, this.defaultPosition.z);
    this.controls.target.set(this.defaultTarget.x, this.defaultTarget.y, this.defaultTarget.z);

    this.controls.minDistance = 2;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI / 2;
  };

  private moveCamera(property: THREE.Vector3, props: MoveProps | MoveProps[], type: CameraAnimationType) {
    if (!Array.isArray(props)) {
      props = [props];
    }
    if (props.length === 0) {
      return;
    }

    const groups = {
      intro: this.tweenGroupIntro,
      objectSelect: this.tweenGroupObjectSelect,
    };

    const tween = new Tween(property)
      .to(props[0].vector, props[0].duration)
      .easing(props[0].easing)
      .onUpdate(() => {
        if (type === 'objectSelect') {
          this.controls.target.y = this.defaultTarget.y;
        }
      })
      .onComplete(() => {
        props.shift();
        groups[type].remove(tween);
        this.moveCamera(property, props, type);
      })
      .start();

    groups[type].add(tween);
  };

  public moveCameraPosition(props: MoveProps | MoveProps[], type: CameraAnimationType) {
    this.moveCamera(this.camera.position, props, type);
  };

  public moveCameraTarget(props: MoveProps | MoveProps[], type: CameraAnimationType) {
    this.moveCamera(this.controls.target, props, type);
  };

  public enableListener() {
    this.camera.add(this.listener);
  };

  public disableListener() {
    this.camera.remove(this.listener);
  };

  public update(delta: number) {
    if (!this.tweenGroupIntro.allStopped()) {
      this.controls.enabled = false;
      this.controls.maxDistance = Infinity;
      this.tweenGroupIntro.update();
    } else {
      this.controls.enabled = true;
      this.controls.maxDistance = this.maxDistance;
    }

    this.tweenGroupObjectSelect.update();

    this.controls.update(delta);
    this.trackObjects.forEach((obj) => obj.lookAt(this.camera.position));
  };
}