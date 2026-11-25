import { ENEMY_CONFIG } from '../constants/enemies.js';

/**
 * Catálogo configurável de tipos distintos de inimigos comuns.
 * Cada tipo possui atributos, tamanho, alcance, padrão de ataque e identidade visual própria.
 */
export const DEFAULT_ENEMY_TYPE_ID = 'common_brawler';

export const ENEMY_TYPES = [
  {
    id: 'common_brawler',
    name: 'Briguento de Rua',
    color: 0xf43f5e,
    bodyWidth: 24,
    bodyHeight: 56,
    unlockAtDefeated: 0,
    spawnWeight: 42,
    visualPreset: {
      scale: 1,
      armStrokeWidth: 3.4,
      torsoStrokeWidth: 3.4,
      activeTypes: ['ninja_headband'],
    },
    baseStats: {
      maxHp: 45,
      strength: 8,
      moveSpeed: 165,
      attackSpeed: 1,
      jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY,
      damageReduction: 0,
    },
    attack: {
      id: 'enemy_strike',
      name: 'Golpe Direto',
      isCombo: false,
      baseDamage: 10,
      windupMs: 260,
      activeMs: 110,
      recoveryMs: 520,
      knockback: 22,
      rangeX: 44,
      rangeY: 40,
      hitbox: {
        width: 34,
        height: 26,
        offsetX: 22,
        offsetY: -4,
      },
    },
  },
  {
    id: 'swift_rusher',
    name: 'Corredor Furioso',
    color: 0xeab308,
    bodyWidth: 22,
    bodyHeight: 50,
    unlockAtDefeated: 4,
    spawnWeight: 28,
    visualPreset: {
      scale: 0.9,
      armStrokeWidth: 3.0,
      torsoStrokeWidth: 3.1,
      activeTypes: ['rocket_shoes', 'ninja_headband'],
    },
    baseStats: {
      maxHp: 32,
      strength: 7,
      moveSpeed: 225,
      attackSpeed: 1.28,
      jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 1.05,
      damageReduction: 0,
    },
    attack: {
      id: 'rusher_jab',
      name: 'Investida Rápida',
      isCombo: false,
      baseDamage: 8,
      windupMs: 190,
      activeMs: 95,
      recoveryMs: 380,
      knockback: 15,
      rangeX: 40,
      rangeY: 38,
      hitbox: {
        width: 32,
        height: 24,
        offsetX: 20,
        offsetY: -4,
      },
    },
  },
  {
    id: 'heavy_bruiser',
    name: 'Brutamontes',
    color: 0xea580c,
    bodyWidth: 30,
    bodyHeight: 64,
    unlockAtDefeated: 12,
    spawnWeight: 18,
    visualPreset: {
      scale: 1.15,
      armStrokeWidth: 5.5,
      torsoStrokeWidth: 4.4,
      activeTypes: ['concrete_shoulders', 'beer_belly'],
    },
    baseStats: {
      maxHp: 82,
      strength: 12,
      moveSpeed: 132,
      attackSpeed: 0.85,
      jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 0.96,
      damageReduction: 0.1,
    },
    attack: {
      id: 'bruiser_smash',
      name: 'Marretada',
      isCombo: false,
      baseDamage: 15,
      windupMs: 340,
      activeMs: 135,
      recoveryMs: 620,
      knockback: 36,
      rangeX: 50,
      rangeY: 46,
      hitbox: {
        width: 44,
        height: 32,
        offsetX: 26,
        offsetY: -2,
      },
    },
  },
  {
    id: 'elite_enforcer',
    name: 'Segurança de Elite',
    color: 0xa855f7,
    bodyWidth: 26,
    bodyHeight: 58,
    unlockAtDefeated: 28,
    spawnWeight: 16,
    visualPreset: {
      scale: 1.05,
      armStrokeWidth: 3.8,
      torsoStrokeWidth: 3.8,
      activeTypes: ['precision_glasses', 'boxing_gloves'],
    },
    baseStats: {
      maxHp: 64,
      strength: 11,
      moveSpeed: 185,
      attackSpeed: 1.08,
      jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 1.02,
      damageReduction: 0.06,
    },
    attack: {
      id: 'enforcer_reach',
      name: 'Direto Longo',
      isCombo: false,
      baseDamage: 12,
      windupMs: 240,
      activeMs: 120,
      recoveryMs: 470,
      knockback: 28,
      rangeX: 58,
      rangeY: 44,
      hitbox: {
        width: 48,
        height: 28,
        offsetX: 30,
        offsetY: -4,
      },
    },
  },
];

export function getEnemyTypeById(id) {
  return ENEMY_TYPES.find((enemy) => enemy.id === id) ?? ENEMY_TYPES[0];
}

export function getDefaultEnemyType() {
  return getEnemyTypeById(DEFAULT_ENEMY_TYPE_ID);
}

/**
 * Seleciona um tipo de inimigo comum respeitando o progresso atual da run (`defeatedCount`)
 * e os pesos configurados de aparição.
 */
export function pickEnemyTypeForProgress(defeatedCount = 0, rng = null) {
  const eligible = ENEMY_TYPES.filter(
    (type) => defeatedCount >= (type.unlockAtDefeated ?? 0)
  );
  if (eligible.length === 0) {
    return ENEMY_TYPES[0];
  }

  const totalWeight = eligible.reduce(
    (sum, item) => sum + Math.max(1, item.spawnWeight ?? 10),
    0
  );
  const rollValue = rng ? rng.next() : Math.random();
  let roll = rollValue * totalWeight;

  for (const item of eligible) {
    roll -= Math.max(1, item.spawnWeight ?? 10);
    if (roll <= 0) {
      return item;
    }
  }

  return eligible[eligible.length - 1];
}
