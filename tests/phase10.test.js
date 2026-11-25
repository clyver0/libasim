import { describe, expect, it, vi } from 'vitest';

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

import { AudioManager } from '../src/audio/AudioManager.js';
import {
  SOUND_KEYS,
  createToneWavDataUri,
  registerDefaultSoundBank,
} from '../src/audio/SoundBank.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { ATTACK_TYPES, COMBOS } from '../src/data/attacks.js';
import {
  DEFAULT_BOSS_DATA,
  DEFAULT_MINI_BOSS_DATA,
  scaleBossData,
} from '../src/data/boss.js';
import { getCharacterById } from '../src/data/characters.js';
import { DRINKS, describeDrinkModifiers, getDrinkById } from '../src/data/drinks.js';
import {
  ENEMY_TYPES,
  getDefaultEnemyType,
  pickEnemyTypeForProgress,
} from '../src/data/enemies.js';
import { UPGRADES, summarizeUpgradeEffects } from '../src/data/upgrades.js';
import { Boss } from '../src/entities/Boss.js';
import { Enemy } from '../src/entities/Enemy.js';
import { GoldenCharacter } from '../src/entities/GoldenCharacter.js';
import { Player } from '../src/entities/Player.js';
import { BossAI } from '../src/systems/BossAI.js';
import {
  CharacterAppearanceSystem,
  computePoseSkeleton,
} from '../src/systems/CharacterAppearanceSystem.js';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';
import { DrinkEffectManager } from '../src/systems/DrinkEffectManager.js';
import { DrinkSystem } from '../src/systems/DrinkSystem.js';
import { EnemyAI } from '../src/systems/EnemyAI.js';
import { GoldenEventScheduler } from '../src/systems/GoldenEventScheduler.js';
import { PlatformGenerator } from '../src/systems/PlatformGenerator.js';
import { RunManager } from '../src/systems/RunManager.js';
import { ShopSystem } from '../src/systems/ShopSystem.js';
import { SpawnSystem } from '../src/systems/SpawnSystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';
import {
  formatAcquiredUpgradesList,
  formatBossHudLabel,
  formatDetailedActiveEffects,
} from '../src/ui/Hud.js';
import { Tooltip, computeTooltipPosition } from '../src/ui/Tooltip.js';

function createMockScene() {
  const listeners = {};
  const makeInteractiveObj = (extra = {}) => {
    const handlers = {};
    const obj = {
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      handlers,
      setOrigin: vi.fn(() => obj),
      setDepth: vi.fn(() => obj),
      setStrokeStyle: vi.fn(() => obj),
      setFillStyle: vi.fn(() => obj),
      setSize: vi.fn(function (w, h) {
        this.width = w;
        this.height = h;
        return obj;
      }),
      setPosition: vi.fn(function (x, y) {
        this.x = x;
        this.y = y;
        return obj;
      }),
      setVisible: vi.fn(() => obj),
      setText: vi.fn(() => obj),
      setY: vi.fn(() => obj),
      setInteractive: vi.fn(() => obj),
      on: vi.fn((ev, cb) => {
        handlers[ev] = cb;
      }),
      add: vi.fn(),
      removeAll: vi.fn(),
      destroy: vi.fn(),
      ...extra,
    };
    return obj;
  };

  return {
    scale: { width: 960, height: 540 },
    listeners,
    events: {
      on: vi.fn((ev, fn) => {
        listeners[ev] = fn;
      }),
      off: vi.fn(),
    },
    add: {
      rectangle: vi.fn((x, y, width, height) =>
        makeInteractiveObj({ x, y, width, height })
      ),
      circle: vi.fn((x, y, r) => makeInteractiveObj({ x, y, radius: r })),
      text: vi.fn((x, y) => makeInteractiveObj({ x, y, width: 140, height: 18 })),
      container: vi.fn((x, y) => makeInteractiveObj({ x, y })),
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
        setDepth: vi.fn(function () {
          return this;
        }),
        setPosition: vi.fn(function (nx, ny) {
          this.x = nx;
          this.y = ny;
        }),
        destroy: vi.fn(),
      })),
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
            setAllowGravity: vi.fn(),
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

describe('Fase 10 — Interface, Tooltips, Áudio e Fluxo Integrado Completo da Run', () => {
  it('posiciona Tooltips respeitando bordas da tela e exibe título e explicação em hover', () => {
    const posNormal = computeTooltipPosition(100, 100, 220, 80, 960, 540);
    expect(posNormal.x).toBe(114);
    expect(posNormal.y).toBe(114);

    // Próximo ao canto inferior direito: faz clamp sem cortar fora da tela
    const posEdge = computeTooltipPosition(920, 510, 220, 80, 960, 540, 12);
    expect(posEdge.x + 220).toBeLessThanOrEqual(960 - 12);
    expect(posEdge.y + 80).toBeLessThanOrEqual(540 - 12);

    const scene = createMockScene();
    const tooltip = new Tooltip(scene);
    const target = scene.add.rectangle(50, 50, 100, 40);

    tooltip.attach(target, {
      title: 'Força',
      description: 'Influencia o dano causado pelos golpes.',
    });

    target.handlers.pointerover({ x: 60, y: 60 });
    expect(tooltip.visible).toBe(true);
    target.handlers.pointerout();
    expect(tooltip.visible).toBe(false);
    tooltip.destroy();
  });

  it('gera banco de efeitos sonoros e trilha em WAV válido e controla mute/música no AudioManager', () => {
    const uri = createToneWavDataUri({
      notes: [{ freq: 440, durationSec: 0.05 }],
    });
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);

    const audio = new AudioManager();
    expect(registerDefaultSoundBank(audio)).toBe(true);
    // Idempotente
    expect(registerDefaultSoundBank(audio)).toBe(false);

    expect(audio.play(SOUND_KEYS.ATTACK_LIGHT)).toBe(1);
    expect(audio.playMusic(SOUND_KEYS.BGM_LOOP)).toBe(1);
    // Chamar playMusic com a mesma trilha não duplica reprodução
    expect(audio.playMusic(SOUND_KEYS.BGM_LOOP)).toBeNull();
    audio.stopMusic();
    expect(audio.currentMusicKey).toBeNull();

    expect(audio.toggleMute()).toBe(true);
    expect(audio.toggleMute()).toBe(false);
  });

  it('executa fluxo completo fim-a-fim de uma run (0 -> 100 inimigos, bebidas, Coquinho, 3 lojas oficiais, Boss Fases 1/2, Vitória e limpeza)', () => {
    const seed = 'full-e2e-run-2026';
    const scene = createMockScene();
    const character = getCharacterById('character_1');
    const player = new Player(scene, 480, 472, character);
    const initialStats = { ...player.state.effectiveStats };

    const platformGen = new PlatformGenerator({ width: 960, height: 540 });
    let currentLayout = platformGen.generate(seed);

    const difficultySystem = new DifficultySystem();
    const spawnSystem = new SpawnSystem({ seed });
    const drinkSystem = new DrinkSystem({ seed: `${seed}-drinks` });
    const drinkEffects = new DrinkEffectManager();
    const appearanceSystem = new CharacterAppearanceSystem();
    const upgradeSystem = new UpgradeSystem({
      seed: `${seed}-upgrades`,
      onUpgradesChanged: (upgs) => {
        const appState = appearanceSystem.setUpgrades(upgs);
        player.syncBodyScale();
        player.setAppearanceState(appState);
      },
    });
    const goldenScheduler = new GoldenEventScheduler({ seed: `${seed}-gold` });
    const shopSystem = new ShopSystem({
      upgradeSystem,
      difficultySystem,
      onShopClosed: (summary) => {
        if (summary.shouldRegeneratePlatforms) {
          currentLayout = platformGen.generate(
            `${seed}-official-${shopSystem.officialVisitsCompleted}`
          );
        }
      },
    });
    const runManager = new RunManager({
      characterId: character.id,
      characterName: character.name,
      seed,
    });
    const combatSystem = new CombatSystem();
    const enemyAI = new EnemyAI();
    const bossAI = new BossAI();

    // Simula progressão completa dos 100 inimigos comuns
    for (let i = 1; i <= 100; i += 1) {
      const enemyData = difficultySystem.scaleEnemyData(getDefaultEnemyType());
      const enemy = new Enemy(scene, 500, 472, enemyData, {
        id: `run_enemy_${i}`,
        onDefeated: (e) => spawnSystem.markEnemyDefeated(e.id),
      });

      // Exercita IA em múltiplos inimigos simultâneos para validar estabilidade/performance
      const intent = enemyAI.decide(enemy, player, currentLayout, [enemy], 16);
      enemy.update(16, intent, player);

      // Derrota o inimigo
      enemy.onHit({ attack: COMBOS[0], damage: 9999, direction: 1 });
      enemy.destroy();

      // Coleta periódica de bebidas ao longo da run
      if (i % 20 === 0) {
        const pickedDrink = drinkSystem.pickDrink({
          rarityBonus: player.state.gameplayModifiers.drinkRarityBonus,
        });
        drinkEffects.applyDrink(pickedDrink ?? getDrinkById('cerveja'), player.state);
        runManager.registerDrinkCollected();
      }
      drinkEffects.update(1500, player.state);

      // Checa aparição garantida do Coquinho Extra e acerta para ganhar Loja Especial
      const goldTrigger = goldenScheduler.checkTrigger(spawnSystem.defeatedCount);
      if (goldTrigger) {
        const coquinho = new GoldenCharacter(scene, {
          id: goldTrigger.id,
          direction: goldTrigger.direction,
          onHitReward: () => shopSystem.enqueueSpecialShop({ source: 'coquinho_extra' }),
        });
        coquinho.onHit({ attack: COMBOS[0], damage: 10 });
        coquinho.destroy();
      }

      // Checa lojas oficiais (25, 50, 75)
      shopSystem.checkOfficialMilestones(spawnSystem.defeatedCount);

      // Processa todas as lojas abertas na fila (especiais e oficiais sequencialmente)
      while (shopSystem.isOpen()) {
        shopSystem.selectOption(0, player.state);
      }

      // Aos 50 mortos, enfrenta e derrota o Mini-Chefão!
      if (spawnSystem.defeatedCount === 50 && !runManager.miniBossSpawned) {
        const scaledMini = scaleBossData(DEFAULT_MINI_BOSS_DATA, {
          officialShopVisits: difficultySystem.officialShopVisits,
        });
        const miniBoss = new Boss(scene, 500, 455, scaledMini, {
          onDefeated: () => runManager.markMiniBossDefeated(),
        });
        runManager.markMiniBossSpawned();
        expect(miniBoss.state.countsAsCommonEnemy).toBe(false);
        miniBoss.onHit({
          attack: COMBOS[2],
          damage: miniBoss.state.maxHp + 50,
          direction: 1,
        });
        expect(miniBoss.isDead()).toBe(true);
        miniBoss.destroy();
      }

      runManager.updateTime(500);
    }

    expect(runManager.miniBossSpawned).toBe(true);
    expect(runManager.miniBossDefeated).toBe(true);

    expect(spawnSystem.isCompleted()).toBe(true);
    expect(spawnSystem.defeatedCount).toBe(100);
    expect(difficultySystem.officialShopVisits).toBe(3);
    expect(shopSystem.officialVisitsCompleted).toBe(3);
    expect(shopSystem.specialVisitsCompleted).toBeGreaterThanOrEqual(1);
    expect(upgradeSystem.getAcquiredUpgrades().length).toBeGreaterThanOrEqual(4);

    // Após os 100 inimigos comuns, surge o Boss Final!
    const scaledBossData = scaleBossData(DEFAULT_BOSS_DATA, {
      officialShopVisits: difficultySystem.officialShopVisits,
    });
    const boss = new Boss(scene, 510, 455, scaledBossData, {
      onPhaseChanged: (phase) => runManager.setBossPhase(phase),
      onDefeated: () => runManager.markVictory(),
    });
    runManager.markBossSpawned(1);

    expect(formatBossHudLabel(boss.state.getSnapshot())).toContain('[FASE 1]');

    // Combate contra o Boss: leva à Fase 2 e depois derrota
    const bossIntent = bossAI.decide(boss, player, currentLayout, 16);
    boss.update(16, bossIntent, player);

    boss.onHit({
      attack: COMBOS[4],
      damage: Math.ceil(boss.state.maxHp * 0.6),
      direction: 1,
    });
    expect(boss.state.phase).toBe(2);
    expect(formatBossHudLabel(boss.state.getSnapshot())).toContain(
      '[FASE 2 — ENFURECIDO]'
    );

    boss.onHit({
      attack: COMBOS[4],
      damage: boss.state.currentHp + 100,
      direction: 1,
    });
    expect(boss.isDead()).toBe(true);
    expect(runManager.getSummary().status).toBe('victory');
    expect(runManager.getSummary().bossDefeated).toBe(true);

    // Verifica limpeza total ao encerrar/reiniciar run
    drinkEffects.clear(player.state);
    upgradeSystem.reset(player.state);
    appearanceSystem.reset();
    shopSystem.reset();
    difficultySystem.reset();
    combatSystem.cancel();
    boss.destroy();
    player.destroy();

    expect(drinkEffects.getActiveEffects()).toHaveLength(0);
    expect(upgradeSystem.getAcquiredUpgrades()).toHaveLength(0);
    expect(player.state.effectiveStats).toEqual(initialStats);
  });

  it('permite continuar atacando normalmente após adquirir upgrade quando a loja abre durante um golpe ativo', () => {
    const scene = createMockScene();
    const player = new Player(scene, 200, 472, getCharacterById('character_1'));
    const combatSystem = new CombatSystem();
    const upgradeSystem = new UpgradeSystem({
      seed: 'attack-after-shop',
      onUpgradesChanged: () => player.syncBodyScale(),
    });
    const difficultySystem = new DifficultySystem();
    const shopSystem = new ShopSystem({
      upgradeSystem,
      difficultySystem,
      onShopOpened: () => {
        // Exatamente como MainScene._onShopOpened faz dentro do callback de derrota/Coquinho
        combatSystem.cancel();
      },
      onShopClosed: () => {
        combatSystem.cancel();
      },
    });

    // Alvo que abre a loja no exato instante em que é atingido por CombatSystem.update()
    const triggerTarget = {
      id: 'milestone_enemy_25',
      hurtbox: { x: 210, y: 444, width: 26, height: 56 },
      onHit: () => {
        shopSystem.checkOfficialMilestones(25);
      },
    };

    expect(combatSystem.requestAttack(ATTACK_TYPES.LIGHT, 100, player)).toBe(true);
    combatSystem.update(16, player, [triggerTarget]);

    // A loja abriu durante o golpe e cancelou o ataque sem prender em RECOVERING órfão!
    expect(shopSystem.isOpen()).toBe(true);
    expect(combatSystem.isIdle()).toBe(true);

    // Jogador escolhe um upgrade (inclusive testando Miniatura/Gigantismo com syncBodyScale)
    shopSystem.selectOption(0, player.state);
    expect(shopSystem.isOpen()).toBe(false);

    // Imediatamente após sair da loja, o jogador consegue atacar e causar dano normalmente!
    const nextEnemy = {
      id: 'enemy_26',
      hurtbox: { x: 210, y: 444, width: 26, height: 56 },
      onHit: vi.fn(),
    };
    expect(combatSystem.requestAttack(ATTACK_TYPES.LIGHT, 5000, player)).toBe(true);
    expect(combatSystem.isAttacking()).toBe(true);
    combatSystem.update(16, player, [nextEnemy]);
    expect(nextEnemy.onHit).toHaveBeenCalledTimes(1);
  });

  it('garante que todos os 30 upgrades possuem pelo menos um benefício real, detalha bebidas/upgrades e interpola motion contínuo', () => {
    // 1. Todos os 30 upgrades têm pelo menos um bônus positivo real
    for (const upg of UPGRADES) {
      const flat = upg.modifiers?.flat ?? {};
      const gp = upg.modifiers?.gameplay ?? {};
      const hasPositiveBenefit =
        (flat.strength ?? 0) > 0 ||
        (flat.maxHp ?? 0) > 0 ||
        (flat.drinkResistance ?? 0) > 0 ||
        (gp.moveSpeedMultiplier ?? 1) > 1 ||
        (gp.jumpMultiplier ?? 1) > 1 ||
        (gp.attackSpeedMultiplier ?? 1) > 1 ||
        (gp.recoveryMultiplier ?? 1) < 1 ||
        (gp.damageMultiplier ?? 1) > 1 ||
        (gp.lightDamageMultiplier ?? 1) > 1 ||
        (gp.comboDamageMultiplier ?? 1) > 1 ||
        (gp.attackRangeMultiplier ?? 1) > 1 ||
        (gp.damageReduction ?? 0) > 0 ||
        (gp.knockbackResistance ?? 0) > 0 ||
        (gp.drinkRarityBonus ?? 0) > 0 ||
        (gp.drinkMagnetBonus ?? 0) > 0 ||
        (gp.bodyScale ?? 1) !== 1;

      expect(hasPositiveBenefit).toBe(true);
      expect(summarizeUpgradeEffects(upg).length).toBeGreaterThan(0);
    }

    // 2. Bebidas aumentam vida máxima / curam e detalham efeitos na HUD
    const drinksRaisingMaxHp = DRINKS.filter(
      (d) => (d.modifiers?.flat?.maxHp ?? 0) > 0
    );
    expect(drinksRaisingMaxHp.length).toBeGreaterThanOrEqual(4);

    const cerveja = getDrinkById('cerveja');
    expect(describeDrinkModifiers(cerveja.modifiers, { healedAmount: 20 })).toContain(
      'Vida Máx'
    );

    const scene = createMockScene();
    const player = new Player(scene, 200, 472, getCharacterById('character_1'));
    const drinkMgr = new DrinkEffectManager();
    drinkMgr.applyDrink(cerveja, player.state);

    const detailedDrinkLines = formatDetailedActiveEffects(
      drinkMgr.getActiveEffects()
    );
    expect(detailedDrinkLines[0]).toContain('Cerveja');
    expect(detailedDrinkLines[0]).toContain('Vida Máx');

    // 3. Lista detalhada de upgrades no canto da HUD
    const upgList = formatAcquiredUpgradesList([
      UPGRADES[0],
      UPGRADES[1], // Mão de Alface com bônus de velocidade de golpe!
    ]);
    expect(upgList[0]).toContain('Soco de Aço');
    expect(upgList[1]).toContain('Mão de Alface');
    expect(upgList[1]).toContain('+35% Vel.Atk');

    // 4. Cinemática contínua interpola suavemente corrida, pulo e golpes
    const skelRunA = computePoseSkeleton(1, 'idle', 28, {
      animTimeMs: 0,
      vx: 260,
      vy: 0,
      grounded: true,
    });
    const skelRunB = computePoseSkeleton(1, 'idle', 28, {
      animTimeMs: 90,
      vx: 260,
      vy: 0,
      grounded: true,
    });
    expect(skelRunA.frontFoot.x).not.toBe(skelRunB.frontFoot.x);
    expect(skelRunA.frontKnee).toBeDefined();
    expect(skelRunA.frontElbow).toBeDefined();

    // 5. Variedade de tipos de inimigos desbloqueados progressivamente
    expect(ENEMY_TYPES.length).toBeGreaterThanOrEqual(4);
    const seenTypes = new Set();
    for (let k = 0; k < 120; k += 1) {
      seenTypes.add(pickEnemyTypeForProgress(45).id);
    }
    expect(seenTypes.size).toBeGreaterThanOrEqual(3);
  });
});
