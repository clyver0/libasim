import { ENEMY_CONFIG } from '../constants/enemies.js';

/**
 * Mantém o estado puro de um inimigo comum, desacoplado da renderização e da física.
 * Os atributos escalonados já chegam calculados uma única vez pelo DifficultySystem.
 */
export class EnemyState {
  constructor(enemyData, { id, scaledStats = null } = {}) {
    if (!enemyData) {
      throw new Error('EnemyState requires enemyData.');
    }

    const stats = scaledStats ?? enemyData.scaledStats ?? enemyData.baseStats;

    this.id = id ?? `${enemyData.id}_${Date.now()}`;
    this.typeId = enemyData.id;
    this.name = enemyData.name;
    this.color = enemyData.color;
    this.bodyWidth = enemyData.bodyWidth;
    this.bodyHeight = enemyData.bodyHeight;
    this.visualPreset = enemyData.visualPreset ?? null;
    this.countsAsCommonEnemy = enemyData.countsAsCommonEnemy !== false;

    this.maxHp = Math.max(1, Math.round(stats.maxHp));
    this.currentHp = this.maxHp;
    this.strength = stats.strength;
    this.moveSpeed = stats.moveSpeed;
    this.attackSpeed = Math.max(0.25, stats.attackSpeed ?? 1);
    this.jumpVelocity = stats.jumpVelocity ?? ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY;
    this.damageReduction = stats.damageReduction ?? 0;
    this.difficultyLevel = enemyData.difficultyLevel ?? 0;

    const baseAttack = enemyData.attack;
    this.attack = {
      ...baseAttack,
      hitbox: { ...baseAttack.hitbox },
      windupMs: Math.max(80, Math.round(baseAttack.windupMs / this.attackSpeed)),
      activeMs: baseAttack.activeMs,
      recoveryMs: Math.max(
        120,
        Math.round(baseAttack.recoveryMs / this.attackSpeed)
      ),
    };

    this.behaviorState = ENEMY_CONFIG.STATES.FALLING;
    this.defeatedHandled = false;
  }

  get stats() {
    return {
      strength: this.strength,
      damageReduction: this.damageReduction,
    };
  }

  isDead() {
    return (
      this.currentHp <= 0 || this.behaviorState === ENEMY_CONFIG.STATES.DEAD
    );
  }

  setBehaviorState(nextState) {
    if (this.isDead() && nextState !== ENEMY_CONFIG.STATES.DEAD) {
      return false;
    }
    this.behaviorState = nextState;
    return true;
  }

  applyDamage(amount) {
    if (this.isDead() || typeof amount !== 'number' || amount <= 0) {
      return 0;
    }

    const applied = Math.min(this.currentHp, Math.max(1, Math.round(amount)));
    this.currentHp = Math.max(0, this.currentHp - applied);

    if (this.currentHp === 0) {
      this.behaviorState = ENEMY_CONFIG.STATES.DEAD;
    }

    return applied;
  }

  getSnapshot() {
    return {
      id: this.id,
      typeId: this.typeId,
      name: this.name,
      hp: this.currentHp,
      maxHp: this.maxHp,
      strength: this.strength,
      moveSpeed: this.moveSpeed,
      attackSpeed: this.attackSpeed,
      behaviorState: this.behaviorState,
      difficultyLevel: this.difficultyLevel,
    };
  }
}
