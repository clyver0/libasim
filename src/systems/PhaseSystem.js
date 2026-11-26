import { PHASE_CONFIG } from '../constants/expansion.js';

/**
 * Progressão em fases por eliminações (a cada 25 inimigos comuns derrotados).
 * Pura e determinística. O escalonamento de fase é multiplicado sobre o escalonamento
 * por visitas à loja já aplicado pelo DifficultySystem (os dois se somam em camadas).
 */
export class PhaseSystem {
  constructor({ config = PHASE_CONFIG, onPhaseChanged = null } = {}) {
    this.config = config;
    this.onPhaseChanged = onPhaseChanged;
    this.currentPhaseId = 1;
  }

  getPhaseIdForKills(defeatedCount = 0) {
    const raw = Math.floor(Math.max(0, defeatedCount) / this.config.KILLS_PER_PHASE) + 1;
    return Math.min(this.config.PHASES.length, raw);
  }

  getPhase(id = this.currentPhaseId) {
    return this.config.PHASES[Math.min(this.config.PHASES.length, Math.max(1, id)) - 1];
  }

  /** Retorna a transição (ou null) quando a contagem atinge uma nova fase. */
  update(defeatedCount) {
    const target = this.getPhaseIdForKills(defeatedCount);
    if (target <= this.currentPhaseId) return null;
    const from = this.currentPhaseId;
    this.currentPhaseId = target;
    const transition = { from, to: target, phase: this.getPhase(target) };
    this.onPhaseChanged?.(transition);
    return transition;
  }

  isAntRainPhase() {
    return Boolean(this.getPhase().antRain);
  }

  /** Aplica o escalonamento da fase atual sobre `scaledStats` (sem mutar o original). */
  scaleEnemyData(scaledData) {
    const { hp, strength, speed } = this.getPhase().scaling;
    const base = scaledData.baseStats ?? {};
    const stats = scaledData.scaledStats;
    const maxSpeed = (base.moveSpeed ?? stats.moveSpeed) * this.config.MAX_COMBINED_SPEED_MULTIPLIER;
    return {
      ...scaledData,
      phaseId: this.currentPhaseId,
      scaledStats: {
        ...stats,
        maxHp: Math.max(1, Math.round(stats.maxHp * hp)),
        strength: Math.max(1, Math.round(stats.strength * strength)),
        moveSpeed: Math.round(Math.min(maxSpeed, stats.moveSpeed * speed)),
      },
    };
  }

  /**
   * Ajusta proporcionalmente os atributos de um inimigo comum já ativo na arena
   * quando ocorre transição de `fromPhaseId` para `toPhaseId`, preservando a razão de HP atual.
   */
  upgradeExistingEnemy(enemy, fromPhaseId, toPhaseId = this.currentPhaseId) {
    const state = enemy?.state;
    if (!state || state.isDead?.() || fromPhaseId === toPhaseId) return false;

    const prev = this.getPhase(fromPhaseId).scaling;
    const next = this.getPhase(toPhaseId).scaling;
    const hpFactor = next.hp / Math.max(0.01, prev.hp);
    const strFactor = next.strength / Math.max(0.01, prev.strength);
    const spdFactor = next.speed / Math.max(0.01, prev.speed);

    const hpRatio = state.maxHp > 0 ? state.currentHp / state.maxHp : 1;
    state.maxHp = Math.max(1, Math.round(state.maxHp * hpFactor));
    state.currentHp = Math.min(
      state.maxHp,
      Math.max(1, Math.round(state.maxHp * hpRatio))
    );
    state.strength = Math.max(1, Math.round(state.strength * strFactor));
    state.moveSpeed = Math.round(state.moveSpeed * spdFactor);
    enemy._redrawHpBar?.();
    return true;
  }

  reset() {
    this.currentPhaseId = 1;
  }
}
