import { BOSS_CONFIG } from '../constants/boss.js';

/**
 * Estado puro do Boss Final, independente de renderização e física.
 * Controla HP, atributos próprios, transição para Fase 2 e padrões de ataque.
 */
export class BossState {
  constructor(bossData, { id = 'boss_1', config = BOSS_CONFIG } = {}) {
    if (!bossData) {
      throw new Error('BossState requires bossData.');
    }

    this.config = config;
    const stats = bossData.scaledStats ?? bossData.baseStats;

    this.id = id;
    this.typeId = bossData.id;
    this.name = bossData.name;
    this.countsAsCommonEnemy = false;
    this.colorPhase1 = bossData.colorPhase1 ?? 0xdc2626;
    this.colorPhase2 = bossData.colorPhase2 ?? 0x9333ea;
    this.bodyWidth = bossData.bodyWidth ?? 36;
    this.bodyHeight = bossData.bodyHeight ?? 74;

    this.maxHp = Math.max(1, Math.round(stats.maxHp));
    this.currentHp = this.maxHp;
    this.baseStrength = stats.strength;
    this.baseMoveSpeed = stats.moveSpeed;
    this.baseAttackSpeed = Math.max(0.4, stats.attackSpeed ?? 1);
    this.jumpVelocity = stats.jumpVelocity ?? config.DEFAULT_JUMP_VELOCITY;
    this.damageReduction = stats.damageReduction ?? 0.12;

    this.phase = 1;
    this.attacks = bossData.attacks ?? {};
    this.activeAttackKey = 'crush';
    this.behaviorState = config.STATES.FALLING;
    this.defeatedHandled = false;
  }

  get color() {
    return this.phase >= 2 ? this.colorPhase2 : this.colorPhase1;
  }

  get strength() {
    const mult =
      this.phase >= 2 ? this.config.PHASE_2_STRENGTH_MULTIPLIER : 1;
    return Math.round(this.baseStrength * mult * 100) / 100;
  }

  get moveSpeed() {
    const mult = this.phase >= 2 ? this.config.PHASE_2_SPEED_MULTIPLIER : 1;
    return Math.round(this.baseMoveSpeed * mult);
  }

  get attackSpeed() {
    const mult =
      this.phase >= 2 ? this.config.PHASE_2_ATTACK_SPEED_MULTIPLIER : 1;
    return this.baseAttackSpeed * mult;
  }

  get stats() {
    return {
      strength: this.strength,
      damageReduction: this.damageReduction,
    };
  }

  /**
   * Compatibilidade com EnemyAI para navegação por plataformas:
   * expõe o alcance básico de perseguição em `this.attack`.
   */
  get attack() {
    return this.getAttackConfig(this.activeAttackKey);
  }

  getAttackConfig(attackKey = 'crush') {
    const raw =
      this.attacks[attackKey] ??
      this.attacks.crush ??
      Object.values(this.attacks)[0];
    const spd = this.attackSpeed;

    return {
      ...raw,
      hitbox: { ...raw.hitbox },
      windupMs: Math.max(100, Math.round(raw.windupMs / spd)),
      activeMs: raw.activeMs,
      recoveryMs: Math.max(150, Math.round(raw.recoveryMs / spd)),
    };
  }

  isDead() {
    return (
      this.currentHp <= 0 || this.behaviorState === this.config.STATES.DEAD
    );
  }

  setBehaviorState(nextState) {
    if (this.isDead() && nextState !== this.config.STATES.DEAD) {
      return false;
    }
    this.behaviorState = nextState;
    return true;
  }

  applyDamage(amount) {
    if (this.isDead() || typeof amount !== 'number' || amount <= 0) {
      return { applied: 0, phaseChanged: false };
    }

    const applied = Math.min(this.currentHp, Math.max(1, Math.round(amount)));
    this.currentHp = Math.max(0, this.currentHp - applied);

    let phaseChanged = false;
    if (this.currentHp === 0) {
      this.behaviorState = this.config.STATES.DEAD;
    } else if (
      this.phase === 1 &&
      this.currentHp / this.maxHp <= this.config.PHASE_2_HP_THRESHOLD_RATIO
    ) {
      this.phase = 2;
      phaseChanged = true;
    }

    return { applied, phaseChanged };
  }

  getSnapshot() {
    return {
      id: this.id,
      name: this.name,
      hp: this.currentHp,
      maxHp: this.maxHp,
      phase: this.phase,
      strength: this.strength,
      moveSpeed: this.moveSpeed,
      behaviorState: this.behaviorState,
    };
  }
}
