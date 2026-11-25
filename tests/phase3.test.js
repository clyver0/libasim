import { describe, expect, it, vi } from 'vitest';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { ComboSystem } from '../src/combat/ComboSystem.js';
import { DamageCalculator } from '../src/combat/DamageCalculator.js';
import { Hitbox } from '../src/combat/Hitbox.js';
import { COMBAT } from '../src/constants/combat.js';
import { ATTACK_TYPES, BASIC_ATTACKS, COMBOS } from '../src/data/attacks.js';
import { getCharacterById } from '../src/data/characters.js';
import { PlayerState } from '../src/entities/PlayerState.js';

describe('Fase 3 — Sistema de Combate e Combos', () => {
  it('reconhece os três tipos de golpes individuais', () => {
    const combo = new ComboSystem();

    const light = combo.registerCommand(ATTACK_TYPES.LIGHT, 100);
    expect(light.id).toBe('light');
    expect(light.isCombo).toBe(false);

    combo.reset();
    const heavy = combo.registerCommand(ATTACK_TYPES.HEAVY, 200);
    expect(heavy.id).toBe('heavy');
    expect(heavy.isCombo).toBe(false);

    combo.reset();
    const special = combo.registerCommand(ATTACK_TYPES.SPECIAL, 300);
    expect(special.id).toBe('special');
    expect(special.isCombo).toBe(false);
  });

  it('reconhece todos os cinco combos, incluindo prefixos compartilhados', () => {
    const combo = new ComboSystem();

    COMBOS.forEach((expectedCombo, index) => {
      combo.reset();
      let result = null;
      const baseTime = (index + 1) * 5000;

      expectedCombo.sequence.forEach((cmd, step) => {
        result = combo.registerCommand(cmd, baseTime + step * 150);
      });

      expect(result).not.toBeNull();
      expect(result.isCombo).toBe(true);
      expect(result.id).toBe(expectedCombo.id);
    });
  });

  it('respeita a janela de tempo dos comandos usando o momento de inserção', () => {
    const combo = new ComboSystem(COMBOS, 500);

    const first = combo.registerCommand(ATTACK_TYPES.HEAVY, 1000);
    expect(first.id).toBe('heavy');

    // Dentro da janela (1400 - 1000 <= 500) -> fecha combo_4 (HEAVY -> HEAVY)
    const second = combo.registerCommand(ATTACK_TYPES.HEAVY, 1400);
    expect(second.id).toBe('combo_4');

    // Fora da janela (2000 - 1000 > 500) -> reinicia como golpe individual
    combo.reset();
    combo.registerCommand(ATTACK_TYPES.HEAVY, 1000);
    const expired = combo.registerCommand(ATTACK_TYPES.HEAVY, 1600);
    expect(expired.id).toBe('heavy');
    expect(expired.isCombo).toBe(false);
  });

  it('calcula dano centralizado garantindo combos mais fortes que golpes individuais', () => {
    const playerState = new PlayerState(getCharacterById('char_a'));
    const lightDmg = DamageCalculator.calculateDamage({
      attack: BASIC_ATTACKS.LIGHT,
      attackerStats: playerState.effectiveStats,
    });
    const heavyDmg = DamageCalculator.calculateDamage({
      attack: BASIC_ATTACKS.HEAVY,
      attackerStats: playerState.effectiveStats,
    });

    for (const comboAttack of COMBOS) {
      const comboDmg = DamageCalculator.calculateDamage({
        attack: comboAttack,
        attackerStats: playerState.effectiveStats,
      });
      expect(comboDmg).toBeGreaterThan(lightDmg);
      expect(comboDmg).toBeGreaterThan(heavyDmg);
    }
  });

  it('controla estados de ataque, recuperação e buffer de 1 comando sem sobreposição', () => {
    const combat = new CombatSystem();
    const attacker = {
      x: 100,
      y: 200,
      facing: 1,
      state: new PlayerState(getCharacterById('char_a')),
    };

    expect(combat.isIdle()).toBe(true);

    // Inicia golpe pesado
    expect(combat.requestAttack(ATTACK_TYPES.HEAVY, 100)).toBe(true);
    expect(combat.isAttacking()).toBe(true);

    // Durante activeMs não aceita novo ataque nem buffer
    expect(combat.requestAttack(ATTACK_TYPES.HEAVY, 150)).toBe(false);

    // Avança além de activeMs para entrar em recuperação
    combat.update(BASIC_ATTACKS.HEAVY.activeMs + 1, attacker, []);
    expect(combat.isRecovering()).toBe(true);

    // Durante recuperação aceita 1 comando no buffer
    expect(combat.requestAttack(ATTACK_TYPES.HEAVY, 300)).toBe(true);
    expect(combat.requestAttack(ATTACK_TYPES.LIGHT, 320)).toBe(false);

    // Ao concluir recuperação, consome o buffer e executa o combo_4
    combat.update(BASIC_ATTACKS.HEAVY.recoveryMs + 1, attacker, []);
    expect(combat.isAttacking()).toBe(true);
    expect(combat.activeAttack.id).toBe('combo_4');

    // Finaliza activeMs + recoveryMs do combo e volta para idle
    combat.update(combat.activeAttack.activeMs + 1, attacker, []);
    expect(combat.isRecovering()).toBe(true);
    combat.update(combat.activeAttack.recoveryMs + 1, attacker, []);
    expect(combat.isIdle()).toBe(true);
  });

  it('detecta acertos por hitbox/hurtbox e previne dano duplicado no mesmo golpe', () => {
    const onHit = vi.fn();
    const combat = new CombatSystem({ onHit });
    const attacker = {
      x: 100,
      y: 200,
      facing: 1,
      state: new PlayerState(getCharacterById('char_a')),
    };

    const targetInRange = {
      id: 'dummy_1',
      hurtbox: { x: 115, y: 180, width: 30, height: 50 },
      onHit: vi.fn(),
    };
    const targetOutOfRange = {
      id: 'dummy_2',
      hurtbox: { x: 300, y: 180, width: 30, height: 50 },
      onHit: vi.fn(),
    };

    combat.requestAttack(ATTACK_TYPES.LIGHT, 100);

    // Múltiplos frames dentro da janela ativa do mesmo golpe
    combat.update(20, attacker, [targetInRange, targetOutOfRange]);
    combat.update(20, attacker, [targetInRange, targetOutOfRange]);
    combat.update(20, attacker, [targetInRange, targetOutOfRange]);

    expect(targetInRange.onHit).toHaveBeenCalledTimes(1);
    expect(onHit).toHaveBeenCalledTimes(1);
    expect(targetOutOfRange.onHit).not.toHaveBeenCalled();

    // Verifica que Hitbox.intersects respeita posição
    const bounds = Hitbox.getWorldBounds(attacker, BASIC_ATTACKS.LIGHT.hitbox, -1);
    expect(bounds.x).toBeLessThan(attacker.x);
  });
});
