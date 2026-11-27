import { PLATFORM_CONFIG } from '../constants/platforms.js';
import { PHYSICS } from '../constants/physics.js';
import { EnemyAI } from './EnemyAI.js';

/**
 * Inteligência Artificial dedicada do Boss Final.
 * Reutiliza navegação de plataformas de `EnemyAI` e seleciona padrões próprios
 * de ataque conforme distância e fase atual (Fase 1 vs Fase 2 Enfurecida).
 */
export class BossAI {
  constructor({
    physics = PHYSICS,
    platformConfig = PLATFORM_CONFIG,
    screenWidth = 960,
  } = {}) {
    this.navigationAI = new EnemyAI({
      physics,
      platformConfig,
      screenWidth,
    });
    this.patternCycle = 0;
  }

  decide(boss, player, layout, deltaMs = 16.67) {
    if (!boss || boss.isDead() || !player || player.isDead()) {
      return {
        moveDir: 0,
        jump: false,
        shouldAttack: false,
        attackKey: null,
        facing: boss?.facing ?? -1,
      };
    }

    const bossOrigin = boss.getCombatOrigin();
    const playerOrigin = player.getCombatOrigin();
    const dx = playerOrigin.x - bossOrigin.x;
    const dy = Math.abs(playerOrigin.y - bossOrigin.y);
    const absDx = Math.abs(dx);
    const facing = dx >= 0 ? 1 : -1;

    const attacks = boss.state.attacks ?? {};
    const phase = boss.state.phase ?? 1;

    // Seleção de padrão de ataque em solo firme
    if (boss.isGrounded() && boss.attackCooldownMs <= 0) {
      if (
        phase >= 2 &&
        attacks.shockwave &&
        absDx <= attacks.shockwave.rangeX &&
        dy <= attacks.shockwave.rangeY &&
        this.patternCycle % 2 === 1
      ) {
        this.patternCycle += 1;
        return {
          moveDir: 0,
          jump: false,
          shouldAttack: true,
          attackKey: 'shockwave',
          facing,
        };
      }

      if (
        attacks.crush &&
        absDx <= attacks.crush.rangeX &&
        dy <= attacks.crush.rangeY
      ) {
        this.patternCycle += 1;
        return {
          moveDir: 0,
          jump: false,
          shouldAttack: true,
          attackKey: 'crush',
          facing,
        };
      }

      if (
        attacks.charge &&
        absDx > 65 &&
        absDx <= attacks.charge.rangeX &&
        dy <= attacks.charge.rangeY
      ) {
        this.patternCycle += 1;
        return {
          moveDir: 0,
          jump: false,
          shouldAttack: true,
          attackKey: 'charge',
          facing,
        };
      }
    }

    // Fora de alcance imediato: reutiliza navegação 2D do EnemyAI
    const navIntent = this.navigationAI.decide(
      boss,
      player,
      layout,
      [boss],
      deltaMs
    );

    return {
      moveDir: navIntent.moveDir ?? 0,
      jump: Boolean(navIntent.jump),
      shouldAttack: false,
      attackKey: null,
      facing: navIntent.facing ?? facing,
    };
  }
}
