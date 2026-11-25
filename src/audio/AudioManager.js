import { Howl, Howler } from 'howler';

export class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.muted = false;
    this.volume = 1.0;
    this.currentMusicKey = null;
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

  playMusic(key) {
    if (this.currentMusicKey === key) return null;
    this.stopMusic();
    const sound = this.sounds.get(key);
    if (!sound) return null;
    this.currentMusicKey = key;
    return sound.play();
  }

  stopMusic() {
    if (!this.currentMusicKey) return;
    this.stop(this.currentMusicKey);
    this.currentMusicKey = null;
  }
}

export const audioManager = new AudioManager();
