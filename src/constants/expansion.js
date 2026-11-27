/**
 * Parâmetros centralizados da Expansão (fases por eliminações, chuva de formigas,
 * efeitos visuais, embriaguez e áudio). Todos os valores de balanceamento ficam aqui
 * ou em `src/data/abilities.js`, nunca espalhados pela lógica.
 */

/** Progressão em quatro fases a cada `KILLS_PER_PHASE` inimigos comuns derrotados. */
export const PHASE_CONFIG = {
  KILLS_PER_PHASE: 25,
  // Teto do multiplicador de velocidade combinado (loja × fase) relativo ao atributo-base.
  MAX_COMBINED_SPEED_MULTIPLIER: 1.8,
  PHASES: [
    {
      id: 1,
      name: 'FASE 1',
      subtitle: 'ROLE DA LIBERDADE',
      color: '#38bdf8',
      scaling: { hp: 1, strength: 1, speed: 1 },
      antRain: false,
    },
    {
      id: 2,
      name: 'FASE 2',
      subtitle: 'A coisa esquenta',
      color: '#facc15',
      scaling: { hp: 1.2, strength: 1.15, speed: 1.05 },
      antRain: false,
    },
    {
      id: 3,
      name: 'FASE 3',
      subtitle: 'Caos total',
      color: '#fb923c',
      scaling: { hp: 1.45, strength: 1.3, speed: 1.1 },
      antRain: false,
    },
    {
      id: 4,
      name: 'FASE 4',
      subtitle: 'CHUVA DE FORMIGAS!',
      color: '#f87171',
      scaling: { hp: 1.75, strength: 1.5, speed: 1.18 },
      antRain: true,
    },
  ],
};

/** Formigas (chuva hostil da Fase 4 e auxiliares do Tonegi). */
export const ANT_CONFIG = {
  BODY_WIDTH: 14,
  BODY_HEIGHT: 9,
  JUMP_COOLDOWN_MS: 650,
  JUMP_HEIGHT_TRIGGER_Y: 36,
  HOSTILE: {
    TARGET_ACTIVE: 10, // quantidade constante mantida em cena
    MAX_ACTIVE: 14, // teto absoluto de entidades hostis
    SPAWN_INTERVAL_MS: 600,
    SPAWN_MARGIN_X: 24,
    SPAWN_Y: 6,
    FALL_VELOCITY: 160,
    HP: 4,
    DAMAGE: 3,
    MOVE_SPEED: 235,
    JUMP_VELOCITY: -430,
    KNOCKBACK: 6,
    CONTACT_COOLDOWN_MS: 700,
    LIFETIME_MS: 14000,
  },
  ALLY: {
    HP: 3,
    BASE_DAMAGE: 5,
    MOVE_SPEED: 300,
    JUMP_VELOCITY: -460,
    KNOCKBACK: 10,
    CONTACT_COOLDOWN_MS: 380,
    SEARCH_RADIUS: 900,
  },
};

/** Feedback visual dos golpes (partículas, tremor, rastros). */
export const EFFECTS_CONFIG = {
  SHAKE_SCALE: 1, // 0 desliga o tremor de câmera
  MAX_SIMULTANEOUS_SWOOSHES: 8,
  MAX_FLOATING_TEXTS: 14,
  PARTICLES: {
    LIGHT: 8,
    HEAVY: 16,
    SPECIAL: 22,
    COMBO: 32,
  },
  SHAKE: {
    LIGHT: { durationMs: 0, intensity: 0 },
    HEAVY: { durationMs: 90, intensity: 0.0035 },
    SPECIAL: { durationMs: 120, intensity: 0.005 },
    COMBO: { durationMs: 150, intensity: 0.007 },
  },
};

/** Pós-processamento de embriaguez (`phaser3-rex-plugins` Warp + Swirl + Phaser PostFX). */
export const DRUNK_FX_CONFIG = {
  // Níveis ciclados com a tecla definida em CONTROLS.DRUNK_FX_LEVEL (0 desliga totalmente).
  INTENSITY_LEVELS: [1, 0.5, 0.25, 0],
  DEFAULT_LEVEL_INDEX: 0,
  STORAGE_KEY: 'libasim.drunkFxLevel',
  // Parâmetros de WarpPostFxPipeline (em pixels) e SwirlPostFxPipeline (radianos)
  WARP_AMPLITUDE_X: 7,
  WARP_AMPLITUDE_Y: 5,
  WARP_FREQUENCY_X: 28,
  WARP_FREQUENCY_Y: 22,
  SWIRL_MAX_RAD: 0.14,
  SWIRL_RADIUS: 360,
  // Aberração cromática radial + visão dupla leve (UV)
  WAVE_AMPLITUDE_X: 0.005,
  WAVE_AMPLITUDE_Y: 0.004,
  CHROMA_AMOUNT: 0.0045,
  GHOST_ALPHA: 0.12,
  CAMERA_SWAY_MAX_RAD: 0.016,
  // Peso do ranking de raridade e do tempo restante no cálculo de intensidade.
  RARITY_WEIGHT: 0.6,
  REMAINING_WEIGHT: 0.4,
  MAX_INTENSITY: 1,
  SMOOTHING_PER_SECOND: 4.5,
  BARREL_MAX: 0.1, // distorção de barril nativa (Phaser FX)
  HUE_ROTATE_MAX_DEG: 28,
  BLOOM_STRENGTH: 0.4,
};

/** Áudio e música. */
export const AUDIO_CONFIG = {
  DEFAULT_MUSIC_VOLUME: 1, // fator do usuário (0..1) sobre o volume-base de cada faixa
  STAGE_MUSIC_VOLUME: 0.48,
  BOSS_MUSIC_VOLUME: 0.68,
  VOLUME_STEP: 0.1,
  FADE_OUT_MS: 450,
  FADE_IN_MS: 250,
  BOSS_FADE_IN_MS: 140,
};

/** Abertura padronizada no início de cada uma das 4 fases (a cada 25 abates). */
export const PHASE_OPENING_CONFIG = {
  WALK_DURATION_MS: 3200,
  MUSIC_FADE_IN_MS: 1400,
  MUSIC_FADE_OUT_MS: 420,
  ARROW_BLINK_PERIOD_MS: 340,
};

/** Transições cinematográficas, barras letterbox e pausas de impacto (hitstop). */
export const CINEMATIC_CONFIG = {
  LETTERBOX_HEIGHT: 34,
  LETTERBOX_TWEEN_MS: 320,
  PHASE_WIPE_DURATION_MS: 520,
  MILESTONE_HITSTOP_MS: 130,
  COMBO_KILL_HITSTOP_MS: 52,
  BOSS_ENTRANCE_PAUSE_MS: 180,
};
