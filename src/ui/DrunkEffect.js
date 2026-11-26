import { DRUNK_FX_CONFIG } from '../constants/expansion.js';

const WARP_KEY = 'rexWarpPostFx';
const SWIRL_KEY = 'rexSwirlPostFx';
const CHROMA_KEY = 'DrunkChromaPipeline';

const CHROMA_GHOST_SHADER = `
#define SHADER_NAME DRUNK_CHROMA_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;
uniform float uChroma;
uniform float uGhost;
varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;
  float w = uIntensity;
  // Aberração cromática radial pulsante + leve visão dupla lateral (diplopia)
  vec2 dir = uv - vec2(0.5);
  float ab = uChroma * w * (1.0 + 0.55 * sin(uTime * 3.1));
  float r = texture2D(uMainSampler, uv + dir * ab * 2.1).r;
  vec4 mid = texture2D(uMainSampler, uv);
  float b = texture2D(uMainSampler, uv - dir * ab * 2.1).b;
  vec3 baseCol = vec3(r, mid.g, b);

  vec2 ghostOffset = vec2(sin(uTime * 2.2) * 0.011 * w, cos(uTime * 1.7) * 0.005 * w);
  vec3 ghostCol = texture2D(uMainSampler, clamp(uv + ghostOffset, 0.001, 0.999)).rgb;
  gl_FragColor = vec4(mix(baseCol, ghostCol, uGhost * w), mid.a);
}
`;

let rexDrunkPipelinesPromise = null;
function loadRexDrunkPipelines() {
  if (!rexDrunkPipelinesPromise) {
    rexDrunkPipelinesPromise = Promise.all([
      import('phaser3-rex-plugins/plugins/warppipeline.js').then((m) => m.default ?? m),
      import('phaser3-rex-plugins/plugins/swirlpipeline.js').then((m) => m.default ?? m),
    ]).catch(() => [null, null]);
  }
  return rexDrunkPipelinesPromise;
}

/**
 * Pós-processamento de embriaguez combinando:
 *  - `WarpPostFxPipeline` (`phaser3-rex-plugins`): ondulação/turbulência 2D na tela;
 *  - `SwirlPostFxPipeline` (`phaser3-rex-plugins`): redemoinho oscilante ao redor do centro;
 *  - `DrunkChromaPipeline`: aberração cromática radial + visão dupla leve;
 *  - Phaser 3.90 PostFX nativo (`Barrel`, `ColorMatrix` hue, `Bloom`) + balanço sutil de câmera.
 *
 * Não compromete controles nem hitboxes (atua somente na câmera pós-renderização), possui
 * redução/desligamento configurável (`[N]`) e restaura 100% da imagem em `teardown()`.
 */
export class DrunkEffect {
  constructor(scene, config = DRUNK_FX_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.camera = scene?.cameras?.main ?? null;
    const phaserWebGL = globalThis.Phaser?.WEBGL ?? 2;
    const PostFXPipeline = globalThis.Phaser?.Renderer?.WebGL?.Pipelines?.PostFXPipeline;

    this.supported = Boolean(
      this.camera?.postFX &&
        scene?.renderer?.type === phaserWebGL &&
        scene.renderer.pipelines?.addPostPipeline &&
        PostFXPipeline
    );
    this.active = false;
    this.intensity = 0;
    this.timeSec = 0;
    this.warp = null;
    this.swirl = null;
    this.chroma = null;
    this.barrel = null;
    this.colorMatrix = null;
    this.bloom = null;
    this._rexReady = false;
    this._destroyed = false;
    this.levelIndex = this._loadLevelIndex();

    if (this.supported) {
      try {
        const pipelines = scene.renderer.pipelines;
        if (!pipelines.getPostPipeline?.(CHROMA_KEY)) {
          pipelines.addPostPipeline(
            CHROMA_KEY,
            DrunkEffect.createChromaPipelineClass(PostFXPipeline, config)
          );
        }
        loadRexDrunkPipelines().then(([WarpPipeline, SwirlPipeline]) => {
          if (this._destroyed || !this.supported) return;
          try {
            if (WarpPipeline && !pipelines.getPostPipeline?.(WARP_KEY)) {
              pipelines.addPostPipeline(WARP_KEY, WarpPipeline);
            }
            if (SwirlPipeline && !pipelines.getPostPipeline?.(SWIRL_KEY)) {
              pipelines.addPostPipeline(SWIRL_KEY, SwirlPipeline);
            }
            this._rexReady = Boolean(WarpPipeline && SwirlPipeline);
            if (this.active && this._rexReady && (!this.warp || !this.swirl)) {
              this._attachRexPipelines();
            }
          } catch {
            // Mantém Chroma + Phaser PostFX ativos mesmo se o plugin falhar
          }
        });
      } catch {
        this.supported = false;
      }
    }
  }

  static createChromaPipelineClass(PostFXPipeline, config) {
    return class DrunkChromaPipeline extends PostFXPipeline {
      constructor(game) {
        super({ game, name: CHROMA_KEY, fragShader: CHROMA_GHOST_SHADER });
        this.timeSec = 0;
        this.intensity = 0;
      }

      onPreRender() {
        this.set1f('uTime', this.timeSec);
        this.set1f('uIntensity', this.intensity);
        this.set1f('uChroma', config.CHROMA_AMOUNT ?? 0.0075);
        this.set1f('uGhost', config.GHOST_ALPHA ?? 0.2);
      }
    };
  }

  _loadLevelIndex() {
    try {
      const raw = globalThis.localStorage?.getItem(this.config.STORAGE_KEY);
      const idx = Number.parseInt(raw, 10);
      if (Number.isInteger(idx) && idx >= 0 && idx < this.config.INTENSITY_LEVELS.length) {
        return idx;
      }
    } catch {
      // localStorage indisponível
    }
    return this.config.DEFAULT_LEVEL_INDEX;
  }

  getLevelScale() {
    return this.config.INTENSITY_LEVELS[this.levelIndex] ?? 1;
  }

  setLevelIndex(index) {
    if (Number.isInteger(index) && index >= 0 && index < this.config.INTENSITY_LEVELS.length) {
      this.levelIndex = index;
    }
    return this.getLevelScale();
  }

  cycleLevel() {
    this.levelIndex = (this.levelIndex + 1) % this.config.INTENSITY_LEVELS.length;
    try {
      globalThis.localStorage?.setItem(this.config.STORAGE_KEY, String(this.levelIndex));
    } catch {
      // ignora
    }
    if (this.getLevelScale() <= 0 && this.active) {
      this.teardown();
    }
    return this.getLevelScale();
  }

  getLevelLabel() {
    const scale = this.getLevelScale();
    return scale <= 0 ? 'OFF' : `${Math.round(scale * 100)}%`;
  }

  _pickSinglePipeline(cam, key) {
    const pipe = cam.getPostPipeline(key);
    return Array.isArray(pipe) ? pipe[pipe.length - 1] : pipe;
  }

  _attachRexPipelines() {
    const cam = this.camera;
    const pipelines = this.scene?.renderer?.pipelines;
    if (!cam || !pipelines) return;
    if (!this.warp && pipelines.getPostPipeline?.(WARP_KEY)) {
      cam.setPostPipeline(WARP_KEY);
      this.warp = this._pickSinglePipeline(cam, WARP_KEY);
      this.warp?.setFrequency?.(
        this.config.WARP_FREQUENCY_X ?? 28,
        this.config.WARP_FREQUENCY_Y ?? 22
      );
    }
    if (!this.swirl && pipelines.getPostPipeline?.(SWIRL_KEY)) {
      cam.setPostPipeline(SWIRL_KEY);
      this.swirl = this._pickSinglePipeline(cam, SWIRL_KEY);
      this.swirl?.setCenter?.(
        (this.scene?.logicalWidth ?? 960) / 2,
        (this.scene?.logicalHeight ?? 540) / 2
      );
      this.swirl?.setRadius?.(this.config.SWIRL_RADIUS ?? 360);
    }
  }

  _setup() {
    if (!this.supported || this.active) return;
    const cam = this.camera;
    try {
      this._attachRexPipelines();
      cam.setPostPipeline(CHROMA_KEY);
      this.chroma = this._pickSinglePipeline(cam, CHROMA_KEY);
      this.barrel = cam.postFX.addBarrel(1);
      this.colorMatrix = cam.postFX.addColorMatrix();
      this.bloom = cam.postFX.addBloom(0xffffff, 1, 1, 1, 0, 4);
      this.active = true;
    } catch {
      this.supported = false;
      this.teardown();
    }
  }

  /** Restaura completamente a imagem e a rotação da câmera. */
  teardown({ destroy = false } = {}) {
    if (destroy) this._destroyed = true;
    const cam = this.camera;
    try {
      if (this.warp) cam?.removePostPipeline?.(WARP_KEY);
      if (this.swirl) cam?.removePostPipeline?.(SWIRL_KEY);
      if (this.chroma) cam?.removePostPipeline?.(CHROMA_KEY);
      if (this.barrel) cam?.postFX?.remove?.(this.barrel);
      if (this.colorMatrix) cam?.postFX?.remove?.(this.colorMatrix);
      if (this.bloom) cam?.postFX?.remove?.(this.bloom);
    } catch {
      cam?.postFX?.clear?.();
    }
    cam?.setRotation?.(0);
    this.warp = null;
    this.swirl = null;
    this.chroma = null;
    this.barrel = null;
    this.colorMatrix = null;
    this.bloom = null;
    this.active = false;
    this.intensity = 0;
  }

  update(deltaMs, target = 0) {
    if (!this.supported) return 0;
    const dt = Math.max(0, deltaMs) / 1000;
    const smooth = 1 - Math.exp(-this.config.SMOOTHING_PER_SECOND * dt);
    this.intensity += (target - this.intensity) * smooth;

    if (this.intensity < 0.004 && target <= 0) {
      if (this.active) this.teardown();
      return 0;
    }
    if (!this.active) this._setup();
    if (!this.active) return 0;

    this.timeSec += dt;
    const i = this.intensity;
    const t = this.timeSec;

    if (this.warp) {
      this.warp.now = t * 5.2;
      this.warp.setSpeed?.(14, 11);
      this.warp.setAmplitude?.(
        (this.config.WARP_AMPLITUDE_X ?? 10.5) * i,
        (this.config.WARP_AMPLITUDE_Y ?? 7.5) * i
      );
    }
    if (this.swirl) {
      this.swirl.setRotation?.(Math.sin(t * 1.55) * (this.config.SWIRL_MAX_RAD ?? 0.22) * i);
    }
    if (this.chroma) {
      this.chroma.timeSec = t;
      this.chroma.intensity = i;
    }
    if (this.barrel) {
      this.barrel.amount = 1 + Math.sin(t * 1.8) * this.config.BARREL_MAX * i;
    }
    if (this.colorMatrix) {
      this.colorMatrix.reset();
      this.colorMatrix.hue(Math.sin(t * 1.1) * this.config.HUE_ROTATE_MAX_DEG * i, true);
      this.colorMatrix.saturate(0.35 * i, true);
    }
    if (this.bloom) {
      this.bloom.strength = this.config.BLOOM_STRENGTH * i;
    }
    this.camera?.setRotation?.(
      Math.sin(t * 1.35) * (this.config.CAMERA_SWAY_MAX_RAD ?? 0.026) * i
    );
    return i;
  }
}
