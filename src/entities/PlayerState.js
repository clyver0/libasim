import { PHYSICS } from '../constants/physics.js';
import { StatCalculator } from '../systems/StatCalculator.js';

/**
 * Mantém o estado de atributos do jogador completamente desacoplado da renderização.
 * Permite recalcular atributos ao receber upgrades ou efeitos temporários em fases futuras.
 */
export class PlayerState {
  constructor(characterData) {
    this.characterId = characterData.id;
    this.characterName = characterData.name;
    this.characterRole = characterData.role ?? '';
    this.color = characterData.color;
    this.colorHex = characterData.colorHex;
    this.baseStats = { ...characterData.baseStats };
    this.multipliers = { ...characterData.multipliers };
    this.upgrades = [];
    this.acquiredUpgradeIds = [];
    this.activeEffects = [];

    this.effectiveStats = StatCalculator.calculateEffectiveStats({
      baseStats: this.baseStats,
      multipliers: this.multipliers,
      upgrades: this.upgrades,
      activeEffects: this.activeEffects,
    });
    this.gameplayModifiers = StatCalculator.calculateGameplayModifiers({
      characterMultipliers: this.multipliers,
      upgrades: this.upgrades,
      activeEffects: this.activeEffects,
    });

    this.currentHp = this.effectiveStats.maxHp;
  }

  recalculateStats() {
    const previousMaxHp = this.effectiveStats.maxHp;
    this.effectiveStats = StatCalculator.calculateEffectiveStats({
      baseStats: this.baseStats,
      multipliers: this.multipliers,
      upgrades: this.upgrades,
      activeEffects: this.activeEffects,
    });
    this.gameplayModifiers = StatCalculator.calculateGameplayModifiers({
      characterMultipliers: this.multipliers,
      upgrades: this.upgrades,
      activeEffects: this.activeEffects,
    });

    const maxHpDelta = this.effectiveStats.maxHp - previousMaxHp;
    if (maxHpDelta > 0) {
      this.currentHp += maxHpDelta;
    }
    this.currentHp = Math.max(
      this.isDead() ? 0 : 1,
      Math.min(this.currentHp, this.effectiveStats.maxHp)
    );

    return this.effectiveStats;
  }

  isDead() {
    return this.currentHp <= 0;
  }

  applyDamage(amount) {
    if (this.isDead() || typeof amount !== 'number' || amount <= 0) {
      return 0;
    }

    const applied = Math.min(this.currentHp, Math.max(1, Math.round(amount)));
    this.currentHp = Math.max(0, this.currentHp - applied);
    return applied;
  }

  /**
   * Recupera HP instantaneamente, respeitando maxHp efetivo.
   * Nunca revive um jogador morto.
   */
  heal(amount) {
    if (this.isDead() || typeof amount !== 'number' || amount <= 0) {
      return 0;
    }

    const missingHp = Math.max(0, this.effectiveStats.maxHp - this.currentHp);
    if (missingHp <= 0) {
      return 0;
    }

    const healed = Math.min(missingHp, Math.round(amount));
    this.currentHp += healed;
    return healed;
  }

  /**
   * Atualiza a lista de modificadores temporários ativos e recalcula os atributos efetivos
   * sem jamais mutar `baseStats` ou `multipliers`.
   */
  setActiveEffects(effects = []) {
    this.activeEffects = Array.isArray(effects) ? [...effects] : [];
    return this.recalculateStats();
  }

  setUpgrades(upgrades = [], acquiredUpgradeIds = []) {
    this.upgrades = Array.isArray(upgrades) ? [...upgrades] : [];
    this.acquiredUpgradeIds = Array.isArray(acquiredUpgradeIds)
      ? [...acquiredUpgradeIds]
      : [];
    return this.recalculateStats();
  }

  getCombatStats() {
    return {
      ...this.effectiveStats,
      ...this.gameplayModifiers,
    };
  }

  getSnapshot() {
    const moveSpeed = Math.round(
      PHYSICS.PLAYER_MOVE_SPEED * (this.gameplayModifiers?.moveSpeedMultiplier ?? 1)
    );
    return {
      characterId: this.characterId,
      characterName: this.characterName,
      characterRole: this.characterRole,
      color: this.color,
      colorHex: this.colorHex,
      hp: this.currentHp,
      maxHp: this.effectiveStats.maxHp,
      strength: this.effectiveStats.strength,
      drinkResistance: this.effectiveStats.drinkResistance,
      moveSpeed,
    };
  }
}
