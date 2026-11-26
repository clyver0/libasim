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
  if (modifiers?.gameplay) {
    cloned.gameplay = { ...modifiers.gameplay };
  }
  return cloned;
}

/**
 * Gerencia o ciclo de vida dos efeitos temporários de bebidas de forma desacoplada da engine.
 *
 * Responsabilidades:
 * - Calcular duração efetiva a partir da resistência registrada no momento da coleta.
 * - Manter temporizadores independentes por bebida.
 * - Manter uma instância e um temporizador independentes para cada coleta.
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
    const durationOverride = drink?.durationOverrideMs;
    const baseDuration = Number(
      drink?.baseDurationMs ?? this.config.BASE_DURATION_MS
    );
    const multiplier = Number(drink?.durationMultiplier ?? 1);
    const minResistance = this.config.MIN_RESISTANCE_FLOOR ?? 0.1;
    const effectiveResistance = Math.max(
      minResistance,
      Number(drinkResistance ?? 1)
    );

    const rawDuration =
      typeof durationOverride === 'number' && Number.isFinite(durationOverride)
        ? durationOverride
        : (baseDuration * multiplier) / effectiveResistance;
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
    if (drink.instantOnly) {
      return {
        effect: null,
        refreshed: false,
        stackCount: 0,
        healedAmount:
          typeof drink.instantHeal === 'number' && drink.instantHeal > 0
            ? playerState.heal(drink.instantHeal)
            : 0,
        resistanceAtCollection,
      };
    }

    const durationMs = this.calculateEffectiveDuration(
      drink,
      resistanceAtCollection
    );

    const appliedEffect = {
      instanceId: `drink-effect-${this.nextInstanceId++}`,
      drinkId: drink.id,
      name: drink.name,
      color: drink.color,
      colorHex: drink.colorHex,
      durationMs,
      remainingMs: durationMs,
      resistanceAtCollection,
      modifiers: cloneModifiers(drink.modifiers),
      effectSummary:
        drink.effectSummary ?? describeDrinkModifiers(drink.modifiers),
      healthDrainPerSecond: Math.max(
        0,
        Number(drink.healthDrainPerSecond ?? 0)
      ),
      healthDrainRemainder: 0,
      synergy: false,
      synergyMultiplierPerStack: null,
      synergyMaxStacks: null,
    };

    const synergy = playerState.drinkSynergies?.[drink.id];
    if (synergy) {
      if (synergy.flat) {
        appliedEffect.modifiers.flat = {
          ...(appliedEffect.modifiers.flat ?? {}),
          ...synergy.flat,
        };
      }
      if (synergy.multiplier) {
        appliedEffect.modifiers.multiplier = {
          ...(appliedEffect.modifiers.multiplier ?? {}),
          ...synergy.multiplier,
        };
      }
      appliedEffect.synergy = true;
      appliedEffect.synergyMultiplierPerStack = synergy.multiplierPerStack ?? null;
      appliedEffect.synergyMaxStacks = synergy.maxStacks ?? null;
    }
    this.activeEffects.push(appliedEffect);

    // Sincroniza modificadores com o PlayerState (recalcula maxHp, strength e drinkResistance)
    playerState.setActiveEffects(this.getActiveModifiers());

    // Aplica cura instantânea em cada coleta (inclusive repetidas), nunca revivendo jogador morto
    const healedAmount =
      typeof drink.instantHeal === 'number' && drink.instantHeal > 0
        ? playerState.heal(drink.instantHeal)
        : 0;

    return {
      effect: { ...appliedEffect, modifiers: cloneModifiers(appliedEffect.modifiers) },
      refreshed: false,
      stackCount: this.activeEffects.filter((effect) => effect.drinkId === drink.id).length,
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
      const activeDeltaMs = Math.min(deltaMs, effect.remainingMs);
      effect.remainingMs = Math.max(0, effect.remainingMs - deltaMs);
      if (effect.healthDrainPerSecond > 0 && !playerState?.isDead?.()) {
        effect.healthDrainRemainder +=
          (effect.healthDrainPerSecond * activeDeltaMs) / 1000;
        const damage = Math.floor(effect.healthDrainRemainder);
        if (damage > 0) {
          playerState?.applyDamage?.(damage);
          effect.healthDrainRemainder -= damage;
        }
      }
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
    const modifiers = this.activeEffects.map((effect) => effect.modifiers);
    const synergyStacks = new Map();

    for (const effect of this.activeEffects) {
      if (!effect.synergy || !effect.synergyMultiplierPerStack) continue;
      const current = synergyStacks.get(effect.drinkId) ?? {
        count: 0,
        maxStacks: effect.synergyMaxStacks,
        multiplierPerStack: effect.synergyMultiplierPerStack,
      };
      current.count += 1;
      synergyStacks.set(effect.drinkId, current);
    }

    for (const { count, maxStacks, multiplierPerStack } of synergyStacks.values()) {
      const stacks = Number.isFinite(maxStacks)
        ? Math.min(count, Math.max(0, maxStacks))
        : count;
      const multiplier = {};
      for (const [stat, amount] of Object.entries(multiplierPerStack)) {
        multiplier[stat] = 1 + stacks * Number(amount);
      }
      modifiers.push({ multiplier });
    }

    return modifiers;
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
      synergy: Boolean(effect.synergy),
      effectSummary:
        effect.effectSummary ?? describeDrinkModifiers(effect.modifiers),
    }));
  }

  hasActiveEffects() {
    return this.activeEffects.length > 0;
  }
}
