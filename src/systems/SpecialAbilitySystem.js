/**
 * Máquina de estados pura (independente da engine) de uma habilidade especial.
 * Estados: 'charging' -> 'ready' -> 'active' -> 'charging'.
 * A duração é sempre finita: `update` encerra a habilidade, garantindo que
 * invulnerabilidade/velocidade nunca sejam permanentes.
 */
export class SpecialAbilitySystem {
  constructor(definition, { onActivate = null, onEnd = null } = {}) {
    if (!definition) {
      throw new Error('SpecialAbilitySystem requires an ability definition.');
    }
    this.definition = definition;
    this.onActivate = onActivate;
    this.onEnd = onEnd;
    this.reset();
  }

  reset() {
    this.state = 'charging';
    this.kills = 0;
    this.cooldownRemainingMs =
      this.definition.chargeType === 'cooldown'
        ? this.definition.initialCooldownMs ?? this.definition.cooldownMs ?? 0
        : 0;
    this.remainingMs = 0;
    this._refreshReady();
  }

  _refreshReady() {
    if (this.state !== 'charging') return;
    if (this.definition.chargeType === 'kills') {
      if (this.kills >= this.definition.killsRequired) this.state = 'ready';
    } else if (this.cooldownRemainingMs <= 0) {
      this.state = 'ready';
    }
  }

  isActive() {
    return this.state === 'active';
  }

  isReady() {
    return this.state === 'ready';
  }

  isInvulnerable() {
    return this.isActive() && Boolean(this.definition.invulnerable);
  }

  /** Cada inimigo comum derrotado contribui com uma unidade de carga. */
  registerKill(amount = 1) {
    if (this.definition.chargeType !== 'kills' || this.state !== 'charging') {
      return false;
    }
    this.kills = Math.min(
      this.definition.killsRequired,
      this.kills + Math.max(0, amount)
    );
    this._refreshReady();
    return true;
  }

  activate() {
    if (this.state !== 'ready') return false;
    this.state = 'active';
    this.remainingMs = this.definition.durationMs;
    this.onActivate?.(this.definition);
    return true;
  }

  end(reason = 'expired') {
    if (this.state !== 'active') return false;
    this.state = 'charging';
    this.remainingMs = 0;
    this.kills = 0;
    this.cooldownRemainingMs =
      this.definition.chargeType === 'cooldown'
        ? this.definition.cooldownMs ?? 0
        : 0;
    this._refreshReady();
    this.onEnd?.(this.definition, reason);
    return true;
  }

  update(deltaMs) {
    if (!(deltaMs > 0)) return;
    if (this.state === 'active') {
      this.remainingMs -= deltaMs;
      if (this.remainingMs <= 0) this.end('expired');
      return;
    }
    if (this.state === 'charging' && this.definition.chargeType === 'cooldown') {
      this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - deltaMs);
      this._refreshReady();
    }
  }

  getSnapshot() {
    const def = this.definition;
    let progress = 1;
    if (this.state === 'active') {
      progress = Math.max(0, this.remainingMs / def.durationMs);
    } else if (this.state === 'charging') {
      progress =
        def.chargeType === 'kills'
          ? this.kills / def.killsRequired
          : 1 -
            this.cooldownRemainingMs /
              Math.max(1, def.initialCooldownMs ?? def.cooldownMs ?? 1);
    }
    return {
      id: def.id,
      name: def.name,
      state: this.state,
      chargeType: def.chargeType,
      progress: Math.min(1, Math.max(0, progress)),
      kills: this.kills,
      killsRequired: def.killsRequired ?? 0,
      remainingMs: Math.max(0, this.remainingMs),
      cooldownRemainingMs: Math.max(0, this.cooldownRemainingMs),
    };
  }
}
