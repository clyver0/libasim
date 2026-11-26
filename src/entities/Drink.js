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
    // Física com peso: gravidade global + extra, quique controlado e deriva lateral inicial
    this.attracted = false;
    this.prevVy = 0;
    this.squashTimerMs = 0;
    this.body.setAllowGravity?.(true);
    this.body.setGravityY?.(this.config.EXTRA_GRAVITY_Y ?? 0);
    this.body.setBounce?.(0, this.config.BOUNCE ?? 0);
    this.body.setMaxVelocity?.(1000, this.config.MAX_FALL_SPEED ?? 800);
    this.body.setDragX?.(this.config.GROUND_DRAG_X ?? 0);
    const drift = this.config.SPAWN_DRIFT_X ?? 0;
    this.body.setVelocity(
      drift > 0 ? (Math.random() * 2 - 1) * drift : 0,
      this.config.FALL_SPEED
    );
    this.body.setCollideWorldBounds(false);
    this.body.setSize(this.config.BODY_WIDTH, this.config.BODY_HEIGHT);

    // Visual separado do corpo físico
    const hasPhotoSprite =
      drinkData.spriteKey &&
      scene.textures?.exists?.(drinkData.spriteKey) &&
      scene.add?.image;
    this.visualBaseScaleX = 1;
    this.visualBaseScaleY = 1;
    const visualScale = this.config.VISUAL_SCALE ?? 1;
    this.specialAura = drinkData.isSpecial
      ? scene.add.graphics({ x, y }).setDepth(10)
      : null;
    this.specialAura?.setScale?.(visualScale);
    if (hasPhotoSprite) {
      const rarityRank = drinkData.rarityRank ?? 1;
      const sourceImage = scene.textures
        .get(drinkData.spriteKey)
        ?.getSourceImage?.();
      const sourceWidth = sourceImage?.naturalWidth || sourceImage?.width;
      const sourceHeight = sourceImage?.naturalHeight || sourceImage?.height;
      const displayHeight = this.config.BODY_HEIGHT * visualScale;
      const aspectRatio =
        Number.isFinite(sourceWidth) &&
        sourceWidth > 0 &&
        Number.isFinite(sourceHeight) &&
        sourceHeight > 0
          ? sourceWidth / sourceHeight
          : 1;
      this.glow = scene.add.graphics({ x, y }).setDepth(11);
      this.glow.fillStyle(
        drinkData.color,
        Math.min(0.32, 0.1 + rarityRank * 0.035)
      );
      this.glow.fillCircle(0, 1, 16 + rarityRank * 1.2);
      this.glow.setScale?.(visualScale);
      this.visual = scene.add
        .image(x, y, drinkData.spriteKey)
        .setDepth(12)
        .setDisplaySize(displayHeight * aspectRatio, displayHeight);
      this.visualBaseScaleX = this.visual.scaleX;
      this.visualBaseScaleY = this.visual.scaleY;
    } else {
      this.visual = scene.add.graphics({ x, y }).setDepth(12);
      this.visual.setScale?.(visualScale);
      this.visualBaseScaleX = visualScale;
      this.visualBaseScaleY = visualScale;
      drawDrinkBottle(
        this.visual,
        drinkData.color,
        drinkData.rarityRank ?? 1
      );
    }

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
    if (!this.attracted) {
      this.attracted = true;
      this.body.setAllowGravity?.(false);
    }
    this.body.setVelocity(vx, vy);
  }

  /** Devolve a bebida à física normal quando a atração magnética termina. */
  resetFallVelocity() {
    if (this.destroyed || this.collected || !this.attracted) return;
    this.attracted = false;
    this.body.setAllowGravity?.(true);
    this.body.setVelocity(0, 0);
  }

  update(deltaMs = 16.67, screenHeight = 540) {
    if (this.destroyed || this.collected) return false;

    this.lifetimeMs -= deltaMs;
    this.floatTimerMs += deltaMs;
    if (this.squashTimerMs > 0) {
      this.squashTimerMs = Math.max(0, this.squashTimerMs - deltaMs);
    }
    const pos = this.getPosition();

    // Quique: só com velocidade suficiente; abaixo do limite a bebida pousa (restituição 0)
    const vy = this.body?.velocity?.y ?? 0;
    if (!this.attracted) {
      const minSpeed = this.config.BOUNCE_MIN_SPEED ?? 0;
      this.body.setBounceY?.(Math.abs(vy) < minSpeed ? 0 : this.config.BOUNCE ?? 0);
      if (this.prevVy > minSpeed && vy < -minSpeed * 0.3) {
        this.squashTimerMs = this.config.SQUASH_DURATION_MS ?? 0;
        this.scene?.events?.emit?.('drink:bounce', {
          x: pos.x,
          y: pos.y + this.body.halfHeight,
          color: this.drinkData?.color,
          strength: Math.min(1, this.prevVy / (this.config.MAX_FALL_SPEED ?? 800)),
        });
      }
    }
    this.prevVy = vy;

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
    this.glow?.setPosition(centerX, centerY);
    if (this.specialAura) {
      const pulse = (Math.sin(this.floatTimerMs / 115) + 1) / 2;
      this.specialAura.clear();
      this.specialAura.lineStyle(2.5, 0xfacc15, 0.72 + pulse * 0.28);
      this.specialAura.strokeCircle(0, 0, 22 + pulse * 7);
      this.specialAura.setPosition(centerX, centerY);
    }

    // Squash & stretch + rotação leve para transmitir peso
    const vx = this.body.velocity?.x ?? 0;
    const vy = this.body.velocity?.y ?? 0;
    const duration = Math.max(1, this.config.SQUASH_DURATION_MS ?? 1);
    const squash = this.squashTimerMs / duration;
    const stretch = isGrounded ? 0 : Math.min(0.18, Math.abs(vy) / 4200);
    const scaleX = 1 + 0.28 * squash - stretch * 0.4;
    const scaleY = 1 - 0.28 * squash + stretch;
    this.visual.setScale?.(
      this.visualBaseScaleX * scaleX,
      this.visualBaseScaleY * scaleY
    );
    this.glow?.setScale?.(scaleX, scaleY);
    this.visual.setRotation?.(
      isGrounded ? 0 : Math.max(-0.5, Math.min(0.5, vx / 420)) + Math.sin(this.floatTimerMs / 110) * 0.08
    );
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
    this.glow?.destroy();
    this.specialAura?.destroy();
    this.visual?.destroy();
    this.collider?.destroy();
  }
}
