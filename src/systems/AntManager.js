import { DamageCalculator } from '../combat/DamageCalculator.js';
import { Hitbox } from '../combat/Hitbox.js';
import { ANT_CONFIG } from '../constants/expansion.js';
import { Ant, decideAntMove } from '../entities/Ant.js';

/**
 * Gerencia as formigas da Expansão:
 *  - Hostis: chuva constante na Fase 4 (fracas, rápidas, perseguem o jogador).
 *    Contra personagens com `antImmunity` (Tonegi) o ataque não causa dano e a formiga morre.
 *  - Auxiliares: criadas pela habilidade do Tonegi; localizam e atacam inimigos.
 * Há tetos duros de entidades e `clear()` destrói tudo (fim de fase/habilidade/run).
 */
export class AntManager {
  constructor({
    scene,
    platforms = null,
    movingPlatforms = null,
    config = ANT_CONFIG,
    random = Math.random,
    onAntSquished = null,
    onHostileKilled = null,
    onAllyHit = null,
  } = {}) {
    this.scene = scene;
    this.platforms = platforms;
    this.movingPlatforms = movingPlatforms;
    this.config = config;
    this.random = random;
    this.onAntSquished = onAntSquished;
    this.onHostileKilled = onHostileKilled;
    this.onAllyHit = onAllyHit;

    this.hostile = [];
    this.allies = [];
    this.rainActive = false;
    this.rainTimerMs = 0;
    this.nextId = 1;
  }

  getAllAnts() {
    return [...this.hostile, ...this.allies];
  }

  // ---- Chuva hostil -------------------------------------------------------------------

  startRain() {
    this.rainActive = true;
    this.rainTimerMs = 0;
  }

  stopRain({ clearAnts = true } = {}) {
    this.rainActive = false;
    if (clearAnts) this.clearHostile();
  }

  spawnHostile(x) {
    if (this.hostile.length >= this.config.HOSTILE.MAX_ACTIVE) return null;
    const cfg = this.config.HOSTILE;
    const ant = new Ant(this.scene, x, cfg.SPAWN_Y, {
      id: `ant_h_${this.nextId++}`,
      faction: 'hostile',
      stats: {
        hp: cfg.HP,
        damage: cfg.DAMAGE,
        moveSpeed: cfg.MOVE_SPEED * (0.9 + this.random() * 0.25),
        jumpVelocity: cfg.JUMP_VELOCITY,
        knockback: cfg.KNOCKBACK,
        contactCooldownMs: cfg.CONTACT_COOLDOWN_MS,
        lifetimeMs: cfg.LIFETIME_MS,
      },
      onDeath: (a, reason) => {
        if (reason === 'hit') this.onHostileKilled?.(a);
      },
    });
    ant.body.setVelocityY?.(cfg.FALL_VELOCITY);
    if (this.platforms) this.scene.physics.add.collider(ant.collider, this.platforms);
    if (this.movingPlatforms) {
      this.scene.physics.add.collider(ant.collider, this.movingPlatforms);
    }
    this.hostile.push(ant);
    return ant;
  }

  // ---- Auxiliares do Tonegi -----------------------------------------------------------

  spawnAlly(x, y, { lifetimeMs, baseDamage = this.config.ALLY.BASE_DAMAGE } = {}) {
    const cfg = this.config.ALLY;
    const ant = new Ant(this.scene, x, y, {
      id: `ant_a_${this.nextId++}`,
      faction: 'ally',
      stats: {
        hp: cfg.HP,
        damage: baseDamage,
        moveSpeed: cfg.MOVE_SPEED,
        jumpVelocity: cfg.JUMP_VELOCITY,
        knockback: cfg.KNOCKBACK,
        contactCooldownMs: cfg.CONTACT_COOLDOWN_MS,
        lifetimeMs,
      },
    });
    if (this.platforms) this.scene.physics.add.collider(ant.collider, this.platforms);
    if (this.movingPlatforms) {
      this.scene.physics.add.collider(ant.collider, this.movingPlatforms);
    }
    this.allies.push(ant);
    return ant;
  }

  // ---- Atualização --------------------------------------------------------------------

  update(deltaMs, { player = null, allyTargets = [], ownerStrength = 10 } = {}) {
    if (this.rainActive && player && !player.isDead?.()) {
      this.rainTimerMs -= deltaMs;
      if (this.rainTimerMs <= 0 && this.hostile.length < this.config.HOSTILE.TARGET_ACTIVE) {
        this.rainTimerMs = this.config.HOSTILE.SPAWN_INTERVAL_MS;
        const margin = this.config.HOSTILE.SPAWN_MARGIN_X;
        const width = this.scene.logicalWidth ?? this.scene.scale?.width ?? 960;
        const scrollX = this.scene.cameras?.main?.scrollX ?? 0;
        this.spawnHostile(scrollX + margin + this.random() * (width - margin * 2));
      }
    }

    this._updateHostile(deltaMs, player);
    this._updateAllies(deltaMs, allyTargets, ownerStrength);
    this._prune();
  }

  _updateHostile(deltaMs, player) {
    if (!player) return;
    const playerOrigin = player.getCombatOrigin();
    const playerBox = player.getHurtbox();
    const scrollX = this.scene?.cameras?.main?.scrollX ?? 0;
    const maxY = (this.scene?.logicalHeight ?? 540) + 60;
    for (const ant of this.hostile) {
      if (ant.isDead() || ant.destroyed) continue;
      const pos = ant.getCombatOrigin();
      if (pos.y > maxY || (scrollX > 0 && pos.x < scrollX - 480)) {
        ant.kill('out_of_bounds');
        continue;
      }
      const move = decideAntMove({
        x: pos.x,
        y: pos.y,
        targetX: playerOrigin.x,
        targetY: playerOrigin.y,
        grounded: ant.isGrounded(),
        blockedSide: Boolean(ant.body.blocked?.left || ant.body.blocked?.right),
        jumpCooldownMs: ant.jumpCooldownMs,
      });
      ant.update(deltaMs, player.isDead?.() ? { dir: 0, jump: false } : move);
      if (ant.isDead() || player.isDead?.()) continue;

      if (ant.contactCooldownMs <= 0 && Hitbox.intersects(ant.getHurtbox(), playerBox)) {
        this._hostileContact(ant, player);
      }
    }
  }

  /** Imunidade do Tonegi vale sempre (com ou sem habilidade): sem dano e a formiga morre. */
  _hostileContact(ant, player) {
    if (player.state?.antImmunity) {
      ant.kill('squished');
      this.onAntSquished?.(ant, player);
      return;
    }
    ant.contactCooldownMs = ant.contactCooldownMaxMs;
    const po = player.getCombatOrigin();
    const ao = ant.getCombatOrigin();
    const dx = po.x - ao.x;
    const dir = Math.sign(dx) || 1;
    player.onHit?.({
      damage: ant.damage,
      knockback: ant.knockback,
      direction: dir,
    });
  }

  _updateAllies(deltaMs, targets, ownerStrength) {
    const valid = targets.filter((t) => t && !t.isDead?.() && !t.destroyed);
    for (const ant of this.allies) {
      if (ant.isDead() || ant.destroyed) continue;
      const pos = ant.getCombatOrigin();
      let best = null;
      let bestDist = this.config.ALLY.SEARCH_RADIUS;
      for (const target of valid) {
        const o = target.getCombatOrigin();
        const dist = Math.abs(o.x - pos.x) + Math.abs(o.y - pos.y) * 0.6;
        if (dist < bestDist) {
          bestDist = dist;
          best = target;
        }
      }

      let move = { dir: 0, jump: false };
      if (best) {
        const o = best.getCombatOrigin();
        move = decideAntMove({
          x: pos.x,
          y: pos.y,
          targetX: o.x,
          targetY: o.y,
          grounded: ant.isGrounded(),
          blockedSide: Boolean(ant.body.blocked?.left || ant.body.blocked?.right),
          jumpCooldownMs: ant.jumpCooldownMs,
        });
      }
      ant.update(deltaMs, move);
      if (ant.isDead() || !best) continue;

      if (ant.contactCooldownMs <= 0 && Hitbox.intersects(ant.getHurtbox(), best.getHurtbox())) {
        ant.contactCooldownMs = ant.contactCooldownMaxMs;
        const attack = { name: 'Formiga', isCombo: false, baseDamage: ant.damage };
        const targetStats = best.state?.getCombatStats?.() ?? best.state?.stats ?? best.stats ?? {};
        const damage = DamageCalculator.calculateDamage({
          attack,
          attackerStats: { strength: ownerStrength },
          targetStats,
        });
        const direction = Math.sign(best.getCombatOrigin().x - pos.x) || 1;
        const hitInfo = { attack, damage, knockback: ant.knockback, direction };
        best.onHit?.(hitInfo);
        this.onAllyHit?.(best, hitInfo, ant);
      }
    }
  }

  _prune() {
    this.hostile = this._pruneList(this.hostile);
    this.allies = this._pruneList(this.allies);
  }

  _pruneList(list) {
    const kept = [];
    for (const ant of list) {
      if (ant.isDead() || ant.destroyed) {
        ant.destroy();
      } else {
        kept.push(ant);
      }
    }
    return kept;
  }

  getHostileTargets() {
    return this.hostile.filter((a) => !a.isDead() && !a.destroyed);
  }

  clearHostile() {
    for (const ant of this.hostile) ant.destroy();
    this.hostile = [];
  }

  clearAllies() {
    for (const ant of this.allies) ant.destroy();
    this.allies = [];
  }

  clear() {
    this.rainActive = false;
    this.clearHostile();
    this.clearAllies();
  }

  getCounts() {
    return { hostile: this.hostile.length, allies: this.allies.length };
  }
}
