import * as THREE from 'three';

export interface MoveProps {
  vector: THREE.Vector3;
  duration: number;
  easing?: (k: number) => number;
}

interface Object3D extends THREE.Object3D {
  applyOutline?: boolean;
  oldVisibleValue?: boolean;
  outlineColor?: THREE.Color;
  outlineThickness?: number;
}

export interface Scene extends THREE.Scene {
  traverse(callback: (node: Object3D) => void): void;
}

export interface Speaker3D extends Object3D {
  getAudio(): THREE.Audio<GainNode | PannerNode>;
  getBuffer(): AudioBuffer3D;
}

export interface AudioBuffer3D extends AudioBuffer {
  volume: number;
  loop: boolean;
  click: boolean;
  refDistance: number;
  rolloffFactor: number;
}
