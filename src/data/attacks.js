/**
 * Catálogo de golpes individuais e combos.
 * PROVISÓRIO: Nomes, sequências e valores numéricos aguardam definição definitiva
 * conforme docs/TECHNICAL_DECISIONS.md (Seção 15).
 */

export const ATTACK_TYPES = {
  LIGHT: 'LIGHT',
  HEAVY: 'HEAVY',
  SPECIAL: 'SPECIAL',
};

export const BASIC_ATTACKS = {
  [ATTACK_TYPES.LIGHT]: {
    id: 'light',
    type: ATTACK_TYPES.LIGHT,
    name: 'Golpe Leve',
    isCombo: false,
    baseDamage: 10,
    activeMs: 110,
    recoveryMs: 160,
    knockback: 18,
    hitbox: {
      width: 38,
      height: 26,
      offsetX: 24,
      offsetY: -4,
    },
    pose: 'light',
    color: 0x38bdf8,
  },
  [ATTACK_TYPES.HEAVY]: {
    id: 'heavy',
    type: ATTACK_TYPES.HEAVY,
    name: 'Golpe Pesado',
    isCombo: false,
    baseDamage: 18,
    activeMs: 150,
    recoveryMs: 280,
    knockback: 32,
    hitbox: {
      width: 46,
      height: 32,
      offsetX: 28,
      offsetY: -2,
    },
    pose: 'heavy',
    color: 0xf59e0b,
  },
  [ATTACK_TYPES.SPECIAL]: {
    id: 'special',
    type: ATTACK_TYPES.SPECIAL,
    name: 'Golpe Especial',
    isCombo: false,
    baseDamage: 15,
    activeMs: 130,
    recoveryMs: 230,
    knockback: 26,
    hitbox: {
      width: 44,
      height: 34,
      offsetX: 26,
      offsetY: -6,
    },
    pose: 'special',
    color: 0xa855f7,
  },
};

/**
 * Cinco combos provisórios.
 * Inclui sequências com prefixos compartilhados (ex.: LIGHT -> LIGHT -> ...)
 * para validar reconhecimento correto de encadeamentos.
 */
export const COMBOS = [
  {
    id: 'combo_1',
    name: 'Combo Rápido',
    isCombo: true,
    provisional: true,
    sequence: [ATTACK_TYPES.LIGHT, ATTACK_TYPES.LIGHT, ATTACK_TYPES.LIGHT],
    baseDamage: 28,
    comboMultiplier: 1.15,
    activeMs: 140,
    recoveryMs: 240,
    knockback: 42,
    hitbox: {
      width: 52,
      height: 32,
      offsetX: 30,
      offsetY: -4,
    },
    pose: 'combo_fast',
    color: 0x22d3ee,
  },
  {
    id: 'combo_2',
    name: 'Quebra-Guarda',
    isCombo: true,
    provisional: true,
    sequence: [ATTACK_TYPES.LIGHT, ATTACK_TYPES.LIGHT, ATTACK_TYPES.HEAVY],
    baseDamage: 36,
    comboMultiplier: 1.25,
    activeMs: 170,
    recoveryMs: 320,
    knockback: 58,
    hitbox: {
      width: 58,
      height: 38,
      offsetX: 34,
      offsetY: -2,
    },
    pose: 'combo_heavy',
    color: 0xf97316,
  },
  {
    id: 'combo_3',
    name: 'Impacto Giratório',
    isCombo: true,
    provisional: true,
    sequence: [ATTACK_TYPES.LIGHT, ATTACK_TYPES.HEAVY, ATTACK_TYPES.SPECIAL],
    baseDamage: 40,
    comboMultiplier: 1.3,
    activeMs: 160,
    recoveryMs: 300,
    knockback: 64,
    hitbox: {
      width: 64,
      height: 40,
      offsetX: 32,
      offsetY: -6,
    },
    pose: 'combo_special',
    color: 0xc084fc,
  },
  {
    id: 'combo_4',
    name: 'Golpe Duplo Pesado',
    isCombo: true,
    provisional: true,
    sequence: [ATTACK_TYPES.HEAVY, ATTACK_TYPES.HEAVY],
    baseDamage: 34,
    comboMultiplier: 1.2,
    activeMs: 170,
    recoveryMs: 340,
    knockback: 60,
    hitbox: {
      width: 56,
      height: 36,
      offsetX: 32,
      offsetY: -2,
    },
    pose: 'combo_heavy',
    color: 0xef4444,
  },
  {
    id: 'combo_5',
    name: 'Finalização Especial',
    isCombo: true,
    provisional: true,
    sequence: [ATTACK_TYPES.SPECIAL, ATTACK_TYPES.LIGHT, ATTACK_TYPES.HEAVY],
    baseDamage: 42,
    comboMultiplier: 1.35,
    activeMs: 180,
    recoveryMs: 350,
    knockback: 72,
    hitbox: {
      width: 66,
      height: 42,
      offsetX: 36,
      offsetY: -4,
    },
    pose: 'combo_special',
    color: 0xfacc15,
  },
];

export function getBasicAttack(type) {
  return BASIC_ATTACKS[type] ?? null;
}
