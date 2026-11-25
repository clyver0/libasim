/**
 * Catálogo de bebidas em ordem crescente de raridade (GAME_DESIGN.md §7).
 * Valores configuráveis para balanceamento; várias bebidas aumentam HP máximo e curam vida.
 */
export const DRINKS = [
  {
    id: 'cantinho_do_vale',
    name: 'Cantinho do Vale',
    rarityRank: 1,
    rarityWeight: 40,
    color: 0xa855f7,
    colorHex: '#a855f7',
    durationMultiplier: 0.9,
    instantHeal: 12,
    modifiers: {
      flat: {
        maxHp: 15,
        strength: 2,
        drinkResistance: -0.05,
      },
    },
  },
  {
    id: 'cerveja',
    name: 'Cerveja',
    rarityRank: 2,
    rarityWeight: 30,
    color: 0xf59e0b,
    colorHex: '#f59e0b',
    durationMultiplier: 1.05,
    instantHeal: 20,
    modifiers: {
      flat: {
        maxHp: 30,
        strength: 3,
        drinkResistance: -0.1,
      },
    },
  },
  {
    id: 'ginde_10',
    name: 'Ginde 10',
    rarityRank: 3,
    rarityWeight: 18,
    color: 0x06b6d4,
    colorHex: '#06b6d4',
    durationMultiplier: 1.15,
    instantHeal: 16,
    modifiers: {
      flat: {
        maxHp: 15,
        strength: 6,
        drinkResistance: -0.18,
      },
    },
  },
  {
    id: 'chevette',
    name: 'Chevette',
    rarityRank: 4,
    rarityWeight: 10,
    color: 0xec4899,
    colorHex: '#ec4899',
    durationMultiplier: 1.3,
    instantHeal: 28,
    modifiers: {
      flat: {
        maxHp: 45,
        strength: 8,
        drinkResistance: -0.25,
      },
      multiplier: {
        strength: 1.08,
      },
    },
  },
  {
    id: 'whisky_energetico',
    name: 'Whisky com Energético',
    rarityRank: 5,
    rarityWeight: 5,
    color: 0xf97316,
    colorHex: '#f97316',
    durationMultiplier: 1.45,
    instantHeal: 25,
    modifiers: {
      flat: {
        maxHp: 30,
        strength: 11,
        drinkResistance: -0.35,
      },
      multiplier: {
        strength: 1.15,
      },
    },
  },
  {
    id: 'absinto',
    name: 'Absinto',
    rarityRank: 6,
    rarityWeight: 2,
    color: 0x22c55e,
    colorHex: '#22c55e',
    durationMultiplier: 1.65,
    instantHeal: 40,
    modifiers: {
      flat: {
        maxHp: 60,
        strength: 15,
        drinkResistance: -0.45,
      },
      multiplier: {
        strength: 1.25,
      },
    },
  },
];

/**
 * Gera texto curto explicando os efeitos temporários (e cura opcional) de uma bebida.
 */
export function describeDrinkModifiers(
  modifiers = {},
  { healedAmount = null, instantHeal = null } = {}
) {
  const parts = [];
  const healVal = healedAmount !== null ? healedAmount : instantHeal;
  if (typeof healVal === 'number' && healVal > 0) {
    parts.push(`+${healVal} Cura`);
  }

  const flat = modifiers?.flat ?? {};
  const mult = modifiers?.multiplier ?? {};

  if (flat.maxHp) {
    parts.push(`${flat.maxHp > 0 ? '+' : ''}${flat.maxHp} Vida Máx`);
  }
  if (flat.strength) {
    parts.push(`${flat.strength > 0 ? '+' : ''}${flat.strength} Força`);
  }
  if (mult.strength && mult.strength !== 1) {
    const pct = Math.round((mult.strength - 1) * 100);
    parts.push(`${pct > 0 ? '+' : ''}${pct}% Força`);
  }
  if (flat.drinkResistance) {
    const pct = Math.round(flat.drinkResistance * 100);
    parts.push(`${pct > 0 ? '+' : ''}${pct}% Resist.`);
  }

  return parts.join(' • ');
}

export function getAllDrinks() {
  return DRINKS;
}

export function getDrinkById(id) {
  return DRINKS.find((drink) => drink.id === id) ?? null;
}
