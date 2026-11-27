import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Scene: class Scene {
      constructor(config) {
        this.sys = config;
      }
    },
    Input: {
      Keyboard: {
        KeyCodes: {},
        JustDown: vi.fn(() => false),
      },
    },
  },
}));

vi.mock('howler', () => ({
  Howl: vi.fn(),
  Howler: { volume: vi.fn(), mute: vi.fn() },
}));

vi.mock('phaser3-rex-plugins/plugins/shockwavepipeline.js', () => ({
  default: class MockShockwavePipeline {},
}));

import { PHASE_CONFIG } from '../src/constants/expansion.js';
import { getCharacterById } from '../src/data/characters.js';
import { DRINKS } from '../src/data/drinks.js';
import { getDefaultEnemyType } from '../src/data/enemies.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { PlayerState } from '../src/entities/PlayerState.js';
import { MainScene } from '../src/scenes/MainScene.js';
import { CharacterAppearanceSystem } from '../src/systems/CharacterAppearanceSystem.js';
import {
  DEV_TOOLS_CONFIG,
  DevToolsController,
  isDevEnvironment,
} from '../src/systems/DevToolsController.js';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';
import { DrinkEffectManager } from '../src/systems/DrinkEffectManager.js';
import { DrinkSystem } from '../src/systems/DrinkSystem.js';
import { GoldenEventScheduler } from '../src/systems/GoldenEventScheduler.js';
import { HorizontalTrackSystem } from '../src/systems/HorizontalTrackSystem.js';
import { PhaseSystem } from '../src/systems/PhaseSystem.js';
import { RunManager } from '../src/systems/RunManager.js';
import { ShopSystem } from '../src/systems/ShopSystem.js';
import { SpawnSystem } from '../src/systems/SpawnSystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';

function createDevToolsHarness(seed = 'devtools-test-seed') {
  const playerState = new PlayerState(getCharacterById('piri'));
  const appearanceSystem = new CharacterAppearanceSystem();
  const difficultySystem = new DifficultySystem();
  const phaseSystem = new PhaseSystem();
  const spawnSystem = new SpawnSystem({ seed });
  const trackSystem = new HorizontalTrackSystem({ seed });
  trackSystem.ensureChunksAround(240, 0);
  const drinkSystem = new DrinkSystem({ seed: `${seed}-drinks` });
  const drinkEffectManager = new DrinkEffectManager();
  const upgradeSystem = new UpgradeSystem({
    seed: `${seed}-upgrades`,
    onUpgradesChanged: (upgrades) => appearanceSystem.setUpgrades(upgrades),
  });
  const shopSystem = new ShopSystem({ upgradeSystem, difficultySystem });
  const goldenScheduler = new GoldenEventScheduler({ seed: `${seed}-gold` });
  const runManager = new RunManager({
    characterId: 'piri',
    characterName: 'Piri',
    seed,
  });

  const appliedEvents = [];
  const controller = new DevToolsController({
    phaseSystem,
    difficultySystem,
    shopSystem,
    spawnSystem,
    trackSystem,
    drinkSystem,
    drinkEffectManager,
    upgradeSystem,
    goldenScheduler,
    runManager,
    getPlayerState: () => playerState,
    onPhaseApplied: (res) => appliedEvents.push(res),
  });

  return {
    controller,
    playerState,
    appearanceSystem,
    difficultySystem,
    phaseSystem,
    spawnSystem,
    trackSystem,
    drinkSystem,
    drinkEffectManager,
    upgradeSystem,
    shopSystem,
    goldenScheduler,
    runManager,
    appliedEvents,
  };
}

describe('Dev Tools — Controle de Progressão de Fases (exclusivo DEV)', () => {
  it('mantém a ferramenta restrita ao ambiente de desenvolvimento', () => {
    expect(isDevEnvironment({ DEV: true, PROD: false })).toBe(true);
    expect(isDevEnvironment({ DEV: false, PROD: true })).toBe(false);
    expect(isDevEnvironment({})).toBe(false);

    // Quando isDevToolsAvailable é false, MainScene ignora a sequência 12345 e não abre a modal
    const scene = new MainScene();
    scene.isDevToolsAvailable = false;
    scene.runEnded = false;
    scene.player = { cheatMode: false, setCheatMode: vi.fn() };
    scene.secretSequence = { push: vi.fn(() => true), reset: vi.fn() };
    scene._handleSecretKeyDown({ key: '1', timeStamp: 10 });
    scene._toggleCheatMode();
    scene._showSecretModeModal(true);

    expect(scene.player.setCheatMode).not.toHaveBeenCalled();
    expect(scene.secretModeModalOpen).toBeFalsy();
  });

  it('permite selecionar diretamente entre as 4 fases atualizando cenário, dificuldade e sistemas em side_2d', () => {
    const h = createDevToolsHarness('select-phases');
    const baseEnemy = getDefaultEnemyType();
    const validUpgradeIds = new Set(UPGRADES.map((u) => u.id));
    const validDrinkIds = new Set(DRINKS.map((d) => d.id));

    // Seleciona Fase 2 -> 25 abates, 1 visita oficial, proporcional de bebidas/upgrades, layout side_2d
    const r2 = h.controller.selectPhase(2);
    expect(r2.toPhaseId).toBe(2);
    expect(h.phaseSystem.currentPhaseId).toBe(2);
    expect(h.trackSystem.currentPhaseId).toBe(2);
    expect(h.trackSystem.getActiveLayout().perspective).toBe('side_2d');
    expect(h.difficultySystem.officialShopVisits).toBe(1);
    expect(h.spawnSystem.defeatedCount).toBe(25);
    expect(h.shopSystem.triggeredMilestones.has(25)).toBe(true);
    expect(h.shopSystem.triggeredMilestones.has(50)).toBe(false);
    expect(h.upgradeSystem.getAcquiredUpgrades()).toHaveLength(1);
    expect(r2.simulatedDrinks).toHaveLength(DEV_TOOLS_CONFIG.DRINKS_PER_PHASE_STEP);

    // Seleciona Fase 4 -> Chuva de Formigas em side_2d, 75 abates, 3 visitas oficiais, 3 upgrades e 6 bebidas sorteadas
    const r4 = h.controller.selectPhase(4);
    expect(r4.toPhaseId).toBe(4);
    expect(h.phaseSystem.currentPhaseId).toBe(4);
    expect(h.phaseSystem.isAntRainPhase()).toBe(true);
    expect(h.trackSystem.currentPhaseId).toBe(4);
    expect(h.trackSystem.getActiveLayout().perspective).toBe('side_2d');
    expect(h.difficultySystem.officialShopVisits).toBe(3);
    expect(h.spawnSystem.defeatedCount).toBe(75);
    expect(Array.from(h.shopSystem.triggeredMilestones)).toEqual([25, 50, 75]);

    const acquiredUpgrades = h.upgradeSystem.getAcquiredUpgrades();
    expect(acquiredUpgrades).toHaveLength(3);
    for (const upg of acquiredUpgrades) {
      expect(validUpgradeIds.has(upg.id)).toBe(true);
    }
    expect(r4.simulatedDrinks).toHaveLength(3 * DEV_TOOLS_CONFIG.DRINKS_PER_PHASE_STEP);
    for (const drink of r4.simulatedDrinks) {
      expect(validDrinkIds.has(drink.id)).toBe(true);
    }

    // Dificuldade combinada (DifficultySystem × PhaseSystem) reflete Fase 4 + 3 visitas oficiais
    const scaledP4 = h.phaseSystem.scaleEnemyData(
      h.difficultySystem.scaleEnemyData(baseEnemy)
    );
    expect(scaledP4.scaledStats.maxHp).toBeGreaterThan(baseEnemy.baseStats.maxHp * 1.8);

    // Retorno direto para a Fase 1 zera visitas/abates e limpa upgrades/bebidas simulados
    const r1 = h.controller.selectPhase(1);
    expect(r1.toPhaseId).toBe(1);
    expect(h.trackSystem.currentPhaseId).toBe(1);
    expect(h.difficultySystem.officialShopVisits).toBe(0);
    expect(h.spawnSystem.defeatedCount).toBe(0);
    expect(h.upgradeSystem.getAcquiredUpgrades()).toHaveLength(0);
    expect(h.drinkEffectManager.getActiveEffects()).toHaveLength(0);
  });

  it('avança imediatamente para a próxima fase até o limite da Fase 4', () => {
    const h = createDevToolsHarness('advance-next');

    expect(h.controller.getCurrentPhaseId()).toBe(1);
    expect(h.controller.advanceToNextPhase().toPhaseId).toBe(2);

    expect(h.controller.advanceToNextPhase().toPhaseId).toBe(3);
    expect(h.phaseSystem.isAntRainPhase()).toBe(false);

    expect(h.controller.advanceToNextPhase().toPhaseId).toBe(4);
    expect(h.phaseSystem.isAntRainPhase()).toBe(true);

    // Na Fase 4 não há próxima fase
    expect(h.controller.getSnapshot().canAdvance).toBe(false);
    expect(h.controller.advanceToNextPhase()).toBeNull();
    expect(h.controller.getCurrentPhaseId()).toBe(4);
  });

  it('ativa/desativa progressão automática avançando exatamente a cada 25 inimigos simulados', () => {
    const h = createDevToolsHarness('auto-progression');

    expect(h.controller.autoProgressionEnabled).toBe(false);
    h.controller.setAutoProgression(true);
    expect(h.controller.autoProgressionEnabled).toBe(true);

    // 24 inimigos simulados ainda permanecem na Fase 1
    const beforeThreshold = h.controller.update(
      24 * DEV_TOOLS_CONFIG.SIMULATED_ENEMY_INTERVAL_MS
    );
    expect(beforeThreshold).toBeNull();
    expect(h.controller.getCurrentPhaseId()).toBe(1);
    expect(h.controller.getSnapshot().simulatedEnemiesInStep).toBe(24);

    // 25º inimigo simulado dispara transição para a Fase 2
    const at25 = h.controller.update(DEV_TOOLS_CONFIG.SIMULATED_ENEMY_INTERVAL_MS);
    expect(at25?.toPhaseId).toBe(2);
    expect(h.controller.getCurrentPhaseId()).toBe(2);
    expect(h.upgradeSystem.getAcquiredUpgrades()).toHaveLength(1);

    // Desativar interrompe a contagem simulada
    h.controller.toggleAutoProgression();
    expect(h.controller.autoProgressionEnabled).toBe(false);
    h.controller.update(50 * DEV_TOOLS_CONFIG.SIMULATED_ENEMY_INTERVAL_MS);
    expect(h.controller.getCurrentPhaseId()).toBe(2);

    // Reativar e simular mais 50 inimigos (25 -> Fase 3, +25 -> Fase 4 e desliga ao atingir o teto)
    h.controller.toggleAutoProgression();
    h.controller.simulateEnemies(PHASE_CONFIG.KILLS_PER_PHASE * 2);
    expect(h.controller.getCurrentPhaseId()).toBe(4);
    expect(h.upgradeSystem.getAcquiredUpgrades()).toHaveLength(3);
    expect(h.controller.autoProgressionEnabled).toBe(false);
  });

  it('integra os controles interativos na modal existente da MainScene (12345)', () => {
    const scene = new MainScene();
    scene.isDevToolsAvailable = true;
    scene.logicalWidth = 960;
    scene.logicalHeight = 540;
    scene.baseRunSeed = 'modal-ui-seed';
    scene.runEnded = false;
    scene.enemies = [];
    scene.drinks = [];

    const playerState = new PlayerState(getCharacterById('acougue'));
    scene.player = {
      cheatMode: false,
      state: playerState,
      body: { x: 220, y: 440, width: 32, height: 60, setVelocity: vi.fn(), setVelocityY: vi.fn() },
      setCheatMode(v) {
        this.cheatMode = v;
        playerState.setCheatMode(v);
      },
      setIntroWalk: vi.fn(),
      setDrinkAuraColor: vi.fn(),
      setPowerMode: vi.fn(),
      syncVisualToBody: vi.fn(),
      syncBodyScale: vi.fn(),
      setAppearanceState: vi.fn(),
      getCombatOrigin: () => ({ x: 236, y: 470 }),
    };

    scene.difficultySystem = new DifficultySystem();
    scene.phaseSystem = new PhaseSystem();
    scene.spawnSystem = new SpawnSystem({ seed: 'modal-ui-seed' });
    scene.trackSystem = new HorizontalTrackSystem({ seed: 'modal-ui-seed' });
    scene.trackSystem.ensureChunksAround(240, 0);
    scene.drinkSystem = new DrinkSystem({ seed: 'modal-ui-drinks' });
    scene.drinkEffectManager = new DrinkEffectManager();
    scene.appearanceSystem = new CharacterAppearanceSystem();
    scene.upgradeSystem = new UpgradeSystem({
      seed: 'modal-ui-upgrades',
      onUpgradesChanged: (u) => scene._handleUpgradesChanged(u),
    });
    scene.shopSystem = new ShopSystem({
      upgradeSystem: scene.upgradeSystem,
      difficultySystem: scene.difficultySystem,
    });
    scene.runManager = new RunManager({ seed: 'modal-ui-seed' });
    scene.antManager = {
      startRain: vi.fn(),
      stopRain: vi.fn(),
    };
    scene.parallaxBackdrop = { setStageIndex: vi.fn(), setVisible: vi.fn() };
    scene.hud = {
      setDrinkTimersVisible: vi.fn(),
      update: vi.fn(),
      updateBossStatus: vi.fn(),
    };
    scene.abilityHud = { setPhase: vi.fn() };
    scene.drunkEffect = { setSuppressed: vi.fn() };
    scene.musicDirector = { startDefault: vi.fn(), endBossMusic: vi.fn() };
    scene.audio = { play: vi.fn() };
    scene.groundCollidersById = new Map();
    scene.platformCollidersById = new Map();
    scene.platforms = { add: vi.fn(), remove: vi.fn(), clear: vi.fn() };
    scene.movingPlatforms = { add: vi.fn(), remove: vi.fn(), clear: vi.fn() };
    scene.physics = {
      world: { gravity: { y: 900 }, pause: vi.fn(), resume: vi.fn() },
      add: {
        existing: (obj) => {
          obj.body = {
            x: 0,
            y: 0,
            halfWidth: 20,
            halfHeight: 10,
            enable: true,
            checkCollision: { up: true, down: true, left: true, right: true },
            setAllowGravity: vi.fn(),
            setImmovable: vi.fn(),
            setFriction: vi.fn(),
            setVelocity: vi.fn(),
          };
          return obj;
        },
      },
    };
    scene.time = { paused: false };
    scene.generatePlatforms = vi.fn(() => scene.trackSystem.getActiveLayout());

    const createdObjects = [];
    const makeInteractiveNode = (extra = {}) => {
      const handlers = {};
      const node = {
        ...extra,
        handlers,
        setDepth() {
          return this;
        },
        setScrollFactor() {
          return this;
        },
        setStrokeStyle: vi.fn(function () {
          return this;
        }),
        setFillStyle: vi.fn(function () {
          return this;
        }),
        setInteractive() {
          return this;
        },
        setOrigin() {
          return this;
        },
        setColor: vi.fn(function () {
          return this;
        }),
        setText: vi.fn(function (t) {
          this.text = t;
          return this;
        }),
        on(ev, fn) {
          handlers[ev] = fn;
          return this;
        },
        destroy: vi.fn(),
      };
      createdObjects.push(node);
      return node;
    };

    scene.add = {
      container: () => ({
        children: [],
        setDepth() {
          return this;
        },
        setScrollFactor() {
          return this;
        },
        add(items) {
          this.children.push(...items);
          return this;
        },
        destroy: vi.fn(),
      }),
      rectangle: () => makeInteractiveNode({ kind: 'rect' }),
      text: (_x, _y, text) => makeInteractiveNode({ kind: 'text', text }),
    };

    scene.devToolsController = new DevToolsController({
      phaseSystem: scene.phaseSystem,
      difficultySystem: scene.difficultySystem,
      shopSystem: scene.shopSystem,
      spawnSystem: scene.spawnSystem,
      trackSystem: scene.trackSystem,
      drinkSystem: scene.drinkSystem,
      drinkEffectManager: scene.drinkEffectManager,
      upgradeSystem: scene.upgradeSystem,
      runManager: scene.runManager,
      antManager: scene.antManager,
      getPlayerState: () => scene.player.state,
      onPhaseApplied: (res) => scene._applyDevToolsPhaseChange(res),
    });

    // Abre pela ação da sequência 12345
    scene._toggleCheatMode();
    expect(scene.secretModeModalOpen).toBe(true);
    expect(scene.player.cheatMode).toBe(true);

    // Dispara clique em "FASE 3" diretamente na modal
    const phase3LabelIndex = createdObjects.findIndex(
      (o) => o.kind === 'text' && o.text === 'FASE 3'
    );
    const phase3Rect = createdObjects[phase3LabelIndex - 1];
    phase3Rect.handlers.pointerup();

    expect(scene.phaseSystem.currentPhaseId).toBe(3);
    expect(scene.trackSystem.getActiveLayout().perspective).toBe('side_2d');
    expect(scene.parallaxBackdrop.setStageIndex).toHaveBeenCalledWith(2);
    expect(scene.antManager.stopRain).toHaveBeenCalled();

    // Dispara clique em "AVANÇAR PRÓXIMA FASE" -> Fase 4 (ativa chuva de formigas)
    const nextLabelIndex = createdObjects.findIndex(
      (o) => o.kind === 'text' && o.text === 'AVANÇAR PRÓXIMA FASE'
    );
    const nextRect = createdObjects[nextLabelIndex - 1];
    nextRect.handlers.pointerup();

    expect(scene.phaseSystem.currentPhaseId).toBe(4);
    expect(scene.antManager.startRain).toHaveBeenCalled();
    expect(scene.upgradeSystem.getAcquiredUpgrades()).toHaveLength(3);

    // Fecha modal e retoma mundo físico
    scene._closeSecretModeModal();
    expect(scene.secretModeModalOpen).toBe(false);
    expect(scene.physics.world.resume).toHaveBeenCalled();
  });
});
