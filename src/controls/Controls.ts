import * as THREE from 'three';
import { OrbitControls as OC } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls as PLC } from 'three/addons/controls/PointerLockControls.js';

export class OrbitControls extends OC {
  public lock() {}
  public unlock() {}
}

export class PointerLockControls extends PLC {
  public target: THREE.Vector3 = new THREE.Vector3();
}
