/**
 * Configurações centralizadas e provisórias do sistema de bebidas (Fase 5).
 * Valores marcados como provisórios para balanceamento futuro (TECHNICAL_DECISIONS.md §15).
 */
export const DRINK_CONFIG = {
  // Spawn e queda (Expansão: spawn menos frequente; queda mais rápida, com peso e quique)
  INITIAL_SPAWN_DELAY_MS: 6000,
  SPAWN_INTERVAL_MS: 16000,
  MAX_ACTIVE_DRINKS: 3,
  SPAWN_Y: 24,
  SPAWN_MARGIN_X: 64,
  FALL_SPEED: 300, // velocidade vertical inicial (px/s)
  LIFETIME_MS: 14000,

  // Física da bebida (gravidade do mundo + parâmetros abaixo)
  EXTRA_GRAVITY_Y: 300, // somada à gravidade global do Arcade
  MAX_FALL_SPEED: 780,
  BOUNCE: 0.52, // coeficiente de restituição ao atingir plataformas
  BOUNCE_MIN_SPEED: 90, // abaixo disso a bebida pousa em vez de quicar
  SPAWN_DRIFT_X: 70, // deriva horizontal aleatória ao surgir
  GROUND_DRAG_X: 420,
  SQUASH_DURATION_MS: 170,

  // Dimensões do corpo físico da bebida
  BODY_WIDTH: 22,
  BODY_HEIGHT: 30,
  VISUAL_SCALE: 2,

  // Duração dos efeitos temporários (valores provisórios)
  BASE_DURATION_MS: 8000,
  MIN_EFFECTIVE_DURATION_MS: 2000,
  MAX_EFFECTIVE_DURATION_MS: 30000,
  MIN_RESISTANCE_FLOOR: 0.1,

  // Repetições da mesma bebida criam efeitos independentes com seus próprios timers.
  REPEAT_POLICY: 'stack',

  // Atração automática (raio inicial pequeno e configurável; Fase 6 ampliará via upgrades)
  MAGNET_BASE_RADIUS: 88,
  MAGNET_PULL_SPEED: 320,
};
