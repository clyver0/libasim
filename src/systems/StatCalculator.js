import { UPGRADE_CONFIG } from '../constants/upgrades.js';

const STAT_KEYS = ['maxHp', 'strength', 'drinkResistance'];

const MIN_LIMITS = {
  maxHp: 1,
  strength: 0,
  drinkResistance: 0.1,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Calcula atributos efetivos de maneira centralizada considerando:
 * 1. Dados-base do personagem
 * 2. Multiplicadores individuais do personagem
 * 3. Modificadores de upgrades da run (preparado para Fase 6)
 * 4. Efeitos temporários ativos (preparado para Fase 5)
 *
 * Cada modificador em `upgrades` ou `activeEffects` pode declarar:
 * `{ flat?: { maxHp?, strength?, drinkResistance? }, multiplier?: { ... } }`
 */
export class StatCalculator {
  static calculateEffectiveStats({
    baseStats,
    multipliers = {},
    upgrades = [],
    activeEffects = [],
  }) {
    const modifiers = [...upgrades, ...activeEffects];
    const result = {};

    for (const key of STAT_KEYS) {
      const baseValue = Number(baseStats?.[key] ?? 0);
      const characterMultiplier = Number(multipliers?.[key] ?? 1);

      let flatBonus = 0;
      let bonusMultiplier = 1;

      for (const mod of modifiers) {
        if (mod?.flat?.[key] !== undefined) {
          flatBonus += Number(mod.flat[key]);
        }
        if (mod?.multiplier?.[key] !== undefined) {
          bonusMultiplier *= Number(mod.multiplier[key]);
        }
      }

      const rawValue = (baseValue * characterMultiplier + flatBonus) * bonusMultiplier;
      const minValue = MIN_LIMITS[key] ?? 0;
      result[key] = Math.max(minValue, Math.round(rawValue * 100) / 100);
    }

    return result;
  }

  /**
   * Calcula modificadores mecânicos secundários de movimentação, combate, escala e bebidas
   * de maneira centralizada e imutável.
   */
  static calculateGameplayModifiers({
    characterMultipliers = {},
    upgrades = [],
    activeEffects = [],
  } = {}) {
    const modifiers = [...upgrades, ...activeEffects];
    const limits = UPGRADE_CONFIG.LIMITS;

    let moveSpeedMultiplier = Number(characterMultipliers?.moveSpeed ?? 1);
    let jumpMultiplier = 1;
    let attackSpeedMultiplier = 1;
    let recoveryMultiplier = 1;
    let damageMultiplier = 1;
    let lightDamageMultiplier = 1;
    let comboDamageMultiplier = 1;
    let attackRangeMultiplier = 1;
    let bodyScale = Number(characterMultipliers?.bodyScale ?? 1);

    let damageReduction = 0;
    let damageTakenMultiplier = 1;
    let knockbackResistance = 0;
    let drinkRarityBonus = 0;
    let drinkMagnetBonus = 0;
    let enemyMoveSpeedMultiplier = 1;
    let specialShopChanceBonus = 0;

    for (const mod of modifiers) {
      const gp = mod?.gameplay;
      if (!gp) continue;

      if (gp.moveSpeedMultiplier !== undefined) {
        moveSpeedMultiplier *= Number(gp.moveSpeedMultiplier);
      }
      if (gp.jumpMultiplier !== undefined) {
        jumpMultiplier *= Number(gp.jumpMultiplier);
      }
      if (gp.attackSpeedMultiplier !== undefined) {
        attackSpeedMultiplier *= Number(gp.attackSpeedMultiplier);
      }
      if (gp.recoveryMultiplier !== undefined) {
        recoveryMultiplier *= Number(gp.recoveryMultiplier);
      }
      if (gp.damageMultiplier !== undefined) {
        damageMultiplier *= Number(gp.damageMultiplier);
      }
      if (gp.lightDamageMultiplier !== undefined) {
        lightDamageMultiplier *= Number(gp.lightDamageMultiplier);
      }
      if (gp.comboDamageMultiplier !== undefined) {
        comboDamageMultiplier *= Number(gp.comboDamageMultiplier);
      }
      if (gp.attackRangeMultiplier !== undefined) {
        attackRangeMultiplier *= Number(gp.attackRangeMultiplier);
      }
      if (gp.bodyScale !== undefined) {
        bodyScale *= Number(gp.bodyScale);
      }

      if (gp.damageReduction !== undefined) {
        damageReduction += Number(gp.damageReduction);
      }
      if (gp.damageTakenMultiplier !== undefined) {
        damageTakenMultiplier *= Number(gp.damageTakenMultiplier);
      }
      if (gp.knockbackResistance !== undefined) {
        knockbackResistance += Number(gp.knockbackResistance);
      }
      if (gp.drinkRarityBonus !== undefined) {
        drinkRarityBonus += Number(gp.drinkRarityBonus);
      }
      if (gp.drinkMagnetBonus !== undefined) {
        drinkMagnetBonus += Number(gp.drinkMagnetBonus);
      }
      if (gp.enemyMoveSpeedMultiplier !== undefined) {
        enemyMoveSpeedMultiplier *= Number(gp.enemyMoveSpeedMultiplier);
      }
      if (gp.specialShopChanceBonus !== undefined) {
        specialShopChanceBonus += Number(gp.specialShopChanceBonus);
      }
    }

    return {
      moveSpeedMultiplier: round3(
        clamp(
          moveSpeedMultiplier,
          limits.MIN_MOVE_SPEED_MULTIPLIER,
          limits.MAX_MOVE_SPEED_MULTIPLIER
        )
      ),
      jumpMultiplier: round3(
        clamp(
          jumpMultiplier,
          limits.MIN_JUMP_MULTIPLIER,
          limits.MAX_JUMP_MULTIPLIER
        )
      ),
      attackSpeedMultiplier: round3(
        clamp(
          attackSpeedMultiplier,
          limits.MIN_ATTACK_SPEED_MULTIPLIER,
          limits.MAX_ATTACK_SPEED_MULTIPLIER
        )
      ),
      recoveryMultiplier: round3(
        clamp(
          recoveryMultiplier,
          limits.MIN_RECOVERY_MULTIPLIER,
          limits.MAX_RECOVERY_MULTIPLIER
        )
      ),
      damageMultiplier: round3(
        clamp(
          damageMultiplier,
          limits.MIN_DAMAGE_MULTIPLIER,
          limits.MAX_DAMAGE_MULTIPLIER
        )
      ),
      lightDamageMultiplier: round3(
        clamp(
          lightDamageMultiplier,
          limits.MIN_DAMAGE_MULTIPLIER,
          limits.MAX_DAMAGE_MULTIPLIER
        )
      ),
      comboDamageMultiplier: round3(
        clamp(
          comboDamageMultiplier,
          limits.MIN_DAMAGE_MULTIPLIER,
          limits.MAX_DAMAGE_MULTIPLIER
        )
      ),
      attackRangeMultiplier: round3(
        clamp(
          attackRangeMultiplier,
          limits.MIN_RANGE_MULTIPLIER,
          limits.MAX_RANGE_MULTIPLIER
        )
      ),
      bodyScale: round3(
        clamp(bodyScale, limits.MIN_BODY_SCALE, limits.MAX_BODY_SCALE)
      ),
      damageReduction: round3(
        clamp(damageReduction, 0, limits.MAX_DAMAGE_REDUCTION)
      ),
      damageTakenMultiplier: round3(
        clamp(
          damageTakenMultiplier,
          limits.MIN_DAMAGE_TAKEN_MULTIPLIER,
          limits.MAX_DAMAGE_TAKEN_MULTIPLIER
        )
      ),
      knockbackResistance: round3(
        clamp(knockbackResistance, 0, limits.MAX_KNOCKBACK_RESISTANCE)
      ),
      drinkRarityBonus: round3(
        clamp(
          drinkRarityBonus,
          limits.MIN_DRINK_RARITY_BONUS,
          limits.MAX_DRINK_RARITY_BONUS
        )
      ),
      drinkMagnetBonus: round3(
        clamp(drinkMagnetBonus, 0, limits.MAX_DRINK_MAGNET_BONUS)
      ),
      enemyMoveSpeedMultiplier: round3(
        clamp(
          enemyMoveSpeedMultiplier,
          limits.MIN_ENEMY_SPEED_MULTIPLIER,
          limits.MAX_ENEMY_SPEED_MULTIPLIER
        )
      ),
      specialShopChanceBonus: round3(
        clamp(specialShopChanceBonus, 0, limits.MAX_SPECIAL_SHOP_CHANCE_BONUS)
      ),
    };
  }
}
