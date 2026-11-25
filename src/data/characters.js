/**
 * Catálogo dos dois personagens jogáveis com identidades e focos distintos:
 * - Personagem 1 (Relâmpago Azul): focado em Velocidade e Ataque Ágil/Força.
 * - Personagem 2 (Colosso Laranja): focado em Vida Máxima (HP) e Resistência a Bebidas.
 */
export const DEFAULT_BASE_STATS = Object.freeze({
  maxHp: 100,
  strength: 10,
  drinkResistance: 1,
});

export const CHARACTERS = Object.freeze([
  Object.freeze({
    id: 'character_1',
    name: 'Relâmpago Azul',
    role: 'Foco: Velocidade & Ataque',
    color: 0x38bdf8,
    colorHex: '#38bdf8',
    baseStats: { ...DEFAULT_BASE_STATS },
    multipliers: Object.freeze({
      maxHp: 0.9,
      strength: 1.2,
      drinkResistance: 0.85,
      moveSpeed: 1.18,
    }),
  }),
  Object.freeze({
    id: 'character_2',
    name: 'Colosso Laranja',
    role: 'Foco: Vida Máx & Resistência',
    color: 0xf97316,
    colorHex: '#f97316',
    baseStats: { ...DEFAULT_BASE_STATS },
    multipliers: Object.freeze({
      maxHp: 1.35,
      strength: 0.95,
      drinkResistance: 1.4,
      moveSpeed: 0.9,
    }),
  }),
]);

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacterById(id) {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}
