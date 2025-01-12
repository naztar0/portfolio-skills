type ClipType = 'MAIN' | 'ONCE' | 'NEXT' | 'EMIT' | 'CLICK';

type CameraControlsType = 'Orbit' | 'Walking';
type CameraAnimationType = 'intro' | 'objectSelect';

interface ClickTexture {
  material: THREE.ShaderMaterial;
  state: TextureState;
  speed: number;
}

type TextureState = 'out' | 'in';
interface ClickTextureState {
  current: TextureState;
  map: {
    [key in TextureState]: TextureState;
  };
}

type AudioState = 'out' | 'in';
interface ClickAudioState {
  current: AudioState;
  map: {
    [key in AudioState]: AudioState;
  };
}

type AnimationState = 'init' | 'in' | 'out';
interface ClickAnimationState {
  current: AnimationState;
  map: {
    [key in AnimationState]: AnimationState;
  };
}
