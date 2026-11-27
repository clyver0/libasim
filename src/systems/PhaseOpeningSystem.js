import { PHASE_OPENING_CONFIG } from '../constants/expansion.js';

/**
 * Controla a sequência de abertura padronizada no início de CADA fase (Fases 1, 2, 3 e 4):
 * 1. O jogador começa andando sozinho para a direita.
 * 2. Silêncio musical durante os primeiros segundos.
 * 3. Seta piscando indicando avanço para a direita.
 * 4. Ao término da caminhada inicial, música entra em fade-in e inimigos começam a surgir.
 */
export class PhaseOpeningSystem {
  constructor({
    config = PHASE_OPENING_CONFIG,
    onIntroStart = null,
    onIntroUpdate = null,
    onIntroComplete = null,
  } = {}) {
    this.config = config;
    this.onIntroStart = onIntroStart;
    this.onIntroUpdate = onIntroUpdate;
    this.onIntroComplete = onIntroComplete;

    this.active = false;
    this.currentPhase = null;
    this.durationMs = config.WALK_DURATION_MS;
    this.elapsedMs = 0;
    this.remainingMs = 0;
    this.arrowVisible = false;
    this.completedPhaseIds = [];
  }

  isActive() {
    return this.active;
  }

  start(phase, { durationMs = this.config.WALK_DURATION_MS } = {}) {
    if (!phase) return false;
    this.active = true;
    this.currentPhase = phase;
    this.durationMs = Math.max(200, durationMs);
    this.elapsedMs = 0;
    this.remainingMs = this.durationMs;
    this.arrowVisible = true;
    this.onIntroStart?.(phase, this.getSnapshot());
    return true;
  }

  update(deltaMs = 16.67) {
    if (!this.active || !(deltaMs > 0)) {
      return this.getSnapshot();
    }

    this.elapsedMs += deltaMs;
    this.remainingMs = Math.max(0, this.durationMs - this.elapsedMs);
    const period = Math.max(80, this.config.ARROW_BLINK_PERIOD_MS);
    this.arrowVisible = Math.floor(this.elapsedMs / period) % 2 === 0;

    const snap = this.getSnapshot();
    this.onIntroUpdate?.(snap);

    if (this.remainingMs <= 0) {
      const finishedPhase = this.currentPhase;
      this.active = false;
      this.arrowVisible = false;
      if (finishedPhase?.id != null) {
        this.completedPhaseIds.push(finishedPhase.id);
      }
      this.onIntroComplete?.(finishedPhase, this.getSnapshot());
    }

    return this.getSnapshot();
  }

  cancel() {
    this.active = false;
    this.arrowVisible = false;
    this.remainingMs = 0;
  }

  getSnapshot() {
    return {
      active: this.active,
      phase: this.currentPhase,
      elapsedMs: this.elapsedMs,
      remainingMs: this.remainingMs,
      durationMs: this.durationMs,
      progress:
        this.durationMs > 0
          ? Math.min(1, this.elapsedMs / this.durationMs)
          : 1,
      arrowVisible: this.arrowVisible,
      completedPhaseIds: [...this.completedPhaseIds],
    };
  }
}
