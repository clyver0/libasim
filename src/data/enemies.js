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
      maxHp: 56,
      strength: 9,
      moveSpeed: 172,
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
      maxHp: 38,
      strength: 8,
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
      maxHp: 100,
      strength: 13,
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
    unlockAtDefeated: 25,
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
  // ---- Expansão: novos arquétipos introduzidos por fase (kills 25 / 50 / 75) ----
  {
    id: 'spear_thrower',
    name: 'Lanceiro',
    color: 0x22d3ee,
    bodyWidth: 22,
    bodyHeight: 58,
    unlockAtDefeated: 25,
    spawnWeight: 26,
    visualPreset: { scale: 1, armStrokeWidth: 2.6, torsoStrokeWidth: 3.2, activeTypes: ['precision_glasses'] },
    baseStats: { maxHp: 58, strength: 10, moveSpeed: 150, attackSpeed: 0.95, jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY, damageReduction: 0 },
    attack: {
      id: 'spear_thrust', name: 'Estocada Longa', isCombo: false, baseDamage: 12,
      windupMs: 320, activeMs: 120, recoveryMs: 560, knockback: 24, rangeX: 96, rangeY: 40,
      hitbox: { width: 88, height: 18, offsetX: 52, offsetY: -6 },
    },
  },
  {
    id: 'iron_wall',
    name: 'Muralha',
    color: 0x64748b,
    bodyWidth: 36,
    bodyHeight: 66,
    unlockAtDefeated: 32,
    spawnWeight: 16,
    visualPreset: { scale: 1.25, armStrokeWidth: 6, torsoStrokeWidth: 5, activeTypes: ['concrete_shoulders', 'hard_hat'] },
    baseStats: { maxHp: 170, strength: 12, moveSpeed: 96, attackSpeed: 0.7, jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 0.9, damageReduction: 0.28 },
    attack: {
      id: 'wall_slam', name: 'Trombada', isCombo: false, baseDamage: 16,
      windupMs: 420, activeMs: 140, recoveryMs: 700, knockback: 44, rangeX: 54, rangeY: 50,
      hitbox: { width: 50, height: 40, offsetX: 30, offsetY: -2 },
    },
  },
  {
    id: 'frenzy_runner',
    name: 'Frenético',
    color: 0xf97316,
    bodyWidth: 20,
    bodyHeight: 48,
    unlockAtDefeated: 50,
    spawnWeight: 26,
    visualPreset: { scale: 0.85, armStrokeWidth: 3, torsoStrokeWidth: 3, activeTypes: ['rocket_shoes', 'spring_legs'] },
    baseStats: { maxHp: 58, strength: 9, moveSpeed: 255, attackSpeed: 1.9, jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 1.1, damageReduction: 0 },
    attack: {
      id: 'frenzy_flurry', name: 'Rajada', isCombo: false, baseDamage: 6,
      windupMs: 150, activeMs: 80, recoveryMs: 260, knockback: 10, rangeX: 38, rangeY: 38,
      hitbox: { width: 30, height: 24, offsetX: 18, offsetY: -4 },
    },
  },
  {
    id: 'crusher',
    name: 'Esmagador',
    color: 0xb91c1c,
    bodyWidth: 34,
    bodyHeight: 68,
    unlockAtDefeated: 56,
    spawnWeight: 16,
    visualPreset: { scale: 1.3, armStrokeWidth: 7, torsoStrokeWidth: 5, activeTypes: ['gorilla_arms', 'beer_belly'] },
    baseStats: { maxHp: 140, strength: 16, moveSpeed: 118, attackSpeed: 0.7, jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 0.9, damageReduction: 0.12 },
    attack: {
      id: 'crusher_quake', name: 'Terremoto', isCombo: false, baseDamage: 22,
      windupMs: 520, activeMs: 160, recoveryMs: 820, knockback: 62, rangeX: 70, rangeY: 54,
      hitbox: { width: 96, height: 44, offsetX: 8, offsetY: 6 },
    },
  },
  {
    id: 'shadow_stalker',
    name: 'Sombra',
    color: 0x7c3aed,
    bodyWidth: 20,
    bodyHeight: 52,
    unlockAtDefeated: 75,
    spawnWeight: 30,
    visualPreset: { scale: 0.95, armStrokeWidth: 2.8, torsoStrokeWidth: 3, activeTypes: ['hero_cape', 'ninja_headband'] },
    baseStats: { maxHp: 72, strength: 14, moveSpeed: 270, attackSpeed: 1.4, jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY * 1.12, damageReduction: 0.05 },
    attack: {
      id: 'shadow_slash', name: 'Corte Sombrio', isCombo: false, baseDamage: 14,
      windupMs: 200, activeMs: 100, recoveryMs: 360, knockback: 26, rangeX: 60, rangeY: 44,
      hitbox: { width: 56, height: 28, offsetX: 32, offsetY: -4 },
    },
  },
  {
    id: 'warlord',
    name: 'Senhor da Guerra',
    color: 0xfacc15,
    bodyWidth: 32,
    bodyHeight: 66,
    unlockAtDefeated: 82,
    spawnWeight: 18,
    visualPreset: { scale: 1.2, armStrokeWidth: 5, torsoStrokeWidth: 4.6, activeTypes: ['chaos_crown', 'concrete_shoulders', 'boxing_gloves'] },
    baseStats: { maxHp: 210, strength: 18, moveSpeed: 150, attackSpeed: 1, jumpVelocity: ENEMY_CONFIG.DEFAULT_JUMP_VELOCITY, damageReduction: 0.2 },
    attack: {
      id: 'warlord_cleave', name: 'Golpe Brutal', isCombo: false, baseDamage: 20,
      windupMs: 360, activeMs: 140, recoveryMs: 600, knockback: 50, rangeX: 66, rangeY: 50,
      hitbox: { width: 62, height: 38, offsetX: 34, offsetY: -2 },
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
