import { ENEMY_CONFIG } from '../constants/enemies.js';
import { PHYSICS } from '../constants/physics.js';
import { CharacterAppearanceSystem } from '../systems/CharacterAppearanceSystem.js';
import { PlayerState } from './PlayerState.js';

/**
 * Desenha um stick figure minimalista em um objeto Graphics do Phaser.
 * Reutiliza o CharacterAppearanceSystem para manter todas as poses, articulações
 * e upgrades visuais em um único ponto centralizado.
 */
export function drawStickFigure(
  graphics,
  color,
  facing = 1,
  pose = 'idle',
  auraColor = null,
  appearanceState = null,
  motion = null
) {
  CharacterAppearanceSystem.renderCharacter(graphics, {
    color,
    facing,
    pose,
    auraColor,
    appearanceState,
    motion,
  });
}

/**
 * Entidade do jogador.
 * Mantém separação explícita entre:
 * - Estado de atributos (`this.state`)
 * - Corpo físico dedicado no Arcade Physics (`this.collider` / `this.body`)
 * - Representação visual independente (`this.visual`, Graphics sem corpo físico)
 */
export class Player {
  constructor(scene, x, y, characterData, physicsConfig = PHYSICS) {
    this.scene = scene;
    this.physicsConfig = physicsConfig;
    this.state = new PlayerState(characterData);
    this.id = 'player';
    this.facing = 1;
    this.combatPose = 'idle';
    this.attackProgress = 0.5;
    this.locomotionPose = 'idle';
    this.walkAnimTimerMs = 0;
    this.animTimeMs = 0;
    this.activeAuraColor = null;
    this.appearanceState = null;
    this.currentBodyScale = 1;
    this.invulnerabilityTimerMs = 0;
    this.hurtKnockbackTimerMs = 0;
    this.hurtKnockbackVx = 0;
    this.flashTimerMs = 0;

    // Objeto dedicado exclusivamente ao Arcade Physics (invisível na renderização)
    this.collider = scene.add.rectangle(
      x,
      y,
      physicsConfig.PLAYER_BODY_WIDTH,
      physicsConfig.PLAYER_BODY_HEIGHT,
      0xffffff,
      0
    );
    scene.physics.add.existing(this.collider);

    this.body = this.collider.body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(
      physicsConfig.PLAYER_BODY_WIDTH,
      physicsConfig.PLAYER_BODY_HEIGHT
    );

    // Representação visual pura (sem física acoplada), sincronizada pós-física
    this.visual = scene.add.graphics({ x, y });
    this._redrawVisual();

    this._onPostUpdate = () => this.syncVisualToBody();
    if (scene?.events?.on) {
      scene.events.on('postupdate', this._onPostUpdate);
    }
  }

  get stats() {
    return this.state.effectiveStats;
  }

  isDead() {
    return this.state.isDead();
  }

  isInvulnerable() {
    return this.invulnerabilityTimerMs > 0;
  }

  _redrawVisual() {
    const color = this.isDead()
      ? 0x64748b
      : this.flashTimerMs > 0
      ? 0xffffff
      : this.state.color;
    const auraColor = this.isDead() ? null : this.activeAuraColor;
    const effectivePose =
      this.combatPose !== 'idle' ? this.combatPose : this.locomotionPose;

    const motion = {
      animTimeMs: this.animTimeMs,
      vx: this.body?.velocity?.x ?? 0,
      vy: this.body?.velocity?.y ?? 0,
      grounded: this.isGrounded(),
      attackProgress: this.attackProgress,
    };

    drawStickFigure(
      this.visual,
      color,
      this.facing,
      effectivePose,
      auraColor,
      this.appearanceState,
      motion
    );
  }

  setAppearanceState(appearanceState = null) {
    this.appearanceState = appearanceState;
    if (appearanceState?.scale && this.visual?.setScale) {
      this.visual.setScale(appearanceState.scale);
    }
    this._redrawVisual();
  }

  setDrinkAuraColor(color = null) {
    if (this.activeAuraColor === color) return;
    this.activeAuraColor = color;
    this._redrawVisual();
  }

  onHit(hitInfo) {
    if (this.isDead() || this.isInvulnerable() || !hitInfo) {
      return false;
    }

    this.state.applyDamage(hitInfo.damage);
    this.invulnerabilityTimerMs = ENEMY_CONFIG.PLAYER_INVULNERABILITY_MS;
    this.flashTimerMs = 150;

    const dir = hitInfo.direction ?? 1;
    const kbResistance = Math.min(
      0.9,
      Math.max(0, this.state.gameplayModifiers?.knockbackResistance ?? 0)
    );
    const effectiveKnockback = (hitInfo.knockback ?? 0) * (1 - kbResistance);
    this.hurtKnockbackVx =
      dir * (effectiveKnockback * ENEMY_CONFIG.KNOCKBACK_VELOCITY_SCALE);
    this.hurtKnockbackTimerMs = ENEMY_CONFIG.PLAYER_HURT_KNOCKBACK_DURATION_MS;
    this.body.setVelocityX(this.hurtKnockbackVx);

    this._redrawVisual();
    return true;
  }

  syncBodyScale() {
    const targetScale = this.state.gameplayModifiers?.bodyScale ?? 1;
    if (targetScale === this.currentBodyScale || !this.body) {
      return;
    }

    const prevHeight =
      this.body.height ?? this.physicsConfig.PLAYER_BODY_HEIGHT;
    const footBottomY = this.body.y + prevHeight;

    const newWidth = Math.max(
      12,
      Math.round(this.physicsConfig.PLAYER_BODY_WIDTH * targetScale)
    );
    const newHeight = Math.max(
      24,
      Math.round(this.physicsConfig.PLAYER_BODY_HEIGHT * targetScale)
    );

    this.currentBodyScale = targetScale;
    if (typeof this.collider.setSize === 'function') {
      this.collider.setSize(newWidth, newHeight);
    } else {
      this.collider.width = newWidth;
      this.collider.height = newHeight;
    }
    this.body.setSize(newWidth, newHeight);
    this.body.y = footBottomY - newHeight;

    this.visual?.setScale?.(targetScale);
    this.syncVisualToBody();
  }

  setCombatPose(pose = 'idle', attackProgress = 0.5) {
    const poseChanged = this.combatPose !== pose;
    this.combatPose = pose;
    this.attackProgress = attackProgress;
    if (poseChanged || pose !== 'idle') {
      this._redrawVisual();
    }
  }

  getCombatOrigin() {
    return {
      x: this.body.x + this.body.halfWidth,
      y: this.body.y + this.body.halfHeight,
    };
  }

  getHurtbox() {
    return {
      x: this.body.x,
      y: this.body.y,
      width: this.body.width,
      height: this.body.height,
    };
  }

  isGrounded() {
    return Boolean(this.body?.blocked?.down || this.body?.touching?.down);
  }

  moveHorizontal(direction) {
    const clampedDir = Math.sign(direction);
    const speedMultiplier =
      this.state.gameplayModifiers?.moveSpeedMultiplier ?? 1;
    this.body.setVelocityX(
      clampedDir * this.physicsConfig.PLAYER_MOVE_SPEED * speedMultiplier
    );

    if (clampedDir !== 0 && clampedDir !== this.facing) {
      this.facing = clampedDir;
      this._redrawVisual();
    }
  }

  jump() {
    if (!this.isGrounded()) {
      return false;
    }

    const jumpMultiplier = this.state.gameplayModifiers?.jumpMultiplier ?? 1;
    this.body.setVelocityY(
      this.physicsConfig.PLAYER_JUMP_VELOCITY * jumpMultiplier
    );
    return true;
  }

  applyInput(intent) {
    if (!intent) return;

    this.moveHorizontal(intent.horizontal ?? 0);

    if (intent.jump) {
      this.jump();
    }
  }

  syncVisualToBody() {
    const centerX = this.body.x + this.body.halfWidth;
    const centerY = this.body.y + this.body.halfHeight;
    this.visual.setPosition(centerX, centerY);
  }

  update(intent, deltaMs = 16.67) {
    this.animTimeMs += deltaMs;

    if (this.invulnerabilityTimerMs > 0) {
      this.invulnerabilityTimerMs = Math.max(
        0,
        this.invulnerabilityTimerMs - deltaMs
      );
    }

    if (this.flashTimerMs > 0) {
      this.flashTimerMs = Math.max(0, this.flashTimerMs - deltaMs);
      if (this.flashTimerMs === 0) {
        this._redrawVisual();
      }
    }

    if (this.isDead()) {
      this.body.setVelocityX(0);
      this.syncVisualToBody();
      return;
    }

    if (this.hurtKnockbackTimerMs > 0) {
      this.hurtKnockbackTimerMs = Math.max(
        0,
        this.hurtKnockbackTimerMs - deltaMs
      );
      this.body.setVelocityX(this.hurtKnockbackVx);
    } else {
      this.applyInput(intent);
    }

    // Animação leve de caminhada integrada às articulações (quando não estiver atacando)
    const movingHorizontally =
      Math.abs(this.body?.velocity?.x ?? 0) > 10 && this.isGrounded();
    let nextLocomotionPose = 'idle';
    if (movingHorizontally) {
      this.walkAnimTimerMs += deltaMs;
      const step = Math.floor(this.walkAnimTimerMs / 130) % 2;
      nextLocomotionPose = step === 0 ? 'walk_1' : 'walk_2';
    } else {
      this.walkAnimTimerMs = 0;
    }

    if (nextLocomotionPose !== this.locomotionPose) {
      this.locomotionPose = nextLocomotionPose;
    }

    // Redesenha continuamente a 60 FPS para respiração, corrida senoidal, pulo e golpes fluidos
    this._redrawVisual();
    this.syncVisualToBody();
  }

  destroy() {
    if (this.scene?.events?.off && this._onPostUpdate) {
      this.scene.events.off('postupdate', this._onPostUpdate);
    }
    this.visual?.destroy();
    this.collider?.destroy();
  }
}
