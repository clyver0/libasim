import { SHOP_CONFIG } from '../constants/shops.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * Sistema próprio de agendamento das aparições do Coquinho Extra durante a run.
 *
 * Regras garantidas (GAME_DESIGN.md §11):
 * - No mínimo 1 e no máximo 3 aparições por run.
 * - Primeira aparição 100% garantida quando o jogador alcançar o evento programado.
 * - Aparições adicionais com probabilidades progressivamente menores.
 * - Determinístico por seed.
 */
export class GoldenEventScheduler {
  constructor({ seed = Date.now(), config = SHOP_CONFIG.COQUINHO } = {}) {
    this.config = config;
    this.rng = new SeededRandom(seed);
    this.scheduledEvents = [];
    this.spawnedCount = 0;

    this._buildSchedule();
  }

  _buildSchedule() {
    this.scheduledEvents = [];
    const slots = this.config.SLOTS ?? [];

    slots.forEach((slot, index) => {
      if (this.scheduledEvents.length >= this.config.MAX_APPEARANCES_PER_RUN) {
        return;
      }

      const isGuaranteedFirst = index === 0;
      const roll = this.rng.next();
      const approved = isGuaranteedFirst || roll <= slot.probability;

      if (!approved) {
        return;
      }

      const triggerAtDefeated = this.rng.int(slot.minDefeated, slot.maxDefeated);
      const direction = this.rng.next() < 0.5 ? 1 : -1;

      this.scheduledEvents.push({
        slotIndex: index,
        triggerAtDefeated,
        probability: isGuaranteedFirst ? 1.0 : slot.probability,
        direction,
        triggered: false,
      });
    });

    // Garantia defensiva de no mínimo 1 evento caso SLOTS tenha sido customizado vazio
    if (
      this.scheduledEvents.length < this.config.MIN_APPEARANCES_PER_RUN &&
      slots.length === 0
    ) {
      this.scheduledEvents.push({
        slotIndex: 0,
        triggerAtDefeated: 15,
        probability: 1.0,
        direction: 1,
        triggered: false,
      });
    }
  }

  getScheduledEvents() {
    return this.scheduledEvents.map((ev) => ({ ...ev }));
  }

  /**
   * Verifica se algum evento programado foi alcançado pelo contador de inimigos derrotados.
   * Nunca dispara novo Coquinho se já houver um ativo na tela.
   */
  checkTrigger(defeatedCount, { hasActiveGolden = false } = {}) {
    if (hasActiveGolden) {
      return null;
    }

    for (const event of this.scheduledEvents) {
      if (!event.triggered && defeatedCount >= event.triggerAtDefeated) {
        event.triggered = true;
        this.spawnedCount += 1;
        return {
          id: `coquinho_${this.spawnedCount}`,
          slotIndex: event.slotIndex,
          triggerAtDefeated: event.triggerAtDefeated,
          direction: event.direction,
        };
      }
    }

    return null;
  }

  reset(seed = Date.now()) {
    this.rng = new SeededRandom(seed);
    this.spawnedCount = 0;
    this._buildSchedule();
  }
}
