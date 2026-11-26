/**
 * Catálogo de bebidas em ordem crescente de raridade (GAME_DESIGN.md §7).
 * Valores configuráveis para balanceamento; várias bebidas aumentam HP máximo e curam vida.
 */
export const DRINKS = [
  {
    id: 'agua',
    name: 'Água',
    rarityRank: 1,
    rarityWeight: 60,
    color: 0x38bdf8,
    colorHex: '#38bdf8',
    instantHeal: 18,
    instantOnly: true,
  },
  {
    id: 'cantinho_do_vale',
    name: 'Cantinho do Vale',
    spriteKey: 'drink_cantinho_do_vale',
    spriteFile: 'cantinho_do_vale.png',
    rarityRank: 2,
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
    spriteKey: 'drink_cerveja',
    spriteFile: 'cerveja.png',
    rarityRank: 3,
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
    id: 'gin_de_10',
    name: 'Gin de 10',
    spriteKey: 'drink_gin_de_10',
    spriteFile: 'gin_de_10.jpg',
    rarityRank: 4,
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
    spriteKey: 'drink_chevette',
    spriteFile: 'images.jpg',
    rarityRank: 5,
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
    id: 'mansao_maromba',
    name: 'Mansão Maromba',
    spriteKey: 'drink_mansao_maromba',
    spriteFile: 'mansao_maromba.jpg',
    rarityRank: 6,
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
    spriteKey: 'drink_absinto',
    spriteFile: 'absinto.png',
    rarityRank: 7,
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
  {
    id: 'caseirinha_da_casa',
    name: 'Caseirinha da Casa',
    rarityRank: 8,
    rarityWeight: 0.25,
    color: 0xfacc15,
    colorHex: '#facc15',
    durationMultiplier: 1.8,
    instantHeal: 45,
    isSpecial: true,
    modifiers: {
      flat: {
        maxHp: 45,
        strength: 18,
        drinkResistance: -0.5,
      },
      multiplier: {
        strength: 1.2,
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
