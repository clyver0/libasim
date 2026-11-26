import { DRUNK_FX_CONFIG } from '../constants/expansion.js';

/**
 * Calcula a intensidade (0..1) da embriaguez a partir dos efeitos de bebida ativos.
 * Cada efeito contribui conforme a raridade da bebida e o tempo restante; várias bebidas
 * se combinam com retornos decrescentes (1 - Π(1 - s_i)) para nunca passar do máximo.
 * `levelScale` é o ajuste do jogador para reduzir/desligar o efeito (acessibilidade).
 */
export function computeDrunkIntensity(
  activeEffects = [],
  { rankByDrinkId = {}, maxRank = 6, levelScale = 1, config = DRUNK_FX_CONFIG } = {}
) {
  if (!activeEffects.length || levelScale <= 0) return 0;

  let remainingProduct = 1;
  for (const effect of activeEffects) {
    const rank = rankByDrinkId[effect.drinkId] ?? 1;
    const rarity = Math.min(1, Math.max(0, rank / maxRank));
    const fraction =
      effect.durationMs > 0
        ? Math.min(1, Math.max(0, effect.remainingMs / effect.durationMs))
        : 0;
    // Aparecimento/desaparecimento suave nos últimos 20% do efeito
    const fade = Math.min(1, fraction / 0.2);
    const strength =
      (config.RARITY_WEIGHT * (0.35 + 0.65 * rarity) + config.REMAINING_WEIGHT * fraction) *
      fade;
    remainingProduct *= 1 - Math.min(1, Math.max(0, strength));
  }

  const intensity = (1 - remainingProduct) * config.MAX_INTENSITY * levelScale;
  return Math.min(config.MAX_INTENSITY, Math.max(0, intensity));
}
