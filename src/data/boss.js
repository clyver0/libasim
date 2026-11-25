import { BOSS_CONFIG } from '../constants/boss.js';

/**
 * Dados configuráveis do Mini-Chefão que surge após 50 inimigos derrotados.
 */
export const DEFAULT_MINI_BOSS_DATA = {
  id: 'mini_boss_50',
  name: 'Leão de Chácara (Mini-Chefão)',
  isMiniBoss: true,
  countsAsCommonEnemy: false,
  colorPhase1: 0xf97316,
  colorPhase2: 0xef4444,
  bodyWidth: 32,
  bodyHeight: 68,
  baseStats: {
    maxHp: 230,
    strength: 12,
    moveSpeed: 190,
    attackSpeed: 1.05,
    jumpVelocity: BOSS_CONFIG.DEFAULT_JUMP_VELOCITY,
    damageReduction: 0.08,
  },
  attacks: {
    crush: {
      id: 'miniboss_crush',
      name: 'Gancho Pesado',
      isCombo: false,
      baseDamage: 14,
      windupMs: 300,
      activeMs: 130,
      recoveryMs: 480,
      knockback: 34,
      rangeX: 56,
      rangeY: 52,
      dashSpeed: 0,
      hitbox: {
        width: 50,
        height: 40,
        offsetX: 30,
        offsetY: -2,
      },
    },
    charge: {
      id: 'miniboss_charge',
      name: 'Trombaço Brutal',
      isCombo: false,
      baseDamage: 17,
      windupMs: 390,
      activeMs: 200,
      recoveryMs: 580,
      knockback: 46,
      rangeX: 145,
      rangeY: 48,
      dashSpeed: 315,
      hitbox: {
        width: 56,
        height: 42,
        offsetX: 26,
        offsetY: 0,
      },
    },
    shockwave: {
      id: 'miniboss_shockwave',
      name: 'Pisão de Choque',
      isCombo: false,
      baseDamage: 19,
      windupMs: 430,
      activeMs: 170,
      recoveryMs: 620,
      knockback: 54,
      rangeX: 84,
      rangeY: 56,
      dashSpeed: 0,
      minPhase: 2,
      hitbox: {
        width: 126,
        height: 42,
        offsetX: 0,
        offsetY: 8,
      },
    },
  },
};

/**
 * Catálogo configurável do Boss Final (independente da engine).
 * Valores provisórios superiores aos inimigos comuns (GAME_DESIGN.md §13).
 */
export const DEFAULT_BOSS_DATA = {
  id: 'final_boss',
  name: 'Rei da Ressaca',
  countsAsCommonEnemy: false,
  colorPhase1: 0xdc2626,
  colorPhase2: 0x9333ea,
  bodyWidth: 36,
  bodyHeight: 74,
  baseStats: {
    maxHp: 420,
    strength: 15,
    moveSpeed: 180,
    attackSpeed: 1.0,
    jumpVelocity: BOSS_CONFIG.DEFAULT_JUMP_VELOCITY,
    damageReduction: 0.12,
  },
  attacks: {
    crush: {
      id: 'boss_crush',
      name: 'Golpe Esmagador',
      isCombo: false,
      baseDamage: 16,
      windupMs: 320,
      activeMs: 140,
      recoveryMs: 520,
      knockback: 38,
      rangeX: 62,
      rangeY: 56,
      dashSpeed: 0,
      hitbox: {
        width: 56,
        height: 44,
        offsetX: 34,
        offsetY: -2,
      },
    },
    charge: {
      id: 'boss_charge',
      name: 'Investida Brutal',
      isCombo: false,
      baseDamage: 20,
      windupMs: 420,
      activeMs: 220,
      recoveryMs: 620,
      knockback: 52,
      rangeX: 165,
      rangeY: 52,
      dashSpeed: 340,
      hitbox: {
        width: 62,
        height: 46,
        offsetX: 30,
        offsetY: 0,
      },
    },
    shockwave: {
      id: 'boss_shockwave',
      name: 'Onda do Caos',
      isCombo: false,
      baseDamage: 24,
      windupMs: 460,
      activeMs: 190,
      recoveryMs: 660,
      knockback: 64,
      rangeX: 98,
      rangeY: 64,
      dashSpeed: 0,
      minPhase: 2,
      hitbox: {
        width: 156,
        height: 48,
        offsetX: 0,
        offsetY: 8,
      },
    },
  },
};

/**
 * Calcula o balanceamento próprio do Boss considerando o estágio da run.
 */
export function scaleBossData(
  bossData = DEFAULT_BOSS_DATA,
  { officialShopVisits = 3, scaling = BOSS_CONFIG.SCALING } = {}
) {
  const visits = Math.max(0, Number(officialShopVisits ?? 0));
  const base = bossData.baseStats;

  const hpMult = 1 + visits * scaling.HP_PER_OFFICIAL_VISIT;
  const strMult = 1 + visits * scaling.STRENGTH_PER_OFFICIAL_VISIT;
  const spdMult = 1 + visits * scaling.SPEED_PER_OFFICIAL_VISIT;

  return {
    ...bossData,
    baseStats: { ...base },
    officialShopVisits: visits,
    scaledStats: {
      maxHp: Math.max(1, Math.round(base.maxHp * hpMult)),
      strength: Math.max(1, Math.round(base.strength * strMult)),
      moveSpeed: Math.round(base.moveSpeed * spdMult),
      attackSpeed: base.attackSpeed ?? 1,
      jumpVelocity: base.jumpVelocity,
      damageReduction: base.damageReduction ?? 0,
    },
  };
}
