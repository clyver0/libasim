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
    this.slotEvents = [];
    this.spawnedCount = 0;
    this.probabilityBonus = 0;

    this._buildSchedule();
  }

  _buildSchedule() {
    this.scheduledEvents = [];
    this.slotEvents = [];
    const slots = this.config.SLOTS ?? [];

    slots
      .slice(0, this.config.MAX_APPEARANCES_PER_RUN)
      .forEach((slot, index) => {
        const roll = this.rng.next();
        const triggerAtDefeated = this.rng.int(
          slot.minDefeated,
          slot.maxDefeated
        );
        const direction = this.rng.next() < 0.5 ? 1 : -1;

        this.slotEvents.push({
          slotIndex: index,
          triggerAtDefeated,
          baseProbability: slot.probability,
          probability: slot.probability,
          roll,
          direction,
          isGuaranteedFirst: index === 0,
          approved: false,
          triggered: false,
        });
      });

    // Garantia defensiva de no mínimo 1 evento caso SLOTS tenha sido customizado vazio
    if (
      this.slotEvents.length < this.config.MIN_APPEARANCES_PER_RUN &&
      slots.length === 0
    ) {
      this.slotEvents.push({
        slotIndex: 0,
        triggerAtDefeated: 15,
        baseProbability: 1,
        probability: 1.0,
        roll: 0,
        direction: 1,
        isGuaranteedFirst: true,
        approved: true,
        triggered: false,
      });
    }

    this.setProbabilityBonus(this.probabilityBonus);
  }

  setProbabilityBonus(bonus = 0) {
    this.probabilityBonus = Math.max(0, Number(bonus) || 0);
    for (const event of this.slotEvents) {
      event.probability = event.isGuaranteedFirst
        ? 1
        : Math.min(1, event.baseProbability + this.probabilityBonus);
      event.approved =
        event.isGuaranteedFirst || event.roll <= event.probability;
    }
    this.scheduledEvents = this.slotEvents.filter((event) => event.approved);
    return this.getScheduledEvents();
  }

  getScheduledEvents() {
    return this.scheduledEvents.map(
      ({ slotIndex, triggerAtDefeated, probability, direction, triggered }) => ({
        slotIndex,
        triggerAtDefeated,
        probability,
        direction,
        triggered,
      })
    );
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
    this.probabilityBonus = 0;
    this._buildSchedule();
  }
}
