import { describe, expect, it } from 'vitest';
import { GAMEPLAY } from '../src/constants/gameplay.js';
import { PLATFORM_CONFIG } from '../src/constants/platforms.js';
import {
  PlatformGenerator,
  canJumpBetween,
} from '../src/systems/PlatformGenerator.js';

describe('Fase 2 — PlatformGenerator e Acessibilidade', () => {
  const generator = new PlatformGenerator();

  it('gera layout idêntico para a mesma seed (reprodutibilidade)', () => {
    const first = generator.generate(12345);
    const second = generator.generate(12345);

    expect(first).toEqual(second);
    expect(first.platforms.length).toBeGreaterThanOrEqual(
      PLATFORM_CONFIG.MIN_COUNT
    );
    expect(first.platforms.length).toBeLessThanOrEqual(
      PLATFORM_CONFIG.MAX_COUNT
    );
  });

  it('gera layouts diferentes para seeds diferentes', () => {
    const layoutA = generator.generate('seed-alpha');
    const layoutB = generator.generate('seed-beta');

    expect(layoutA.platforms).not.toEqual(layoutB.platforms);
  });

  it('respeita os limites da tela e margens em múltiplas seeds', () => {
    const seeds = [1, 42, 999, 'run-1', 'run-2', 'chiquinho'];

    for (const seed of seeds) {
      const { platforms } = generator.generate(seed);
      const groundTop = GAMEPLAY.SCREEN_HEIGHT - PLATFORM_CONFIG.GROUND_HEIGHT;

      for (const p of platforms) {
        expect(p.x - p.width / 2).toBeGreaterThanOrEqual(
          PLATFORM_CONFIG.MARGIN_X
        );
        expect(p.x + p.width / 2).toBeLessThanOrEqual(
          GAMEPLAY.SCREEN_WIDTH - PLATFORM_CONFIG.MARGIN_X
        );
        expect(p.y - p.height / 2).toBeGreaterThanOrEqual(
          PLATFORM_CONFIG.MIN_TOP_Y
        );
        expect(p.y + p.height / 2).toBeLessThanOrEqual(
          groundTop - PLATFORM_CONFIG.MAX_BOTTOM_MARGIN_FROM_GROUND
        );
      }
    }
  });

  it('não gera sobreposições indevidas entre plataformas', () => {
    const seeds = [10, 20, 30, 40, 50];

    for (const seed of seeds) {
      const { platforms } = generator.generate(seed);

      for (let i = 0; i < platforms.length; i += 1) {
        for (let j = i + 1; j < platforms.length; j += 1) {
          const a = platforms[i];
          const b = platforms[j];

          const dx = Math.abs(a.x - b.x);
          const dy = Math.abs(a.y - b.y);
          const minDx =
            (a.width + b.width) / 2 + PLATFORM_CONFIG.MIN_HORIZONTAL_GAP;
          const minDy =
            (a.height + b.height) / 2 + PLATFORM_CONFIG.MIN_VERTICAL_GAP;

          expect(dx < minDx && dy < minDy).toBe(false);
        }
      }
    }
  });

  it('preserva a região inicial segura livre de plataformas', () => {
    const zone = PLATFORM_CONFIG.SAFE_SPAWN_ZONE;
    const seeds = [100, 200, 300, 'spawn-check'];

    for (const seed of seeds) {
      const { platforms } = generator.generate(seed);

      for (const p of platforms) {
        const dx = Math.abs(p.x - zone.x);
        const dy = Math.abs(p.y - zone.y);
        const overlapsSafeZone =
          dx < (p.width + zone.width) / 2 && dy < (p.height + zone.height) / 2;

        expect(overlapsSafeZone).toBe(false);
      }
    }
  });

  it('garante acessibilidade entre plataformas e caminho alcançável a partir do chão', () => {
    const seeds = [7, 77, 777, 'acessibilidade-1', 'acessibilidade-2'];

    for (const seed of seeds) {
      const result = generator.generate(seed);
      expect(result.reachable).toBe(true);
      expect(generator.validateReachability(result.platforms)).toBe(true);
    }

    // Valida também que uma plataforma alta demais é rejeitada por canJumpBetween
    const ground = generator.getGroundDescriptor();
    const unreachablePlatform = {
      x: 480,
      y: ground.y - ground.height / 2 - 220,
      width: 140,
      height: 18,
    };
    expect(canJumpBetween(ground, unreachablePlatform)).toBe(false);
  });
});
