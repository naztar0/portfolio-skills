import StatsModule from 'three/addons/libs/stats.module.js';
import { DEBUG } from '@/config';

export class Stats {
  private readonly instance?: StatsModule;

  constructor() {
    if (DEBUG) {
      this.instance = new StatsModule();
      document.body.appendChild(this.instance.dom);
    }
  }

  public update() {
    if (!DEBUG) {
      this.instance?.update();
    }
  }
}