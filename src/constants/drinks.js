/**
 * Configurações centralizadas e provisórias do sistema de bebidas (Fase 5).
 * Valores marcados como provisórios para balanceamento futuro (TECHNICAL_DECISIONS.md §15).
 */
export const DRINK_CONFIG = {
  // Spawn e queda (valores provisórios)
  INITIAL_SPAWN_DELAY_MS: 4000,
  SPAWN_INTERVAL_MS: 9000,
  MAX_ACTIVE_DRINKS: 3,
  SPAWN_Y: 24,
  SPAWN_MARGIN_X: 64,
  FALL_SPEED: 135,
  LIFETIME_MS: 14000,

  // Dimensões do corpo físico da bebida
  BODY_WIDTH: 22,
  BODY_HEIGHT: 30,

  // Duração dos efeitos temporários (valores provisórios)
  BASE_DURATION_MS: 8000,
  MIN_EFFECTIVE_DURATION_MS: 2000,
  MAX_EFFECTIVE_DURATION_MS: 30000,
  MIN_RESISTANCE_FLOOR: 0.1,

  // Política de repetição aprovada: renovar timer sem duplicar modificadores
  REPEAT_POLICY: 'refresh',

  // Atração automática (raio inicial pequeno e configurável; Fase 6 ampliará via upgrades)
  MAGNET_BASE_RADIUS: 88,
  MAGNET_PULL_SPEED: 320,
};
