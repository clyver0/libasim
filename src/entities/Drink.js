import { DRINK_CONFIG } from '../constants/drinks.js';

/**
 * Desenha uma garrafa estilizada com halo de raridade, vidro reflexivo e rótulo.
 * Coordenadas relativas ao centro do corpo físico (0, 0).
 */
export function drawDrinkBottle(graphics, color, rarityRank = 1) {
  graphics.clear();

  // Halo luminoso de raridade
  const glowAlpha = Math.min(0.32, 0.1 + rarityRank * 0.035);
  graphics.fillStyle(color, glowAlpha);
  graphics.fillCircle(0, 1, 16 + rarityRank * 1.2);

  // Sombra/contorno escuro externo
  graphics.fillStyle(0x020617, 0.92);
  graphics.fillRoundedRect(-9.5, -6.5, 19, 21, 5);
  graphics.fillRect(-5, -15, 10, 9);

  // Vidro translúcido da garrafa
  graphics.fillStyle(0x1e293b, 0.85);
  graphics.fillRoundedRect(-8, -5, 16, 18, 4);

  // Líquido interno vibrante
  graphics.fillStyle(color, 0.96);
  graphics.fillRoundedRect(-6.5, -1, 13, 12.5, 3);

  // Menisco iluminado do líquido
  graphics.fillStyle(0xffffff, 0.35);
  graphics.fillRect(-5.5, -1, 11, 2);

  // Gargalo e tampa dourada/metálica
  graphics.fillStyle(0xcbd5e1, 0.95);
  graphics.fillRect(-3.5, -12.5, 7, 7.5);
  graphics.fillStyle(rarityRank >= 4 ? 0xfacc15 : 0x94a3b8, 1);
  graphics.fillRoundedRect(-4.5, -15, 9, 3.5, 1.5);

  // Rótulo central elegante
  graphics.fillStyle(0x0f172a, 0.72);
  graphics.fillRect(-5.5, 2.5, 11, 5);
  graphics.lineStyle(1, 0xf8fafc, 0.55);
  graphics.strokeRect(-5.5, 2.5, 11, 5);

  // Reflexo vertical de vidro e contorno cristalino
  graphics.fillStyle(0xffffff, 0.38);
  graphics.fillRect(-5.5, -3.5, 2, 13);
  graphics.lineStyle(1.4, 0xe2e8f0, 0.88);
  graphics.strokeRoundedRect(-8, -5, 16, 18, 4);
}

/**
 * Entidade física e visual de uma bebida coletável caindo no cenário.
 */
export class Drink {
  constructor(scene, x, y, drinkData, { id, config = DRINK_CONFIG } = {}) {
    this.scene = scene;
    this.id = id ?? `drink-${Date.now()}`;
    this.drinkData = drinkData;
    this.config = { ...DRINK_CONFIG, ...config };
    this.collected = false;
    this.destroyed = false;
    this.lifetimeMs = this.config.LIFETIME_MS;
    this.floatTimerMs = 0;

    // Corpo físico dedicado (Arcade Physics)
    this.collider = scene.add.rectangle(
      x,
      y,
      this.config.BODY_WIDTH,
      this.config.BODY_HEIGHT,
      0xffffff,
      0
    );
    scene.physics.add.existing(this.collider);

    this.body = this.collider.body;
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, this.config.FALL_SPEED);
    this.body.setCollideWorldBounds(false);
    this.body.setSize(this.config.BODY_WIDTH, this.config.BODY_HEIGHT);

    // Visual separado do corpo físico
    this.visual = scene.add.graphics({ x, y }).setDepth(12);
    drawDrinkBottle(
      this.visual,
      drinkData.color,
      drinkData.rarityRank ?? 1
    );

    this._onPostUpdate = () => this.syncVisualToBody();
    if (scene?.events?.on) {
      scene.events.on('postupdate', this._onPostUpdate);
    }
  }

  getPosition() {
    return {
      x: this.body.x + this.body.halfWidth,
      y: this.body.y + this.body.halfHeight,
    };
  }

  setAttractionVelocity(vx, vy) {
    if (this.destroyed || this.collected) return;
    this.body.setVelocity(vx, vy);
  }

  resetFallVelocity() {
    if (this.destroyed || this.collected) return;
    const isGrounded = Boolean(this.body?.blocked?.down || this.body?.touching?.down);
    this.body.setVelocity(0, isGrounded ? 0 : this.config.FALL_SPEED);
  }

  update(deltaMs = 16.67, screenHeight = 540) {
    if (this.destroyed || this.collected) return false;

    this.lifetimeMs -= deltaMs;
    this.floatTimerMs += deltaMs;
    const pos = this.getPosition();

    if (this.lifetimeMs <= 0 || pos.y > screenHeight + 60) {
      return true;
    }

    return false;
  }

  syncVisualToBody() {
    if (this.destroyed || !this.body || !this.visual) return;
    const centerX = this.body.x + this.body.halfWidth;
    const isGrounded = Boolean(this.body?.blocked?.down || this.body?.touching?.down);
    const bobOffset = isGrounded ? Math.sin(this.floatTimerMs / 180) * 2.5 : 0;
    const centerY = this.body.y + this.body.halfHeight + bobOffset;
    this.visual.setPosition(centerX, centerY);
  }

  onCollected() {
    if (this.body) {
      this.body.enable = false;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.scene?.events?.off && this._onPostUpdate) {
      this.scene.events.off('postupdate', this._onPostUpdate);
    }
    this.visual?.destroy();
    this.collider?.destroy();
  }
}
