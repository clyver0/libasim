import { describe, expect, it, vi } from 'vitest';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { ENEMY_CONFIG } from '../src/constants/enemies.js';
import { PHYSICS } from '../src/constants/physics.js';
import { ATTACK_TYPES, COMBOS } from '../src/data/attacks.js';
import { getCharacterById } from '../src/data/characters.js';
import { getDefaultEnemyType } from '../src/data/enemies.js';
import { Enemy } from '../src/entities/Enemy.js';
import { EnemyState } from '../src/entities/EnemyState.js';
import { Player } from '../src/entities/Player.js';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';
import {
  EnemyAI,
  computeTakeoffPoint,
  findNextReachableStep,
} from '../src/systems/EnemyAI.js';
import { SpawnSystem } from '../src/systems/SpawnSystem.js';
import { formatEnemyCounter } from '../src/ui/Hud.js';

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
    fillRect: vi.fn(),
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
            width: gameObject.width,
            height: gameObject.height,
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

describe('Fase 4 — Inimigos, IA, Spawn e Progressão de Dificuldade', () => {
  it('cria inimigos com atributos válidos e separação entre física e visual', () => {
    const scene = createMockScene();
    const baseData = getDefaultEnemyType();
    const enemy = new Enemy(scene, 300, 32, baseData, { id: 'enemy_1' });

    expect(enemy.id).toBe('enemy_1');
    expect(enemy.state.currentHp).toBe(baseData.baseStats.maxHp);
    expect(enemy.state.maxHp).toBe(baseData.baseStats.maxHp);
    expect(enemy.state.strength).toBe(baseData.baseStats.strength);
    expect(enemy.state.moveSpeed).toBe(baseData.baseStats.moveSpeed);
    expect(enemy.state.attackSpeed).toBe(baseData.baseStats.attackSpeed);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.FALLING);
    expect(enemy.visual.body).toBeUndefined();
    expect(enemy.collider.body).toBeDefined();

    const hurtbox = enemy.getHurtbox();
    expect(hurtbox.width).toBe(baseData.bodyWidth);
    expect(hurtbox.height).toBe(baseData.bodyHeight);

    enemy.destroy();
    expect(scene.listeners.postupdate).toBeUndefined();
  });

  it('aplica dano de golpes individuais e combos, knockback, texto de dano/combo e morte idempotente', () => {
    const scene = createMockScene();
    const textEntries = [];
    scene.add.text = vi.fn((x, y, content, style) => {
      const obj = {
        x,
        y,
        content,
        style,
        setOrigin: vi.fn(() => obj),
        setDepth: vi.fn(() => obj),
        destroy: vi.fn(),
      };
      textEntries.push(obj);
      return obj;
    });
    scene.tweens = { add: vi.fn() };

    const onDefeated = vi.fn();
    const baseData = getDefaultEnemyType();
    const player = new Player(scene, 200, 472, getCharacterById('char_a'));
    const enemy = new Enemy(scene, 232, 472, baseData, {
      id: 'enemy_test',
      onDefeated,
    });
    enemy.body.blocked.down = true;

    const combat = new CombatSystem();
    combat.requestAttack(ATTACK_TYPES.LIGHT, 100);
    combat.update(20, player, [enemy]);

    expect(enemy.state.currentHp).toBeLessThan(enemy.state.maxHp);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.HURT);
    expect(enemy.body.velocity.x).toBeGreaterThan(0);
    expect(textEntries[0].content).toContain('Golpe Leve');
    expect(textEntries[0].content).toContain(`-${player.state.effectiveStats.strength}`);

    // Finaliza o inimigo com dano de combo (DamageCalculator)
    const comboFinisher = COMBOS[1];
    enemy.onHit({
      attack: comboFinisher,
      damage: enemy.state.currentHp + 50,
      knockback: comboFinisher.knockback,
      direction: 1,
    });

    expect(textEntries[1].content).toContain(`COMBO! ${comboFinisher.name}`);
    expect(textEntries[1].content).toContain('-');

    expect(enemy.isDead()).toBe(true);
    expect(enemy.state.currentHp).toBe(0);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.DEAD);
    expect(onDefeated).toHaveBeenCalledTimes(1);

    // Golpes adicionais em inimigo morto não disparam contagem duplicada
    enemy.onHit({ attack: comboFinisher, damage: 20, direction: 1 });
    expect(onDefeated).toHaveBeenCalledTimes(1);
  });

  it('permite ataque inimigo ao jogador respeitando alcance, recuperação e invulnerabilidade', () => {
    const scene = createMockScene();
    const player = new Player(scene, 200, 472, getCharacterById('char_a'));
    const enemy = new Enemy(scene, 230, 472, getDefaultEnemyType(), {
      id: 'attacker_1',
    });
    player.body.blocked.down = true;
    enemy.body.blocked.down = true;
    enemy.state.setBehaviorState(ENEMY_CONFIG.STATES.CHASING);

    const ai = new EnemyAI();
    const intent = ai.decide(enemy, player, null, [enemy], 16);
    expect(intent.shouldAttack).toBe(true);
    expect(intent.facing).toBe(-1);

    const initialHp = player.state.currentHp;
    enemy.update(16, intent, player);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.WINDUP);

    // Avança além do windup para entrar em ATTACKING e acertar o jogador
    enemy.update(enemy.state.attack.windupMs + 1, null, player);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.ATTACKING);
    enemy.update(16, null, player);

    expect(player.state.currentHp).toBeLessThan(initialHp);
    expect(player.isInvulnerable()).toBe(true);

    // Mesmo se outro inimigo atacar imediatamente, invulnerabilidade protege o jogador
    const hpAfterFirstHit = player.state.currentHp;
    expect(
      player.onHit({ damage: 15, knockback: 10, direction: -1 })
    ).toBe(false);
    expect(player.state.currentHp).toBe(hpAfterFirstHit);

    // Conclui activeMs e entra em RECOVERING, retomando CHASING ao final
    enemy.update(enemy.state.attack.activeMs + 1, null, player);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.RECOVERING);
    enemy.update(enemy.state.attack.recoveryMs + 1, null, player);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.CHASING);
  });

  it('persegue o jogador, evita plataformas impossíveis, desvia de teto e usa cooldown de pulo', () => {
    const scene = createMockScene();
    const player = new Player(scene, 500, 472, getCharacterById('char_a'));
    const enemy = new Enemy(scene, 200, 472, getDefaultEnemyType(), {
      id: 'ai_1',
    });
    player.body.blocked.down = true;
    enemy.body.blocked.down = true;
    enemy.state.setBehaviorState(ENEMY_CONFIG.STATES.CHASING);

    const ground = { id: 'ground', x: 480, y: 520, width: 960, height: 40, isGround: true };
    const reachablePlatform = { id: 'plat_1', x: 340, y: 426, width: 160, height: 18 };
    const impossiblePlatform = { id: 'plat_high', x: 340, y: 120, width: 160, height: 18 };
    const layout = {
      ground,
      platforms: [reachablePlatform, impossiblePlatform],
    };

    const ai = new EnemyAI();

    // Perseguição no chão
    const chaseIntent = ai.decide(enemy, player, layout, [enemy], 16);
    expect(chaseIntent.moveDir).toBeGreaterThan(0);
    expect(chaseIntent.shouldAttack).toBe(false);

    // Escolha de plataformas alcançáveis vs impossíveis
    const enemyPhysics = {
      GRAVITY_Y: PHYSICS.GRAVITY_Y,
      PLAYER_MOVE_SPEED: enemy.state.moveSpeed,
      PLAYER_JUMP_VELOCITY: enemy.state.jumpVelocity,
    };
    expect(
      findNextReachableStep(ground, reachablePlatform, [ground, reachablePlatform, impossiblePlatform], enemyPhysics)
    ).toEqual(reachablePlatform);
    expect(
      findNextReachableStep(ground, impossiblePlatform, [ground, reachablePlatform, impossiblePlatform], enemyPhysics)
    ).toBeNull();

    // Ponto de decolagem evita saltar diretamente sob a plataforma de cima
    const takeoff = computeTakeoffPoint(ground, reachablePlatform, 340, 24);
    expect(
      takeoff < reachablePlatform.x - reachablePlatform.width / 2 ||
        takeoff > reachablePlatform.x + reachablePlatform.width / 2
    ).toBe(true);

    // Quando o inimigo está sob a plataforma e o jogador está nela, anda para fora da sombra antes de pular
    player.body.x = reachablePlatform.x - 12;
    player.body.y = reachablePlatform.y - 9 - 56;
    enemy.body.x = reachablePlatform.x - 12;
    enemy.body.y = ground.y - 20 - 56;
    const underShadowIntent = ai.decide(enemy, player, layout, [enemy], 200);
    expect(underShadowIntent.jump).toBe(false);
    expect(Math.abs(underShadowIntent.moveDir)).toBeGreaterThan(0);

    // Na posição segura de decolagem, pula uma vez e respeita cooldown nos frames seguintes
    enemy.body.x = takeoff - 12;
    const jumpIntent = ai.decide(enemy, player, layout, [enemy], 200);
    expect(jumpIntent.jump).toBe(true);
    const secondJumpIntent = ai.decide(enemy, player, layout, [enemy], 16);
    expect(secondJumpIntent.jump).toBe(false);

    // Quando o inimigo está em uma plataforma acima do jogador, mantém borda firme sem oscilar no meio
    enemy.body.blocked.down = true;
    enemy.aiMemory.jumpTarget = null;
    enemy.body.x = reachablePlatform.x - 12;
    enemy.body.y = reachablePlatform.y - 9 - 56;
    player.body.x = reachablePlatform.x - 12;
    player.body.y = ground.y - 20 - 56;

    const dropIntent1 = ai.decide(enemy, player, layout, [enemy], 16);
    const firstDropDir = Math.sign(dropIntent1.moveDir);
    expect(firstDropDir).not.toBe(0);

    // Simula inimigo cruzando o centro X diretamente acima do jogador: não deve inverter direção
    enemy.body.x = reachablePlatform.x - 12 + firstDropDir * 10;
    const dropIntent2 = ai.decide(enemy, player, layout, [enemy], 16);
    expect(Math.sign(dropIntent2.moveDir)).toBe(firstDropDir);

    // Ao sair da borda, a IA para de inverter o sentido durante a queda.
    enemy.body.blocked.down = false;
    enemy.body.touching.down = false;
    const fallingIntent1 = ai.decide(enemy, player, layout, [enemy], 16);
    player.body.x = 800;
    const fallingIntent2 = ai.decide(enemy, player, layout, [enemy], 16);
    expect(fallingIntent1.moveDir).toBe(0);
    expect(fallingIntent2.moveDir).toBe(0);
  });

  it('controla spawn no topo, evasão do jogador, limites simultâneos e parada após 100 derrotas', () => {
    const onAllDefeated = vi.fn();
    const spawn = new SpawnSystem({
      seed: 12345,
      onAllDefeated,
    });

    // Limites progressivos configuráveis: 5 -> 7 -> 10
    expect(spawn.getMaxSimultaneous()).toBe(5);
    expect(formatEnemyCounter(0, 100)).toBe('Inimigos: 0 / 100');

    // Respeita intervalo e evita spawn sobre o jogador
    expect(spawn.update(100, { playerX: 480, activeEnemies: [] })).toBeNull();
    const spawned = spawn.update(ENEMY_CONFIG.SPAWN.INITIAL_DELAY_MS, {
      playerX: 480,
      activeEnemies: [],
    });
    expect(spawned).not.toBeNull();
    expect(spawned.y).toBe(ENEMY_CONFIG.SPAWN.TOP_Y);
    expect(Math.abs(spawned.x - 480)).toBeGreaterThanOrEqual(
      ENEMY_CONFIG.SPAWN.MIN_PLAYER_DISTANCE_X
    );

    // Respeita limite simultâneo de 5 no início
    const fiveActive = Array.from({ length: 5 }, (_, i) => ({
      id: `active_${i}`,
      x: 100 + i * 80,
      y: 32,
    }));
    expect(spawn.canSpawn(5)).toBe(false);
    expect(
      spawn.update(5000, { playerX: 480, activeEnemies: fiveActive })
    ).toBeNull();

    // Contagem é idempotente e remoção administrativa não conta como derrota
    expect(spawn.markEnemyDefeated(spawned.id)).toBe(true);
    expect(spawn.markEnemyDefeated(spawned.id)).toBe(false);
    expect(spawn.defeatedCount).toBe(1);

    spawn.unregisterActiveEnemy('nao_derrotado');
    expect(spawn.defeatedCount).toBe(1);

    // Simula progresso até estágios médio (7) e final (10)
    for (let i = 2; i <= 34; i += 1) {
      spawn.markEnemyDefeated(`sim_${i}`);
    }
    expect(spawn.getMaxSimultaneous()).toBe(7);

    for (let i = 35; i <= 67; i += 1) {
      spawn.markEnemyDefeated(`sim_${i}`);
    }
    expect(spawn.getMaxSimultaneous()).toBe(10);

    // Quando derrotados + ativos == 100, não spawna excedente
    for (let i = 68; i <= 95; i += 1) {
      spawn.markEnemyDefeated(`sim_${i}`);
    }
    expect(spawn.defeatedCount).toBe(95);
    expect(spawn.canSpawn(5)).toBe(false);
    expect(spawn.canSpawn(4)).toBe(true);

    // Ao atingir 100 derrotas, interrompe definitivamente e dispara callback único
    for (let i = 96; i <= 100; i += 1) {
      spawn.markEnemyDefeated(`sim_${i}`);
    }
    expect(spawn.defeatedCount).toBe(100);
    expect(spawn.isCompleted()).toBe(true);
    expect(spawn.canSpawn(0)).toBe(false);
    expect(onAllDefeated).toHaveBeenCalledTimes(1);
  });

  it('aumenta dificuldade apenas após visita oficial à loja do Chiquinho e sem escalonamento duplicado', () => {
    const difficulty = new DifficultySystem();
    const spawn = new SpawnSystem({ seed: 99 });
    const baseData = getDefaultEnemyType();

    // Derrotar inimigos NÃO altera a dificuldade
    spawn.markEnemyDefeated('e1');
    spawn.markEnemyDefeated('e2');
    const level0 = difficulty.scaleEnemyData(baseData);
    expect(level0.scaledStats.maxHp).toBe(baseData.baseStats.maxHp);
    expect(level0.scaledStats.strength).toBe(baseData.baseStats.strength);
    expect(level0.scaledStats.moveSpeed).toBe(baseData.baseStats.moveSpeed);

    // Visita não oficial (ex.: futura loja do Coquinho Extra) NÃO altera a dificuldade
    const specialResult = difficulty.handleShopVisit({
      isOfficial: false,
      source: 'coquinho_extra',
    });
    expect(specialResult.applied).toBe(false);
    expect(difficulty.officialShopVisits).toBe(0);

    // Visita oficial à loja do Chiquinho aumenta HP, força e velocidade
    const official1 = difficulty.handleShopVisit({
      isOfficial: true,
      milestone: 25,
    });
    expect(official1.applied).toBe(true);
    expect(difficulty.officialShopVisits).toBe(1);

    const level1 = difficulty.scaleEnemyData(baseData);
    expect(level1.scaledStats.maxHp).toBeGreaterThan(baseData.baseStats.maxHp);
    expect(level1.scaledStats.strength).toBeGreaterThan(baseData.baseStats.strength);
    expect(level1.scaledStats.moveSpeed).toBeGreaterThan(baseData.baseStats.moveSpeed);

    // Criar EnemyState a partir de scaledStats não aplica escalonamento duplicado
    const state = new EnemyState(level1, {
      id: 'scaled_enemy',
      scaledStats: level1.scaledStats,
    });
    expect(state.maxHp).toBe(level1.scaledStats.maxHp);
    expect(state.strength).toBe(level1.scaledStats.strength);
    expect(state.moveSpeed).toBe(level1.scaledStats.moveSpeed);

    // Catálogo base permanece intacto
    expect(baseData.baseStats.maxHp).toBe(56);

    // Instanciar Enemy diretamente com scaledData aplica scaledStats sem precisar repassar opção separada
    const scene = createMockScene();
    const scaledEnemy = new Enemy(scene, 300, 32, level1, {
      id: 'enemy_scaled_1',
    });
    expect(scaledEnemy.state.maxHp).toBe(level1.scaledStats.maxHp);
    expect(scaledEnemy.state.strength).toBe(level1.scaledStats.strength);
    expect(scaledEnemy.state.moveSpeed).toBe(level1.scaledStats.moveSpeed);

    // Reaplicar scaleEnemyData sobre objeto já escalonado continua calculando uma única vez sobre baseStats
    const rescaled = difficulty.scaleEnemyData(level1);
    expect(rescaled.scaledStats).toEqual(level1.scaledStats);
  });

  it('impede contagem de derrotas após remoção administrativa e interrompe IA, ataques e spawns na morte do jogador', () => {
    const scene = createMockScene();
    const player = new Player(scene, 200, 472, getCharacterById('char_a'));
    const enemy = new Enemy(scene, 230, 472, getDefaultEnemyType(), {
      id: 'enemy_stop_test',
    });
    player.body.blocked.down = true;
    enemy.body.blocked.down = true;
    enemy.state.setBehaviorState(ENEMY_CONFIG.STATES.CHASING);

    // EnemyAI não manipula posição vertical diretamente (nem y nem velocity.y)
    const ai = new EnemyAI();
    const initialY = enemy.body.y;
    const initialVy = enemy.body.velocity.y;
    const chasingIntent = ai.decide(enemy, player, null, [enemy], 16);
    expect(chasingIntent.shouldAttack).toBe(true);
    expect(enemy.body.y).toBe(initialY);
    expect(enemy.body.velocity.y).toBe(initialVy);

    // Coloca inimigo em ATTACKING com hitbox ativa e jogador em ataque ativo
    enemy.update(16, chasingIntent, player);
    enemy.update(enemy.state.attack.windupMs + 1, null, player);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.ATTACKING);

    const combat = new CombatSystem();
    combat.requestAttack(ATTACK_TYPES.LIGHT, 100);
    expect(combat.isAttacking()).toBe(true);

    // Jogador morre
    player.state.applyDamage(player.state.currentHp + 100);
    expect(player.isDead()).toBe(true);

    // CombatSystem cancela ataque ativo quando atacante está morto
    combat.update(16, player, [enemy]);
    expect(combat.isIdle()).toBe(true);
    expect(combat.currentHitboxBounds).toBeNull();

    // EnemyAI retorna intenção neutra e Enemy interrompe ataque/hitbox ativa
    const deadPlayerIntent = ai.decide(enemy, player, null, [enemy], 16);
    expect(deadPlayerIntent.moveDir).toBe(0);
    expect(deadPlayerIntent.jump).toBe(false);
    expect(deadPlayerIntent.shouldAttack).toBe(false);

    enemy.update(16, deadPlayerIntent, player);
    expect(enemy.currentHitboxBounds).toBeNull();
    expect(enemy.body.velocity.x).toBe(0);
    expect(enemy.state.behaviorState).toBe(ENEMY_CONFIG.STATES.CHASING);

    // SpawnSystem interrompe spawns na parada/morte do jogador e bloqueia contagem de removidos sem derrota
    const spawn = new SpawnSystem({ seed: 77 });
    const req = spawn.update(ENEMY_CONFIG.SPAWN.INITIAL_DELAY_MS, {
      playerX: 480,
      activeEnemies: [],
    });
    expect(req).not.toBeNull();

    expect(spawn.unregisterActiveEnemy(req.id)).toBe(true);
    expect(spawn.markEnemyDefeated(req.id)).toBe(false);
    expect(spawn.defeatedCount).toBe(0);

    expect(
      spawn.update(5000, { playerX: 480, activeEnemies: [], playerDead: true })
    ).toBeNull();
    spawn.stop();
    expect(spawn.canSpawn(0)).toBe(false);
    expect(spawn.update(5000, { playerX: 480, activeEnemies: [] })).toBeNull();
  });
});
