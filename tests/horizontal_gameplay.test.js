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
    this.rate = vi.fn(() => 1);
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
  default: {
    Scene: class Scene {
      constructor(config) {
        this.sys = config;
      }
    },
    Input: {
      Keyboard: {
        KeyCodes: {
          LEFT: 37,
          RIGHT: 39,
          UP: 38,
          DOWN: 40,
          A: 65,
          D: 68,
          W: 87,
          S: 83,
          SHIFT: 16,
          SPACE: 32,
          ENTER: 13,
          J: 74,
          K: 75,
          L: 76,
          E: 69,
          Q: 81,
          P: 80,
          M: 77,
          N: 78,
          TAB: 9,
          G: 71,
        },
        JustDown: vi.fn((key) => Boolean(key?._justDown)),
      },
    },
  },
}));

import { AudioManager } from '../src/audio/AudioManager.js';
import { MusicDirector } from '../src/audio/MusicDirector.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../src/audio/SoundBank.js';
import { CONTROLS } from '../src/constants/controls.js';
import { PHASE_OPENING_CONFIG } from '../src/constants/expansion.js';
import { PHYSICS } from '../src/constants/physics.js';
import {
  HORIZONTAL_TRACK_CONFIG,
  PLATFORM_TYPES,
} from '../src/constants/platforms.js';
import { getCharacterById } from '../src/data/characters.js';
import { getDefaultEnemyType } from '../src/data/enemies.js';
import { Enemy } from '../src/entities/Enemy.js';
import { GoldenCharacter } from '../src/entities/GoldenCharacter.js';
import { Player } from '../src/entities/Player.js';
import { computePoseSkeleton } from '../src/systems/CharacterAppearanceSystem.js';
import { DrinkSystem } from '../src/systems/DrinkSystem.js';
import { EnemyAI } from '../src/systems/EnemyAI.js';
import { HorizontalTrackSystem } from '../src/systems/HorizontalTrackSystem.js';
import { InputController } from '../src/systems/InputController.js';
import { PhaseOpeningSystem } from '../src/systems/PhaseOpeningSystem.js';
import { PhaseSystem } from '../src/systems/PhaseSystem.js';
import { canJumpBetween } from '../src/systems/PlatformGenerator.js';
import { SpawnSystem } from '../src/systems/SpawnSystem.js';
import {
  isUiOverlayObject,
  syncUiCameraObjects,
} from '../src/ui/UiCameraLayer.js';
import { MainScene } from '../src/scenes/MainScene.js';
import { ParallaxBackdrop, renderArenaPlatforms } from '../src/ui/ArenaBackdrop.js';

function createMockScene() {
  const listeners = new Map();
  const makeGraphics = (x = 0, y = 0) => ({
    x,
    y,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
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
    setDepth: vi.fn(function () {
      return this;
    }),
    setScrollFactor: vi.fn(function () {
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
    destroy: vi.fn(),
  });

  return {
    logicalWidth: 960,
    logicalHeight: 540,
    cameras: {
      main: {
        scrollX: 0,
        scrollY: 0,
        setScroll(x, y) {
          this.scrollX = x;
          this.scrollY = y;
        },
      },
    },
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
          setSize(w, h) {
            this.width = w;
            this.height = h;
          },
          setPosition(nx, ny) {
            this.x = nx;
            this.y = ny;
          },
          destroy: vi.fn(),
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
            blocked: { down: true, left: false, right: false },
            touching: { down: true },
            setCollideWorldBounds: vi.fn(),
            setAllowGravity: vi.fn(),
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

describe('Transformação do Gameplay — Movimentação Horizontal, Plataformas, Dash, Buracos e Fases', () => {
  it('1. mantém controle manual estilo beat em up (sem andar automaticamente) no modo horizontal', () => {
    const scene = createMockScene();
    const piri = getCharacterById('piri');
    const player = new Player(scene, 220, 440, piri, PHYSICS, {
      continuousRun: true,
    });

    const baseMoveSpeed =
      PHYSICS.PLAYER_MOVE_SPEED * piri.multipliers.moveSpeed;

    // Sem entrada horizontal: jogador fica parado (controle manual de beat 'em up)
    player.update({ horizontal: 0, jump: false, dash: false }, 16.67);
    expect(player.body.velocity.x).toBe(0);

    // Pressionando direita: avança normalmente para a direita
    player.update({ horizontal: 1, jump: false, dash: false }, 16.67);
    expect(player.facing).toBe(1);
    expect(player.body.velocity.x).toBeCloseTo(baseMoveSpeed, 2);

    // Pressionando esquerda: permite virar e recuar para lutar contra inimigos atrás
    player.update({ horizontal: -1, jump: false, dash: false }, 16.67);
    expect(player.facing).toBe(-1);
    expect(player.body.velocity.x).toBeCloseTo(-baseMoveSpeed, 2);

    // Soltando o comando: para imediatamente
    player.update({ horizontal: 0, jump: false, dash: false }, 16.67);
    expect(player.body.velocity.x).toBe(0);
  });

  it('2. gera chunks horizontais determinísticos sem limite artificial, com plataformas static, moving e crumbling e buracos saltáveis', () => {
    const trackA = new HorizontalTrackSystem({ seed: 'libasim-scroll-seed' });
    const trackB = new HorizontalTrackSystem({ seed: 'libasim-scroll-seed' });

    // Avança o mundo até x = 9000 sem limites artificiais e descartando chunks antigos
    for (let px = 200; px <= 9000; px += 650) {
      const camX = Math.max(0, px - 340);
      trackA.ensureChunksAround(px, camX);
      trackB.ensureChunksAround(px, camX);
    }

    const layoutA = trackA.getActiveLayout();
    const layoutB = trackB.getActiveLayout();
    expect(layoutA.platforms.map((p) => p.id)).toEqual(
      layoutB.platforms.map((p) => p.id)
    );
    expect(layoutA.ground.x + layoutA.ground.width / 2).toBeGreaterThan(9500);
    // Chunks iniciais distantes já foram reciclados para manter O(1)
    expect(trackA.chunks.has(0)).toBe(false);

    // Fase 1: apenas plataformas estáticas
    const phase1Track = new HorizontalTrackSystem({
      seed: 'categories-wide-seed',
      phaseId: 1,
      trackConfig: { ...HORIZONTAL_TRACK_CONFIG, PRUNE_BEHIND_PX: 50000 },
    });
    phase1Track.ensureChunksAround(4500, 0);
    const phase1Types = new Set(
      phase1Track.getActiveLayout().allPlatforms.map((p) => p.type)
    );
    expect(phase1Types.has(PLATFORM_TYPES.STATIC)).toBe(true);
    expect(phase1Types.has(PLATFORM_TYPES.MOVING)).toBe(false);
    expect(phase1Types.has(PLATFORM_TYPES.CRUMBLING)).toBe(false);

    // Fase 2: libera plataformas móveis, mas ainda sem desintegráveis
    const phase2Track = new HorizontalTrackSystem({
      seed: 'categories-wide-seed',
      phaseId: 2,
      trackConfig: { ...HORIZONTAL_TRACK_CONFIG, PRUNE_BEHIND_PX: 50000 },
    });
    phase2Track.ensureChunksAround(6000, 0);
    const phase2Types = new Set(
      phase2Track.getActiveLayout().allPlatforms.map((p) => p.type)
    );
    expect(phase2Types.has(PLATFORM_TYPES.STATIC)).toBe(true);
    expect(phase2Types.has(PLATFORM_TYPES.MOVING)).toBe(true);
    expect(phase2Types.has(PLATFORM_TYPES.CRUMBLING)).toBe(false);

    // Fase 3+: libera todas as 3 categorias (incluindo crumbling) + buracos frequentes/longos com ponte
    const wideTrack = new HorizontalTrackSystem({
      seed: 'categories-wide-seed',
      phaseId: 3,
      trackConfig: { ...HORIZONTAL_TRACK_CONFIG, PRUNE_BEHIND_PX: 50000 },
    });
    wideTrack.ensureChunksAround(8000, 0);
    const wideLayout = wideTrack.getActiveLayout();

    const typesFound = new Set(wideLayout.allPlatforms.map((p) => p.type));
    expect(typesFound.has(PLATFORM_TYPES.STATIC)).toBe(true);
    expect(typesFound.has(PLATFORM_TYPES.MOVING)).toBe(true);
    expect(typesFound.has(PLATFORM_TYPES.CRUMBLING)).toBe(true);

    const axesFound = new Set(
      wideLayout.allPlatforms
        .filter((p) => p.type === PLATFORM_TYPES.MOVING)
        .map((p) => p.axis)
    );
    expect(axesFound.has('horizontal')).toBe(true);
    expect(axesFound.has('vertical')).toBe(true);

    // Zona inicial segura não possui buracos; adiante existem buracos frequentes e buracos longos com plataformas de travessia
    expect(wideLayout.holes.length).toBeGreaterThanOrEqual(4);
    const longHoles = wideLayout.holes.filter((h) => h.isLong);
    expect(longHoles.length).toBeGreaterThan(0);
    for (const hole of wideLayout.holes) {
      expect(hole.left).toBeGreaterThanOrEqual(
        HORIZONTAL_TRACK_CONFIG.INITIAL_SAFE_GROUND_WIDTH
      );
      if (hole.isLong) {
        const bridgePlatforms = wideLayout.allPlatforms.filter(
          (p) => p.x >= hole.left - 20 && p.x <= hole.right + 20
        );
        expect(bridgePlatforms.length).toBeGreaterThanOrEqual(2);
      } else {
        const leftBank = { x: hole.left - 60, y: 520, width: 120, height: 40 };
        const rightBank = { x: hole.right + 60, y: 520, width: 120, height: 40 };
        expect(canJumpBetween(leftBank, rightBank)).toBe(true);
      }
    }
  });

  it('3. move plataformas móveis (horizontal/vertical) e desintegra plataformas crumbling após contato do jogador', () => {
    const scene = createMockScene();
    const player = new Player(scene, 300, 440, getCharacterById('piri'));
    const brokenIds = [];
    const track = new HorizontalTrackSystem({
      seed: 'crumble-and-move-seed',
      phaseId: 3,
      trackConfig: { ...HORIZONTAL_TRACK_CONFIG, PRUNE_BEHIND_PX: 20000 },
      onPlatformBroken: (p) => brokenIds.push(p.id),
    });
    track.ensureChunksAround(6000, 0);
    const allPlats = track.getActiveLayout().allPlatforms;

    const movingPlat = allPlats.find((p) => p.type === PLATFORM_TYPES.MOVING);
    const crumblingPlat = allPlats.find(
      (p) => p.type === PLATFORM_TYPES.CRUMBLING
    );
    expect(movingPlat).toBeDefined();
    expect(crumblingPlat).toBeDefined();

    // Plataforma móvel altera posição real ao atualizar tempo
    const startX = movingPlat.x;
    const startY = movingPlat.y;
    track.update(320);
    if (movingPlat.axis === 'horizontal') {
      expect(movingPlat.x).not.toBe(startX);
    } else {
      expect(movingPlat.y).not.toBe(startY);
    }

    // Posiciona os pés do jogador exatamente sobre a plataforma desintegrável
    const platTop = crumblingPlat.y - crumblingPlat.height / 2;
    player.body.x = crumblingPlat.x - player.body.halfWidth;
    player.body.y = platTop - player.body.height;
    player.body.velocity.y = 0;

    expect(crumblingPlat.state).toBe('intact');
    expect(crumblingPlat.solid).toBe(true);

    // Contato inicia tremor ('shaking')
    track.update(16, { player });
    expect(crumblingPlat.state).toBe('shaking');
    expect(crumblingPlat.solid).toBe(true);

    // Após o tempo de aviso, a plataforma desintegra ('broken', solid = false)
    track.update(HORIZONTAL_TRACK_CONFIG.CRUMBLING.SHAKE_DURATION_MS + 20);
    expect(crumblingPlat.state).toBe('broken');
    expect(crumblingPlat.solid).toBe(false);
    expect(brokenIds).toContain(crumblingPlat.id);
    // Plataforma quebrada não entra na lista de superfícies sólidas da IA
    expect(
      track.getActiveLayout().platforms.some((p) => p.id === crumblingPlat.id)
    ).toBe(false);
  });

  it('4. executa dash/slide por botão próprio, com animação, invulnerabilidade, cooldown e bloqueio consistente em obstáculos', () => {
    expect(CONTROLS.DASH).toBeDefined();
    expect(CONTROLS.DASH.length).toBeGreaterThan(0);

    const keyMap = new Map();
    const mockKeyboardScene = {
      input: {
        keyboard: {
          addKey: (code) => {
            const k = { keyCode: code, isDown: false, _justDown: false };
            keyMap.set(code, k);
            return k;
          },
        },
      },
    };
    const input = new InputController(mockKeyboardScene);
    keyMap.get(16)._justDown = true; // SHIFT
    expect(input.readMovementIntent().dash).toBe(true);

    const scene = createMockScene();
    const dashEvents = [];
    scene.events.on('player:dash', (info) => dashEvents.push(info));
    const player = new Player(scene, 250, 440, getCharacterById('tonegi'), PHYSICS, {
      continuousRun: true,
    });

    // Ativa dash/slide
    player.update({ horizontal: 0, jump: false, dash: true }, 16);
    expect(player.isDashing()).toBe(true);
    expect(player.isInvulnerable()).toBe(true);
    expect(player.body.velocity.x).toBeGreaterThanOrEqual(PHYSICS.DASH.MIN_SPEED);
    expect(dashEvents).toHaveLength(1);

    // Esquiva de ataque inimigo durante o dash sem receber dano
    const hpBeforeAttack = player.state.currentHp;
    expect(player.onHit({ damage: 25, knockback: 12, direction: -1 })).toBe(false);
    expect(player.state.currentHp).toBe(hpBeforeAttack);

    // Pose esquelética dedicada de dash/slide difere da corrida comum
    const dashSkeleton = computePoseSkeleton(1, 'dash', 28, {
      animTimeMs: 50,
      vx: 600,
      vy: 0,
      grounded: true,
    });
    const idleSkeleton = computePoseSkeleton(1, 'idle', 28, {
      animTimeMs: 50,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    expect(dashSkeleton.head.y).toBeGreaterThan(idleSkeleton.head.y);

    // Respeita bloqueio físico de obstáculos (não atravessa parede inconsistente)
    player.body.blocked.right = true;
    player.update({ horizontal: 0, jump: false, dash: false }, 16);
    expect(player.isDashing()).toBe(false);
    expect(player.body.velocity.x).toBe(0);
    player.body.blocked.right = false;

    // Dash é um comando normal sem cooldown: pode ser usado novamente logo após encerrar
    expect(PHYSICS.DASH.COOLDOWN_MS).toBe(0);
    expect(player.canDash()).toBe(true);
    expect(player.startDash(1)).toBe(true);
  });

  it('5. aplica exatamente -30 HP ao cair em buraco, impulsiona com ricochete e impede dano repetido na recuperação', () => {
    const scene = createMockScene();
    const player = new Player(scene, 500, 520, getCharacterById('piri'), PHYSICS, {
      continuousRun: true,
    });
    player.body.blocked.down = false;
    player.body.touching.down = false;

    const initialHp = player.state.currentHp;
    const firstFall = player.handlePitFall({
      groundTopY: 500,
      safeLandingX: 620,
    });

    // Perde exatamente 30 HP e recebe ricochete para cima e para a frente
    expect(firstFall.triggered).toBe(true);
    expect(firstFall.damaged).toBe(true);
    expect(firstFall.damageApplied).toBe(30);
    expect(player.state.currentHp).toBe(initialHp - 30);
    expect(player.body.velocity.y).toBe(PHYSICS.PIT_HAZARD.BOUNCE_VELOCITY_Y);
    expect(player.body.velocity.x).toBeGreaterThan(0);
    expect(player.body.y + player.body.height).toBeLessThan(500);

    // Novo contato imediato ou durante a janela de recuperação NÃO aplica outro dano de 30 HP!
    const repeatedContact = player.handlePitFall({
      groundTopY: 500,
      safeLandingX: 650,
    });
    expect(repeatedContact.triggered).toBe(true);
    expect(repeatedContact.damaged).toBe(false);
    expect(repeatedContact.damageApplied).toBe(0);
    expect(player.state.currentHp).toBe(initialHp - 30);

    // Após expirar a recuperação e pousar em solo firme, a trava é liberada normalmente
    player.body.blocked.down = true;
    player.body.touching.down = true;
    player.update(
      { horizontal: 0, jump: false, dash: false },
      PHYSICS.PIT_HAZARD.RECOVERY_PROTECTION_MS + 50
    );
    expect(player.pitContactLocked).toBe(false);
    expect(player.pitRecoveryTimerMs).toBe(0);
  });

  it('6. executa a abertura padronizada em TODAS as 4 fases (0, 25, 50 e 75 abates): caminhada solo, silêncio, seta piscando, inimigos e música em fade-in', () => {
    const scene = createMockScene();
    const player = new Player(scene, 200, 440, getCharacterById('acougue'), PHYSICS, {
      continuousRun: true,
    });
    const audio = new AudioManager();
    registerDefaultSoundBank(audio);
    const musicDirector = new MusicDirector({ audio });
    const spawnSystem = new SpawnSystem({ seed: 'phase-intro-seed' });
    const phaseSystem = new PhaseSystem();

    let arrowBlinkStates = [];
    const phaseOpening = new PhaseOpeningSystem({
      config: PHASE_OPENING_CONFIG,
      onIntroStart: () => {
        musicDirector.silenceForPhaseIntro();
        spawnSystem.stop();
        player.setIntroWalk(true);
      },
      onIntroUpdate: (snap) => {
        arrowBlinkStates.push(snap.arrowVisible);
      },
      onIntroComplete: () => {
        player.setIntroWalk(false);
        spawnSystem.resume();
        musicDirector.startDefault({
          fadeInMs: PHASE_OPENING_CONFIG.MUSIC_FADE_IN_MS,
        });
      },
    });

    // Valida a mesma sequência exata nas 4 fases: início (0), 25, 50 e 75 inimigos derrotados!
    for (const kills of [0, 25, 50, 75]) {
      if (kills > 0) {
        phaseSystem.update(kills);
      }
      const phase = phaseSystem.getPhase();
      arrowBlinkStates = [];

      phaseOpening.start(phase);

      // 1 & 2: Jogador andando sozinho para a direita, sem música e sem spawns
      expect(phaseOpening.isActive()).toBe(true);
      expect(player.introAutoWalk).toBe(true);
      expect(audio.currentMusicKey).toBeNull();
      expect(spawnSystem.stopped).toBe(true);

      player.update({ horizontal: -1, jump: true, dash: true }, 16);
      expect(player.body.velocity.x).toBe(PHYSICS.CONTINUOUS_RUN.INTRO_WALK_SPEED);
      expect(player.facing).toBe(1);

      // 3: Seta piscando alterna estado visível/oculto durante os primeiros segundos
      for (
        let elapsed = 0;
        elapsed + 180 < PHASE_OPENING_CONFIG.WALK_DURATION_MS;
        elapsed += 180
      ) {
        phaseOpening.update(180);
      }
      expect(arrowBlinkStates).toContain(true);
      expect(arrowBlinkStates).toContain(false);
      expect(audio.currentMusicKey).toBeNull();

      // 4, 5 & 6: Conclui abertura -> música entra com fade-in e inimigos começam a surgir!
      phaseOpening.update(300);
      expect(phaseOpening.isActive()).toBe(false);
      expect(player.introAutoWalk).toBe(false);
      expect(spawnSystem.stopped).toBe(false);
      expect(audio.currentMusicKey).not.toBeNull();

      const activeHowl = audio.sounds.get(audio.currentMusicKey);
      expect(activeHowl.fade).toHaveBeenCalledWith(
        0,
        expect.any(Number),
        PHASE_OPENING_CONFIG.MUSIC_FADE_IN_MS,
        expect.anything()
      );
    }

    expect(phaseOpening.getSnapshot().completedPhaseIds).toEqual([1, 2, 3, 4]);
  });

  it('7. adapta SpawnSystem, DrinkSystem, GoldenCharacter e EnemyAI para coordenadas horizontais avançadas (> 960px)', () => {
    const scrollX = 4800;
    const viewportWidth = 960;
    const holes = [{ left: 5100, right: 5210, width: 110 }];

    const spawnSystem = new SpawnSystem({ seed: 'scroll-spawn' });
    const enemyReq = spawnSystem.update(ENEMY_CONFIG_DELAY(), {
      playerX: scrollX + 320,
      activeEnemies: [],
      viewportLeft: scrollX,
      viewportWidth,
      holes,
    });
    expect(enemyReq).not.toBeNull();
    expect(enemyReq.x).toBeGreaterThanOrEqual(scrollX);
    expect(enemyReq.x).toBeLessThanOrEqual(scrollX + viewportWidth);
    expect(enemyReq.x <= 5100 - 18 || enemyReq.x >= 5210 + 18).toBe(true);

    const drinkSystem = new DrinkSystem({ seed: 'scroll-drink' });
    const drinkReq = drinkSystem.update(10000, {
      activeDrinks: [],
      viewportLeft: scrollX,
      viewportWidth,
      holes,
    });
    expect(drinkReq).not.toBeNull();
    expect(drinkReq.x).toBeGreaterThanOrEqual(scrollX);
    expect(drinkReq.x).toBeLessThanOrEqual(scrollX + viewportWidth);

    const scene = createMockScene();
    scene.cameras.main.scrollX = scrollX;
    const coquinho = new GoldenCharacter(scene, {
      direction: -1,
      screenWidth: viewportWidth,
      viewportLeft: scrollX,
    });
    expect(coquinho.getCombatOrigin().x).toBeGreaterThan(scrollX + viewportWidth);
    coquinho.destroy();

    // EnemyAI salta sobre buraco entre dois segmentos de chão em X > 4800
    const player = new Player(scene, 5280, 472, getCharacterById('piri'));
    const enemy = new Enemy(scene, 5075, 472, getDefaultEnemyType(), { id: 'e_scroll' });
    enemy.state.setBehaviorState('chasing');
    const layout = {
      ground: { id: 'ground', x: 5200, y: 520, width: 1200, height: 40, isGround: true },
      groundSegments: [
        { id: 'seg_1', x: 4900, y: 520, width: 400, height: 40, left: 4700, right: 5100, isGround: true },
        { id: 'seg_2', x: 5400, y: 520, width: 400, height: 40, left: 5200, right: 5600, isGround: true },
      ],
      holes: [{ id: 'h1', left: 5100, right: 5200, width: 100 }],
      platforms: [],
    };
    const ai = new EnemyAI();
    const intent = ai.decide(enemy, player, layout, [enemy], 200);
    expect(intent.moveDir).toBeGreaterThanOrEqual(0);
    enemy.destroy();
  });

  it('8. isola todos os modais e UIs na uiCamera limpa, mantendo o efeito de embriaguez apenas na tela do jogador', () => {
    const mainIgnored = new Set();
    const uiIgnored = new Set();
    const mainCamera = { ignore: vi.fn((o) => mainIgnored.add(o)) };
    const uiCamera = { ignore: vi.fn((o) => uiIgnored.add(o)) };

    const playerVisual = { scrollFactorX: 1, scrollFactorY: 1, depth: 10 };
    const parallaxSky = { scrollFactorX: 0, scrollFactorY: 0, depth: -35 };
    const heatOverlay = { scrollFactorX: 0, scrollFactorY: 0, depth: 18 };
    const hudPanel = { scrollFactorX: 0, scrollFactorY: 0, depth: 20 };
    const pauseModal = { scrollFactorX: 0, scrollFactorY: 0, depth: 100 };
    const chiquinhoShop = { scrollFactorX: 0, scrollFactorY: 0, depth: 130 };
    const tooltip = { scrollFactorX: 0, scrollFactorY: 0, depth: 220 };

    const state = syncUiCameraObjects(
      mainCamera,
      uiCamera,
      [
        playerVisual,
        parallaxSky,
        heatOverlay,
        hudPanel,
        pauseModal,
        chiquinhoShop,
        tooltip,
      ],
      undefined,
      { excluded: new Set([heatOverlay]) }
    );

    expect(isUiOverlayObject(hudPanel)).toBe(true);
    expect(isUiOverlayObject(pauseModal)).toBe(true);
    expect(isUiOverlayObject(chiquinhoShop)).toBe(true);
    expect(isUiOverlayObject(playerVisual)).toBe(false);
    expect(isUiOverlayObject(parallaxSky)).toBe(false);

    // UI e modais ficam APENAS na uiCamera (ignorados pela mainCamera que recebe distorção)
    expect(mainIgnored.has(hudPanel)).toBe(true);
    expect(mainIgnored.has(pauseModal)).toBe(true);
    expect(mainIgnored.has(chiquinhoShop)).toBe(true);
    expect(mainIgnored.has(tooltip)).toBe(true);
    expect(uiIgnored.has(hudPanel)).toBe(false);
    expect(uiIgnored.has(pauseModal)).toBe(false);
    expect(uiIgnored.has(chiquinhoShop)).toBe(false);

    // Jogador, parallax e overlay de calor ficam APENAS na mainCamera
    expect(uiIgnored.has(playerVisual)).toBe(true);
    expect(uiIgnored.has(parallaxSky)).toBe(true);
    expect(uiIgnored.has(heatOverlay)).toBe(true);
    expect(mainIgnored.has(playerVisual)).toBe(false);
    expect(state.uiObjects.has(pauseModal)).toBe(true);
  });
});

function ENEMY_CONFIG_DELAY() {
  return 1000;
}
