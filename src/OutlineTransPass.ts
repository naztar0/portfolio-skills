import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { Scene } from '@/types';
import fragmentShader from '@/assets/shaders/outlineFragment.glsl?raw';
import vertexShader from '@/assets/shaders/outlineVertex.glsl?raw';

interface Camera extends THREE.Camera {
  near: number;
  far: number;
}

interface Material extends THREE.Material {
  uniforms: {
    [key: string]: THREE.IUniform;
  };
}

export class OutlineTransPass extends Pass {
  private readonly normalTarget: THREE.WebGLRenderTarget<THREE.Texture>;
  private readonly depthTarget: THREE.WebGLRenderTarget<THREE.Texture>;
  private readonly normalOverrideMaterial: THREE.MeshNormalMaterial;
  private fsQuad: FullScreenQuad;

  constructor(
    private readonly resolution: THREE.Vector2,
    private readonly renderScene: Scene,
    private readonly renderCamera: Camera,
  ) {
    super();

    this.fsQuad = new FullScreenQuad();
    this.fsQuad.material = this.createOutlinePostProcessMaterial();

    // create a buffer to store the normals of the scene onto
    const normalTarget = new THREE.WebGLRenderTarget(
      this.resolution.x,
      this.resolution.y,
    );
    normalTarget.texture.format = THREE.RGBFormat;
    normalTarget.texture.minFilter = THREE.NearestFilter;
    normalTarget.texture.magFilter = THREE.NearestFilter;
    normalTarget.texture.generateMipmaps = false;
    normalTarget.stencilBuffer = false;
    // this stores the depth buffer containing only objects that will have outlines
    normalTarget.depthBuffer = true;
    normalTarget.depthTexture = new THREE.DepthTexture(this.resolution.x, this.resolution.y);
    normalTarget.depthTexture.type = THREE.UnsignedShortType;

    this.normalTarget = normalTarget;
    // create a buffer to store the depth of the scene we don't use the default depth buffer because this one includes only objects that have the outline applied
    const depthTarget = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y );
    depthTarget.texture.format = THREE.RGBFormat;
    depthTarget.texture.minFilter = THREE.NearestFilter;
    depthTarget.texture.magFilter = THREE.NearestFilter;
    depthTarget.texture.generateMipmaps = false;
    depthTarget.stencilBuffer = false;
    depthTarget.depthBuffer = true;
    depthTarget.depthTexture = new THREE.DepthTexture(this.resolution.x, this.resolution.y);
    depthTarget.depthTexture.type = THREE.UnsignedShortType;
    this.depthTarget = depthTarget;

    this.normalOverrideMaterial = new THREE.MeshNormalMaterial();
  };

  // functions for hiding/showing objects based on whether they should have outlines applied
  setOutlineObjectsVisible(bVisible: boolean) {
    this.renderScene.traverse((node) => {
      if (node.applyOutline && ['Mesh', 'SkinnedMesh'].includes(node.type)) {
        if (!bVisible) {
          node.oldVisibleValue = node.visible;
          node.visible = false;
        } else {
          // Restore the original visible value. This way objects that were originally hidden stay hidden
          if (node.oldVisibleValue !== undefined) {
            node.visible = node.oldVisibleValue;
            delete node.oldVisibleValue;
          }
        }
      }
    });
  };

  setNonOutlineObjectsVisible(bVisible: boolean) {
    this.renderScene.traverse((node) => {
      if (!node.applyOutline && ['Mesh', 'SkinnedMesh'].includes(node.type)) {
        if (!bVisible) {
          node.oldVisibleValue = node.visible;
          node.visible = false;
        } else {
          // Restore the original visible value. This way objects that were originally hidden stay hidden
          if (node.oldVisibleValue != undefined) {
            node.visible = node.oldVisibleValue;
            delete node.oldVisibleValue;
          }
        }
      }
    });
  };

  /*
  This is a modified pipeline from the original outlines effect
  to support outlining individual objects.

  1 - Render all objects to get final color buffer with regular depth buffer
      (this is done in index.js)

  2 - Render only non-outlines objects to get `nonOutlinesDepthBuffer`.
      (we need this to depth test our outlines so they render behind objects)

  3 - Render all outlines objects to get normal buffer and depth buffer, which are inputs for the outline effect.
      This must NOT include objects that won't have outlines applied.

  4 - Render outline effect, using normal and depth buffer that contains only outline objects,
       use the `nonOutlinesDepthBuffer` for depth test. And finally, combine with the final color buffer.
  */

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    // Turn off writing to the depth buffer
    // because we need to read from it in the later passes.
    const depthBufferValue = writeBuffer.depthBuffer;
    writeBuffer.depthBuffer = false;

    // 1. Re-render the scene to capture all normals in texture.
    // Ideally, we could capture this in the first render pass along with
    // the depth texture.
    renderer.setRenderTarget(this.normalTarget);

    const overrideMaterialValue = this.renderScene.overrideMaterial;
    this.renderScene.overrideMaterial = this.normalOverrideMaterial;
    // Only include objects that have the "applyOutline" property.
    // We do this by hiding all other objects temporarily.
    this.setNonOutlineObjectsVisible(false);
    renderer.render(this.renderScene, this.renderCamera);
    this.setNonOutlineObjectsVisible(true);

    this.renderScene.overrideMaterial = overrideMaterialValue;

    // 2. Re-render the scene to capture the depth of objects that do NOT have outlines
    renderer.setRenderTarget(this.depthTarget);

    this.setOutlineObjectsVisible(false);
    renderer.render(this.renderScene, this.renderCamera);
    this.setOutlineObjectsVisible(true);

    (this.fsQuad.material as Material).uniforms['depthBuffer'].value = this.normalTarget.depthTexture;
    (this.fsQuad.material as Material).uniforms['normalBuffer'].value = this.normalTarget.texture;
    (this.fsQuad.material as Material).uniforms['sceneColorBuffer'].value = readBuffer.texture;
    (this.fsQuad.material as Material).uniforms['nonOutlinesDepthBuffer'].value = this.depthTarget.depthTexture;

    this.renderScene.traverse((node) => {
      if (node.applyOutline) {
        (this.fsQuad.material as Material).uniforms['outlineColor'].value = node.outlineColor || new THREE.Color(0xffffff);
        (this.fsQuad.material as Material).uniforms['outlineThickness'].value = node.outlineThickness || 1.0;
      }
    });

    // 3. Draw the outlines using the depth texture and normal texture
    // and combine it with the scene color
    if (this.renderToScreen) {
      // If this is the last effect, then renderToScreen is true.
      // So we should render to the screen by setting target null
      // Otherwise, render into the writeBuffer that the next effect will use as its read buffer.
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
    }

    // Reset the depthBuffer value so we continue writing to it in the next render.
    writeBuffer.depthBuffer = depthBufferValue;
  };

  createOutlinePostProcessMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        sceneColorBuffer: { value: undefined },
        depthBuffer: { value: undefined },
        normalBuffer: { value: undefined },
        nonOutlinesDepthBuffer: { value: undefined },
        outlineColor: { value: new THREE.Color(0xffffff) },
        outlineThickness: { value: 1.0 },
        // depth multiplier, depth bias, and same for normals
        multiplierParameters: { value: new THREE.Vector4(1, 1, 2, 0.7) },
        cameraNear: { value: this.renderCamera.near },
        cameraFar: { value: this.renderCamera.far },
        screenSize: {
          value: new THREE.Vector4(
            this.resolution.x,
            this.resolution.y,
            1 / this.resolution.x,
            1 / this.resolution.y
          ),
        },
      },
      vertexShader,
      fragmentShader,
    });
  };
}
