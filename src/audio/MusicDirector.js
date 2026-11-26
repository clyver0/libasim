import { audioManager as defaultAudio } from './AudioManager.js';
import { SOUND_KEYS } from './SoundBank.js';
import { AUDIO_CONFIG } from '../constants/expansion.js';
import { BOSS_MUSIC_BY_BOSS_ID, MUSIC_TRACKS } from '../data/music.js';

/**
 * Orquestra a trilha sonora principal e as músicas distintas de cada boss/fase sobre o AudioManager (Howler.js).
 * - Garante ausência total de sobreposição de faixas (toda transição passa por `AudioManager.playMusic`).
 * - Suporta faixas distintas por boss e por fase do boss (ex.: Fase 1 -> Beethoven 5ª, Fase 2 -> Cavalgada das Valquírias).
 * - Faz fallback transparente para `SOUND_KEYS.BGM_LOOP` quando uma faixa externa não estiver carregada (ex.: ambiente headless/testes).
 */
export class MusicDirector {
  constructor({
    audio = defaultAudio,
    tracks = MUSIC_TRACKS,
    bossMap = BOSS_MUSIC_BY_BOSS_ID,
    stageTrackId = 'stage_normal',
    menuTrackId = 'menu',
    fallbackKey = SOUND_KEYS.BGM_LOOP,
    config = AUDIO_CONFIG,
  } = {}) {
    this.audio = audio;
    this.tracks = tracks;
    this.bossMap = bossMap;
    this.stageTrackId = stageTrackId;
    this.menuTrackId = menuTrackId;
    this.fallbackKey = fallbackKey;
    this.config = config;
    this.activeBossId = null;
    this.activeBossPhase = 1;
    this.registered = false;
    this.audio.setMusicVolume?.(this.config.DEFAULT_MUSIC_VOLUME ?? 1);
  }

  /** Registra todas as faixas declaradas em `MUSIC_TRACKS` uma única vez no AudioManager. */
  registerTracks() {
    if (this.registered) return;
    this.registered = true;
    for (const [trackId, track] of Object.entries(this.tracks)) {
      if (!track?.key || this.audio.sounds.has(track.key)) continue;
      const isStage = trackId === this.stageTrackId || trackId === this.menuTrackId;
      const baseVol = isStage
        ? (this.config.STAGE_MUSIC_VOLUME ?? 0.48) * (track.volumeScale ?? 1)
        : (this.config.BOSS_MUSIC_VOLUME ?? 0.7) * (track.volumeScale ?? 1);
      this.audio.registerMusic(track.key, track.src, {
        loop: track.loop !== false,
        baseVolume: baseVol,
      });
    }
  }

  /** Inicia a música exclusiva da tela de seleção/menu. */
  startMenu({ fadeOutMs = 0 } = {}) {
    this.registerTracks();
    this.activeBossId = null;
    this.activeBossPhase = 1;
    const menuTrack = this.tracks[this.menuTrackId];
    if (!menuTrack?.key) return null;
    return this.audio.playMusic(menuTrack.key, {
      fadeInMs: this.config.FADE_IN_MS,
      fadeOutMs,
    });
  }

  _resolveStageKey() {
    const stageTrack = this.tracks[this.stageTrackId];
    if (
      stageTrack?.key &&
      this.audio.sounds.has(stageTrack.key) &&
      !this.audio.failedMusic?.has(stageTrack.key)
    ) {
      return stageTrack.key;
    }
    return this.fallbackKey;
  }

  _resolveBossTrack(bossId, phase = 1) {
    const entry = this.bossMap[bossId];
    if (!entry) return null;
    const trackId =
      typeof entry === 'string'
        ? entry
        : entry[phase] ?? entry[1] ?? Object.values(entry)[0];
    return trackId ? this.tracks[trackId] ?? null : null;
  }

  /** Inicia (ou retoma) a música normal da partida. */
  startDefault({ fadeOutMs = 0 } = {}) {
    this.registerTracks();
    this.activeBossId = null;
    this.activeBossPhase = 1;
    const targetKey = this._resolveStageKey();
    const played = this.audio.playMusic(targetKey, {
      fadeInMs: this.config.FADE_IN_MS,
      fadeOutMs,
    });
    if (this.audio.currentMusicKey !== targetKey && targetKey !== this.fallbackKey) {
      return this.audio.playMusic(this.fallbackKey, {
        fadeInMs: this.config.FADE_IN_MS,
        fadeOutMs,
      });
    }
    return played;
  }

  /** Inicia ou transiciona a música específica do boss (e de sua fase atual). */
  playBossMusic(bossId, phase = 1) {
    const track = this._resolveBossTrack(bossId, phase);
    if (!track) return false;
    this.registerTracks();
    this.activeBossId = bossId;
    this.activeBossPhase = phase;
    this.audio.playMusic(track.key, {
      fadeInMs: this.config.BOSS_FADE_IN_MS,
      fadeOutMs: this.config.FADE_OUT_MS,
    });
    if (this.audio.currentMusicKey !== track.key) {
      // Fallback seguro se o arquivo externo falhou
      this.audio.playMusic(this.fallbackKey);
      return false;
    }
    return true;
  }

  /** Atualiza a faixa quando o boss avança de fase (ex.: Fase 1 -> Fase 2). */
  setBossPhase(bossId, phase) {
    if (!bossId || this.activeBossId !== bossId) return false;
    if (this.activeBossPhase === phase) return false;
    return this.playBossMusic(bossId, phase);
  }

  /** Encerra a música do boss ao derrotá-lo e faz transição suave de volta à música normal. */
  endBossMusic(bossId = this.activeBossId) {
    if (!bossId || this.activeBossId !== bossId) return false;
    this.activeBossId = null;
    this.activeBossPhase = 1;
    const stageKey = this._resolveStageKey();
    this.audio.playMusic(stageKey, {
      fadeInMs: this.config.FADE_IN_MS * 2,
      fadeOutMs: this.config.FADE_OUT_MS,
    });
    return true;
  }

  /** Para a música atual no fim/reinício da run sem deixar faixas sobrepostas. */
  reset({ restartDefault = false } = {}) {
    this.activeBossId = null;
    this.activeBossPhase = 1;
    this.audio.stopMusic();
    if (restartDefault) {
      this.startDefault();
    }
  }

  adjustVolume(delta) {
    const next = (this.audio.musicVolume ?? 1) + delta;
    return this.audio.setMusicVolume(next);
  }

  setVolume(volume) {
    return this.audio.setMusicVolume(volume);
  }

  getVolume() {
    return this.audio.musicVolume ?? 1;
  }
}
