import { DRINK_CONFIG } from '../constants/drinks.js';
import { describeDrinkModifiers } from '../data/drinks.js';

function cloneModifiers(modifiers = {}) {
  const cloned = {};
  if (modifiers?.flat) {
    cloned.flat = { ...modifiers.flat };
  }
  if (modifiers?.multiplier) {
    cloned.multiplier = { ...modifiers.multiplier };
  }
  return cloned;
}

/**
 * Gerencia o ciclo de vida dos efeitos temporários de bebidas de forma desacoplada da engine.
 *
 * Responsabilidades:
 * - Calcular duração efetiva a partir da resistência registrada no momento da coleta.
 * - Manter temporizadores independentes por bebida.
 * - Renovar o timer em coletas repetidas da mesma bebida sem duplicar modificadores.
 * - Aplicar cura instantânea em cada coleta (sem nunca reviver jogador morto).
 * - Expirar e remover múltiplos efeitos corretamente no mesmo frame.
 * - Sincronizar modificadores com PlayerState sem mutar atributos-base.
 */
export class DrinkEffectManager {
  constructor(config = DRINK_CONFIG) {
    this.config = { ...DRINK_CONFIG, ...config };
    this.activeEffects = [];
    this.nextInstanceId = 1;
  }

  /**
   * Fórmula conceitual (GAME_DESIGN.md §7):
   * Duração efetiva = duração-base × multiplicador da bebida ÷ resistência efetiva do personagem
   */
  calculateEffectiveDuration(drink, drinkResistance) {
    const baseDuration = Number(
      drink?.baseDurationMs ?? this.config.BASE_DURATION_MS
    );
    const multiplier = Number(drink?.durationMultiplier ?? 1);
    const minResistance = this.config.MIN_RESISTANCE_FLOOR ?? 0.1;
    const effectiveResistance = Math.max(
      minResistance,
      Number(drinkResistance ?? 1)
    );

    const rawDuration = (baseDuration * multiplier) / effectiveResistance;
    const clamped = Math.min(
      this.config.MAX_EFFECTIVE_DURATION_MS,
      Math.max(this.config.MIN_EFFECTIVE_DURATION_MS, rawDuration)
    );

    return Math.round(clamped);
  }

  applyDrink(drink, playerState) {
    if (!drink || !playerState || playerState.isDead?.()) {
      return null;
    }

    // Registra a resistência efetiva no exato momento da coleta (antes de alterar efeitos)
    const minResistance = this.config.MIN_RESISTANCE_FLOOR ?? 0.1;
    const resistanceAtCollection = Math.max(
      minResistance,
      Number(playerState.effectiveStats?.drinkResistance ?? 1)
    );
    const durationMs = this.calculateEffectiveDuration(
      drink,
      resistanceAtCollection
    );

    const existing = this.activeEffects.find(
      (effect) => effect.drinkId === drink.id
    );

    let appliedEffect;
    let refreshed = false;

    if (existing) {
      // Opção A aprovada: renovar timer sem duplicar modificadores
      existing.durationMs = durationMs;
      existing.remainingMs = durationMs;
      existing.resistanceAtCollection = resistanceAtCollection;
      appliedEffect = existing;
      refreshed = true;
    } else {
      appliedEffect = {
        instanceId: `drink-effect-${this.nextInstanceId++}`,
        drinkId: drink.id,
        name: drink.name,
        color: drink.color,
        colorHex: drink.colorHex,
        durationMs,
        remainingMs: durationMs,
        resistanceAtCollection,
        modifiers: cloneModifiers(drink.modifiers),
        effectSummary: describeDrinkModifiers(drink.modifiers),
      };
      this.activeEffects.push(appliedEffect);
    }

    // Sincroniza modificadores com o PlayerState (recalcula maxHp, strength e drinkResistance)
    playerState.setActiveEffects(this.getActiveModifiers());

    // Aplica cura instantânea em cada coleta (inclusive repetidas), nunca revivendo jogador morto
    const healedAmount =
      typeof drink.instantHeal === 'number' && drink.instantHeal > 0
        ? playerState.heal(drink.instantHeal)
        : 0;

    return {
      effect: { ...appliedEffect, modifiers: cloneModifiers(appliedEffect.modifiers) },
      refreshed,
      healedAmount,
      resistanceAtCollection,
    };
  }

  update(deltaMs, playerState) {
    if (
      typeof deltaMs !== 'number' ||
      deltaMs <= 0 ||
      this.activeEffects.length === 0
    ) {
      return [];
    }

    const expired = [];
    const remaining = [];

    for (const effect of this.activeEffects) {
      effect.remainingMs = Math.max(0, effect.remainingMs - deltaMs);
      if (effect.remainingMs <= 0) {
        expired.push(effect);
      } else {
        remaining.push(effect);
      }
    }

    if (expired.length > 0) {
      this.activeEffects = remaining;
      playerState?.setActiveEffects(this.getActiveModifiers());
    }

    return expired;
  }

  clear(playerState = null) {
    if (this.activeEffects.length === 0) {
      return;
    }
    this.activeEffects = [];
    playerState?.setActiveEffects([]);
  }

  getActiveModifiers() {
    return this.activeEffects.map((effect) => effect.modifiers);
  }

  getActiveEffects() {
    return this.activeEffects.map((effect) => ({
      instanceId: effect.instanceId,
      drinkId: effect.drinkId,
      name: effect.name,
      color: effect.color,
      colorHex: effect.colorHex,
      durationMs: effect.durationMs,
      remainingMs: effect.remainingMs,
      resistanceAtCollection: effect.resistanceAtCollection,
      effectSummary:
        effect.effectSummary ?? describeDrinkModifiers(effect.modifiers),
    }));
  }

  hasActiveEffects() {
    return this.activeEffects.length > 0;
  }
}
