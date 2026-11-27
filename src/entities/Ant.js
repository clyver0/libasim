import { ANT_CONFIG } from '../constants/expansion.js';

/**
 * Desenha uma formiga estilizada (cabeça, tórax, abdômen, patas animadas e antenas)
 * em um objeto Graphics. Coordenadas relativas ao centro do corpo físico.
 */
export function drawAnt(graphics, { color = 0x1f2937, facing = 1, timeMs = 0, scale = 1, flash = false } = {}) {
  if (!graphics) return;
  graphics.clear();
  const c = flash ? 0xffffff : color;
  const d = facing >= 0 ? 1 : -1;
  const s = scale;
  const t = timeMs * 0.03;

  // Patas (6) com ciclo alternado
  graphics.lineStyle(1.2 * s, 0x0f172a, 1);
  for (let i = 0; i < 3; i += 1) {
    const baseX = d * (-2 + i * 3.2) * s;
    const swing = Math.sin(t + i * 2.1) * 2.2 * s;
    graphics.lineBetween(baseX, 1 * s, baseX + swing, 5 * s);
    graphics.lineBetween(baseX, 1 * s, baseX - swing, 5 * s);
  }

  // Abdômen, tórax e cabeça
  graphics.fillStyle(c, 1);
  graphics.fillCircle(-d * 6 * s, 0, 4.3 * s);
  graphics.fillCircle(0, -0.5 * s, 3.1 * s);
  graphics.fillCircle(d * 5.2 * s, -1 * s, 2.7 * s);

  // Brilho e olho
  graphics.fillStyle(0xffffff, 0.35);
  graphics.fillCircle(-d * 7 * s, -1.6 * s, 1.1 * s);
  graphics.fillStyle(0xf8fafc, 1);
  graphics.fillCircle(d * 6.2 * s, -1.6 * s, 0.9 * s);

  // Antenas
  graphics.lineStyle(1 * s, 0x0f172a, 1);
  const wig = Math.sin(t * 0.7) * 1.2 * s;
  graphics.lineBetween(d * 6.5 * s, -2.8 * s, d * 10 * s, -6.5 * s + wig);
  graphics.lineBetween(d * 5 * s, -3.2 * s, d * 8 * s, -7.5 * s - wig);
}

/**
 * Decisão de movimento pura da formiga (testável sem engine): persegue o alvo no eixo X e
 * salta quando o alvo está acima ou quando bate em um obstáculo lateral.
 */
export function decideAntMove({
  x,
  y,
  targetX,
  targetY,
  grounded,
  blockedSide = false,
  jumpCooldownMs = 0,
  jumpTriggerY = ANT_CONFIG.JUMP_HEIGHT_TRIGGER_Y,
  stopDistance = 3,
}) {
  const dx = targetX - x;
  const dir = Math.abs(dx) > stopDistance ? Math.sign(dx) : 0;
  const targetAbove = y - targetY > jumpTriggerY;
  const jump = Boolean(grounded && jumpCooldownMs <= 0 && (targetAbove || (blockedSide && dir !== 0)));
  return { dir, jump };
}

/**
 * Formiga: usada como inimigo hostil (chuva da Fase 4) e como auxiliar do Tonegi.
 * Mantém corpo físico dedicado + visual Graphics, e expõe a interface de alvo do CombatSystem
 * (`id`, `isDead`, `isInvulnerable`, `getHurtbox`, `onHit`, `stats`).
 */
export class Ant {
  constructor(scene, x, y, { id, faction = 'hostile', stats, onDeath = null } = {}) {
    this.scene = scene;
    this.id = id;
    this.faction = faction;
    this.stats = { damageReduction: 0 };
    this.hp = stats.hp;
    this.damage = stats.damage;
    this.moveSpeed = stats.moveSpeed;
    this.jumpVelocity = stats.jumpVelocity;
    this.knockback = stats.knockback ?? 0;
    this.contactCooldownMaxMs = stats.contactCooldownMs ?? 600;
    this.lifetimeMs = stats.lifetimeMs ?? 10000;
    this.onDeath = onDeath;

    this.facing = 1;
    this.dead = false;
    this.destroyed = false;
    this.contactCooldownMs = 0;
    this.jumpCooldownMs = 0;
    this.flashMs = 0;
    this.knockbackTimerMs = 0;
    this.animTimeMs = Math.random() * 400;
    this._redrawTimerMs = 0;
    this.visualScale = faction === 'ally' ? 0.95 : 0.85;
    this.color = faction === 'ally' ? 0xfbbf24 : 0x1f2937;

    const w = ANT_CONFIG.BODY_WIDTH;
    const h = ANT_CONFIG.BODY_HEIGHT;
    this.collider = scene.add.rectangle(x, y, w, h, 0xffffff, 0);
    scene.physics.add.existing(this.collider);
    this.body = this.collider.body;
    this.body.setCollideWorldBounds?.(true);
    this.body.setSize(w, h);

    this.visual = scene.add.graphics({ x, y }).setDepth(14);
    drawAnt(this.visual, { color: this.color, facing: this.facing, timeMs: this.animTimeMs, scale: this.visualScale });

    this._onPostUpdate = () => this.syncVisualToBody();
    scene.events?.on?.('postupdate', this._onPostUpdate);
  }

  isDead() {
    return this.dead;
  }

  isInvulnerable() {
    return false;
  }

  isGrounded() {
    return Boolean(this.body?.blocked?.down || this.body?.touching?.down);
  }

  getCombatOrigin() {
    return { x: this.body.x + this.body.halfWidth, y: this.body.y + this.body.halfHeight };
  }

  getHurtbox() {
    return { x: this.body.x, y: this.body.y, width: this.body.width, height: this.body.height };
  }

  onHit(hitInfo) {
    if (this.dead) return false;
    this.hp -= Math.max(1, hitInfo?.damage ?? 1);
    this.flashMs = 90;
    const dir = hitInfo?.direction ?? 1;
    this.body.setVelocityX?.(dir * (hitInfo?.knockback ?? 0) * 5);
    this.knockbackTimerMs = 140;
    if (this.hp <= 0) this.kill('hit');
    return true;
  }

  /** Mata a formiga uma única vez e notifica o dono (efeitos visuais, contagem etc.). */
  kill(reason = 'killed') {
    if (this.dead) return false;
    this.dead = true;
    this.deathReason = reason;
    this.body.enable = false;
    this.onDeath?.(this, reason);
    return true;
  }

  /** `move` vem de `decideAntMove`. */
  update(deltaMs, move) {
    if (this.dead || this.destroyed) return;
    this.animTimeMs += deltaMs;
    this.lifetimeMs -= deltaMs;
    if (this.contactCooldownMs > 0) this.contactCooldownMs = Math.max(0, this.contactCooldownMs - deltaMs);
    if (this.jumpCooldownMs > 0) this.jumpCooldownMs = Math.max(0, this.jumpCooldownMs - deltaMs);
    if (this.flashMs > 0) this.flashMs = Math.max(0, this.flashMs - deltaMs);

    if (this.lifetimeMs <= 0) {
      this.kill('expired');
      return;
    }

    if (this.knockbackTimerMs > 0) {
      this.knockbackTimerMs -= deltaMs;
    } else if (move) {
      this.body.setVelocityX(move.dir * this.moveSpeed);
      if (move.dir !== 0) this.facing = move.dir >= 0 ? 1 : -1;
      if (move.jump) {
        this.body.setVelocityY(this.jumpVelocity);
        this.jumpCooldownMs = ANT_CONFIG.JUMP_COOLDOWN_MS;
      }
    }

    this._redrawTimerMs -= deltaMs;
    if (this._redrawTimerMs <= 0) {
      this._redrawTimerMs = 50;
      drawAnt(this.visual, {
        color: this.color,
        facing: this.facing,
        timeMs: this.animTimeMs,
        scale: this.visualScale,
        flash: this.flashMs > 0,
      });
    }
  }

  syncVisualToBody() {
    if (this.destroyed || !this.body) return;
    this.visual?.setPosition(this.body.x + this.body.halfWidth, this.body.y + this.body.halfHeight);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene?.events?.off?.('postupdate', this._onPostUpdate);
    this.visual?.destroy();
    this.collider?.destroy();
  }
}
