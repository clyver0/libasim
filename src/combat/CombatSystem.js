import { COMBAT } from '../constants/combat.js';
import { ComboSystem } from './ComboSystem.js';
import { DamageCalculator } from './DamageCalculator.js';
import { Hitbox } from './Hitbox.js';

/**
 * Orquestra o ciclo de vida dos ataques:
 * - Estados (idle -> attacking -> recovering -> idle)
 * - Buffer de 1 comando durante a recuperação
 * - Detecção de acertos via Hitbox/Hurtbox
 * - Prevenção de múltiplos acertos no mesmo alvo por golpe
 * - Cálculo centralizado de dano via DamageCalculator
 */
export class CombatSystem {
  constructor({ comboSystem = new ComboSystem(), onHit = null } = {}) {
    this.comboSystem = comboSystem;
    this.onHit = onHit;

    this.state = COMBAT.STATES.IDLE;
    this.activeAttack = null;
    this.activeTimerMs = 0;
    this._totalActiveMs = 0;
    this._effectiveRecoveryMs = 0;
    this.recoveryTimerMs = 0;
    this.attackInstanceId = 0;
    this.hitTargetIds = new Set();
    this.bufferedCommand = null;
    this.currentHitboxBounds = null;
    this._lastAttacker = null;
  }

  isIdle() {
    return this.state === COMBAT.STATES.IDLE;
  }

  isAttacking() {
    return this.state === COMBAT.STATES.ATTACKING;
  }

  isRecovering() {
    return this.state === COMBAT.STATES.RECOVERING;
  }

  requestAttack(attackType, inputTime, attacker = null) {
    if (!attackType) return false;
    if (attacker) {
      this._lastAttacker = attacker;
    }

    if (this.state === COMBAT.STATES.IDLE) {
      return this._startAttack(attackType, inputTime, attacker);
    }

    if (this.state === COMBAT.STATES.RECOVERING && !this.bufferedCommand) {
      this.bufferedCommand = { attackType, inputTime };
      return true;
    }

    return false;
  }

  _startAttack(attackType, inputTime, attacker = null) {
    const attack = this.comboSystem.registerCommand(attackType, inputTime);
    if (!attack) return false;

    const owner = attacker ?? this._lastAttacker;
    const mods = owner?.state?.gameplayModifiers;
    const speedMult = mods?.attackSpeedMultiplier ?? 1;
    const recoveryMult = mods?.recoveryMultiplier ?? 1;

    const effectiveActiveMs =
      speedMult === 1
        ? attack.activeMs
        : Math.max(40, Math.round(attack.activeMs / speedMult));

    const effectiveRecoveryMs =
      speedMult === 1 && recoveryMult === 1
        ? attack.recoveryMs
        : Math.max(
            50,
            Math.round((attack.recoveryMs * recoveryMult) / speedMult)
          );

    this.state = COMBAT.STATES.ATTACKING;
    this.activeAttack = attack;
    this.activeTimerMs = effectiveActiveMs;
    this._totalActiveMs = effectiveActiveMs;
    this._effectiveRecoveryMs = effectiveRecoveryMs;
    this.recoveryTimerMs = 0;
    this.attackInstanceId += 1;
    this.hitTargetIds.clear();
    this.bufferedCommand = null;
    return true;
  }

  /**
   * Progresso normalizado [0..1] do ataque atual para interpolação contínua de animação.
   */
  getAttackMotionProgress() {
    if (this.state === COMBAT.STATES.ATTACKING && this._totalActiveMs > 0) {
      const elapsed = Math.max(0, this._totalActiveMs - this.activeTimerMs);
      return Math.min(0.68, (elapsed / this._totalActiveMs) * 0.68);
    }
    if (this.state === COMBAT.STATES.RECOVERING && this._effectiveRecoveryMs > 0) {
      const elapsed = Math.max(0, this._effectiveRecoveryMs - this.recoveryTimerMs);
      return Math.min(1, 0.68 + (elapsed / this._effectiveRecoveryMs) * 0.32);
    }
    return 0;
  }

  cancel() {
    this.state = COMBAT.STATES.IDLE;
    this.activeAttack = null;
    this.activeTimerMs = 0;
    this._effectiveRecoveryMs = 0;
    this.recoveryTimerMs = 0;
    this.bufferedCommand = null;
    this.currentHitboxBounds = null;
    this.hitTargetIds.clear();
    this.comboSystem?.reset?.();
  }

  update(deltaMs, attacker, targets = []) {
    if (attacker) {
      this._lastAttacker = attacker;
    }
    if (attacker?.isDead?.()) {
      this.cancel();
      return;
    }

    if (this.state === COMBAT.STATES.IDLE) {
      this.currentHitboxBounds = null;
      return;
    }

    // Proteção contra estado órfão caso um evento externo tenha limpado `activeAttack`
    if (!this.activeAttack) {
      this.cancel();
      return;
    }

    if (this.state === COMBAT.STATES.ATTACKING) {
      const origin = attacker.getCombatOrigin
        ? attacker.getCombatOrigin()
        : { x: attacker.x, y: attacker.y };

      const rangeMult =
        attacker?.state?.gameplayModifiers?.attackRangeMultiplier ?? 1;
      const hitboxConfig =
        rangeMult === 1
          ? this.activeAttack.hitbox
          : {
              ...this.activeAttack.hitbox,
              width: Math.round(this.activeAttack.hitbox.width * rangeMult),
              offsetX: Math.round(
                (this.activeAttack.hitbox.offsetX ?? 0) * rangeMult
              ),
            };

      this.currentHitboxBounds = Hitbox.getWorldBounds(
        origin,
        hitboxConfig,
        attacker.facing ?? 1
      );

      this._checkHits(attacker, targets);

      // Se um callback dentro de `_checkHits` (ex.: abertura de loja ao derrotar 25º inimigo
      // ou acertar Coquinho Extra) chamou `cancel()`, interrompe imediatamente sem entrar em RECOVERING!
      if (this.state !== COMBAT.STATES.ATTACKING || !this.activeAttack) {
        return;
      }

      this.activeTimerMs -= deltaMs;
      if (this.activeTimerMs <= 0) {
        this.state = COMBAT.STATES.RECOVERING;
        this.recoveryTimerMs =
          this._effectiveRecoveryMs || this.activeAttack.recoveryMs;
        this.currentHitboxBounds = null;
      }
      return;
    }

    if (this.state === COMBAT.STATES.RECOVERING) {
      this.currentHitboxBounds = null;
      this.recoveryTimerMs -= deltaMs;

      if (this.recoveryTimerMs <= 0) {
        if (this.bufferedCommand) {
          const { attackType, inputTime } = this.bufferedCommand;
          this.bufferedCommand = null;
          this._startAttack(attackType, inputTime, attacker);
        } else {
          this.state = COMBAT.STATES.IDLE;
          this.activeAttack = null;
        }
      }
    }
  }

  /**
   * Resolve acertos entre uma hitbox ativa e uma lista de alvos,
   * centralizando interseção, deduplicação e DamageCalculator para jogador e inimigos.
   */
  static resolveHits({
    attacker,
    attack,
    hitboxBounds,
    targets = [],
    hitTargetIds = new Set(),
    attackInstanceId = 0,
    onHit = null,
  }) {
    if (!attack || !hitboxBounds || !targets?.length) return [];

    const attackerStats = attacker?.state?.getCombatStats
      ? attacker.state.getCombatStats()
      : attacker?.state?.effectiveStats ?? attacker?.stats ?? {};
    const resolved = [];

    for (const target of targets) {
      if (
        !target ||
        target.isDead?.() ||
        target.isInvulnerable?.() ||
        hitTargetIds.has(target.id)
      ) {
        continue;
      }

      const hurtbox = target.getHurtbox ? target.getHurtbox() : target.hurtbox;
      if (!Hitbox.intersects(hitboxBounds, hurtbox)) continue;

      hitTargetIds.add(target.id);

      const targetStats = target?.state?.getCombatStats
        ? target.state.getCombatStats()
        : target.state?.effectiveStats ?? target.stats ?? {};
      const damage = DamageCalculator.calculateDamage({
        attack,
        attackerStats,
        targetStats,
      });

      const hitInfo = {
        attackInstanceId,
        attack,
        damage,
        knockback: attack.knockback ?? 0,
        direction: attacker?.facing ?? 1,
        hitbox: hitboxBounds,
      };

      if (typeof target.onHit === 'function') {
        target.onHit(hitInfo);
      }

      if (typeof onHit === 'function') {
        onHit(target, hitInfo);
      }

      resolved.push({ target, hitInfo });
    }

    return resolved;
  }

  _checkHits(attacker, targets) {
    CombatSystem.resolveHits({
      attacker,
      attack: this.activeAttack,
      hitboxBounds: this.currentHitboxBounds,
      targets,
      hitTargetIds: this.hitTargetIds,
      attackInstanceId: this.attackInstanceId,
      onHit: this.onHit,
    });
  }
}
