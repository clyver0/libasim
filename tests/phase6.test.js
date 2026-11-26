import { describe, expect, it, vi } from 'vitest';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { DamageCalculator } from '../src/combat/DamageCalculator.js';
import { ATTACK_TYPES, BASIC_ATTACKS, COMBOS } from '../src/data/attacks.js';
import { getCharacterById } from '../src/data/characters.js';
import { getDrinkById } from '../src/data/drinks.js';
import { UPGRADES, getUpgradeById } from '../src/data/upgrades.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Player } from '../src/entities/Player.js';
import { PlayerState } from '../src/entities/PlayerState.js';
import { DrinkEffectManager } from '../src/systems/DrinkEffectManager.js';
import { DrinkSystem } from '../src/systems/DrinkSystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';

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
        setScale: vi.fn(),
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

describe('Fase 6 — Sistema de Upgrades (30 Upgrades e Regras)', () => {
  it('declara exatamente os 30 upgrades com efeito mecânico e metadado visual separados', () => {
    expect(UPGRADES).toHaveLength(30);
    const ids = new Set(UPGRADES.map((u) => u.id));
    expect(ids.size).toBe(30);

    for (const upgrade of UPGRADES) {
      expect(upgrade.name).toBeTruthy();
      expect(upgrade.description).toBeTruthy();
      expect(upgrade.modifiers).toBeDefined();
      expect(upgrade.visual).toBeDefined();
      const hasMechanicalEffect =
        Boolean(upgrade.modifiers.flat) ||
        Boolean(upgrade.modifiers.multiplier) ||
        Boolean(upgrade.modifiers.gameplay) ||
        Boolean(upgrade.temporaryDrinkEffect);
      expect(hasMechanicalEffect).toBe(true);
    }
  });

  it('impede repetição de upgrades não-acumuláveis e respeita incompatibilidade Miniatura vs Gigantismo', () => {
    const state = new PlayerState(getCharacterById('character_1'));
    const system = new UpgradeSystem({ seed: 'upg-seed-1' });

    // Adquire Miniatura
    const miniatura = system.acquireUpgrade('miniatura', state);
    expect(miniatura).not.toBeNull();
    expect(system.hasUpgrade('miniatura')).toBe(true);

    // Não permite repetir Miniatura nem adquirir Gigantismo
    expect(system.canAcquire('miniatura')).toBe(false);
    expect(system.canAcquire('gigantismo')).toBe(false);
    expect(system.acquireUpgrade('gigantismo', state)).toBeNull();

    // Em qualquer sorteio de loja, nem Miniatura nem Gigantismo podem aparecer
    for (let i = 0; i < 20; i += 1) {
      const options = system.rollOptions(3);
      expect(options).toHaveLength(3);
      const optionIds = options.map((o) => o.id);
      expect(new Set(optionIds).size).toBe(3);
      expect(optionIds).not.toContain('miniatura');
      expect(optionIds).not.toContain('gigantismo');
    }

    // Sentido inverso: Gigantismo bloqueia Miniatura
    const sys2 = new UpgradeSystem({ seed: 'upg-seed-2' });
    expect(sys2.acquireUpgrade('gigantismo')).not.toBeNull();
    expect(sys2.canAcquire('miniatura')).toBe(false);
  });

  it('suporta upgrades acumuláveis quando explicitamente configurados como stackable', () => {
    const customCatalog = [
      {
        id: 'stack_test',
        name: 'Teste Acumulável',
        description: 'Pode acumular até 2 vezes.',
        stackable: true,
        maxStacks: 2,
        modifiers: { flat: { strength: 3 } },
        visual: { slot: 'test', type: 'test' },
      },
    ];
    const state = new PlayerState(getCharacterById('character_1'));
    const baseStr = state.effectiveStats.strength;
    const system = new UpgradeSystem({ catalog: customCatalog, seed: 10 });

    expect(system.acquireUpgrade('stack_test', state)).not.toBeNull();
    expect(state.effectiveStats.strength).toBe(baseStr + 3);
    expect(system.acquireUpgrade('stack_test', state)).not.toBeNull();
    expect(state.effectiveStats.strength).toBe(baseStr + 6);
    expect(system.canAcquire('stack_test')).toBe(false);
  });

  it('aplica corretamente efeitos positivos e negativos em atributos, combate, movimento, hitbox e bebidas', () => {
    const scene = createMockScene();
    const player = new Player(scene, 480, 472, getCharacterById('character_1'));
    const system = new UpgradeSystem({
      seed: 99,
      onUpgradesChanged: () => player.syncBodyScale(),
    });

    const baseMove = Math.abs((player.moveHorizontal(1), player.body.velocity.x));
    const baseJump = Math.abs((player.jump(), player.body.velocity.y));
    const baseBodyWidth = player.body.width;

    // Movimento e pulo: Tênis de Foguete + Capa de Super-Herói + Pernas de Mola
    system.acquireUpgrade('tenis_de_foguete', player.state);
    system.acquireUpgrade('capa_de_super_heroi', player.state);
    system.acquireUpgrade('pernas_de_mola', player.state);

    player.moveHorizontal(1);
    expect(player.body.velocity.x).toBeGreaterThan(baseMove);
    player.jump();
    expect(Math.abs(player.body.velocity.y)).toBeGreaterThan(baseJump);

    // Escala e hitbox: Gigantismo aumenta corpo físico preservando base dos pés
    const footBefore = player.body.y + player.body.height;
    system.acquireUpgrade('gigantismo', player.state);
    expect(player.body.width).toBeGreaterThan(baseBodyWidth);
    expect(player.body.y + player.body.height).toBe(footBefore);

    // Combate e dano: Luvas de Boxe (golpe leve), Tatuagem (combo), Óculos (alcance), Faixa branca (força e dano)
    const lightBefore = DamageCalculator.calculateDamage({
      attack: BASIC_ATTACKS.LIGHT,
      attackerStats: player.state.getCombatStats(),
    });
    const comboBefore = DamageCalculator.calculateDamage({
      attack: COMBOS[0],
      attackerStats: player.state.getCombatStats(),
    });

    system.acquireUpgrade('luvas_de_boxe', player.state);
    system.acquireUpgrade('tatuagem_de_dragao', player.state);
    system.acquireUpgrade('oculos_de_precisao', player.state);
    system.acquireUpgrade('faixa_branca_jiu_emy', player.state);

    const lightAfter = DamageCalculator.calculateDamage({
      attack: BASIC_ATTACKS.LIGHT,
      attackerStats: player.state.getCombatStats(),
    });
    const comboAfter = DamageCalculator.calculateDamage({
      attack: COMBOS[0],
      attackerStats: player.state.getCombatStats(),
    });
    expect(lightAfter).toBeGreaterThan(lightBefore);
    expect(comboAfter).toBeGreaterThan(comboBefore);

    const combat = new CombatSystem();
    combat.requestAttack(ATTACK_TYPES.LIGHT, 100, player);
    combat.update(10, player, []);
    expect(combat.currentHitboxBounds.width).toBeGreaterThan(
      BASIC_ATTACKS.LIGHT.hitbox.width
    );
    expect(combat._effectiveRecoveryMs).toBeGreaterThan(
      BASIC_ATTACKS.LIGHT.recoveryMs
    );

    // Defesa e knockback: Corpo de Aço + Ombros de Concreto + Joelheiras Blindadas
    system.acquireUpgrade('corpo_de_aco', player.state);
    system.acquireUpgrade('ombros_de_concreto', player.state);
    system.acquireUpgrade('joelheiras_blindadas', player.state);

    const enemyHitReduced = DamageCalculator.calculateDamage({
      attack: { baseDamage: 20, isCombo: false },
      attackerStats: { strength: 10 },
      targetStats: player.state.getCombatStats(),
    });
    expect(enemyHitReduced).toBeLessThan(20);

    player.onHit({ damage: 10, knockback: 30, direction: 1 });
    expect(player.hurtKnockbackVx).toBeLessThan(30 * 6);

    // O aliado aumenta a chance de Noias, e a mochila mantém a atração de bebidas.
    system.acquireUpgrade('aliado_chiquinho_promos', player.state);
    expect(player.state.gameplayModifiers.specialShopChanceBonus).toBe(0.2);
    system.acquireUpgrade('mochila_de_bebidas', player.state);
    expect(player.state.gameplayModifiers.drinkMagnetBonus).toBeGreaterThan(0);

    const drinkSys = new DrinkSystem({ seed: 'combo-drink' });
    const attraction = drinkSys.computeAttractionVelocity(
      { x: 100, y: 100 },
      { x: 310, y: 100 },
      { extraRadius: player.state.gameplayModifiers.drinkMagnetBonus }
    );
    expect(attraction.attracted).toBe(true);

    // Fígado de Ferro + Máscara de Gás reduzem duração de bebida e preservam upgrades após expirar bebida
    const statsWithUpgrades = { ...player.state.effectiveStats };
    system.acquireUpgrade('figado_de_ferro', player.state);
    system.acquireUpgrade('mascara_de_gas', player.state);
    const statsBeforeDrink = { ...player.state.effectiveStats };

    const drinkMgr = new DrinkEffectManager();
    const appliedDrink = drinkMgr.applyDrink(
      getDrinkById('cerveja'),
      player.state
    );
    expect(appliedDrink.resistanceAtCollection).toBeGreaterThan(
      statsWithUpgrades.drinkResistance
    );
    drinkMgr.update(appliedDrink.effect.durationMs + 100, player.state);
    expect(player.state.effectiveStats).toEqual(statsBeforeDrink);
  });

  it('aplica os modificadores de camisa e marmita a sorte, inimigos e defesa', () => {
    const state = new PlayerState(getCharacterById('character_1'));
    const system = new UpgradeSystem({ seed: 'gab-marmita' });
    const baseRarity = state.gameplayModifiers.drinkRarityBonus;
    system.acquireUpgrade('chines_do_gab', state);
    expect(state.gameplayModifiers.drinkRarityBonus).toBeGreaterThan(baseRarity);
    expect(state.gameplayModifiers.enemyMoveSpeedMultiplier).toBe(0.9);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      state: { moveSpeed: 100 },
      body: { setVelocityX: vi.fn() },
      isDead: () => false,
      moveSpeedMultiplier: 1,
      facing: -1,
    });
    enemy.setMoveSpeedMultiplier(
      state.gameplayModifiers.enemyMoveSpeedMultiplier
    );
    enemy.moveHorizontal(1);
    expect(enemy.body.setVelocityX).toHaveBeenCalledWith(90);

    const damageBeforeMarmita = DamageCalculator.calculateDamage({
      attack: { baseDamage: 20, isCombo: false },
      attackerStats: { strength: 10 },
      targetStats: state.getCombatStats(),
    });
    system.acquireUpgrade('marmita_ketchup_roubado', state);
    expect(state.effectiveStats.maxHp).toBeGreaterThan(100);
    expect(state.gameplayModifiers.damageReduction).toBeGreaterThan(0);
    expect(state.gameplayModifiers.enemyMoveSpeedMultiplier).toBeGreaterThan(0.9);

    const damageAfterMarmita = DamageCalculator.calculateDamage({
      attack: { baseDamage: 20, isCombo: false },
      attackerStats: { strength: 10 },
      targetStats: state.getCombatStats(),
    });
    expect(damageAfterMarmita).toBeLessThan(damageBeforeMarmita);
  });

  it('faz Tênis de Foguete acelerar e fortalecer muito, reduzindo resistência e sorte', () => {
    const playerState = new PlayerState(getCharacterById('character_1'));
    const baseStrength = playerState.effectiveStats.strength;
    const baseResistance = playerState.effectiveStats.drinkResistance;
    const baseSpeed = playerState.gameplayModifiers.moveSpeedMultiplier;
    const system = new UpgradeSystem({ seed: 'rocket-shoes' });

    system.acquireUpgrade('tenis_de_foguete', playerState);

    expect(playerState.effectiveStats.strength).toBeGreaterThan(baseStrength * 2);
    expect(playerState.effectiveStats.drinkResistance).toBeCloseTo(
      baseResistance * 0.5
    );
    expect(playerState.gameplayModifiers.moveSpeedMultiplier).toBeGreaterThan(
      baseSpeed * 1.6
    );
    expect(playerState.gameplayModifiers.damageMultiplier).toBe(1.25);
    expect(playerState.gameplayModifiers.drinkRarityBonus).toBe(-0.45);
  });

  it('aplica cada um dos 30 upgrades individualmente sem erro (exceto conflito mútuo)', () => {
    for (const upgrade of UPGRADES) {
      const state = new PlayerState(getCharacterById('character_1'));
      const system = new UpgradeSystem({ seed: upgrade.number });
      const result = system.acquireUpgrade(upgrade.id, state);
      expect(result).not.toBeNull();
      expect(state.effectiveStats.maxHp).toBeGreaterThanOrEqual(1);
      expect(state.effectiveStats.drinkResistance).toBeGreaterThanOrEqual(0.1);
    }
    expect(getUpgradeById('coroa_do_caos').number).toBe(30);
  });
});
