import { DRINK_CONFIG } from '../constants/drinks.js';
import { DRINKS } from '../data/drinks.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * Gerencia seleção por raridade, agendamento de spawn, atração automática e coleta idempotente.
 * Completamente independente da engine Phaser para facilitar testes determinísticos.
 */
export class DrinkSystem {
  constructor({
    screenWidth = 960,
    seed = Date.now(),
    catalog = DRINKS,
    config = DRINK_CONFIG,
  } = {}) {
    this.screenWidth = screenWidth;
    this.catalog = catalog;
    this.config = { ...DRINK_CONFIG, ...config };
    this.random = new SeededRandom(seed);

    this.nextDrinkId = 1;
    this.spawnTimerMs = this.config.INITIAL_SPAWN_DELAY_MS;
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
  }

  resume() {
    this.stopped = false;
  }

  reset(seed = Date.now()) {
    this.random = new SeededRandom(seed);
    this.nextDrinkId = 1;
    this.spawnTimerMs = this.config.INITIAL_SPAWN_DELAY_MS;
    this.stopped = false;
  }

  /**
   * Sorteia uma bebida respeitando os pesos de raridade.
   * `rarityBonus` (>= 0) fica preparado para upgrades da Fase 6 (Sorte/Azar no Copo).
   */
  pickDrink({ rarityBonus = 0 } = {}) {
    if (!this.catalog || this.catalog.length === 0) {
      return null;
    }

    const weighted = this.catalog.map((drink) => {
      const baseWeight = Math.max(0.01, Number(drink.rarityWeight ?? 1));
      const rankFactor = 1 + rarityBonus * ((drink.rarityRank ?? 1) - 1) * 0.15;
      return {
        drink,
        weight: Math.max(0.01, baseWeight * rankFactor),
      };
    });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.random.next() * totalWeight;

    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.drink;
      }
    }

    return weighted[weighted.length - 1].drink;
  }

  update(
    deltaMs,
    { activeDrinks = [], playerDead = false, rarityBonus = 0 } = {}
  ) {
    if (this.stopped || playerDead || typeof deltaMs !== 'number' || deltaMs <= 0) {
      return null;
    }

    if (activeDrinks.length >= this.config.MAX_ACTIVE_DRINKS) {
      return null;
    }

    this.spawnTimerMs -= deltaMs;
    if (this.spawnTimerMs > 0) {
      return null;
    }

    this.spawnTimerMs = this.config.SPAWN_INTERVAL_MS;

    const drinkData = this.pickDrink({ rarityBonus });
    if (!drinkData) {
      return null;
    }

    const minX = this.config.SPAWN_MARGIN_X;
    const maxX = Math.max(minX + 1, this.screenWidth - this.config.SPAWN_MARGIN_X);
    const x = this.random.range(minX, maxX);

    return {
      id: `drink-${this.nextDrinkId++}`,
      x,
      y: this.config.SPAWN_Y,
      drinkData,
    };
  }

  /**
   * Calcula vetor de atração automática quando a bebida está dentro do raio configurado.
   * `extraRadius` permite ampliar a atração automática com a Mochila de Bebidas.
   */
  computeAttractionVelocity(drinkPos, playerPos, { extraRadius = 0 } = {}) {
    const effectiveRadius = Math.max(
      0,
      Number(this.config.MAGNET_BASE_RADIUS ?? 0) + Number(extraRadius ?? 0)
    );

    if (effectiveRadius <= 0 || !drinkPos || !playerPos) {
      return { attracted: false, vx: 0, vy: 0 };
    }

    const dx = playerPos.x - drinkPos.x;
    const dy = playerPos.y - drinkPos.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0.001 || distance > effectiveRadius) {
      return { attracted: false, vx: 0, vy: 0 };
    }

    const pullSpeed = this.config.MAGNET_PULL_SPEED;
    return {
      attracted: true,
      vx: (dx / distance) * pullSpeed,
      vy: (dy / distance) * pullSpeed,
    };
  }

  /**
   * Coleta idempotente: garante que cada instância física de bebida seja aplicada no máximo uma vez.
   */
  collectDrink(drinkEntity, playerState, effectManager) {
    if (
      !drinkEntity ||
      drinkEntity.collected ||
      drinkEntity.destroyed ||
      !playerState ||
      playerState.isDead?.() ||
      !effectManager
    ) {
      return null;
    }

    drinkEntity.collected = true;
    const result = effectManager.applyDrink(drinkEntity.drinkData, playerState);
    drinkEntity.onCollected?.();
    return result;
  }
}
