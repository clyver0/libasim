import { describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager.js';

vi.mock('phaser', () => ({
  default: {
    AUTO: 0,
    Scale: {
      FIT: 1,
      CENTER_BOTH: 1,
    },
    Scene: class Scene {
      constructor(config) {
        this.sys = config;
      }
    },
  },
}));

vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(function (options) {
    this.options = options;
    this.play = vi.fn(() => 1);
    this.stop = vi.fn();
  }),
  Howler: {
    volume: vi.fn(),
    mute: vi.fn(),
  },
}));

describe('Setup Inicial do Projeto', () => {
  it('configura Phaser 3 com Arcade Physics habilitado', async () => {
    const { createGameConfig } = await import('../src/config.js');
    const config = createGameConfig();

    expect(config.physics.default).toBe('arcade');
    expect(config.physics.arcade).toEqual({
      gravity: { x: 0, y: 0 },
      debug: false,
    });
    expect(config.scene.length).toBeGreaterThan(0);
  });

  it('gerencia volume e estado de mute com AudioManager (Howler.js)', () => {
    const manager = new AudioManager();

    manager.setVolume(0.5);
    expect(manager.volume).toBe(0.5);

    manager.setVolume(2);
    expect(manager.volume).toBe(1);

    manager.setMuted(true);
    expect(manager.muted).toBe(true);
  });

  it('carrega e reproduz sons registrados no AudioManager', () => {
    const manager = new AudioManager();
    manager.load('apito', '/assets/audio/whistle.mp3');

    const playId = manager.play('apito');
    expect(playId).toBe(1);
    expect(manager.play('inexistente')).toBeNull();
  });
});
