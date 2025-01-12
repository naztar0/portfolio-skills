import * as THREE from 'three';

export const findObjects = (object: THREE.Object3D, suffix: string, result: THREE.Object3D[] = []) => {
  if (object.name.endsWith(suffix)) {
    result.push(object);
  }
  if (object.children.length === 0) {
    return;
  }
  object.children.forEach((child) => findObjects(child, suffix, result));
};

export const degToRad = (degrees: number) => degrees * Math.PI / 180;
