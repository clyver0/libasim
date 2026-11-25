import { ENEMY_CONFIG } from '../constants/enemies.js';

/**
 * Sistema centralizado de progressão de dificuldade.
 * A dificuldade só evolui mediante visitas oficiais à loja do Chiquinho.
 * Aplica multiplicadores exclusivamente sobre os atributos-base do catálogo.
 */
export class DifficultySystem {
  constructor({
    config = ENEMY_CONFIG.DIFFICULTY,
    onDifficultyChanged = null,
  } = {}) {
    this.config = config;
    this.onDifficultyChanged = onDifficultyChanged;
    this.officialShopVisits = 0;
  }

  getMultipliers() {
    const visits = this.officialShopVisits;
    const hpMultiplier = 1 + visits * this.config.HP_STEP_PER_VISIT;
    const strengthMultiplier =
      1 + visits * this.config.STRENGTH_STEP_PER_VISIT;
    const speedMultiplier = Math.min(
      this.config.MAX_SPEED_MULTIPLIER,
      1 + visits * this.config.SPEED_STEP_PER_VISIT
    );

    return {
      hpMultiplier,
      strengthMultiplier,
      speedMultiplier,
    };
  }

  registerOfficialShopVisit(metadata = {}) {
    this.officialShopVisits += 1;
    const snapshot = this.getSnapshot();

    if (typeof this.onDifficultyChanged === 'function') {
      this.onDifficultyChanged(snapshot, metadata);
    }

    return snapshot;
  }

  /**
   * Interface para futuras lojas (Chiquinho vs Coquinho Extra).
   * Apenas visitas com `isOfficial: true` alteram a dificuldade.
   */
  handleShopVisit({ isOfficial = false, ...metadata } = {}) {
    if (!isOfficial) {
      return {
        applied: false,
        ...this.getSnapshot(),
      };
    }

    const snapshot = this.registerOfficialShopVisit(metadata);
    return {
      applied: true,
      ...snapshot,
    };
  }

  /**
   * Calcula os atributos finais do inimigo a partir de `baseStats` (sem escalonamento duplo).
   */
  scaleEnemyData(enemyData) {
    if (!enemyData?.baseStats) {
      throw new Error('DifficultySystem.scaleEnemyData requires enemyData with baseStats.');
    }

    const { hpMultiplier, strengthMultiplier, speedMultiplier } =
      this.getMultipliers();
    const base = enemyData.baseStats;

    return {
      ...enemyData,
      baseStats: { ...base },
      difficultyLevel: this.officialShopVisits,
      scaledStats: {
        maxHp: Math.max(1, Math.round(base.maxHp * hpMultiplier)),
        strength: Math.max(1, Math.round(base.strength * strengthMultiplier)),
        moveSpeed: Math.round(base.moveSpeed * speedMultiplier),
        attackSpeed: base.attackSpeed ?? 1,
        jumpVelocity: base.jumpVelocity,
        damageReduction: base.damageReduction ?? 0,
      },
    };
  }

  getSnapshot() {
    return {
      officialShopVisits: this.officialShopVisits,
      ...this.getMultipliers(),
    };
  }

  reset() {
    this.officialShopVisits = 0;
  }
}
