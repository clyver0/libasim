/**
 * Gerador leve de amostras WAV PCM em memória (Data URI base64) para alimentar o Howler.js
 * com efeitos sonoros e trilha musical minimalista sem exigir arquivos binários externos.
 */
function encodeBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createToneWavDataUri({
  notes = [{ freq: 440, durationSec: 0.08 }],
  volume = 0.28,
  wave = 'triangle',
  sampleRate = 22050,
} = {}) {
  const totalSec = notes.reduce((acc, n) => acc + Math.max(0.01, n.durationSec), 0);
  const numSamples = Math.max(1, Math.floor(totalSec * sampleRate));
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // Cabeçalho RIFF/WAVE PCM 16-bit mono
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let sampleIndex = 0;
  for (const note of notes) {
    const noteSamples = Math.max(1, Math.floor(note.durationSec * sampleRate));
    const freq = note.freq ?? 0;
    const endFreq = note.endFreq ?? freq;

    for (let i = 0; i < noteSamples && sampleIndex < numSamples; i += 1) {
      const progress = i / noteSamples;
      const currentFreq = freq + (endFreq - freq) * progress;
      const t = sampleIndex / sampleRate;

      // Envelope suave de ataque e decaimento para evitar estalos
      const attack = Math.min(1, i / (sampleRate * 0.006));
      const release = Math.max(0, 1 - progress * 0.85);
      const env = attack * release;

      let raw = 0;
      if (currentFreq > 0) {
        const phase = 2 * Math.PI * currentFreq * t;
        if (wave === 'square') {
          raw = Math.sin(phase) >= 0 ? 0.8 : -0.8;
        } else if (wave === 'triangle') {
          raw = (2 / Math.PI) * Math.asin(Math.sin(phase));
        } else {
          raw = Math.sin(phase);
        }
      }

      const clamped = Math.max(-1, Math.min(1, raw * volume * env));
      view.setInt16(44 + sampleIndex * 2, Math.round(clamped * 32767), true);
      sampleIndex += 1;
    }
  }

  const base64 = encodeBase64(new Uint8Array(buffer));
  return `data:audio/wav;base64,${base64}`;
}

export const SOUND_KEYS = {
  UI_MOVE: 'ui_move',
  UI_CONFIRM: 'ui_confirm',
  ATTACK_LIGHT: 'attack_light',
  ATTACK_HEAVY: 'attack_heavy',
  COMBO_HIT: 'combo_hit',
  PLAYER_HURT: 'player_hurt',
  DRINK_PICKUP: 'drink_pickup',
  SHOP_OPEN: 'shop_open',
  UPGRADE_PICK: 'upgrade_pick',
  COQUINHO_HIT: 'coquinho_hit',
  BOSS_SPAWN: 'boss_spawn',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  BGM_LOOP: 'bgm_loop',
};

export function registerDefaultSoundBank(audioManager) {
  if (!audioManager || audioManager._soundBankInitialized) {
    return false;
  }

  audioManager._soundBankInitialized = true;

  try {
    audioManager.load(
      SOUND_KEYS.UI_MOVE,
      createToneWavDataUri({
        notes: [{ freq: 520, durationSec: 0.045 }],
        volume: 0.16,
      })
    );
    audioManager.load(
      SOUND_KEYS.UI_CONFIRM,
      createToneWavDataUri({
        notes: [
          { freq: 523, durationSec: 0.06 },
          { freq: 659, durationSec: 0.09 },
        ],
        volume: 0.22,
      })
    );
    audioManager.load(
      SOUND_KEYS.ATTACK_LIGHT,
      createToneWavDataUri({
        notes: [{ freq: 340, endFreq: 190, durationSec: 0.055 }],
        volume: 0.2,
        wave: 'triangle',
      })
    );
    audioManager.load(
      SOUND_KEYS.ATTACK_HEAVY,
      createToneWavDataUri({
        notes: [{ freq: 220, endFreq: 110, durationSec: 0.09 }],
        volume: 0.26,
        wave: 'square',
      })
    );
    audioManager.load(
      SOUND_KEYS.COMBO_HIT,
      createToneWavDataUri({
        notes: [
          { freq: 392, durationSec: 0.05 },
          { freq: 587, durationSec: 0.08 },
        ],
        volume: 0.26,
        wave: 'square',
      })
    );
    audioManager.load(
      SOUND_KEYS.PLAYER_HURT,
      createToneWavDataUri({
        notes: [{ freq: 180, endFreq: 95, durationSec: 0.12 }],
        volume: 0.28,
        wave: 'square',
      })
    );
    audioManager.load(
      SOUND_KEYS.DRINK_PICKUP,
      createToneWavDataUri({
        notes: [
          { freq: 587, durationSec: 0.05 },
          { freq: 784, durationSec: 0.08 },
        ],
        volume: 0.22,
      })
    );
    audioManager.load(
      SOUND_KEYS.SHOP_OPEN,
      createToneWavDataUri({
        notes: [
          { freq: 440, durationSec: 0.06 },
          { freq: 554, durationSec: 0.06 },
          { freq: 659, durationSec: 0.1 },
        ],
        volume: 0.22,
      })
    );
    audioManager.load(
      SOUND_KEYS.UPGRADE_PICK,
      createToneWavDataUri({
        notes: [
          { freq: 523, durationSec: 0.05 },
          { freq: 659, durationSec: 0.05 },
          { freq: 880, durationSec: 0.1 },
        ],
        volume: 0.24,
      })
    );
    audioManager.load(
      SOUND_KEYS.COQUINHO_HIT,
      createToneWavDataUri({
        notes: [
          { freq: 659, durationSec: 0.05 },
          { freq: 880, durationSec: 0.05 },
          { freq: 1046, durationSec: 0.12 },
        ],
        volume: 0.26,
      })
    );
    audioManager.load(
      SOUND_KEYS.BOSS_SPAWN,
      createToneWavDataUri({
        notes: [
          { freq: 146, durationSec: 0.14 },
          { freq: 138, durationSec: 0.14 },
          { freq: 110, durationSec: 0.26 },
        ],
        volume: 0.3,
        wave: 'square',
      })
    );
    audioManager.load(
      SOUND_KEYS.VICTORY,
      createToneWavDataUri({
        notes: [
          { freq: 523, durationSec: 0.09 },
          { freq: 659, durationSec: 0.09 },
          { freq: 784, durationSec: 0.09 },
          { freq: 1046, durationSec: 0.22 },
        ],
        volume: 0.26,
      })
    );
    audioManager.load(
      SOUND_KEYS.DEFEAT,
      createToneWavDataUri({
        notes: [
          { freq: 330, durationSec: 0.12 },
          { freq: 277, durationSec: 0.12 },
          { freq: 220, durationSec: 0.24 },
        ],
        volume: 0.25,
      })
    );
    audioManager.load(
      SOUND_KEYS.BGM_LOOP,
      createToneWavDataUri({
        notes: [
          { freq: 220, durationSec: 0.28 },
          { freq: 261.6, durationSec: 0.28 },
          { freq: 329.6, durationSec: 0.28 },
          { freq: 293.7, durationSec: 0.28 },
          { freq: 196, durationSec: 0.28 },
          { freq: 246.9, durationSec: 0.28 },
          { freq: 293.7, durationSec: 0.28 },
          { freq: 261.6, durationSec: 0.28 },
        ],
        volume: 0.09,
        wave: 'triangle',
      }),
      { loop: true }
    );
    return true;
  } catch {
    return false;
  }
}
