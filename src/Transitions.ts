import * as THREE from 'three';
import { Easing } from '@tweenjs/tween.js';
import { MoveProps } from '@/types';

export class Transitions {
  static initCameraTransition(endPosition: THREE.Vector3): MoveProps[] {
    return [
      { vector: new THREE.Vector3(0, 40, 0), duration: 0 },
      { vector: new THREE.Vector3(0, 40, 0), duration: 100 },
      { vector: new THREE.Vector3(0, 8, 5), duration: 4000, easing: Easing.Quadratic.In },
      { vector: new THREE.Vector3(-0.1, 7.5, 5), duration: 60, easing: Easing.Linear.None },
      { vector: endPosition, duration: 1500, easing: Easing.Quartic.Out },
    ];
  }
}