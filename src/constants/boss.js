import { PHYSICS } from './physics.js';

/**
 * Parâmetros configuráveis e provisórios do Boss Final (Fase 9).
 * Valores centralizados para ajuste de balanceamento conforme TECHNICAL_DECISIONS.md (§15).
 */
export const BOSS_CONFIG = {
  MINI_BOSS_MILESTONE: 50,
  SPAWN_X_RATIO: 0.72,
  SPAWN_Y: 80,

  // Escalonamento próprio do boss considerando estágio da run (visitas oficiais)
  SCALING: {
    HP_PER_OFFICIAL_VISIT: 0.22,
    STRENGTH_PER_OFFICIAL_VISIT: 0.16,
    SPEED_PER_OFFICIAL_VISIT: 0.06,
  },

  // Transição para Fase 2 (Enfurecido) ao atingir 50% ou menos do HP máximo
  PHASE_2_HP_THRESHOLD_RATIO: 0.5,
  PHASE_2_SPEED_MULTIPLIER: 1.25,
  PHASE_2_ATTACK_SPEED_MULTIPLIER: 1.28,
  PHASE_2_STRENGTH_MULTIPLIER: 1.18,

  DEFAULT_JUMP_VELOCITY: PHYSICS.PLAYER_JUMP_VELOCITY * 1.06,
  HURT_FLASH_MS: 120,
  KNOCKBACK_RESISTANCE: 0.75,

  STATES: {
    FALLING: 'falling',
    CHASING: 'chasing',
    WINDUP: 'windup',
    ATTACKING: 'attacking',
    RECOVERING: 'recovering',
    DEAD: 'dead',
  },
};
