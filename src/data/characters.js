import { ABILITIES } from './abilities.js';

const base = (import.meta.env?.BASE_URL ?? './').replace(/\/?$/, '/');

/**
 * Catálogo dos três personagens jogáveis. Todos os atributos são multiplicadores
 * configuráveis aplicados pelo StatCalculator sobre os atributos-base (sem lógica duplicada).
 *
 * - Açougue: gigante, forte, muito resistente às bebidas e muito lento.
 * - Piri: porte médio/grande, muito forte, muito resistente e lento.
 * - Tonegi: minúsculo, relativamente rápido, muito forte e quase sem resistência às bebidas.
 *
 * `bodyScale` altera hitbox e visual; `visualTypes` define o visual-base (acessórios).
 * `drinkSynergies` aplica multiplicadores extras apenas enquanto o efeito da bebida está ativo.
 * `antImmunity` é uma propriedade do personagem (independe de estar usando a habilidade).
 */
export const DEFAULT_BASE_STATS = Object.freeze({
  maxHp: 100,
  strength: 10,
  drinkResistance: 1,
});

export const CHARACTERS = Object.freeze([
  Object.freeze({
    id: 'acougue',
    name: 'Açougue',
    role: 'Gigante lento | Cantinho aumenta a força',
    portraitKey: 'portrait_acougue',
    portraitSrc: `${base}characters/acougue.png`,
    color: 0xef4444,
    colorHex: '#ef4444',
    baseStats: { ...DEFAULT_BASE_STATS },
    multipliers: Object.freeze({
      maxHp: 1.4,
      strength: 1.3,
      drinkResistance: 1.8,
      moveSpeed: 0.62,
      bodyScale: 1.55,
    }),
    visualTypes: Object.freeze(['beer_belly', 'concrete_shoulders']),
    drinkSynergies: Object.freeze({
      cantinho_do_vale: Object.freeze({
        flat: Object.freeze({ strength: 0 }),
        multiplierPerStack: Object.freeze({ strength: 1 }),
        maxStacks: 9,
      }),
    }),
    antImmunity: false,
    ability: ABILITIES.terca_do_cantinho,
  }),
  Object.freeze({
    id: 'piri',
    name: 'Piri',
    role: 'Muito forte | O fit se calou (10 kills)',
    portraitKey: 'portrait_piri',
    portraitSrc: `${base}characters/piri.png`,
    color: 0x10b981,
    colorHex: '#10b981',
    baseStats: { ...DEFAULT_BASE_STATS },
    multipliers: Object.freeze({
      maxHp: 1.25,
      strength: 1.7,
      drinkResistance: 1.7,
      moveSpeed: 0.78,
      bodyScale: 1.25,
    }),
    visualTypes: Object.freeze(['boxing_gloves', 'hero_cape']),
    drinkSynergies: Object.freeze({}),
    antImmunity: false,
    ability: ABILITIES.o_fit_se_calou,
  }),
  Object.freeze({
    id: 'tonegi',
    name: 'Tonegi',
    role: 'Pequeno e ágil | Pisa ligeiro (formigas)',
    portraitKey: 'portrait_tonegi',
    portraitSrc: `${base}characters/tonegi.png`,
    color: 0xfbbf24,
    colorHex: '#fbbf24',
    baseStats: { ...DEFAULT_BASE_STATS },
    multipliers: Object.freeze({
      maxHp: 0.85,
      strength: 1.6,
      drinkResistance: 0.45,
      moveSpeed: 1.2,
      bodyScale: 0.72,
    }),
    visualTypes: Object.freeze(['ninja_headband', 'rocket_shoes']),
    drinkSynergies: Object.freeze({}),
    antImmunity: true,
    ability: ABILITIES.pisa_ligeiro,
  }),
]);

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacterById(id) {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}
