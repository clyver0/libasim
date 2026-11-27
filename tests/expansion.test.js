import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(function (options) {
    this.options = options;
    this._vol = options?.volume ?? 1;
    this.playing = false;
    this.play = vi.fn(() => {
      this.playing = true;
      return 1;
    });
    this.stop = vi.fn(() => {
      this.playing = false;
    });
    this.fade = vi.fn();
    this._rate = 1;
    this.rate = vi.fn((v) => {
      if (typeof v === 'number') this._rate = v;
      return this._rate;
    });
    this.volume = vi.fn((v) => {
      if (typeof v === 'number') this._vol = v;
      return this._vol;
    });
  }),
  Howler: {
    volume: vi.fn(),
    mute: vi.fn(),
  },
}));

vi.mock('phaser', () => ({
  default: {},
}));

import { AudioManager } from '../src/audio/AudioManager.js';
import { MusicDirector } from '../src/audio/MusicDirector.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../src/audio/SoundBank.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { DRINK_CONFIG } from '../src/constants/drinks.js';
import { ANT_CONFIG, DRUNK_FX_CONFIG, PHASE_CONFIG } from '../src/constants/expansion.js';
import { PHYSICS } from '../src/constants/physics.js';
import { ABILITIES } from '../src/data/abilities.js';
import { CHARACTERS, getCharacterById } from '../src/data/characters.js';
import { DRINKS, getDrinkById } from '../src/data/drinks.js';
import { ENEMY_TYPES, pickEnemyTypeForProgress } from '../src/data/enemies.js';
import { BOSS_MUSIC_BY_BOSS_ID, MUSIC_TRACKS } from '../src/data/music.js';
import { getUpgradeById } from '../src/data/upgrades.js';
import { decideAntMove } from '../src/entities/Ant.js';
import { Drink } from '../src/entities/Drink.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Player } from '../src/entities/Player.js';
import { PlayerState } from '../src/entities/PlayerState.js';
import { AbilityRuntime } from '../src/systems/AbilityRuntime.js';
import { AntManager } from '../src/systems/AntManager.js';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';
import { DrinkEffectManager } from '../src/systems/DrinkEffectManager.js';
import { DrinkSystem } from '../src/systems/DrinkSystem.js';
import { computeDrunkIntensity } from '../src/systems/DrunkIntensity.js';
import { KeySequenceDetector } from '../src/systems/KeySequenceDetector.js';
import { configureOneWayPlatform } from '../src/systems/PlatformCollision.js';
import { PhaseSystem } from '../src/systems/PhaseSystem.js';
import { SpecialAbilitySystem } from '../src/systems/SpecialAbilitySystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';
import { DrunkEffect } from '../src/ui/DrunkEffect.js';
import { EffectsManager } from '../src/ui/EffectsManager.js';
import { ShopUI } from '../src/ui/ShopUI.js';

function createMockScene() {
  const listeners = new Map();
  const makeGraphics = (x = 0, y = 0) => ({
    x,
    y,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    destroyed: false,
    clear: vi.fn(),
    fillStyle: vi.fn(),
    lineStyle: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
    fillEllipse: vi.fn(),
    strokeEllipse: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRoundedRect: vi.fn(),
    strokeRoundedRect: vi.fn(),
    fillTriangle: vi.fn(),
    lineBetween: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    strokePath: vi.fn(),
    setDepth: vi.fn(function () {
      return this;
    }),
    setPosition(nx, ny) {
      this.x = nx;
      this.y = ny;
      return this;
    },
    setScale(sx, sy = sx) {
      this.scale = sx;
      this.scaleX = sx;
      this.scaleY = sy;
      return this;
    },
    setRotation(r) {
      this.rotation = r;
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  });

  return {
    logicalWidth: 960,
    logicalHeight: 540,
    events: {
      on(ev, fn) {
        if (!listeners.has(ev)) listeners.set(ev, new Set());
        listeners.get(ev).add(fn);
      },
      off(ev, fn) {
        listeners.get(ev)?.delete(fn);
      },
      emit(ev, payload) {
        for (const fn of listeners.get(ev) ?? []) fn(payload);
      },
    },
    add: {
      rectangle(x, y, width, height) {
        return {
          x,
          y,
          width,
          height,
          destroyed: false,
          setSize(w, h) {
            this.width = w;
            this.height = h;
          },
          destroy() {
            this.destroyed = true;
          },
        };
      },
      graphics({ x = 0, y = 0 } = {}) {
        return makeGraphics(x, y);
      },
    },
    physics: {
      add: {
        existing(obj) {
          const w = obj.width ?? 24;
          const h = obj.height ?? 56;
          obj.body = {
            x: obj.x - w / 2,
            y: obj.y - h / 2,
            width: w,
            height: h,
            halfWidth: w / 2,
            halfHeight: h / 2,
            velocity: { x: 0, y: 0 },
            gravity: { x: 0, y: 0 },
            bounce: { x: 0, y: 0 },
            allowGravity: true,
            enable: true,
            blocked: { down: true, left: false, right: false },
            touching: { down: true },
            setCollideWorldBounds: vi.fn(),
            setAllowGravity(v) {
              this.allowGravity = Boolean(v);
            },
            setGravityY(gy) {
              this.gravity.y = gy;
            },
            setBounce(bx, by = bx) {
              this.bounce.x = bx;
              this.bounce.y = by;
            },
            setBounceY(by) {
              this.bounce.y = by;
            },
            setMaxVelocity: vi.fn(),
            setDragX: vi.fn(),
            setSize(nw, nh) {
              this.width = nw;
              this.height = nh;
              this.halfWidth = nw / 2;
              this.halfHeight = nh / 2;
            },
            setVelocity(vx, vy) {
              this.velocity.x = vx;
              this.velocity.y = vy;
            },
            setVelocityX(vx) {
              this.velocity.x = vx;
            },
            setVelocityY(vy) {
              this.velocity.y = vy;
            },
          };
        },
        collider: vi.fn(),
      },
    },
  };
}

describe('Expansão — Personagens, Habilidades, Bebidas, Fases, Formigas, Efeitos e Áudio', () => {
  it('exige 10 abates para carregar todas as habilidades especiais', () => {
    for (const ability of Object.values(ABILITIES)) {
      expect(ability.chargeType).toBe('kills');
      expect(ability.killsRequired).toBe(10);
    }
  });

  it('1. define Açougue, Piri e Tonegi com atributos, tamanhos e identidades distintas', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(['acougue', 'piri', 'tonegi']);

    const acougue = new PlayerState(getCharacterById('acougue'));
    const piri = new PlayerState(getCharacterById('piri'));
    const tonegi = new PlayerState(getCharacterById('tonegi'));

    // Tamanhos: Açougue muito grande > Piri médio/grande > Tonegi muito pequeno
    expect(acougue.gameplayModifiers.bodyScale).toBeGreaterThan(piri.gameplayModifiers.bodyScale);
    expect(piri.gameplayModifiers.bodyScale).toBeGreaterThan(1);
    expect(tonegi.gameplayModifiers.bodyScale).toBeLessThan(0.8);

    // Velocidades: Tonegi rápido > Piri lento > Açougue muito lento
    expect(tonegi.gameplayModifiers.moveSpeedMultiplier).toBeGreaterThan(
      piri.gameplayModifiers.moveSpeedMultiplier
    );
    expect(piri.gameplayModifiers.moveSpeedMultiplier).toBeGreaterThan(
      acougue.gameplayModifiers.moveSpeedMultiplier
    );

    // Força: Piri e Tonegi muito fortes, Açougue relativamente forte
    expect(piri.effectiveStats.strength).toBeGreaterThan(acougue.effectiveStats.strength);
    expect(tonegi.effectiveStats.strength).toBeGreaterThan(acougue.effectiveStats.strength);

    // Resistência a bebidas: Açougue e Piri muito resistentes, Tonegi pouquíssima resistência
    expect(acougue.effectiveStats.drinkResistance).toBeGreaterThan(1.5);
    expect(piri.effectiveStats.drinkResistance).toBeGreaterThan(1.5);
    expect(tonegi.effectiveStats.drinkResistance).toBeLessThan(0.6);
    expect(tonegi.antImmunity).toBe(true);
    expect(acougue.antImmunity).toBe(false);
    expect(piri.antImmunity).toBe(false);
  });

  it('2. acumula Cantinhos do Vale no Açougue em multiplicadores lineares até 10x e expira cada timer', () => {
    const acougueState = new PlayerState(getCharacterById('acougue'));
    const manager = new DrinkEffectManager();
    const cantinho = getDrinkById('cantinho_do_vale');

    const baseStrength = acougueState.effectiveStats.strength;
    const first = manager.applyDrink(cantinho, acougueState);

    expect(first.effect.synergy).toBe(true);
    expect(acougueState.effectiveStats.strength).toBe(baseStrength * 2);

    // Cada coleta mantém seu próprio timer e soma uma unidade ao multiplicador.
    const second = manager.applyDrink(cantinho, acougueState);
    expect(second.refreshed).toBe(false);
    expect(manager.getActiveEffects()).toHaveLength(2);
    expect(acougueState.effectiveStats.strength).toBe(baseStrength * 3);

    const third = manager.applyDrink(cantinho, acougueState);
    expect(acougueState.effectiveStats.strength).toBe(baseStrength * 4);

    for (let stack = 4; stack <= 9; stack += 1) {
      manager.applyDrink(cantinho, acougueState);
    }
    expect(acougueState.effectiveStats.strength).toBe(baseStrength * 10);
    manager.applyDrink(cantinho, acougueState);
    expect(acougueState.effectiveStats.strength).toBe(baseStrength * 10);

    const firstStackRemainingMs = first.effect.durationMs;
    manager.update(firstStackRemainingMs + 1, acougueState);
    const activeStacks = manager.getActiveEffects();
    expect(activeStacks.some((effect) => effect.instanceId === first.effect.instanceId)).toBe(false);
    expect(activeStacks.length).toBeGreaterThan(0);
    expect(acougueState.effectiveStats.strength).toBe(
      baseStrength * (1 + Math.min(activeStacks.length, 10))
    );

    // Em Piri (sem sinergia), Cantinho aplica o bônus padrão (+2) sem dobrar
    const piriState = new PlayerState(getCharacterById('piri'));
    const piriBase = piriState.effectiveStats.strength;
    const piriManager = new DrinkEffectManager();
    const piriRes = piriManager.applyDrink(cantinho, piriState);
    expect(piriRes.effect.synergy).toBe(false);
    expect(piriState.effectiveStats.strength).toBe(piriBase + 2);
  });

  it('3. controla Terça do Cantinho (Açougue): chuva de Cantinhos configurável, sem invulnerabilidade, encerramento limpo', () => {
    const scene = createMockScene();
    const player = new Player(scene, 480, 440, getCharacterById('acougue'));
    const spawned = [];
    const runtime = new AbilityRuntime({
      scene,
      player,
      spawnDrink: (req) => spawned.push(req),
      random: () => 0.5,
    });

    // Nove abates ainda não carregam a habilidade.
    expect(runtime.tryActivate()).toBe(false);
    for (let i = 0; i < 9; i += 1) runtime.registerKill();
    expect(runtime.system.isReady()).toBe(false);
    runtime.registerKill();
    expect(runtime.system.isReady()).toBe(true);

    expect(runtime.tryActivate()).toBe(true);
    expect(player.isInvulnerable()).toBe(false);

    // Avança durante a chuva
    for (let t = 0; t < 1500; t += 100) {
      runtime.update(100);
    }
    expect(spawned.length).toBeGreaterThanOrEqual(4);
    expect(spawned.every((d) => d.drinkData.id === 'cantinho_do_vale')).toBe(true);

    // Encerra ao completar duração
    runtime.update(ABILITIES.terca_do_cantinho.durationMs);
    expect(runtime.isActive()).toBe(false);
  });

  it('4. controla O fit se calou (Piri): carrega com 10 kills, carro invulnerável/rápido atropela e encerra corretamente', () => {
    const scene = createMockScene();
    const player = new Player(scene, 300, 440, getCharacterById('piri'));
    const enemy = new Enemy(scene, 330, 440, ENEMY_TYPES[0], { id: 'e1' });
    const initialHp = enemy.state.currentHp;

    const runtime = new AbilityRuntime({
      scene,
      player,
      getTargets: () => [enemy],
    });

    // 9 abates ainda não liberam
    for (let i = 0; i < 9; i += 1) {
      runtime.registerKill();
    }
    expect(runtime.system.isReady()).toBe(false);
    expect(runtime.tryActivate()).toBe(false);

    // 10º abate libera
    runtime.registerKill();
    expect(runtime.system.isReady()).toBe(true);
    expect(runtime.tryActivate()).toBe(true);

    expect(player.isInvulnerable()).toBe(true);
    expect(player.abilityForm).toBe('car');
    expect(player.abilityMoveSpeed).toBe(ABILITIES.o_fit_se_calou.moveSpeed);

    // Atropela o inimigo no caminho
    let ramBounds = null;
    const resolveHits = CombatSystem.resolveHits;
    CombatSystem.resolveHits = (options) => {
      ramBounds = options.hitboxBounds;
      return resolveHits(options);
    };
    try {
      runtime.update(16);
    } finally {
      CombatSystem.resolveHits = resolveHits;
    }
    expect(ramBounds.height).toBe(ABILITIES.o_fit_se_calou.ram.height);
    expect(ramBounds.y).toBeCloseTo(
      player.getCombatOrigin().y +
        ABILITIES.o_fit_se_calou.ram.offsetY -
        ABILITIES.o_fit_se_calou.ram.height / 2
    );
    expect(enemy.state.currentHp).toBeLessThan(initialHp);

    // Abates durante o carro não recarregam para invulnerabilidade infinita
    expect(runtime.registerKill()).toBe(false);

    // Ao encerrar a duração, invulnerabilidade, velocidade e forma são revertidas
    runtime.update(ABILITIES.o_fit_se_calou.durationMs + 50);
    expect(runtime.isActive()).toBe(false);
    expect(player.isInvulnerable()).toBe(false);
    expect(player.abilityForm).toBeNull();
    expect(player.abilityMoveSpeed).toBeNull();
    expect(runtime.getSnapshot().kills).toBe(0);
  });

  it('5. controla Pisa ligeiro (Tonegi): encolhe, acelera, fica invulnerável, cria formigas auxiliares que atacam e destrói ao fim', () => {
    const scene = createMockScene();
    const player = new Player(scene, 200, 440, getCharacterById('tonegi'));
    const normalHeight = player.body.height;
    const antManager = new AntManager({ scene, random: () => 0.5 });
    const enemy = new Enemy(scene, 210, 440, ENEMY_TYPES[0], { id: 'e_ant' });
    const enemyStartHp = enemy.state.currentHp;

    const runtime = new AbilityRuntime({
      scene,
      player,
      antManager,
      random: () => 0.5,
    });

    const feetBefore = player.body.y + player.body.height;
    for (let i = 0; i < 10; i += 1) runtime.registerKill();
    expect(runtime.tryActivate()).toBe(true);
    expect(player.isInvulnerable()).toBe(true);
    expect(player.abilityForm).toBe('ant');
    expect(player.body.height).toBeLessThan(normalHeight);
    expect(player.body.y + player.body.height).toBeCloseTo(feetBefore);
    expect(
      player.visual.y +
        player.visual.scaleY * player._getVisualFootOffset()
    ).toBeCloseTo(feetBefore);
    expect(player.abilityMoveSpeed).toBeGreaterThan(
      PHYSICS.PLAYER_MOVE_SPEED * player.state.multipliers.moveSpeed
    );

    // Cria formigas auxiliares e elas localizam e causam dano ao inimigo
    for (let i = 0; i < 12; i += 1) {
      runtime.update(150);
      antManager.update(150, {
        player,
        allyTargets: [enemy],
        ownerStrength: player.state.effectiveStats.strength,
      });
    }
    expect(antManager.allies.length).toBeGreaterThan(0);
    expect(antManager.allies.length).toBeLessThanOrEqual(
      ABILITIES.pisa_ligeiro.helpers.maxActive
    );
    expect(enemy.state.currentHp).toBeLessThan(enemyStartHp);

    // Ao encerrar habilidade, reverte tamanho/invulnerabilidade e destrói formigas auxiliares
    runtime.update(ABILITIES.pisa_ligeiro.durationMs + 50);
    expect(runtime.isActive()).toBe(false);
    expect(player.isInvulnerable()).toBe(false);
    expect(player.abilityForm).toBeNull();
    expect(player.body.height).toBe(normalHeight);
    expect(antManager.allies.length).toBe(0);
  });

  it('6. calcula intensidade da embriaguez por raridade/duração, permite reduzir/desligar e restaura câmera no teardown', () => {
    const rankByDrinkId = Object.fromEntries(DRINKS.map((d) => [d.id, d.rarityRank]));
    const rarestDrinkId = DRINKS[DRINKS.length - 1].id;
    const weak = computeDrunkIntensity(
      [{ drinkId: 'cantinho_do_vale', durationMs: 8000, remainingMs: 8000 }],
      { rankByDrinkId }
    );
    const strong = computeDrunkIntensity(
      [{ drinkId: rarestDrinkId, durationMs: 8000, remainingMs: 8000 }],
      { rankByDrinkId }
    );
    const fading = computeDrunkIntensity(
      [{ drinkId: rarestDrinkId, durationMs: 8000, remainingMs: 500 }],
      { rankByDrinkId }
    );
    const off = computeDrunkIntensity(
      [{ drinkId: rarestDrinkId, durationMs: 8000, remainingMs: 8000 }],
      { rankByDrinkId, levelScale: 0 }
    );

    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(fading);
    expect(off).toBe(0);
    expect(computeDrunkIntensity([], { rankByDrinkId })).toBe(0);

    // Ciclo de níveis e teardown limpo
    const mockCam = { setRotation: vi.fn(), postFX: null };
    const drunkFx = new DrunkEffect({ cameras: { main: mockCam } }, DRUNK_FX_CONFIG);
    expect(drunkFx.getLevelScale()).toBe(1);
    expect(drunkFx.cycleLevel()).toBe(0.5);
    expect(drunkFx.cycleLevel()).toBe(0.25);
    expect(drunkFx.cycleLevel()).toBe(0);
    expect(drunkFx.getLevelLabel()).toBe('OFF');
    drunkFx.teardown();
    expect(mockCam.setRotation).toHaveBeenCalledWith(0);

    drunkFx.supported = true;
    drunkFx._setup = vi.fn(() => {
      drunkFx.active = true;
    });
    drunkFx.setSuppressed(true);
    expect(drunkFx.update(16, 1)).toBe(0);
    drunkFx.setSuppressed(false);
    expect(drunkFx.update(16, 1)).toBeGreaterThan(0);
  });

  it('7. reduz frequência de spawn das bebidas, acelera queda e aplica gravidade/quique mantendo coleta intacta', () => {
    expect(DRINK_CONFIG.SPAWN_INTERVAL_MS).toBeGreaterThanOrEqual(14000);
    expect(DRINK_CONFIG.FALL_SPEED).toBeGreaterThanOrEqual(250);
    expect(DRINK_CONFIG.BOUNCE).toBeGreaterThan(0.3);

    const scene = createMockScene();
    const bouncedEvents = [];
    scene.events.on('drink:bounce', (e) => bouncedEvents.push(e));

    const drink = new Drink(scene, 200, 24, getDrinkById('cerveja'));
    expect(drink.body.allowGravity).toBe(true);
    expect(drink.body.bounce.y).toBe(DRINK_CONFIG.BOUNCE);

    // Simula queda rápida seguida de quique (inversão de velocidade vertical)
    drink.body.velocity.y = 350;
    drink.update(16, 540);
    drink.body.velocity.y = -180;
    drink.update(16, 540);
    expect(bouncedEvents.length).toBe(1);
    expect(drink.squashTimerMs).toBeGreaterThan(0);

    // Coleta continua funcionando normalmente via DrinkSystem
    const drinkSystem = new DrinkSystem({ seed: 42 });
    const effectManager = new DrinkEffectManager();
    const playerState = new PlayerState(getCharacterById('piri'));
    const collected = drinkSystem.collectDrink(drink, playerState, effectManager);
    expect(collected).not.toBeNull();
    expect(drink.collected).toBe(true);
  });

  it('dobra a altura visual e preserva a proporção dos sprites fotográficos', () => {
    const scene = createMockScene();
    const drinkData = getDrinkById('cerveja');
    const sprite = {
      scaleX: 1,
      scaleY: 1,
      setDepth: vi.fn(function () {
        return this;
      }),
      setDisplaySize: vi.fn(function (width, height) {
        this.scaleX = width / 400;
        this.scaleY = height / 800;
        return this;
      }),
      setPosition: vi.fn(function () {
        return this;
      }),
      setScale: vi.fn(function (scaleX, scaleY = scaleX) {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        return this;
      }),
      setRotation: vi.fn(function () {
        return this;
      }),
      destroy: vi.fn(),
    };
    scene.textures = {
      exists: vi.fn((key) => key === drinkData.spriteKey),
      get: vi.fn(() => ({
        getSourceImage: () => ({ width: 400, height: 800 }),
      })),
    };
    scene.add.image = vi.fn(() => sprite);

    for (const drink of DRINKS) {
      if (drink.spriteKey && drink.spriteFile) {
        expect(
          fs.existsSync(path.resolve('public', 'drinks', drink.spriteFile))
        ).toBe(true);
      } else if (drink.instantOnly) {
        expect(drink.id).toBe('agua');
      } else {
        expect(drink.isSpecial).toBe(true);
      }
    }

    const entity = new Drink(scene, 200, 24, drinkData);
    expect(scene.add.image).toHaveBeenCalledWith(
      200,
      24,
      drinkData.spriteKey
    );
    expect(sprite.setDisplaySize).toHaveBeenCalledWith(
      (DRINK_CONFIG.BODY_HEIGHT * DRINK_CONFIG.VISUAL_SCALE) / 2,
      DRINK_CONFIG.BODY_HEIGHT * DRINK_CONFIG.VISUAL_SCALE
    );
    entity.syncVisualToBody();
    expect(sprite.scaleX).toBeCloseTo(
      (DRINK_CONFIG.BODY_HEIGHT * DRINK_CONFIG.VISUAL_SCALE) / 800
    );
    expect(sprite.scaleY).toBeCloseTo(
      (DRINK_CONFIG.BODY_HEIGHT * DRINK_CONFIG.VISUAL_SCALE) / 800
    );

    entity.destroy();
    expect(sprite.destroy).toHaveBeenCalledOnce();
  });

  it('destaca a Caseirinha da Casa com aura pulsante sem exigir sprite fotográfico', () => {
    const scene = createMockScene();
    const drink = new Drink(
      scene,
      240,
      30,
      getDrinkById('caseirinha_da_casa')
    );

    expect(drink.specialAura).toBeTruthy();
    scene.events.emit('postupdate');
    expect(drink.specialAura.strokeCircle).toHaveBeenCalled();
    expect(drink.visual.scaleY).toBe(DRINK_CONFIG.VISUAL_SCALE);
    expect(drink.specialAura.scaleY).toBe(DRINK_CONFIG.VISUAL_SCALE);
    drink.destroy();
    expect(drink.specialAura.destroyed).toBe(true);
  });

  it('usa o fundo de tela cheia correspondente em cada loja', () => {
    const makeDisplay = () => ({
      setDepth: vi.fn(function () { return this; }),
      setVisible: vi.fn(function () { return this; }),
      setDisplaySize: vi.fn(function () { return this; }),
      setScale: vi.fn(function () { return this; }),
      setStrokeStyle: vi.fn(function () { return this; }),
      setFillStyle: vi.fn(function () { return this; }),
      setText: vi.fn(function () { return this; }),
      setColor: vi.fn(function () { return this; }),
      setOrigin: vi.fn(function () { return this; }),
      setInteractive: vi.fn(function () { return this; }),
      setPosition: vi.fn(function () { return this; }),
      add: vi.fn(function () { return this; }),
      removeAll: vi.fn(function () { return this; }),
      disableInteractive: vi.fn(function () { return this; }),
      on: vi.fn(function () { return this; }),
      destroy: vi.fn(),
    });
    const scene = {
      textures: {
        get: vi.fn((key) => ({
          getSourceImage: () =>
            key === 'shop_chiquinho_promos'
              ? { width: 512, height: 512 }
              : { width: 768, height: 768 },
        })),
      },
      add: {
        container: vi.fn(makeDisplay),
        rectangle: vi.fn(makeDisplay),
        image: vi.fn(makeDisplay),
        text: vi.fn(makeDisplay),
      },
    };
    const shopUI = new ShopUI(scene);
    const officialArtwork = scene.add.image.mock.results[0].value;
    const noiaArtwork = scene.add.image.mock.results[1].value;
    const theme = {
      title: 'Chiquinho Promos',
      subtitle: 'Escolha um upgrade',
      accentColor: 0x38bdf8,
      accentHex: '#38bdf8',
      panelBg: 0x0f172a,
    };

    shopUI.open({ theme: { ...theme, id: 'official' }, options: [] });
    expect(officialArtwork.setVisible).toHaveBeenLastCalledWith(true);
    expect(noiaArtwork.setVisible).toHaveBeenLastCalledWith(false);
    expect(officialArtwork.setScale).toHaveBeenCalledWith(960 / 512);
    expect(shopUI.cardsContainer.setPosition).toHaveBeenLastCalledWith(0, 16);

    shopUI.open({ theme: { ...theme, id: 'special' }, options: [] });
    expect(officialArtwork.setVisible).toHaveBeenLastCalledWith(false);
    expect(noiaArtwork.setVisible).toHaveBeenLastCalledWith(true);
    expect(noiaArtwork.setScale).toHaveBeenCalledWith(960 / 768);
    expect(shopUI.cardsContainer.setPosition).toHaveBeenLastCalledWith(0, 16);
    expect(
      fs.existsSync(path.resolve('public', 'backgrounds', 'chiquinho-promos-shop.png'))
    ).toBe(true);
    expect(
      fs.existsSync(path.resolve('public', 'backgrounds', 'noia-shop.png'))
    ).toBe(true);
    shopUI.destroy();
  });

  it('8. avança as 4 fases a cada 25 abates, amplia variedade de inimigos e escala loja × fase', () => {
    const transitions = [];
    const phases = new PhaseSystem({ onPhaseChanged: (t) => transitions.push(t) });

    expect(phases.getPhaseIdForKills(0)).toBe(1);
    expect(phases.getPhaseIdForKills(24)).toBe(1);
    expect(phases.getPhaseIdForKills(25)).toBe(2);
    expect(phases.getPhaseIdForKills(49)).toBe(2);
    expect(phases.getPhaseIdForKills(50)).toBe(3);
    expect(phases.getPhaseIdForKills(74)).toBe(3);
    expect(phases.getPhaseIdForKills(75)).toBe(4);
    expect(phases.getPhaseIdForKills(99)).toBe(4);

    phases.update(25);
    phases.update(50);
    phases.update(75);
    expect(transitions.map((t) => t.to)).toEqual([2, 3, 4]);
    expect(phases.isAntRainPhase()).toBe(true);

    // Variedade crescente por fase
    const countUnlocked = (kills) =>
      ENEMY_TYPES.filter((e) => kills >= (e.unlockAtDefeated ?? 0)).length;
    expect(countUnlocked(0)).toBeLessThan(countUnlocked(25));
    expect(countUnlocked(25)).toBeLessThan(countUnlocked(50));
    expect(countUnlocked(50)).toBeLessThan(countUnlocked(75));
    expect(ENEMY_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(pickEnemyTypeForProgress(85)).toBeDefined();

    // Escalonamento combinado (DifficultySystem + PhaseSystem) e ajuste de inimigo ativo
    const difficulty = new DifficultySystem();
    difficulty.registerOfficialShopVisit();
    const shopScaled = difficulty.scaleEnemyData(ENEMY_TYPES[0]);
    const phaseScaled = phases.scaleEnemyData(shopScaled);
    expect(phaseScaled.scaledStats.maxHp).toBeGreaterThan(shopScaled.scaledStats.maxHp);
    expect(phaseScaled.scaledStats.strength).toBeGreaterThan(shopScaled.scaledStats.strength);

    const scene = createMockScene();
    const activeEnemy = new Enemy(scene, 400, 440, shopScaled, { id: 'e_active' });
    const beforeHp = activeEnemy.state.maxHp;
    phases.upgradeExistingEnemy(activeEnemy, 1, 2);
    expect(activeEnemy.state.maxHp).toBeGreaterThan(beforeHp);
  });

  it('9. executa chuva de formigas na Fase 4 com teto de entidades e imunidade letal do Tonegi', () => {
    const scene = createMockScene();
    const tonegi = new Player(scene, 300, 440, getCharacterById('tonegi'));
    const piri = new Player(scene, 300, 440, getCharacterById('piri'));
    const squished = [];

    const ants = new AntManager({
      scene,
      random: () => 0.5,
      onAntSquished: (ant) => squished.push(ant.id),
    });

    ants.startRain();
    // Garante limite máximo de formigas simultâneas mesmo com muitos updates
    for (let i = 0; i < 30; i += 1) {
      ants.update(ANT_CONFIG.HOSTILE.SPAWN_INTERVAL_MS, { player: tonegi });
    }
    expect(ants.hostile.length).toBeLessThanOrEqual(ANT_CONFIG.HOSTILE.MAX_ACTIVE);

    // Coloca uma formiga hostil sobre o Tonegi (SEM habilidade ativa): zero dano e formiga morre!
    const tonegiHpBefore = tonegi.state.currentHp;
    const antOnTonegi = ants.spawnHostile(300);
    if (antOnTonegi) {
      antOnTonegi.body.x = tonegi.body.x;
      antOnTonegi.body.y = tonegi.body.y;
      ants.update(16, { player: tonegi });
      expect(tonegi.state.currentHp).toBe(tonegiHpBefore);
      expect(antOnTonegi.isDead()).toBe(true);
      expect(antOnTonegi.deathReason).toBe('squished');
      expect(squished).toContain(antOnTonegi.id);
    }

    // Contra Piri, a formiga causa dano baixo normalmente e sobrevive
    ants.clearHostile();
    const piriHpBefore = piri.state.currentHp;
    const antOnPiri = ants.spawnHostile(300);
    antOnPiri.body.x = piri.body.x;
    antOnPiri.body.y = piri.body.y;
    ants.update(16, { player: piri });
    expect(piri.state.currentHp).toBeLessThan(piriHpBefore);
    expect(antOnPiri.isDead()).toBe(false);

    // Parar chuva limpa entidades
    ants.stopRain({ clearAnts: true });
    expect(ants.rainActive).toBe(false);
    expect(ants.hostile.length).toBe(0);

    // IA pura da formiga pula quando alvo está acima
    const move = decideAntMove({ x: 100, y: 400, targetX: 160, targetY: 300, grounded: true });
    expect(move).toEqual({ dir: 1, jump: true });
  });

  it('10. gerencia trilha normal, músicas distintas por boss/fase sem sobreposição, volume e arquivos reais em disco', () => {
    // Verifica que todas as faixas declaradas em MUSIC_TRACKS existem em public/audio/music
    const musicDir = path.resolve(process.cwd(), 'public/audio/music');
    for (const track of Object.values(MUSIC_TRACKS)) {
      const fileName = path.basename(track.src[0]);
      const fullPath = path.join(musicDir, fileName);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(100_000);
      expect(track.license).toMatch(/Public Domain|CC0|Creative Commons/i);
      expect(track.commercialUse).toBe(true);
    }

    const audio = new AudioManager();
    registerDefaultSoundBank(audio);
    const director = new MusicDirector({ audio });

    // Inicia trilha principal
    director.startDefault();
    expect(audio.currentMusicKey).toBe(MUSIC_TRACKS.stage_normal.key);
    const stageMusic = audio.sounds.get(MUSIC_TRACKS.stage_normal.key);
    expect(director.setDrunkIntensity(1, 0)).toBeCloseTo(0.92);
    expect(stageMusic.rate).toHaveBeenLastCalledWith(0.92);
    expect(director.setDrunkIntensity(0, 1000)).toBe(1);
    expect(stageMusic.rate).toHaveBeenLastCalledWith(1);

    // Mini-Boss -> faixa própria (Mountain King), sem sobrepor a anterior
    expect(director.playBossMusic('mini_boss_50', 1)).toBe(true);
    expect(audio.currentMusicKey).toBe(MUSIC_TRACKS.boss_mini.key);

    // Ao derrotar Mini-Boss -> retorna à trilha normal
    expect(director.endBossMusic('mini_boss_50')).toBe(true);
    expect(audio.currentMusicKey).toBe(MUSIC_TRACKS.stage_normal.key);

    // Boss Final Fase 1 -> Beethoven 5ª; Fase 2 -> Ride of the Valkyries
    expect(director.playBossMusic('boss_final', 1)).toBe(true);
    expect(audio.currentMusicKey).toBe(MUSIC_TRACKS.boss_final_p1.key);
    expect(director.setBossPhase('boss_final', 2)).toBe(true);
    expect(audio.currentMusicKey).toBe(MUSIC_TRACKS.boss_final_p2.key);
    expect(BOSS_MUSIC_BY_BOSS_ID.boss_final[1]).not.toBe(
      BOSS_MUSIC_BY_BOSS_ID.boss_final[2]
    );

    // Volume configurável
    expect(director.setVolume(0.4)).toBeCloseTo(0.4, 5);
    expect(director.adjustVolume(0.2)).toBeCloseTo(0.6, 5);

    // Reset limpa música ativa
    director.reset();
    expect(audio.currentMusicKey).toBeNull();
  });

  it('11. categoriza efeitos de ataque por tipo (LIGHT, HEAVY, SPECIAL, COMBO) e limpa recursos em dispose()', () => {
    expect(EffectsManager.categorize({ type: 'LIGHT', isCombo: false })).toBe('LIGHT');
    expect(EffectsManager.categorize({ type: 'HEAVY', isCombo: false })).toBe('HEAVY');
    expect(EffectsManager.categorize({ type: 'SPECIAL', isCombo: false })).toBe('SPECIAL');
    expect(EffectsManager.categorize({ type: 'LIGHT', isCombo: true })).toBe('COMBO');

    const fx = new EffectsManager(createMockScene());
    fx.announce = vi.fn();
    fx.flash = vi.fn();
    fx.shake = vi.fn();
    fx.shockwave = vi.fn();
    fx.ring = vi.fn();
    fx.sparks = vi.fn();
    fx.phaseTransition({
      name: 'FASE 2',
      subtitle: 'A coisa esquenta',
      color: '#facc15',
    });
    expect(fx.announce).toHaveBeenCalledWith(
      'PASSOU DE FASE!',
      expect.objectContaining({ sub: 'FASE 2: A coisa esquenta' })
    );
    fx.powerUpBurst({ x: 10, y: 20 }, 4);
    expect(fx.announce).toHaveBeenCalledWith(
      'FORÇA ×4!!!',
      expect.objectContaining({ sub: 'Cantinho do Vale' })
    );
    fx.dispose();
    expect(fx.disposed).toBe(true);
  });

  it('detecta 1-2-3-4-5 em sequência e reinicia alternando falha e tempo', () => {
    const detector = new KeySequenceDetector(['1', '2', '3', '4', '5'], 1000);
    expect(detector.push('1', 10)).toBe(false);
    expect(detector.push('2', 20)).toBe(false);
    expect(detector.push('4', 30)).toBe(false);
    expect(detector.push('2', 40)).toBe(false);
    expect(detector.push('1', 1200)).toBe(false);
    expect(detector.push('2', 1210)).toBe(false);
    expect(detector.push('3', 1220)).toBe(false);
    expect(detector.push('4', 1230)).toBe(false);
    expect(detector.push('5', 1240)).toBe(true);
  });

  it('configura plataformas elevadas para colisão somente pelo topo', () => {
    const body = {
      checkCollision: { up: false, down: true, left: true, right: true },
    };

    expect(configureOneWayPlatform(body)).toBe(true);
    expect(body.checkCollision).toEqual({
      up: true,
      down: false,
      left: false,
      right: false,
    });
    expect(configureOneWayPlatform(null)).toBe(false);
  });

  it('12. garante limpeza completa ao reiniciar run (habilidade, formigas, efeitos de bebida e atributos-base intactos)', () => {
    const scene = createMockScene();
    const player = new Player(scene, 400, 440, getCharacterById('tonegi'));
    const baseSnapshot = { ...player.state.baseStats };
    const antManager = new AntManager({ scene });
    const drinkManager = new DrinkEffectManager();
    const runtime = new AbilityRuntime({ scene, player, antManager });

    drinkManager.applyDrink(getDrinkById('corote_dourado'), player.state);
    runtime.update(ABILITIES.pisa_ligeiro.initialCooldownMs);
    runtime.tryActivate();
    runtime.update(500);
    antManager.startRain();
    antManager.spawnHostile(200);

    // Encerramento/reset completo
    runtime.reset();
    antManager.clear();
    drinkManager.clear(player.state);

    expect(runtime.isActive()).toBe(false);
    expect(player.isInvulnerable()).toBe(false);
    expect(player.abilityForm).toBeNull();
    expect(antManager.getCounts()).toEqual({ hostile: 0, allies: 0 });
    expect(drinkManager.hasActiveEffects()).toBe(false);
    expect(player.state.baseStats).toEqual(baseSnapshot);
  });
});
