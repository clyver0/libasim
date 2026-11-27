import { Howl, Howler } from 'howler';

export class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.muted = false;
    this.volume = 1.0;
    this.currentMusicKey = null;
    this.musicVolume = 1;
    this.musicBase = new Map();
    this.failedMusic = new Set();
    this._soundBankInitialized = false;
  }

  load(key, src, options = {}) {
    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      ...options,
    });
    this.sounds.set(key, howl);
    return howl;
  }

  play(key) {
    const sound = this.sounds.get(key);
    if (!sound) return null;
    return sound.play();
  }

  stop(key) {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.stop();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    Howler.mute(this.muted);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Registra uma faixa de música (stream longo). Falhas de carga são toleradas: a faixa é marcada
   * como indisponível e `playMusic` mantém a música atual em vez de ficar em silêncio.
   */
  registerMusic(key, src, { loop = true, baseVolume = 1, html5 = false } = {}) {
    this.musicBase.set(key, baseVolume);
    const howl = this.load(key, src, {
      loop,
      volume: baseVolume * this.musicVolume,
      html5,
      preload: true,
      onloaderror: () => this.failedMusic.add(key),
    });
    return howl;
  }

  /** Volume do usuário para todas as músicas (0..1), relativo ao volume-base de cada faixa. */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    const current = this.sounds.get(this.currentMusicKey);
    if (current && this.currentMusicKey) {
      current.volume?.(this._musicTargetVolume(this.currentMusicKey, current));
    }
    return this.musicVolume;
  }

  _musicTargetVolume(key, sound) {
    if (!this.musicBase.has(key)) {
      const own = typeof sound?.volume === 'function' ? sound.volume() : 1;
      this.musicBase.set(key, typeof own === 'number' ? own : 1);
    }
    return this.musicBase.get(key) * this.musicVolume;
  }

  playMusic(key, { fadeInMs = 0, fadeOutMs = 0 } = {}) {
    if (this.currentMusicKey === key) return null;
    const sound = this.sounds.get(key);
    if (!sound || this.failedMusic.has(key)) return null;
    this.stopMusic({ fadeOutMs });
    this.currentMusicKey = key;
    sound.rate?.(1);
    const target = this._musicTargetVolume(key, sound);
    if (fadeInMs > 0 && typeof sound.fade === 'function') {
      sound.volume?.(0);
      const id = sound.play();
      sound.fade(0, target, fadeInMs, id);
      return id;
    }
    sound.volume?.(target);
    return sound.play();
  }

  stopMusic({ fadeOutMs = 0 } = {}) {
    const key = this.currentMusicKey;
    if (!key) return;
    this.currentMusicKey = null;
    const sound = this.sounds.get(key);
    if (!sound) return;
    sound.rate?.(1);
    if (fadeOutMs > 0 && typeof sound.fade === 'function') {
      const from = this._musicTargetVolume(key, sound);
      sound.fade(from, 0, fadeOutMs);
      // Só interrompe se a mesma faixa não foi retomada no intervalo (evita corte/sobreposição)
      setTimeout(() => {
        if (this.currentMusicKey !== key) sound.stop();
      }, fadeOutMs + 40);
    } else {
      sound.stop();
    }
  }
}

export const audioManager = new AudioManager();
