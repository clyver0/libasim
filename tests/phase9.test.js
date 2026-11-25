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
        KeyCodes: { ESC: 27, ENTER: 13, SPACE: 32 },
        JustDown: () => false,
      },
    },
  },
}));

import { CombatSystem } from '../src/combat/CombatSystem.js';
import { BOSS_CONFIG } from '../src/constants/boss.js';
import { ATTACK_TYPES, COMBOS } from '../src/data/attacks.js';
import { DEFAULT_BOSS_DATA, scaleBossData } from '../src/data/boss.js';
import { getCharacterById } from '../src/data/characters.js';
import { getDefaultEnemyType } from '../src/data/enemies.js';
import { Boss } from '../src/entities/Boss.js';
import { Player } from '../src/entities/Player.js';
import { formatGameOverSummaryLines } from '../src/scenes/GameOverScene.js';
import { formatVictorySummaryLines } from '../src/scenes/VictoryScene.js';
import { BossAI } from '../src/systems/BossAI.js';
import { RunManager } from '../src/systems/RunManager.js';

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
      graphics: vi.fn(({ x = 0, y = 0 } = {}) => ({
        x,
        y,
        clear: vi.fn(),
        lineStyle: vi.fn(),
        fillStyle: vi.fn(),
        strokeCircle: vi.fn(),
        fillCircle: vi.fn(),
        lineBetween: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillEllipse: vi.fn(),
        strokeEllipse: vi.fn(),
        setScale: vi.fn(),
        setPosition: vi.fn(function (nx, ny) {
          this.x = nx;
          this.y = ny;
        }),
        destroy: vi.fn(),
      })),
      text: vi.fn(() => {
        const t = {
          y: 0,
          setOrigin: vi.fn(() => t),
          setDepth: vi.fn(() => t),
          destroy: vi.fn(),
        };
        return t;
      }),
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

describe('Fase 9 — Boss Final, RunManager e Encerramento da Run', () => {
  it('possui atributos superiores aos inimigos comuns e escalona conforme visitas oficiais da run', () => {
    const commonEnemy = getDefaultEnemyType();
    const boss0 = scaleBossData(DEFAULT_BOSS_DATA, { officialShopVisits: 0 });
    const boss3 = scaleBossData(DEFAULT_BOSS_DATA, { officialShopVisits: 3 });

    expect(boss0.countsAsCommonEnemy).toBe(false);
    expect(boss0.scaledStats.maxHp).toBeGreaterThan(commonEnemy.baseStats.maxHp * 4);
    expect(boss0.scaledStats.strength).toBeGreaterThan(commonEnemy.baseStats.strength);

    expect(boss3.scaledStats.maxHp).toBeGreaterThan(boss0.scaledStats.maxHp);
    expect(boss3.scaledStats.strength).toBeGreaterThan(boss0.scaledStats.strength);
    expect(boss3.scaledStats.moveSpeed).toBeGreaterThan(boss0.scaledStats.moveSpeed);
  });

  it('executa padrões próprios de ataque, transiciona para Fase 2 em <= 50% HP e dispara condição de vitória ao ser derrotado', () => {
    const scene = createMockScene();
    const player = new Player(scene, 300, 472, getCharacterById('character_1'));
    const scaledBoss = scaleBossData(DEFAULT_BOSS_DATA, { officialShopVisits: 2 });

    const onPhaseChanged = vi.fn();
    const onDefeated = vi.fn();
    const boss = new Boss(scene, 345, 455, scaledBoss, {
      onPhaseChanged,
      onDefeated,
    });
    boss.attackCooldownMs = 0;

    const bossAI = new BossAI();

    // Curta distância -> escolhe Golpe Esmagador (crush)
    const closeIntent = bossAI.decide(boss, player, null, 16);
    expect(closeIntent.shouldAttack).toBe(true);
    expect(closeIntent.attackKey).toBe('crush');

    // Executa ciclo de ataque do Boss contra o jogador
    const initialPlayerHp = player.state.currentHp;
    boss.update(16, closeIntent, player);
    expect(boss.state.behaviorState).toBe(BOSS_CONFIG.STATES.WINDUP);
    boss.update(boss.currentAttackConfig.windupMs + 1, null, player);
    expect(boss.state.behaviorState).toBe(BOSS_CONFIG.STATES.ATTACKING);
    boss.update(16, null, player);
    expect(player.state.currentHp).toBeLessThan(initialPlayerHp);

    // Média distância -> escolhe Investida Brutal (charge) com dashSpeed
    boss.state.setBehaviorState(BOSS_CONFIG.STATES.CHASING);
    boss.attackCooldownMs = 0;
    boss.body.x = 430;
    const midIntent = bossAI.decide(boss, player, null, 16);
    expect(midIntent.shouldAttack).toBe(true);
    expect(midIntent.attackKey).toBe('charge');
    boss.update(16, midIntent, player);
    boss.update(boss.currentAttackConfig.windupMs + 1, null, player);
    boss.update(16, null, player);
    expect(Math.abs(boss.body.velocity.x)).toBeGreaterThan(0);

    // Causa dano até <= 50% do HP -> transição automática para Fase 2 Enfurecida!
    const speedPhase1 = boss.state.moveSpeed;
    const strengthPhase1 = boss.state.strength;
    const halfDamage = Math.ceil(boss.state.maxHp * 0.55);
    boss.onHit({
      attack: COMBOS[2],
      damage: halfDamage,
      knockback: 40,
      direction: 1,
    });

    expect(boss.state.phase).toBe(2);
    expect(onPhaseChanged).toHaveBeenCalledWith(2, boss);
    expect(boss.state.moveSpeed).toBeGreaterThan(speedPhase1);
    expect(boss.state.strength).toBeGreaterThan(strengthPhase1);

    // Na Fase 2, também utiliza Onda do Caos (shockwave)
    boss.state.setBehaviorState(BOSS_CONFIG.STATES.CHASING);
    boss.attackCooldownMs = 0;
    boss.body.x = 340;
    bossAI.patternCycle = 1;
    const phase2Intent = bossAI.decide(boss, player, null, 16);
    expect(phase2Intent.shouldAttack).toBe(true);
    expect(phase2Intent.attackKey).toBe('shockwave');

    // Derrota final do Boss reutilizando CombatSystem do jogador (idempotente)
    boss.state.currentHp = 10;
    boss.body.x = 320;
    boss.body.y = 435;
    const combat = new CombatSystem();
    combat.requestAttack(ATTACK_TYPES.HEAVY, 500, player);
    combat.update(16, player, [boss]);

    expect(boss.isDead()).toBe(true);
    expect(onDefeated).toHaveBeenCalledTimes(1);

    // Golpes extras após morto não disparam onDefeated novamente
    boss.onHit({ attack: COMBOS[0], damage: 50, direction: 1 });
    expect(onDefeated).toHaveBeenCalledTimes(1);
  });

  it('consolida progresso completo no RunManager e formata resumos de Vitória e Game Over', () => {
    const run = new RunManager({
      characterId: 'character_2',
      characterName: 'Personagem 2',
      seed: 'run-final',
      totalEnemyTarget: 100,
    });

    run.updateTime(45200);
    run.registerDrinkCollected();
    run.registerDrinkCollected();
    run.syncProgress({
      defeatedEnemies: 100,
      officialShopsVisited: 3,
      specialShopsVisited: 1,
      acquiredUpgrades: ['Soco de Aço', 'Pernas de Mola', 'Capacete de Obra', 'Faixa Ninja'],
    });
    run.markBossSpawned(1);
    run.setBossPhase(2);
    expect(run.markVictory()).toBe(true);
    expect(run.markDefeat()).toBe(false); // não sobrescreve vitória já concluída

    const summary = run.getSummary();
    expect(summary.status).toBe('victory');
    expect(summary.bossDefeated).toBe(true);
    expect(summary.drinksCollected).toBe(2);

    const victoryLines = formatVictorySummaryLines(summary);
    expect(victoryLines.join('\n')).toContain('100 / 100');
    expect(victoryLines.join('\n')).toContain('Boss Final derrotado: Sim');

    const defeatRun = new RunManager({ characterName: 'Personagem 1' });
    defeatRun.syncProgress({ defeatedEnemies: 42 });
    defeatRun.markDefeat();
    const gameOverLines = formatGameOverSummaryLines(defeatRun.getSummary());
    expect(gameOverLines.join('\n')).toContain('42 / 100');
  });
});
