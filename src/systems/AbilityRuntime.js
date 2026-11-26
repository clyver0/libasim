import { CombatSystem } from '../combat/CombatSystem.js';
import { Hitbox } from '../combat/Hitbox.js';
import { getDrinkById } from '../data/drinks.js';
import { SpecialAbilitySystem } from './SpecialAbilitySystem.js';

/**
 * Executa o comportamento (efeitos de jogo + visuais) das habilidades especiais por cima da
 * máquina de estados pura `SpecialAbilitySystem`. Todo estado temporário aplicado ao jogador
 * (invulnerabilidade, velocidade, forma, escala) é revertido em `_stop` e em `reset()`.
 */
export class AbilityRuntime {
  constructor({
    scene,
    player,
    effects = null,
    antManager = null,
    spawnDrink = null,
    getTargets = () => [],
    random = Math.random,
  }) {
    this.scene = scene;
    this.player = player;
    this.effects = effects;
    this.antManager = antManager;
    this.spawnDrink = spawnDrink;
    this.getTargets = getTargets;
    this.random = random;
    this.definition = player.state.ability;

    this.rainTimerMs = 0;
    this.rainSpawned = 0;
    this.helperTimerMs = 0;
    this.ramHitIds = new Set();
    this.ramRehitTimerMs = 0;
    this.ramInstance = 0;
    this.confetti = null;

    this.system = this.definition
      ? new SpecialAbilitySystem(this.definition, {
          onActivate: (def) => this._start(def),
          onEnd: (def, reason) => this._stop(def, reason),
        })
      : null;
  }

  hasAbility() {
    return Boolean(this.system);
  }

  isActive() {
    return Boolean(this.system?.isActive());
  }

  getSnapshot() {
    return this.system?.getSnapshot() ?? null;
  }

  tryActivate() {
    if (!this.system || this.player.isDead()) return false;
    return this.system.activate();
  }

  /** Cada inimigo comum derrotado contribui com uma unidade de carga (Piri). */
  registerKill() {
    return this.system?.registerKill(1) ?? false;
  }

  update(deltaMs) {
    if (!this.system) return;
    if (this.player.isDead() && this.system.isActive()) {
      this.system.end('player_dead');
      return;
    }
    this.system.update(deltaMs);
    if (!this.system.isActive()) return;

    switch (this.definition.id) {
      case 'terca_do_cantinho':
        this._updateRain(deltaMs);
        break;
      case 'o_fit_se_calou':
        this._updateRam(deltaMs);
        break;
      case 'pisa_ligeiro':
        this._updateHelpers(deltaMs);
        break;
      default:
        break;
    }
  }

  /** Reinício/saída da run: encerra qualquer efeito ativo e zera a máquina de estados. */
  reset() {
    if (!this.system) return;
    if (this.system.isActive()) this.system.end('reset');
    this.system.reset();
    this._removeConfetti();
  }

  // ---- Início ---------------------------------------------------------------------------

  _origin() {
    return this.player.getCombatOrigin();
  }

  _start(def) {
    const o = this._origin();
    const fx = this.effects;
    switch (def.id) {
      case 'terca_do_cantinho': {
        this.rainTimerMs = 0;
        this.rainSpawned = 0;
        fx?.announce('TERÇA DO CANTINHO!', { color: def.colorHex, sub: 'Chove Cantinho do Vale!', size: 52, holdMs: 1200 });
        fx?.flash(220, 168, 85, 247);
        fx?.shake(300, 0.006);
        fx?.ring(o.x, o.y, def.color, { radius: 120, durationMs: 600, width: 6 });
        this._startConfetti(def);
        break;
      }
      case 'o_fit_se_calou': {
        this.ramHitIds.clear();
        this.ramRehitTimerMs = 0;
        this.player.setAbilityState({
          invulnerable: true,
          moveSpeed: def.moveSpeed,
          autoRun: true,
          form: 'car',
        });
        fx?.announce('O FIT SE CALOU!', { color: def.colorHex, sub: 'VRUUUM!', size: 50, holdMs: 900 });
        fx?.flash(180, 120, 255, 160);
        fx?.shake(260, 0.008);
        fx?.sparks(o.x, o.y, 0xf8fafc, 30, { speed: [160, 480], lifespan: 500, scale: 1.4 });
        fx?.ring(o.x, o.y, def.color, { radius: 90, durationMs: 420, width: 6 });
        fx?.startFollower('car_trail', this.player.visual, {
          offsetY: 18,
          config: {
            frequency: 18,
            lifespan: 320,
            speed: { min: 10, max: 60 },
            angle: { min: 160, max: 200 },
            scale: { start: 1.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: [0xf8fafc, 0x22c55e, 0xfacc15],
          },
        });
        break;
      }
      case 'pisa_ligeiro': {
        this.helperTimerMs = 0;
        this.player.state.setAbilityModifiers([
          { gameplay: { bodyScale: def.bodyScaleMultiplier } },
        ]);
        this.player.syncBodyScale();
        this.player.setAbilityState({
          invulnerable: true,
          moveSpeed: def.moveSpeed,
          form: 'ant',
          scale: def.bodyScaleMultiplier,
        });
        fx?.announce('PISA LIGEIRO!', { color: def.colorHex, sub: 'Tonegi virou formiga!', size: 50, holdMs: 900 });
        fx?.flash(180, 251, 191, 36);
        fx?.shake(200, 0.005);
        fx?.sparks(o.x, o.y, def.color, 30, { speed: [100, 360], lifespan: 450, scale: 1.1 });
        fx?.ring(o.x, o.y, def.color, { radius: 70, durationMs: 380, width: 5 });
        fx?.startFollower('ant_trail', this.player.visual, {
          offsetY: 8,
          config: {
            frequency: 40,
            lifespan: 260,
            speed: { min: 5, max: 30 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0xfbbf24, 0x1f2937],
          },
        });
        break;
      }
      default:
        break;
    }
  }

  // ---- Encerramento ---------------------------------------------------------------------

  _stop(def, reason) {
    const o = this._origin();
    const fx = this.effects;
    const quiet = reason === 'reset' || reason === 'player_dead';
    switch (def.id) {
      case 'terca_do_cantinho':
        this._removeConfetti();
        if (!quiet) {
          fx?.announce('Acabou a Terça...', { color: '#c4b5fd', size: 30, holdMs: 500 });
          fx?.ring(o.x, o.y, def.color, { radius: 70, durationMs: 400, width: 3 });
        }
        break;
      case 'o_fit_se_calou':
        this.player.clearAbilityState();
        fx?.stopFollower('car_trail');
        if (!quiet) {
          fx?.announce('Motor desligado', { color: '#86efac', size: 28, holdMs: 400 });
          fx?.sparks(o.x, o.y + 10, 0xcbd5e1, 24, { speed: [40, 220], lifespan: 600, scale: 1.2 });
          fx?.ring(o.x, o.y, def.color, { radius: 60, durationMs: 380, width: 4 });
        }
        break;
      case 'pisa_ligeiro':
        this.player.state.setAbilityModifiers([]);
        this.player.syncBodyScale();
        this.player.clearAbilityState();
        fx?.stopFollower('ant_trail');
        this.antManager?.clearAllies();
        if (!quiet) {
          fx?.announce('Tonegi voltou!', { color: '#fde68a', size: 30, holdMs: 400 });
          fx?.sparks(o.x, o.y, def.color, 24, { speed: [80, 300], lifespan: 450, scale: 1 });
          fx?.ring(o.x, o.y, def.color, { radius: 60, durationMs: 380, width: 4 });
        }
        break;
      default:
        break;
    }
  }

  // ---- Terça do Cantinho -----------------------------------------------------------------

  _updateRain(deltaMs) {
    const rain = this.definition.rain;
    this.rainTimerMs -= deltaMs;
    if (this.rainTimerMs > 0 || this.rainSpawned >= rain.maxDrinks) return;
    this.rainTimerMs = rain.intervalMs;
    const drink = getDrinkById(rain.drinkId);
    if (!drink || !this.spawnDrink) return;
    const width = this.scene.logicalWidth ?? 960;
    for (let i = 0; i < rain.perTick && this.rainSpawned < rain.maxDrinks; i += 1) {
      this.rainSpawned += 1;
      this.spawnDrink({
        id: `terca_${Date.now()}_${this.rainSpawned}`,
        x: rain.marginX + this.random() * (width - rain.marginX * 2),
        y: rain.spawnY,
        drinkData: drink,
      });
    }
  }

  _startConfetti(def) {
    this._removeConfetti();
    if (!this.scene?.add?.particles) return;
    const width = this.scene.logicalWidth ?? 960;
    this.confetti = this.scene.add.particles(0, -10, 'fx_spark', {
      x: { min: 0, max: width },
      lifespan: 2400,
      speedY: { min: 160, max: 320 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.1, end: 0.5 },
      alpha: { start: 1, end: 0.2 },
      tint: [def.color, 0xfacc15, 0xf472b6, 0x38bdf8],
      frequency: 38,
      quantity: 2,
      blendMode: 'ADD',
    });
    this.confetti.setDepth(40);
  }

  _removeConfetti() {
    if (!this.confetti) return;
    const emitter = this.confetti;
    this.confetti = null;
    emitter.stop?.();
    if (this.scene?.time?.delayedCall) {
      this.scene.time.delayedCall(2500, () => emitter.destroy());
    } else {
      emitter.destroy();
    }
  }

  // ---- O fit se calou (atropelamento) -----------------------------------------------------

  _updateRam(deltaMs) {
    const ram = this.definition.ram;
    this.ramRehitTimerMs -= deltaMs;
    if (this.ramRehitTimerMs <= 0) {
      this.ramRehitTimerMs = ram.rehitMs;
      this.ramHitIds.clear();
      this.ramInstance += 1;
    }
    const player = this.player;
    const facing = player.facing ?? 1;
    const bounds = Hitbox.getWorldBounds(
      player.getCombatOrigin(),
      {
        width: ram.width,
        height: player.body.height + ram.heightPad,
        offsetX: ram.width * 0.2,
        offsetY: 0,
      },
      facing
    );
    const attack = {
      id: 'ram',
      type: 'SPECIAL',
      isCombo: false,
      name: ram.name,
      baseDamage: ram.baseDamage,
      knockback: ram.knockback,
      color: this.definition.color,
    };
    CombatSystem.resolveHits({
      attacker: player,
      attack,
      hitboxBounds: bounds,
      targets: this.getTargets(),
      hitTargetIds: this.ramHitIds,
      attackInstanceId: this.ramInstance,
      onHit: (target, hitInfo) => {
        const origin = target.getCombatOrigin?.() ?? this._origin();
        this.effects?.hit(origin, hitInfo, { color: this.definition.color });
      },
    });
  }

  // ---- Pisa ligeiro (formigas auxiliares) --------------------------------------------------

  _updateHelpers(deltaMs) {
    if (!this.antManager) return;
    const cfg = this.definition.helpers;
    this.helperTimerMs -= deltaMs;
    if (this.helperTimerMs > 0) return;
    this.helperTimerMs = cfg.spawnIntervalMs;
    if (this.antManager.allies.length >= cfg.maxActive) return;
    const o = this._origin();
    const ant = this.antManager.spawnAlly(o.x + (this.random() * 2 - 1) * 24, o.y, {
      lifetimeMs: cfg.lifetimeMs,
    });
    if (ant) this.effects?.sparks(o.x, o.y, 0xfbbf24, 5, { speed: [40, 140], lifespan: 260, scale: 0.6 });
  }
}
