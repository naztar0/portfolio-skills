export const DEBUG = false;
export const BG_COLOR = '#87c5eb';

export const SCENE_FILE = '/main.glb';
export const TEXTURE = {
  ocean: {
    file: '/textures/water_normals.jpg',
    colorSpace: '',
  },
  waterDrop: {
    file: '/textures/water_drop.webp',
    colorSpace: 'srgb',
  },
  umbrellaIn: {
    file: '/textures/umbrella_in.webp',
    colorSpace: 'srgb',
  },
  umbrellaOut: {
    file: '/textures/umbrella_out.webp',
    colorSpace: 'srgb',
  },
};

export const AUDIO = {
  main: {
    file: '/audio/main.mp3',
    volume: 0.1,
    refDistance: 0,
    rolloffFactor: 0,
    loop: true,
    click: false,
  },
  hover: {
    file: '/audio/hover.mp3',
    volume: 0.01,
    refDistance: 0,
    rolloffFactor: 0,
    loop: false,
    click: false,
  },
  JSCastle: {
    file: '/audio/js_castle.mp3',
    volume: 1,
    refDistance: 1,
    rolloffFactor: 12,
    loop: true,
    click: false,
  },
  Node: {
    file: '/audio/node.mp3',
    volume: 0.2,
    refDistance: 1.5,
    rolloffFactor: 8.5,
    loop: true,
    click: false,
  },
  GitLab: {
    file: '/audio/gitlab.mp3',
    volume: 0.8,
    refDistance: 1.5,
    rolloffFactor: 8.5,
    loop: false,
    click: false,
  },
  Ferris: {
    file: '/audio/ferris.mp3',
    volume: 1,
    refDistance: 1.5,
    rolloffFactor: 8.5,
    loop: false,
    click: false,
  },
  MariaDB: {
    file: '/audio/mariadb.mp3',
    volume: 1,
    refDistance: 1.5,
    rolloffFactor: 8.5,
    loop: false,
    click: false,
  },
  Java: {
    file: '/audio/java.mp3',
    volume: 1,
    refDistance: 1.5,
    rolloffFactor: 8.5,
    loop: false,
    click: false,
  },
  Tux: {
    file: '/audio/tux.mp3',
    volume: 1,
    refDistance: 1.5,
    rolloffFactor: 8.5,
    loop: false,
    click: false,
  },
  PHP: {
    file: '/audio/php.mp3',
    volume: 1.5,
    refDistance: 3,
    rolloffFactor: 12,
    loop: false,
    click: false,
  },
  Umbrella_in: {
    file: '/audio/umbrella_in.mp3',
    volume: 1,
    refDistance: 5,
    rolloffFactor: 8,
    loop: false,
    click: true,
  },
};
