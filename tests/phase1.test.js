import { describe, expect, it, vi } from 'vitest';
import { PHYSICS } from '../src/constants/physics.js';
import {
  CHARACTERS,
  DEFAULT_BASE_STATS,
  getCharacterById,
} from '../src/data/characters.js';
import { Player } from '../src/entities/Player.js';
import { PlayerState } from '../src/entities/PlayerState.js';
import { StatCalculator } from '../src/systems/StatCalculator.js';
import { formatHudLines } from '../src/ui/Hud.js';

function createMockScene() {
  const listeners = {};
  const createMockGraphics = ({ x = 0, y = 0 } = {}) => ({
    x,
    y,
    clear: vi.fn(),
    lineStyle: vi.fn(),
    fillStyle: vi.fn(),
    strokeCircle: vi.fn(),
    fillCircle: vi.fn(),
    lineBetween: vi.fn(),
    setPosition: vi.fn(function (nx, ny) {
      this.x = nx;
      this.y = ny;
    }),
    destroy: vi.fn(),
  });

  return {
    listeners,
    events: {
      on: vi.fn((event, fn) => {
        listeners[event] = fn;
      }),
      off: vi.fn((event, fn) => {
        if (listeners[event] === fn) delete listeners[event];
      }),
    },
    add: {
      rectangle: vi.fn((x, y, width, height) => ({
        x,
        y,
        width,
        height,
        destroy: vi.fn(),
      })),
      graphics: vi.fn((opts) => createMockGraphics(opts)),
    },
    physics: {
      add: {
        existing: vi.fn((gameObject) => {
          gameObject.body = {
            x: gameObject.x - gameObject.width / 2,
            y: gameObject.y - gameObject.height / 2,
            halfWidth: gameObject.width / 2,
            halfHeight: gameObject.height / 2,
            velocity: { x: 0, y: 0 },
            blocked: { down: false },
            touching: { down: false },
            setCollideWorldBounds: vi.fn(),
            setSize: vi.fn(),
            setVelocityX: vi.fn(function (vx) {
              this.velocity.x = vx;
            }),
            setVelocityY: vi.fn(function (vy) {
              this.velocity.y = vy;
            }),
          };
        }),
      },
    },
  };
}

describe('Fase 1 — Personagens, Atributos, Player e HUD', () => {
  it('define dois personagens iniciais com cor, força, HP máx, resistência e velocidade diferentes', () => {
    expect(CHARACTERS).toHaveLength(2);
    expect(CHARACTERS[0].color).not.toBe(CHARACTERS[1].color);

    const state1 = new PlayerState(CHARACTERS[0]);
    const state2 = new PlayerState(CHARACTERS[1]);
    const snap1 = state1.getSnapshot();
    const snap2 = state2.getSnapshot();

    expect(snap1.maxHp).not.toBe(snap2.maxHp);
    expect(snap1.strength).not.toBe(snap2.strength);
    expect(snap1.drinkResistance).not.toBe(snap2.drinkResistance);
    expect(snap1.moveSpeed).not.toBe(snap2.moveSpeed);

    // Personagem 1 focado em velocidade/ataque; Personagem 2 focado em HP/resistência
    expect(snap1.moveSpeed).toBeGreaterThan(snap2.moveSpeed);
    expect(snap1.strength).toBeGreaterThan(snap2.strength);
    expect(snap2.maxHp).toBeGreaterThan(snap1.maxHp);
    expect(snap2.drinkResistance).toBeGreaterThan(snap1.drinkResistance);

    expect(getCharacterById('character_2').id).toBe('character_2');
    expect(getCharacterById('inexistente').id).toBe(CHARACTERS[0].id);
  });

  it('calcula atributos efetivos centralizados considerando base, multiplicadores, upgrades e efeitos', () => {
    const base = StatCalculator.calculateEffectiveStats({
      baseStats: { maxHp: 100, strength: 10, drinkResistance: 1 },
      multipliers: { maxHp: 1, strength: 1, drinkResistance: 1 },
    });

    expect(base).toEqual({ maxHp: 100, strength: 10, drinkResistance: 1 });

    const modified = StatCalculator.calculateEffectiveStats({
      baseStats: { maxHp: 100, strength: 10, drinkResistance: 1 },
      multipliers: { maxHp: 1.2, strength: 1.5, drinkResistance: 1 },
      upgrades: [{ flat: { maxHp: 30, strength: 5 } }],
      activeEffects: [{ multiplier: { strength: 2, drinkResistance: 0.5 } }],
    });

    expect(modified).toEqual({
      maxHp: 150,
      strength: 40,
      drinkResistance: 0.5,
    });
  });

  it('mantém PlayerState desacoplado e formata linhas da HUD corretamente', () => {
    const state = new PlayerState(CHARACTERS[1]);
    const snapshot = state.getSnapshot();

    expect(snapshot.hp).toBe(snapshot.maxHp);
    expect(snapshot.maxHp).toBe(135);
    expect(snapshot.strength).toBe(9.5);
    expect(snapshot.drinkResistance).toBe(1.4);
    expect(snapshot.moveSpeed).toBe(Math.round(PHYSICS.PLAYER_MOVE_SPEED * 0.9));

    const lines = formatHudLines(snapshot);
    expect(lines).toEqual([
      CHARACTERS[1].name,
      `HP: ${snapshot.hp} / ${snapshot.maxHp}`,
      `Força: ${snapshot.strength}`,
      `Resistência a bebidas: ${snapshot.drinkResistance}`,
      `Velocidade: ${snapshot.moveSpeed}`,
    ]);
  });

  it('controla movimentação horizontal com velocidade individual, pulo apenas no chão e sincroniza visual', () => {
    const scene = createMockScene();
    const player = new Player(scene, 480, 300, CHARACTERS[0]);
    const expectedSpeed =
      PHYSICS.PLAYER_MOVE_SPEED * CHARACTERS[0].multipliers.moveSpeed;

    // Representação visual não possui corpo físico acoplado
    expect(player.visual.body).toBeUndefined();
    expect(player.collider.body).toBeDefined();

    // Movimento horizontal
    player.applyInput({ horizontal: -1, jump: false });
    expect(player.body.velocity.x).toBeCloseTo(-expectedSpeed, 2);
    expect(player.facing).toBe(-1);

    player.applyInput({ horizontal: 0, jump: false });
    expect(player.body.velocity.x).toBe(0);

    // Não pula no ar
    player.body.blocked.down = false;
    expect(player.jump()).toBe(false);
    expect(player.body.velocity.y).toBe(0);

    // Pula quando apoiado no chão
    player.body.blocked.down = true;
    expect(player.jump()).toBe(true);
    expect(player.body.velocity.y).toBe(PHYSICS.PLAYER_JUMP_VELOCITY);

    // Sincronização pós-física do stick figure com o centro do corpo Arcade
    player.body.x = 200;
    player.body.y = 150;
    scene.listeners.postupdate();

    expect(player.visual.x).toBe(200 + player.body.halfWidth);
    expect(player.visual.y).toBe(150 + player.body.halfHeight);
  });
});
