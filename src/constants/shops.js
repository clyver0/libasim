/**
 * Configurações centralizadas das Lojas e do evento Coquinho Extra (Fase 8).
 * Valores de frequência e probabilidades adicionais são PROVISÓRIOS e configuráveis
 * conforme docs/TECHNICAL_DECISIONS.md (§15).
 */
export const SHOP_CONFIG = {
  // Marcos oficiais da loja Chiquinho Promos (GAME_DESIGN.md §10)
  OFFICIAL_MILESTONES: [25, 50, 75],
  OPTIONS_PER_VISIT: 3,

  OFFICIAL_THEME: {
    id: 'official',
    title: 'CHIQUINHO PROMOS — LOJA OFICIAL',
    subtitle: 'Escolha 1 upgrade (aumenta a dificuldade e renova plataformas)',
    accentColor: 0x38bdf8,
    accentHex: '#38bdf8',
    panelBg: 0x0f172a,
  },

  SPECIAL_THEME: {
    id: 'special',
    title: 'COQUINHO EXTRA — LOJA ESPECIAL',
    subtitle: 'Recompensa Bônus! Escolha 1 upgrade (sem aumentar dificuldade)',
    accentColor: 0xfacc15,
    accentHex: '#facc15',
    panelBg: 0x1c1917,
  },

  // Configurações do personagem dourado Coquinho Extra (GAME_DESIGN.md §11)
  COQUINHO: {
    MIN_APPEARANCES_PER_RUN: 1,
    MAX_APPEARANCES_PER_RUN: 3,
    // Três janelas progressivas: 1ª garantida (1.0), 2ª e 3ª com probabilidades menores (provisórias)
    SLOTS: [
      { minDefeated: 10, maxDefeated: 22, probability: 1.0 },
      { minDefeated: 33, maxDefeated: 62, probability: 0.55 },
      { minDefeated: 68, maxDefeated: 92, probability: 0.25 },
    ],
    MOVE_SPEED: 155,
    BODY_WIDTH: 26,
    BODY_HEIGHT: 52,
    SPAWN_OFFSET_X: 36,
    DESPAWN_MARGIN_X: 64,
    DEFAULT_HEIGHT_ABOVE_GROUND: 52,
    COLOR: 0xfacc15,
    COLOR_HEX: '#facc15',
  },
};
