import { describe, expect, it } from 'vitest';
import { DamageCalculator } from '../src/combat/DamageCalculator.js';
import { DRINK_CONFIG } from '../src/constants/drinks.js';
import { getCharacterById } from '../src/data/characters.js';
import { DRINKS, getDrinkById } from '../src/data/drinks.js';
import { getUpgradeById } from '../src/data/upgrades.js';
import { PlayerState } from '../src/entities/PlayerState.js';
import { DrinkEffectManager } from '../src/systems/DrinkEffectManager.js';
import { DrinkSystem } from '../src/systems/DrinkSystem.js';
import { formatActiveEffects } from '../src/ui/Hud.js';

function createPlayerState() {
  const character = getCharacterById('char-a');
  return new PlayerState(character);
}

describe('Fase 5 — Bebidas e Efeitos Temporários', () => {
  it('mantém catálogo com as 8 bebidas em ordem crescente de raridade e pesos decrescentes', () => {
    expect(DRINKS).toHaveLength(8);
    expect(DRINKS.map((d) => d.name)).toEqual([
      'Água',
      'Cantinho do Vale',
      'Cerveja',
      'Gin de 10',
      'Chevette',
      'Mansão Maromba',
      'Absinto',
      'Caseirinha da Casa',
    ]);
    expect(DRINKS[7].isSpecial).toBe(true);
    expect(DRINKS[7].rarityWeight).toBeLessThan(DRINKS[6].rarityWeight);

    for (let i = 1; i < DRINKS.length; i += 1) {
      expect(DRINKS[i].rarityRank).toBeGreaterThan(DRINKS[i - 1].rarityRank);
      expect(DRINKS[i].rarityWeight).toBeLessThan(DRINKS[i - 1].rarityWeight);
    }
  });

  it('faz Água curar instantaneamente sem conceder efeito temporário ou alterar atributos', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();
    const statsBefore = { ...playerState.effectiveStats };
    playerState.applyDamage(30);
    const hpBefore = playerState.currentHp;

    const result = manager.applyDrink(getDrinkById('agua'), playerState);

    expect(result.effect).toBeNull();
    expect(result.healedAmount).toBe(18);
    expect(playerState.currentHp).toBe(hpBefore + 18);
    expect(playerState.effectiveStats).toEqual(statsBefore);
    expect(manager.hasActiveEffects()).toBe(false);
  });

  it('sorteia bebidas de forma determinística por seed e respeita distribuição de raridade', () => {
    const sysA = new DrinkSystem({ seed: 'phase5-seed' });
    const sysB = new DrinkSystem({ seed: 'phase5-seed' });

    const seqA = Array.from({ length: 20 }, () => sysA.pickDrink().id);
    const seqB = Array.from({ length: 20 }, () => sysB.pickDrink().id);
    expect(seqA).toEqual(seqB);

    const counts = {};
    for (let i = 0; i < 600; i += 1) {
      const picked = sysA.pickDrink();
      counts[picked.id] = (counts[picked.id] ?? 0) + 1;
    }

    expect(counts.cantinho_do_vale ?? 0).toBeGreaterThan(counts.absinto ?? 0);
  });

  it('calcula duração efetiva usando resistência registrada no momento da coleta e respeita limites', () => {
    const manager = new DrinkEffectManager();
    const cerveja = getDrinkById('cerveja');

    const normalDuration = manager.calculateEffectiveDuration(cerveja, 1.0);
    const highResDuration = manager.calculateEffectiveDuration(cerveja, 2.0);
    const lowResDuration = manager.calculateEffectiveDuration(cerveja, 0.5);
    const clampedMin = manager.calculateEffectiveDuration(cerveja, 100);
    const clampedMax = manager.calculateEffectiveDuration(cerveja, 0.001);

    expect(normalDuration).toBe(
      Math.round(DRINK_CONFIG.BASE_DURATION_MS * cerveja.durationMultiplier)
    );
    expect(highResDuration).toBeLessThan(normalDuration);
    expect(lowResDuration).toBeGreaterThan(normalDuration);
    expect(clampedMin).toBe(DRINK_CONFIG.MIN_EFFECTIVE_DURATION_MS);
    expect(clampedMax).toBe(DRINK_CONFIG.MAX_EFFECTIVE_DURATION_MS);
  });

  it('aplica Cachaça de Cobra por 15 segundos, drenando vida e restaurando os bônus ao expirar', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();
    const baseStrength = playerState.effectiveStats.strength;
    const baseSpeed = playerState.gameplayModifiers.moveSpeedMultiplier;
    const baseHp = playerState.currentHp;
    const effectData = getUpgradeById('cachaca_de_cobra').temporaryDrinkEffect;
    const applied = manager.applyDrink(
      {
        ...effectData,
        id: 'cachaca_de_cobra_effect',
        name: 'Cachaça de Cobra',
      },
      playerState
    );

    expect(applied.effect.durationMs).toBe(15000);
    expect(playerState.effectiveStats.strength).toBeGreaterThan(baseStrength);
    expect(playerState.gameplayModifiers.moveSpeedMultiplier).toBeGreaterThan(
      baseSpeed
    );
    expect(playerState.gameplayModifiers.damageTakenMultiplier).toBe(1.2);
    const normalIncomingDamage = DamageCalculator.calculateDamage({
      attack: { baseDamage: 10, isCombo: false },
      attackerStats: { strength: 10 },
    });
    const increasedIncomingDamage = DamageCalculator.calculateDamage({
      attack: { baseDamage: 10, isCombo: false },
      attackerStats: { strength: 10 },
      targetStats: playerState.getCombatStats(),
    });
    expect(increasedIncomingDamage).toBeGreaterThan(normalIncomingDamage);

    manager.update(5000, playerState);
    expect(playerState.currentHp).toBe(baseHp - 20);
    manager.update(10000, playerState);
    expect(manager.hasActiveEffects()).toBe(false);
    expect(playerState.currentHp).toBe(baseHp - 60);
    expect(playerState.effectiveStats.strength).toBe(baseStrength);
    expect(playerState.gameplayModifiers.moveSpeedMultiplier).toBe(baseSpeed);
    expect(playerState.gameplayModifiers.damageTakenMultiplier).toBe(1);
  });

  it('aplica força, maxHp, resistência e cura instantânea e restaura atributos originais ao expirar', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();
    const baseSnapshot = { ...playerState.effectiveStats };
    const originalBaseStats = { ...playerState.baseStats };

    // Causa dano prévio para testar cura instantânea
    playerState.applyDamage(30);
    const hpBeforeDrink = playerState.currentHp;

    const absinto = getDrinkById('absinto');
    const applied = manager.applyDrink(absinto, playerState);

    expect(applied).not.toBeNull();
    expect(applied.resistanceAtCollection).toBe(baseSnapshot.drinkResistance);
    expect(applied.healedAmount).toBeGreaterThan(0);
    expect(playerState.currentHp).toBeGreaterThan(hpBeforeDrink);
    expect(playerState.effectiveStats.strength).toBeGreaterThan(baseSnapshot.strength);
    expect(playerState.effectiveStats.maxHp).toBeGreaterThan(baseSnapshot.maxHp);
    expect(playerState.effectiveStats.drinkResistance).toBeLessThan(
      baseSnapshot.drinkResistance
    );

    // Impacto real no DamageCalculator
    const attack = { baseDamage: 10, isCombo: false };
    const baseDamage = DamageCalculator.calculateDamage({
      attack,
      attackerStats: baseSnapshot,
    });
    const buffedDamage = DamageCalculator.calculateDamage({
      attack,
      attackerStats: playerState.effectiveStats,
    });
    expect(buffedDamage).toBeGreaterThan(baseDamage);

    // Expiração limpa: retorna exatamente aos atributos originais sem mutar baseStats
    const expired = manager.update(applied.effect.durationMs + 50, playerState);
    expect(expired).toHaveLength(1);
    expect(playerState.effectiveStats).toEqual(baseSnapshot);
    expect(playerState.baseStats).toEqual(originalBaseStats);
    expect(playerState.currentHp).toBeLessThanOrEqual(playerState.effectiveStats.maxHp);
  });

  it('nunca revive jogador morto ao tentar aplicar cura ou bebida', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();

    playerState.applyDamage(9999);
    expect(playerState.isDead()).toBe(true);
    expect(playerState.heal(50)).toBe(0);
    expect(playerState.isDead()).toBe(true);

    const result = manager.applyDrink(getDrinkById('cerveja'), playerState);
    expect(result).toBeNull();
    expect(playerState.isDead()).toBe(true);
  });

  it('acumula bebidas repetidas em instâncias independentes e aplica cura em cada coleta', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();
    const chevette = getDrinkById('chevette');

    const first = manager.applyDrink(chevette, playerState);
    const strengthAfterFirst = playerState.effectiveStats.strength;
    const maxHpAfterFirst = playerState.effectiveStats.maxHp;

    // Avança parte do timer e causa dano antes da segunda coleta
    manager.update(3000, playerState);
    playerState.applyDamage(25);
    const hpBeforeSecond = playerState.currentHp;

    const second = manager.applyDrink(chevette, playerState);
    expect(second.refreshed).toBe(false);
    expect(manager.getActiveEffects()).toHaveLength(2);
    expect(playerState.effectiveStats.strength).toBeGreaterThan(strengthAfterFirst);
    expect(playerState.effectiveStats.maxHp).toBeGreaterThan(maxHpAfterFirst);
    expect(second.healedAmount).toBeGreaterThan(0);
    expect(playerState.currentHp).toBeGreaterThan(hpBeforeSecond);
    expect(second.effect.remainingMs).toBeGreaterThan(first.effect.durationMs);

    const firstStackRemainingMs = manager.getActiveEffects()[0].remainingMs;
    manager.update(firstStackRemainingMs, playerState);
    const activeAfterFirstExpired = manager.getActiveEffects();
    expect(activeAfterFirstExpired).toHaveLength(1);
    expect(activeAfterFirstExpired[0].instanceId).toBe(second.effect.instanceId);
    expect(activeAfterFirstExpired[0].remainingMs).toBe(
      second.effect.durationMs - firstStackRemainingMs
    );
  });

  it('suporta efeitos simultâneos independentes e expira múltiplos efeitos corretamente no mesmo frame', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();
    const baseSnapshot = { ...playerState.effectiveStats };

    const cantinho = getDrinkById('cantinho_do_vale');
    const cerveja = getDrinkById('cerveja');

    const r1 = manager.applyDrink(cantinho, playerState);
    const r2 = manager.applyDrink(cerveja, playerState);

    expect(manager.getActiveEffects()).toHaveLength(2);

    // Avança parcialmente: ambos continuam ativos com timers independentes
    manager.update(2000, playerState);
    const activeMid = manager.getActiveEffects();
    expect(activeMid).toHaveLength(2);
    expect(activeMid[0].remainingMs).toBe(r1.effect.durationMs - 2000);
    expect(activeMid[1].remainingMs).toBe(r2.effect.durationMs - 2000);

    // Avança além de ambos no mesmo frame: os dois expiram juntos e restauram baseSnapshot
    const expired = manager.update(50000, playerState);
    expect(expired).toHaveLength(2);
    expect(manager.getActiveEffects()).toHaveLength(0);
    expect(playerState.effectiveStats).toEqual(baseSnapshot);
  });

  it('garante coleta idempotente, atração configurável e formatação de efeitos na HUD', () => {
    const playerState = createPlayerState();
    const manager = new DrinkEffectManager();
    const drinkSystem = new DrinkSystem({ seed: 42 });

    const drinkEntity = {
      id: 'drink-1',
      drinkData: getDrinkById('gin_de_10'),
      collected: false,
      destroyed: false,
      onCollected: () => {},
    };

    const firstCollect = drinkSystem.collectDrink(drinkEntity, playerState, manager);
    const secondCollect = drinkSystem.collectDrink(drinkEntity, playerState, manager);

    expect(firstCollect).not.toBeNull();
    expect(secondCollect).toBeNull();
    expect(manager.getActiveEffects()).toHaveLength(1);

    // Atração dentro e fora do raio configurável (e com extraRadius para Fase 6)
    const near = drinkSystem.computeAttractionVelocity(
      { x: 100, y: 100 },
      { x: 150, y: 100 }
    );
    const far = drinkSystem.computeAttractionVelocity(
      { x: 100, y: 100 },
      { x: 300, y: 100 }
    );
    const farWithUpgrade = drinkSystem.computeAttractionVelocity(
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { extraRadius: 150 }
    );

    expect(near.attracted).toBe(true);
    expect(near.vx).toBeGreaterThan(0);
    expect(far.attracted).toBe(false);
    expect(farWithUpgrade.attracted).toBe(true);

    // Formatação da HUD
    const lines = formatActiveEffects(manager.getActiveEffects());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Gin de 10:');
    expect(lines[0]).toMatch(/s$/);

    // Limpeza total ao encerrar/reiniciar run
    manager.clear(playerState);
    expect(manager.getActiveEffects()).toHaveLength(0);
  });
});
