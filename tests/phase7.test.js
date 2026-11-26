import { describe, expect, it, vi } from 'vitest';
import { getCharacterById } from '../src/data/characters.js';
import { UPGRADES, getUpgradeById } from '../src/data/upgrades.js';
import { Player } from '../src/entities/Player.js';
import {
  CharacterAppearanceSystem,
  computePoseSkeleton,
} from '../src/systems/CharacterAppearanceSystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';

function createRecordingGraphics() {
  return {
    x: 0,
    y: 0,
    scale: 1,
    clear: vi.fn(),
    lineStyle: vi.fn(),
    fillStyle: vi.fn(),
    lineBetween: vi.fn(),
    strokeCircle: vi.fn(),
    fillCircle: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillEllipse: vi.fn(),
    strokeEllipse: vi.fn(),
    setScale: vi.fn(function (s) {
      this.scale = s;
    }),
    setPosition: vi.fn(function (nx, ny) {
      this.x = nx;
      this.y = ny;
    }),
    destroy: vi.fn(),
  };
}

function createMockScene() {
  const listeners = {};
  return {
    listeners,
    events: {
      on: vi.fn((ev, fn) => {
        listeners[ev] = fn;
      }),
      off: vi.fn(),
    },
    add: {
      rectangle: vi.fn((x, y, width, height) => ({
        x,
        y,
        width,
        height,
        destroy: vi.fn(),
      })),
      graphics: vi.fn(() => createRecordingGraphics()),
    },
    physics: {
      add: {
        existing: vi.fn((gameObject) => {
          gameObject.body = {
            x: gameObject.x - gameObject.width / 2,
            y: gameObject.y - gameObject.height / 2,
            width: gameObject.width,
            height: gameObject.height,
            halfWidth: gameObject.width / 2,
            halfHeight: gameObject.height / 2,
            velocity: { x: 0, y: 0 },
            blocked: { down: true },
            touching: { down: true },
            setCollideWorldBounds: vi.fn(),
            setSize: vi.fn(function (w, h) {
              this.width = w;
              this.height = h;
              this.halfWidth = w / 2;
              this.halfHeight = h / 2;
            }),
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

describe('Fase 7 — CharacterAppearanceSystem e Aparência dos Personagens', () => {
  it('resolve estado visual para cada um dos 30 upgrades sem modificar atributos mecânicos', () => {
    const scene = createMockScene();
    const player = new Player(scene, 480, 472, getCharacterById('character_1'));
    const appearance = new CharacterAppearanceSystem();
    const initialStats = { ...player.state.effectiveStats };
    const initialGameplay = { ...player.state.gameplayModifiers };

    for (const upgrade of UPGRADES) {
      const state = appearance.setUpgrades([upgrade]);
      expect(state.activeTypes).toContain(upgrade.visual.type);
      player.setAppearanceState(state);
    }

    // CharacterAppearanceSystem NÃO altera atributos mecânicos
    expect(player.state.effectiveStats).toEqual(initialStats);
    expect(player.state.gameplayModifiers).toEqual(initialGameplay);
  });

  it('garante coexistência visual de combinações exigidas pelo Game Design', () => {
    const appearance = new CharacterAppearanceSystem();

    // 1. Braços de Gorila + Luvas de Boxe + Luvas de Seda
    // 2. Tênis de Foguete + Pernas de Mola
    // 3. Capacete de Obra + Coroa do Caos
    // 4. Novos acessórios de loja e compatibilidade com os acessórios existentes
    const comboIds = [
      'bracos_de_gorila',
      'luvas_de_boxe',
      'luvas_de_seda',
      'tenis_de_foguete',
      'pernas_de_mola',
      'capacete_de_obra',
      'chines_do_gab',
      'coroa_do_caos',
      'mochila_de_bebidas',
      'aliado_chiquinho_promos',
      'marmita_ketchup_roubado',
      'faixa_branca_jiu_emy',
      'capa_de_super_heroi',
    ];

    const state = appearance.setUpgrades(comboIds);
    expect(state.hasGorillaArms).toBe(true);
    expect(state.armStrokeWidth).toBeGreaterThan(3);
    expect(state.hasBoxingGloves).toBe(true);
    expect(state.hasSilkGloves).toBe(true);
    expect(state.hasSpringLegs).toBe(true);
    expect(state.hasRocketShoes).toBe(true);
    expect(state.hasHardHat).toBe(true);
    expect(state.hasLuckyHat).toBe(false);
    expect(state.hasDrinkBackpack).toBe(true);
    expect(state.hasDrinkMagnet).toBe(false);
    expect(state.activeTypes).toContain('team_jersey');
    expect(state.activeTypes).toContain('promo_badge');
    expect(state.activeTypes).toContain('white_jiu_belt');

    // A coroa continua deslocada quando coexistir com o capacete.
    expect(state.headStack.crownOffsetY).toBeLessThan(0);

    // Renderiza em todas as poses de combate, caminhada e direções sem erro
    const g = createRecordingGraphics();
    const poses = [
      'idle',
      'walk_1',
      'walk_2',
      'light',
      'heavy',
      'special',
      'combo_fast',
      'combo_heavy',
      'combo_special',
    ];

    for (const pose of poses) {
      for (const facing of [1, -1]) {
        CharacterAppearanceSystem.renderCharacter(g, {
          color: 0x38bdf8,
          facing,
          pose,
          auraColor: 0x22c55e,
          appearanceState: state,
        });
      }
    }

    expect(g.clear).toHaveBeenCalledTimes(poses.length * 2);
    expect(g.fillEllipse).toHaveBeenCalled();
    expect(g.fillRect).toHaveBeenCalled();
  });

  it('integra UpgradeSystem -> CharacterAppearanceSystem -> Player preservando animações e escala', () => {
    const scene = createMockScene();
    const player = new Player(scene, 480, 472, getCharacterById('piri'));
    const appearance = new CharacterAppearanceSystem();
    const upgrades = new UpgradeSystem({
      seed: 123,
      onUpgradesChanged: (list) => {
        const appState = appearance.setUpgrades(list);
        player.syncBodyScale();
        player.setAppearanceState(appState);
      },
    });

    upgrades.acquireUpgrade(getUpgradeById('gigantismo'), player.state);
    upgrades.acquireUpgrade(getUpgradeById('oculos_de_precisao'), player.state);
    upgrades.acquireUpgrade(getUpgradeById('joelheiras_blindadas'), player.state);

    expect(player.appearanceState.scale).toBeGreaterThan(1);
    expect(player.visual.scale).toBeCloseTo(player.appearanceState.scale * player.state.multipliers.bodyScale, 5);

    // Verifica que esqueleto acompanha pose de ataque e caminhada
    const skelIdle = computePoseSkeleton(1, 'idle');
    const skelLight = computePoseSkeleton(1, 'light');
    expect(skelLight.frontHand.x).toBeGreaterThan(skelIdle.frontHand.x);

    player.update({ horizontal: 1, jump: false }, 150);
    expect(player.locomotionPose).toBe('walk_2');
  });
});
