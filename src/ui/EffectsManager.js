import { EFFECTS_CONFIG } from '../constants/expansion.js';

const TEXTURE_SPARK = 'fx_spark';
const TEXTURE_STREAK = 'fx_streak';
const SHOCKWAVE_KEY = 'rexShockwavePostFx';
const MAX_CACHED_EMITTERS = 64;

let shockwavePipelinePromise = null;
function loadShockwavePipeline() {
  if (!shockwavePipelinePromise) {
    shockwavePipelinePromise = import('phaser3-rex-plugins/plugins/shockwavepipeline.js')
      .then((m) => m.default ?? m)
      .catch(() => null);
  }
  return shockwavePipelinePromise;
}

/**
 * Efeitos visuais de combate e habilidades usando recursos nativos do Phaser 3.90:
 * sistema de partículas (ParticleEmitter), tweens, câmera (shake/flash).
 * Emissores são reaproveitados (cache por tipo/cor) para manter a performance estável.
 * Todos os métodos são seguros quando a cena não oferece uma API (ex.: testes sem Phaser).
 */
export class EffectsManager {
  constructor(scene, config = EFFECTS_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.emitters = new Map();
    this.followers = new Map();
    this.activeSwooshes = 0;
    this.activeTexts = 0;
    this._shockwaveTween = null;
    this.disposed = false;
    this._ensureTextures();
    this._registerShockwavePipeline();
  }

  _registerShockwavePipeline() {
    const { scene } = this;
    const phaserWebGL = globalThis.Phaser?.WEBGL ?? 2;
    if (
      scene?.renderer?.type === phaserWebGL &&
      scene.renderer.pipelines?.addPostPipeline &&
      globalThis.Phaser?.Renderer?.WebGL?.Pipelines?.PostFXPipeline &&
      !scene.renderer.pipelines.getPostPipeline?.(SHOCKWAVE_KEY)
    ) {
      loadShockwavePipeline().then((ShockwavePipeline) => {
        if (this.disposed || !ShockwavePipeline) return;
        try {
          if (!scene.renderer.pipelines.getPostPipeline?.(SHOCKWAVE_KEY)) {
            scene.renderer.pipelines.addPostPipeline(SHOCKWAVE_KEY, ShockwavePipeline);
          }
        } catch {
          // Ignora em ambientes sem WebGL completo
        }
      });
    }
  }

  /** Onda de choque refrativa WebGL (`phaser3-rex-plugins`) expandindo a partir de `(x, y)`. */
  shockwave(x, y, { maxRadius = 320, waveWidth = 26, durationMs = 380 } = {}) {
    const cam = this.scene?.cameras?.main;
    const phaserWebGL = globalThis.Phaser?.WEBGL ?? 2;
    if (
      this.disposed ||
      this.scene?.renderer?.type !== phaserWebGL ||
      !this.scene.renderer.pipelines?.getPostPipeline?.(SHOCKWAVE_KEY) ||
      !cam?.setPostPipeline ||
      !this.scene?.tweens?.addCounter
    ) {
      return;
    }
    try {
      this._clearShockwave();
      cam.setPostPipeline(SHOCKWAVE_KEY);
      const raw = cam.getPostPipeline(SHOCKWAVE_KEY);
      const pipe = Array.isArray(raw) ? raw[raw.length - 1] : raw;
      if (!pipe) return;
      pipe.setCenter?.(x, y);
      pipe.setWaveWidth?.(waveWidth);
      pipe.setWaveRadius?.(8);
      this._shockwaveTween = this.scene.tweens.addCounter({
        from: 8,
        to: maxRadius,
        duration: durationMs,
        ease: 'Cubic.Out',
        onUpdate: (tw) => {
          pipe.setWaveRadius?.(tw.getValue());
        },
        onComplete: () => this._clearShockwave(),
      });
    } catch {
      this._clearShockwave();
    }
  }

  _clearShockwave() {
    if (this._shockwaveTween) {
      this._shockwaveTween.stop?.();
      this._shockwaveTween = null;
    }
    try {
      this.scene?.cameras?.main?.removePostPipeline?.(SHOCKWAVE_KEY);
    } catch {
      // ignora
    }
  }

  _ensureTextures() {
    const { scene } = this;
    if (!scene?.textures || !scene.make?.graphics) return;
    if (!scene.textures.exists(TEXTURE_SPARK)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(5, 5, 5);
      g.generateTexture(TEXTURE_SPARK, 10, 10);
      g.destroy();
    }
    if (!scene.textures.exists(TEXTURE_STREAK)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 18, 4, 2);
      g.generateTexture(TEXTURE_STREAK, 18, 4);
      g.destroy();
    }
  }

  get canEmit() {
    return !this.disposed && Boolean(this.scene?.add?.particles);
  }

  _emitter(kind, color, dir, texture, cfg) {
    const key = `${kind}|${color}|${dir}`;
    let emitter = this.emitters.get(key);
    if (!emitter || !emitter.active) {
      if (this.emitters.size >= MAX_CACHED_EMITTERS) {
        const oldest = this.emitters.keys().next().value;
        this.emitters.get(oldest)?.destroy();
        this.emitters.delete(oldest);
      }
      emitter = this.scene.add.particles(0, 0, texture, {
        emitting: false,
        tint: color,
        blendMode: 'ADD',
        ...cfg,
      });
      emitter.setDepth(53);
      this.emitters.set(key, emitter);
    }
    return emitter;
  }

  /** Explosão radial de faíscas. */
  sparks(x, y, color, count, { speed = [120, 320], lifespan = 280, scale = 1 } = {}) {
    if (!this.canEmit) return;
    const emitter = this._emitter('spark', color, 0, TEXTURE_SPARK, {
      speed: { min: speed[0], max: speed[1] },
      angle: { min: 0, max: 360 },
      lifespan: { min: lifespan * 0.6, max: lifespan },
      scale: { start: 0.9 * scale, end: 0 },
      alpha: { start: 1, end: 0 },
    });
    emitter.explode(count, x, y);
  }

  /** Riscos de velocidade em leque na direção do golpe. */
  streaks(x, y, color, count, dir = 1) {
    if (!this.canEmit) return;
    const base = dir >= 0 ? 0 : 180;
    const emitter = this._emitter('streak', color, dir, TEXTURE_STREAK, {
      speed: { min: 260, max: 520 },
      angle: { min: base - 28, max: base + 28 },
      rotate: { onEmit: () => 0 },
      lifespan: { min: 120, max: 240 },
      scale: { start: 1.1, end: 0.1 },
      alpha: { start: 0.95, end: 0 },
    });
    emitter.explode(count, x, y);
  }

  ring(x, y, color, { radius = 40, durationMs = 280, width = 3, depth = 52 } = {}) {
    const { scene } = this;
    if (this.disposed || !scene?.add?.circle || !scene?.tweens?.add) return;
    const ring = scene.add
      .circle(x, y, 8, color, 0.12)
      .setStrokeStyle(width, color, 0.95)
      .setDepth(depth);
    scene.tweens.add({
      targets: ring,
      scale: radius / 8,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
  }

  shake(durationMs, intensity) {
    const scale = this.config.SHAKE_SCALE ?? 1;
    if (!(durationMs > 0) || !(intensity > 0) || scale <= 0) return;
    this.scene?.cameras?.main?.shake?.(durationMs, intensity * scale);
  }

  flash(durationMs, r = 255, g = 255, b = 255) {
    this.scene?.cameras?.main?.flash?.(durationMs, r, g, b);
  }

  /** Categoria de feedback do golpe: cada uma tem partículas, anéis e tremor próprios. */
  static categorize(attack) {
    if (attack?.isCombo) return 'COMBO';
    if (attack?.type === 'SPECIAL') return 'SPECIAL';
    if (attack?.type === 'HEAVY') return 'HEAVY';
    return 'LIGHT';
  }

  hit(origin, hitInfo, { color = 0x38bdf8 } = {}) {
    if (this.disposed || !origin) return;
    const category = EffectsManager.categorize(hitInfo?.attack);
    const dir = hitInfo?.direction ?? 1;
    const count = this.config.PARTICLES[category];
    const tint = hitInfo?.attack?.color ?? color;
    const { x, y } = origin;

    this.sparks(x, y, tint, count, {
      speed: category === 'LIGHT' ? [100, 240] : [160, 400],
      scale: category === 'LIGHT' ? 0.8 : 1.2,
    });
    if (category !== 'LIGHT') this.streaks(x, y, tint, Math.ceil(count / 2), dir);
    if (category === 'HEAVY') this.ring(x, y, tint, { radius: 46 });
    if (category === 'SPECIAL') {
      this.ring(x, y, tint, { radius: 58, width: 4 });
      this.sparks(x, y, 0xffffff, 10, { speed: [80, 200], scale: 0.7 });
    }
    if (category === 'COMBO') {
      // Acerto crítico (combo): anéis dourados duplos, onda de choque WebGL, centelha branca e flash curto
      this.ring(x, y, 0xfacc15, { radius: 70, width: 5 });
      this.ring(x, y, 0xffffff, { radius: 44, durationMs: 200 });
      this.sparks(x, y, 0xfacc15, 14, { speed: [200, 480], scale: 1.4 });
      this.shockwave(x, y, { maxRadius: 240, waveWidth: 22, durationMs: 300 });
      this.flash(60, 255, 244, 190);
    }
    const shake = this.config.SHAKE[category];
    this.shake(shake.durationMs, shake.intensity);
  }

  /** Rastro em arco do golpe (finalização) com cor/tamanho por categoria. */
  swoosh(origin, dir, attack) {
    const { scene } = this;
    if (this.disposed || !origin || !scene?.add?.graphics || !scene?.tweens?.add) return;
    if (this.activeSwooshes >= (this.config.MAX_SIMULTANEOUS_SWOOSHES ?? 8)) return;
    const category = EffectsManager.categorize(attack);
    const radius = { LIGHT: 30, HEAVY: 44, SPECIAL: 52, COMBO: 58 }[category];
    const width = { LIGHT: 3, HEAVY: 6, SPECIAL: 7, COMBO: 8 }[category];
    const color = attack?.color ?? 0x38bdf8;
    const g = scene.add.graphics({ x: origin.x + dir * 14, y: origin.y }).setDepth(51);
    g.lineStyle(width, color, 0.9);
    g.beginPath();
    if (dir >= 0) g.arc(0, 0, radius, -1.1, 1.1, false);
    else g.arc(0, 0, radius, Math.PI - 1.1, Math.PI + 1.1, false);
    g.strokePath();
    g.lineStyle(width * 0.45, 0xffffff, 0.8);
    g.beginPath();
    if (dir >= 0) g.arc(0, 0, radius - 3, -0.9, 0.9, false);
    else g.arc(0, 0, radius - 3, Math.PI - 0.9, Math.PI + 0.9, false);
    g.strokePath();
    this.activeSwooshes += 1;
    scene.tweens.add({
      targets: g,
      scaleX: 1.35,
      scaleY: 1.2,
      alpha: 0,
      duration: category === 'LIGHT' ? 150 : 230,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.activeSwooshes = Math.max(0, this.activeSwooshes - 1);
        g.destroy();
      },
    });
  }

  /** Antecipação: anel convergindo no início do golpe. */
  anticipation(origin, color = 0xffffff) {
    const { scene } = this;
    if (this.disposed || !origin || !scene?.add?.circle || !scene?.tweens?.add) return;
    const ring = scene.add
      .circle(origin.x, origin.y, 36, color, 0)
      .setStrokeStyle(2, color, 0.8)
      .setDepth(52);
    scene.tweens.add({
      targets: ring,
      scale: 0.35,
      alpha: 0,
      duration: 130,
      onComplete: () => ring.destroy(),
    });
  }

  floatingText(x, y, text, style = {}, { rise = 34, durationMs = 900 } = {}) {
    const { scene } = this;
    if (this.disposed || !scene?.add?.text || !scene?.tweens?.add) return null;
    if (this.activeTexts >= (this.config.MAX_FLOATING_TEXTS ?? 14)) return null;
    const label = scene.add
      .text(x, y, text, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#090d16',
        strokeThickness: 4,
        align: 'center',
        ...style,
      })
      .setOrigin(0.5)
      .setDepth(85);
    this.activeTexts += 1;
    scene.tweens.add({
      targets: label,
      y: y - rise,
      alpha: 0,
      duration: durationMs,
      onComplete: () => {
        this.activeTexts = Math.max(0, this.activeTexts - 1);
        label.destroy();
      },
    });
    return label;
  }

  /** Anúncio grande no centro da tela com entrada em "pop" e saída suave. */
  announce(text, { color = '#facc15', sub = '', y = 150, holdMs = 1100, size = 40 } = {}) {
    const { scene } = this;
    if (this.disposed || !scene?.add?.text || !scene?.tweens?.add) return null;
    const width = scene.logicalWidth ?? 960;
    const main = scene.add
      .text(width / 2, y, text, {
        fontFamily: 'sans-serif',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#090d16',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(95)
      .setScale(0.2)
      .setAlpha(0);
    const subtitle = sub
      ? scene.add
          .text(width / 2, y + size * 0.85, sub, {
            fontFamily: 'sans-serif',
            fontSize: `${Math.round(size * 0.42)}px`,
            fontStyle: 'bold',
            color: '#f8fafc',
            stroke: '#090d16',
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(95)
          .setAlpha(0)
      : null;
    const targets = subtitle ? [main, subtitle] : [main];
    scene.tweens.add({
      targets: main,
      scale: 1,
      alpha: 1,
      duration: 280,
      ease: 'Back.Out',
    });
    if (subtitle) scene.tweens.add({ targets: subtitle, alpha: 1, duration: 280, delay: 120 });
    scene.tweens.add({
      targets,
      alpha: 0,
      y: '-=26',
      duration: 520,
      delay: 280 + holdMs,
      onComplete: () => targets.forEach((t) => t.destroy()),
    });
    return main;
  }

  phaseTransition(phase) {
    const color = Number.parseInt((phase.color ?? '#facc15').replace('#', ''), 16);
    const width = this.scene?.logicalWidth ?? 960;
    const height = this.scene?.logicalHeight ?? 540;
    this.announce(phase.name, { color: phase.color, sub: phase.subtitle, size: 54, holdMs: 1500, y: 140 });
    this.flash(260, 255, 255, 255);
    this.shake(320, 0.009);
    this.ring(width / 2, height / 2, color, { radius: 90, durationMs: 700, width: 8, depth: 70 });
    this.ring(width / 2, height / 2, 0xffffff, { radius: 60, durationMs: 500, width: 4, depth: 70 });
    this.sparks(width / 2, height / 2, color, 40, { speed: [200, 600], lifespan: 700, scale: 1.4 });
    this.shockwave(width / 2, height / 2, { maxRadius: 520, waveWidth: 34, durationMs: 540 });
  }

  /** Fortalecimento do Açougue ao coletar Cantinho do Vale. */
  powerUpBurst(origin, multiplier = 2) {
    if (!origin) return;
    const cappedMultiplier = Math.max(2, Math.min(10, Math.floor(multiplier)));
    this.announce(`FORÇA ×${cappedMultiplier}!!!`, { color: '#fb923c', sub: 'Cantinho do Vale', size: 46, y: 130, holdMs: 700 });
    this.flash(200, 255, 120, 60);
    this.shake(260, 0.008);
    this.shockwave(origin.x, origin.y, { maxRadius: 360, waveWidth: 28, durationMs: 420 });
    this.ring(origin.x, origin.y, 0xfacc15, { radius: 100, durationMs: 520, width: 6 });
    this.ring(origin.x, origin.y, 0xef4444, { radius: 70, durationMs: 380, width: 5 });
    this.ring(origin.x, origin.y, 0xffffff, { radius: 40, durationMs: 260, width: 3 });
    this.sparks(origin.x, origin.y, 0xf97316, 46, { speed: [160, 520], lifespan: 700, scale: 1.4 });
    this.sparks(origin.x, origin.y, 0xfacc15, 24, { speed: [60, 240], lifespan: 900, scale: 1 });
  }

  antSquish(origin) {
    if (!origin) return;
    this.sparks(origin.x, origin.y, 0x84cc16, 10, { speed: [60, 200], lifespan: 380, scale: 0.8 });
    this.ring(origin.x, origin.y, 0x84cc16, { radius: 20, durationMs: 220, width: 2 });
    this.floatingText(origin.x, origin.y - 12, 'SPLAT!', { fontSize: '13px', color: '#a3e635' }, { rise: 24, durationMs: 650 });
  }

  drinkBounce({ x, y, color = 0xffffff, strength = 0.5 } = {}) {
    if (x === undefined) return;
    this.sparks(x, y, color, Math.round(3 + strength * 6), { speed: [40, 150], lifespan: 260, scale: 0.6 });
  }

  /** Emissor persistente que segue um alvo (aura, rastro). */
  startFollower(id, target, { texture = TEXTURE_SPARK, offsetX = 0, offsetY = 0, config = {} } = {}) {
    if (!this.canEmit || !target) return null;
    this.stopFollower(id, { immediate: true });
    const emitter = this.scene.add.particles(0, 0, texture, {
      blendMode: 'ADD',
      ...config,
    });
    emitter.setDepth(config.depth ?? 11);
    emitter.startFollow(target, offsetX, offsetY);
    this.followers.set(id, emitter);
    return emitter;
  }

  stopFollower(id, { immediate = false } = {}) {
    const emitter = this.followers.get(id);
    if (!emitter) return;
    this.followers.delete(id);
    if (immediate || !this.scene?.time?.delayedCall) {
      emitter.destroy();
      return;
    }
    emitter.stop?.();
    this.scene.time.delayedCall(900, () => emitter.destroy());
  }

  dispose() {
    this.disposed = true;
    this._clearShockwave();
    for (const emitter of this.emitters.values()) emitter.destroy?.();
    this.emitters.clear();
    for (const emitter of this.followers.values()) emitter.destroy?.();
    this.followers.clear();
  }
}
