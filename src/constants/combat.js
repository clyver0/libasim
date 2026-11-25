/**
 * Parâmetros centralizados do sistema de combate.
 * Valores marcados como PROVISÓRIOS até definição final de balanceamento em TECHNICAL_DECISIONS.md.
 */
export const COMBAT = {
  // Janela máxima (ms) entre o momento de inserção de um comando e o próximo para manter o combo
  COMBO_WINDOW_MS: 850,

  // Multiplicadores provisórios de dano
  STRENGTH_DAMAGE_FACTOR: 1.0,
  BASE_STRENGTH_REFERENCE: 10,

  // Knockback visual padrão (pixels)
  DEFAULT_KNOCKBACK_DURATION_MS: 120,

  // Estados de combate
  STATES: {
    IDLE: 'idle',
    ATTACKING: 'attacking',
    RECOVERING: 'recovering',
  },
};
