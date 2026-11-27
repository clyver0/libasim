import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          SHIFT: 16,
          SPACE: 32,
          W: 87,
          A: 65,
          S: 83,
          D: 68,
          UP: 38,
          DOWN: 40,
          LEFT: 37,
          RIGHT: 39,
        },
        JustDown: (key) => Boolean(key?._justDown || key?.isDown),
      },
    },
  },
}));

import { CombatSystem } from '../src/combat/CombatSystem.js';
import { Hitbox } from '../src/combat/Hitbox.js';
import { PHYSICS } from '../src/constants/physics.js';
import { PLATFORM_TYPES } from '../src/constants/platforms.js';
import { DEFAULT_BOSS_DATA } from '../src/data/boss.js';
import { getCharacterById } from '../src/data/characters.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { Boss } from '../src/entities/Boss.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Player } from '../src/entities/Player.js';
import { BossAI } from '../src/systems/BossAI.js';
import { EnemyAI } from '../src/systems/EnemyAI.js';
import { HorizontalTrackSystem } from '../src/systems/HorizontalTrackSystem.js';
import { InputController } from '../src/systems/InputController.js';
import { PhaseSystem } from '../src/systems/PhaseSystem.js';

function createMockGraphics() {
  return {
    visible: true,
    depth: 0,
    clear: vi.fn(),
    destroy: vi.fn(),
    setDepth(d) {
      this.depth = d;
      return this;
    },
    setScrollFactor() {
      return this;
    },
    setVisible(v) {
      this.visible = Boolean(v);
      return this;
    },
    setAlpha() {
      return this;
    },
    setPosition() {
      return this;
    },
    fillStyle: vi.fn(),
    lineStyle: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRoundedRect: vi.fn(),
    strokeRoundedRect: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
    fillEllipse: vi.fn(),
    strokeEllipse: vi.fn(),
    fillTriangle: vi.fn(),
    strokeTriangle: vi.fn(),
    fillPoints: vi.fn(),
    lineBetween: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    strokePath: vi.fn(),
  };
}

function createMockScene() {
  return {
    events: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    cameras: { main: { scrollX: 0, scrollY: 0, zoom: 1, flash: vi.fn(), shake: vi.fn() } },
    tweens: { add: vi.fn((cfg) => { cfg.onComplete?.(); return {}; }) },
    textures: { exists: () => false },
    add: {
      graphics: () => createMockGraphics(),
      rectangle: (x, y, w, h) => ({
        x,
        y,
        width: w,
        height: h,
        body: null,
        setOrigin() { return this; },
        setDepth() { return this; },
        setScrollFactor() { return this; },
        setVisible() { return this; },
        destroy: vi.fn(),
      }),
      text: () => ({
        setOrigin() { return this; },
        setDepth() { return this; },
        setScrollFactor() { return this; },
        setPosition() { return this; },
        setVisible() { return this; },
        destroy: vi.fn(),
      }),
    },
    physics: {
      world: { gravity: { y: PHYSICS.GRAVITY_Y } },
      add: {
        existing: (obj) => {
          obj.body = {
            x: obj.x - obj.width / 2,
            y: obj.y - obj.height / 2,
            width: obj.width,
            height: obj.height,
            halfWidth: obj.width / 2,
            halfHeight: obj.height / 2,
            velocity: { x: 0, y: 0 },
            blocked: { down: false, left: false, right: false, up: false },
            touching: { down: false, left: false, right: false, up: false },
            allowGravity: true,
            enable: true,
            checkCollision: { up: true, down: true, left: true, right: true },
            setCollideWorldBounds() { return this; },
            setMaxVelocity() { return this; },
            setAllowGravity(flag) { this.allowGravity = Boolean(flag); return this; },
            setVelocity(vx, vy) { this.velocity.x = vx; this.velocity.y = vy; return this; },
            setVelocityX(vx) { this.velocity.x = vx; return this; },
            setVelocityY(vy) { this.velocity.y = vy; return this; },
            setSize(w, h) {
              this.width = w;
              this.height = h;
              this.halfWidth = w / 2;
              this.halfHeight = h / 2;
              return this;
            },
          };
          return obj;
        },
      },
    },
  };
}

describe('Unificação 2D Lateral (side_2d) em todas as 4 fases', () => {
  it('mantém perspective === "side_2d" nas 4 fases e preserva a progressão de plataformas (static -> moving na Fase 2 -> crumbling na Fase 3+)', () => {
    const phaseSystem = new PhaseSystem();

    for (const phaseId of [1, 2, 3, 4]) {
      const track = new HorizontalTrackSystem({
        seed: `side-2d-unified-p${phaseId}`,
        phaseId,
      });
      const types = new Set();
      for (let x = 240; x <= 6400; x += 480) {
        track.ensureChunksAround(x, Math.max(0, x - 320));
        const layout = track.getActiveLayout();
        expect(layout.perspective).toBe('side_2d');
        for (const p of layout.allPlatforms ?? []) {
          types.add(p.type);
        }
      }

      expect(phaseSystem.getPhase(phaseId).id).toBe(phaseId);

      if (phaseId === 1) {
        expect(types.has(PLATFORM_TYPES.MOVING)).toBe(false);
        expect(types.has(PLATFORM_TYPES.CRUMBLING)).toBe(false);
      } else if (phaseId === 2) {
        expect(types.has(PLATFORM_TYPES.MOVING)).toBe(true);
        expect(types.has(PLATFORM_TYPES.CRUMBLING)).toBe(false);
      } else {
        expect(types.has(PLATFORM_TYPES.MOVING)).toBe(true);
        expect(types.has(PLATFORM_TYPES.CRUMBLING)).toBe(true);
      }
    }
  });

  it('dispara desintegração de plataformas crumbling ao pisar em side_2d na Fase 3', () => {
    const track = new HorizontalTrackSystem({ seed: 'crumble-side2d' });
    track.setPhase(3);
    for (let x = 240; x <= 3200; x += 480) {
      track.ensureChunksAround(x, Math.max(0, x - 320));
    }

    const layout = track.getActiveLayout();
    const crumbling = layout.allPlatforms.find((p) => p.type === PLATFORM_TYPES.CRUMBLING);
    expect(crumbling).toBeTruthy();
    expect(crumbling.state).toBe('intact');

    const mockPlayer = {
      body: { velocity: { x: 0, y: 0 } },
      getHurtbox: () => ({
        x: crumbling.x - 16,
        y: crumbling.y - crumbling.height / 2 - 60,
        width: 32,
        height: 60,
      }),
    };

    track.update(16, { player: mockPlayer });
    expect(crumbling.state).toBe('shaking');
  });

  it('mantém controles, movimento, pulo, dash, combate e IA exclusivamente em 2D lateral', () => {
    const keyMap = {};
    const mockInputScene = {
      input: {
        keyboard: {
          addKey: (code) => {
            const k = { code, isDown: false, _justDown: false };
            keyMap[code] = k;
            return k;
          },
        },
      },
    };
    const input = new InputController(mockInputScene);
    keyMap[68].isDown = true; // D
    keyMap[32].isDown = true; // SPACE (jump)
    keyMap[16]._justDown = true; // SHIFT (dash)

    const intent = input.readMovementIntent();
    expect(intent).toEqual({
      horizontal: 1,
      vertical: 0,
      jump: true,
      dash: true,
    });

    const scene = createMockScene();
    const player = new Player(scene, 240, 440, getCharacterById('piri'));
    const enemy = new Enemy(scene, 280, 440, ENEMY_TYPES[0], { id: 'e-2d' });
    const boss = new Boss(scene, 310, 440, DEFAULT_BOSS_DATA, { id: 'b-2d' });

    player.body.blocked.down = true;
    enemy.body.blocked.down = true;
    boss.body.blocked.down = true;

    const enemyAI = new EnemyAI();
    const bossAI = new BossAI();
    const layout = { perspective: 'side_2d', groundSegments: [], holes: [], platforms: [] };

    const enemyIntent = enemyAI.decide(enemy, player, layout, [enemy], 16);
    expect(enemyIntent.shouldAttack).toBe(true);
    expect(enemyIntent.facing).toBe(-1);

    boss.attackCooldownMs = 0;
    const bossIntent = bossAI.decide(boss, player, layout, 16);
    expect(bossIntent.shouldAttack).toBe(true);

    const attack = {
      id: 'light',
      type: 'LIGHT',
      name: 'Soco',
      baseDamage: 12,
      knockback: 20,
      hitbox: { width: 64, height: 48, offsetX: 28, offsetY: 0 },
    };
    const bounds = Hitbox.getWorldBounds(player.getCombatOrigin(), attack.hitbox, 1);
    const hits = CombatSystem.resolveHits({
      attacker: player,
      attack,
      hitboxBounds: bounds,
      targets: [enemy],
      hitTargetIds: new Set(),
      attackInstanceId: 1,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].hitInfo.directionVector).toEqual({ x: 1, y: 0 });
  });
});
