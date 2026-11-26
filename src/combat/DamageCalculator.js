import { COMBAT } from '../constants/combat.js';

/**
 * Centraliza o cálculo de dano de golpes individuais e combos.
 * Preparado para receber modificadores de força, upgrades e resistências do alvo.
 */
export class DamageCalculator {
  static calculateDamage({
    attack,
    attackerStats = {},
    targetStats = {},
    bonusMultiplier = 1,
  }) {
    if (!attack || typeof attack.baseDamage !== 'number') {
      return 0;
    }

    const strength =
      attackerStats.strength ?? COMBAT.BASE_STRENGTH_REFERENCE;
    const strengthFactor =
      (strength / COMBAT.BASE_STRENGTH_REFERENCE) *
      COMBAT.STRENGTH_DAMAGE_FACTOR;

    const comboMultiplier = attack.isCombo
      ? (attack.comboMultiplier ?? 1) *
        (attackerStats.comboDamageMultiplier ?? 1)
      : 1;

    const isLightAttack =
      !attack.isCombo && (attack.type === 'LIGHT' || attack.id === 'light');
    const attackTypeMultiplier = isLightAttack
      ? attackerStats.lightDamageMultiplier ?? 1
      : 1;

    const globalDamageMultiplier = attackerStats.damageMultiplier ?? 1;

    const targetReduction = Math.min(
      Math.max(targetStats.damageReduction ?? 0, 0),
      0.9
    );

    const rawDamage =
      attack.baseDamage *
      strengthFactor *
      comboMultiplier *
      attackTypeMultiplier *
      globalDamageMultiplier *
      bonusMultiplier *
      (targetStats.damageTakenMultiplier ?? 1) *
      (1 - targetReduction);

    return Math.max(1, Math.round(rawDamage));
  }
}
