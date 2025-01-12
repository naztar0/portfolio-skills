import * as THREE from 'three';
import { Easing } from '@tweenjs/tween.js';
import { WalkingCameraControls } from '@/controls/WalkingCameraControls';
import { OrbitCameraControls } from '@/controls/OrbitCameraControls';
import { findObjects } from '@/utils';
import leftArrow from '@/assets/icons/left_arrow.svg?raw';

export class RayCaster {
  private readonly instance: THREE.Raycaster;
  private readonly mousePointer: THREE.Vector2;
  private readonly pointerCoords: THREE.Vector2;
  private readonly boxObjects: THREE.Object3D<THREE.Object3DEventMap>[] = [];
  private readonly boxOutlineObjects: THREE.Object3D<THREE.Object3DEventMap>[] = [];
  private readonly backButton: HTMLButtonElement;
  private hoverAudio: THREE.Audio | null = null;
  private clickAnimations: Record<string, THREE.AnimationAction> = {};
  private clickTextures: Record<string, ClickTexture> = {};
  private clickAudios: Record<string, THREE.Audio<GainNode | PannerNode>> = {};
  private currentParent: keyof typeof this.boxObjectNames = '';
  private lastObjectId = 0;

  private readonly boxObjectNames = {
    '': [
      'Docker', 'Ferris', 'MySQL', 'Wireshark', 'PHP', 'JSCastle', 'Tux',
      'GitLab', 'MariaDB', 'Node', 'Mongo', 'Laravel', 'Java', 'Suzanne', 'Umbrella',
    ],
    'JSCastle': [
      'JSPennant', 'NextJS', 'SolidJS', 'AdonisJS', 'ThreeJS', 'React',
    ],
    'Umbrella': [
      'AePr', 'Android', 'Au', 'CArduino', 'Cinema4D', 'Ffmpeg', 'Git', 'Graphql', 'Kafka',
      'Nginx', 'PostgreSQL', 'PsAi', 'Pt', 'Python', 'Redis', 'TonBtc', 'UnitySharp',
    ],
  };

  private readonly boxOutlineObjectNames = [
    ...this.boxObjectNames['Umbrella'],
  ];

  private readonly clickAnimationStates: Record<string, ClickAnimationState> = {
    'Umbrella': {
      current: 'init',
      map: {
        'init': 'in',
        'in': 'out',
        'out': 'in',
      },
    },
  };

  private readonly clickTextureStates: Record<string, ClickTextureState> = {
    'Umbrella': {
      current: 'out',
      map: {
        'in': 'out',
        'out': 'in',
      },
    },
  };

  private readonly clickAudioStates: Record<string, ClickAudioState> = {
    'Umbrella': {
      current: 'out',
      map: {
        'in': 'out',
        'out': 'in',
      },
    },
  };

  constructor(
    private readonly cameraControls: WalkingCameraControls | OrbitCameraControls,
    private readonly scene: THREE.Scene,
    private readonly getCameraControlsType: () => CameraControlsType,
    private readonly outlineCallback: (object: THREE.Object3D[]) => void,
    private readonly showMessage: (objectName?: string) => void,
  ) {
    this.instance = new THREE.Raycaster();
    this.mousePointer = new THREE.Vector2();
    this.pointerCoords = new THREE.Vector2();

    this.backButton = document.createElement('button');
    this.backButton.classList.add('back-button');
    this.backButton.innerHTML = leftArrow;
    this.backButton.onclick = this.resetParent.bind(this);
    document.body.appendChild(this.backButton);
  };

  public initialize(
    audio: THREE.Audio,
    animations: Record<string, THREE.AnimationAction>,
    textures: Record<string, ClickTexture>,
    audios: Record<string, THREE.Audio<GainNode | PannerNode>>,
  ) {
    this.hoverAudio = audio;
    this.clickAnimations = animations;
    this.clickTextures = textures;
    this.clickAudios = audios;
    const parents = this.scene.children.find((child) => child.name === 'Scene')!;
    findObjects(parents, '_BOX', this.boxObjects);
    findObjects(parents, '_OUTLINE', this.boxOutlineObjects);
    this.boxObjects.forEach((object) => object.visible = false);
    this.boxOutlineObjects.forEach((object) => object.visible = false);
  };

  private currentObjects() {
    return this.boxObjects.filter((object) =>
      this.boxObjectNames[this.currentParent].includes(object.name.slice(0, -4))); // remove _BOX
  };

  private getMouseVector2(event: PointerEvent): THREE.Vector2 {
    return new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
  };

  private checkRayIntersections(): THREE.Intersection[] {
    this.instance.setFromCamera(this.mousePointer, this.cameraControls.camera);
    return this.instance.intersectObjects(this.currentObjects());
  };

  private findParent(object: THREE.Object3D): THREE.Object3D {
    if (
      !object.parent ||
      this.boxObjectNames[this.currentParent].includes(object.name) ||
      this.boxOutlineObjectNames.includes(object.name.slice(0, -8)) // remove _OUTLINE
    ) {
      return object;
    }
    return this.findParent(object.parent);
  };

  private outlineObjects(pointerEvent: PointerEvent) {
    if (this.getCameraControlsType() !== 'Orbit') {
      return;
    }
    const mouseVector = this.getMouseVector2(pointerEvent);
    this.mousePointer.set(mouseVector.x, mouseVector.y);
    const objects = [this.checkRayIntersections()[0]]
      .filter((obj) => obj !== undefined)
      .map((obj) => {
        return this.findParent(obj.object)
      });
    this.boxOutlineObjects.forEach((object) => object.visible = false);
    if (this.boxOutlineObjects.includes(objects[0])) {
      objects[0].visible = true;
    } else {
      this.outlineCallback(objects);
    }
    return objects[0];
  };

  private playAnimation(objectName: string) {
    const animationState = this.clickAnimationStates[objectName];
    if (animationState) {
      const getAnimation = () =>
        Object.keys(this.clickAnimations).find(
          (key) => key.includes(`${objectName}_${animationState.current}`)
        );
      const prevAnimation = getAnimation();
      if (prevAnimation) {
        this.clickAnimations[prevAnimation].stop();
      }
      animationState.current = animationState.map[animationState.current];
      const animation = getAnimation();
      if (animation) {
        this.clickAnimations[animation].play();
      }
    }
  };

  private playTextureTransition(objectName: string) {
    const textureState = this.clickTextureStates[objectName];
    if (textureState) {
      textureState.current = textureState.map[textureState.current];
      const texture = this.clickTextures[objectName];
      if (texture) {
        texture.state = textureState.current;
      }
    }
  };

  private playAudioTransition(objectName: string) {
    const audioState = this.clickAudioStates[objectName];
    if (audioState) {
      audioState.current = audioState.map[audioState.current];
      const audio = this.clickAudios[`${objectName}_${audioState.current}`];
      if (audio) {
        audio.stop();
        audio.play();
      }
    }
  };

  public onPointerMove(event: PointerEvent) {
    const object = this.outlineObjects(event);
    if (object && object.id !== this.lastObjectId) {
      this.lastObjectId = object.id;
      this.hoverAudio?.play();
      this.showMessage(object.name.split('_')[0]);
    } else if (!object) {
      this.lastObjectId = 0;
      this.showMessage();
    }
  };

  public onPointerDown(event: PointerEvent) {
    this.pointerCoords.set(event.clientX, event.clientY);
  };

  public onPointerUp(event: PointerEvent) {
    const coords = new THREE.Vector2(event.clientX, event.clientY);
    if (!coords.equals(this.pointerCoords)) {
      return;
    }
    const object = this.outlineObjects(event);
    if (
      object &&
      Object.keys(this.boxObjectNames).includes(object.name) &&
      this.currentParent !== object.name
    ) {
      // move camera to object
      this.currentParent = object.name as keyof typeof this.boxObjectNames;
      const objectWorldPosition = new THREE.Vector3();
      object.getWorldPosition(objectWorldPosition);
      this.cameraControls.moveCameraTarget({
        vector: objectWorldPosition,
        duration: 800,
        easing: Easing.Quadratic.InOut,
      }, 'objectSelect');

      // show back button
      this.backButton.classList.add('show');

      // play animations and transitions
      this.playAnimation(this.currentParent);
      this.playTextureTransition(this.currentParent);
      this.playAudioTransition(this.currentParent);
    }
  };

  public resetParent() {
    this.currentParent = '';
    this.cameraControls.moveCameraTarget({
      vector: this.cameraControls.defaultTarget,
      duration: 800,
      easing: Easing.Quadratic.InOut,
    }, 'objectSelect');

    this.backButton.classList.remove('show');

    Object.entries(this.clickAnimationStates).forEach(([key, value]) => {
      if (value.current === 'in') {
        this.playAnimation(key);
      }
    });

    Object.entries(this.clickTextureStates).forEach(([key, value]) => {
      if (value.current === 'in') {
        this.playTextureTransition(key);
      }
    });

    Object.entries(this.clickAudioStates).forEach(([key, value]) => {
      if (value.current === 'in') {
        this.playAudioTransition(key);
      }
    });
  };
}
