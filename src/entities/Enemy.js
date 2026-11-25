import { CombatSystem } from '../combat/CombatSystem.js';
import { Hitbox } from '../combat/Hitbox.js';
import { ENEMY_CONFIG } from '../constants/enemies.js';
import { EnemyState } from './EnemyState.js';
import { drawStickFigure } from './Player.js';

/**
 * Entidade de inimigo comum.
 * Separa estado (`this.state`), corpo físico Arcade (`this.collider` / `this.body`)
 * e representação visual (`this.visual` + `this.hpBar`).
 */
export class Enemy {
  constructor(scene, x, y, enemyData, { id = null, onDefeated = null } = {}) {
    this.scene = scene;
    this.state = new EnemyState(enemyData, {
      id,
      scaledStats: enemyData?.scaledStats ?? null,
    });
    this.id = this.state.id;
    this.onDefeated = onDefeated;

    this.facing = -1;
    this.animTimeMs = Math.random() * 600;
    this.hurtTimerMs = 0;
    this.flashTimerMs = 0;
    this.attackTimerMs = 0;
    this.attackCooldownMs = 0;
    this.attackInstanceId = 0;
    this.hitTargetIds = new Set();
    this.currentHitboxBounds = null;
    this.destroyed = false;

    // Estado interno por inimigo para IA sem alocações por frame
    this.aiMemory = {
      decisionTimerMs: 0,
      jumpCooldownMs: 0,
      stuckTimerMs: 0,
      lastCheckX: x,
      unstickTimerMs: 0,
      unstickDir: 0,
      cachedFromId: null,
      cachedTargetId: null,
      cachedNextStep: null,
      dropSurfaceId: null,
      dropTargetX: 0,
      jumpTarget: null,
      jumpFromTop: 0,
    };

    // Corpo físico dedicado
    this.collider = scene.add.rectangle(
      x,
      y,
      this.state.bodyWidth,
      this.state.bodyHeight,
      0xffffff,
      0
    );
    scene.physics.add.existing(this.collider);

    this.body = this.collider.body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(this.state.bodyWidth, this.state.bodyHeight);

    // Visual desacoplado da física (com escala própria por arquétipo de inimigo)
    this.visual = scene.add.graphics({ x, y });
    const presetScale = this.state.visualPreset?.scale ?? 1;
    if (presetScale !== 1) {
      this.visual.setScale?.(presetScale);
    }
    this.hpBar = scene.add.graphics({ x, y });
    this._lastVisualKey = '';
    this._lastHpKey = '';
    this._redrawVisual();
    this._redrawHpBar();

    this._onPostUpdate = () => this.syncVisualToBody();
    if (scene?.events?.on) {
      scene.events.on('postupdate', this._onPostUpdate);
    }
  }

  get stats() {
    return this.state.stats;
  }

  isDead() {
    return this.state.isDead();
  }

  isGrounded() {
    return Boolean(this.body?.blocked?.down || this.body?.touching?.down);
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

  _getPoseAndColor() {
    const behavior = this.state.behaviorState;
    if (this.flashTimerMs > 0) {
      return { pose: 'idle', color: 0xffffff };
    }
    if (behavior === ENEMY_CONFIG.STATES.WINDUP) {
      return { pose: 'special', color: 0xfbbf24 };
    }
    if (behavior === ENEMY_CONFIG.STATES.ATTACKING) {
      return { pose: 'light', color: this.state.color };
    }
    return { pose: 'idle', color: this.state.color };
  }

  _redrawVisual() {
    if (!this.visual || this.destroyed) return;
    const base = this._getPoseAndColor();
    const behavior = this.state.behaviorState;
    let attackProgress = 0.5;
    if (behavior === ENEMY_CONFIG.STATES.ATTACKING && this.state.attack.activeMs > 0) {
      const elapsed = Math.max(0, this.state.attack.activeMs - this.attackTimerMs);
      attackProgress = Math.min(0.68, (elapsed / this.state.attack.activeMs) * 0.68);
    } else if (behavior === ENEMY_CONFIG.STATES.RECOVERING && this.state.attack.recoveryMs > 0) {
      const elapsed = Math.max(0, this.state.attack.recoveryMs - this.attackTimerMs);
      attackProgress = Math.min(1, 0.68 + (elapsed / this.state.attack.recoveryMs) * 0.32);
    }

    const pose =
      behavior === ENEMY_CONFIG.STATES.RECOVERING ? 'light' : base.pose;
    const preset = this.state.visualPreset;

    drawStickFigure(
      this.visual,
      base.color,
      this.facing,
      pose,
      null,
      {
        scale: preset?.scale ?? 1,
        armStrokeWidth: preset?.armStrokeWidth ?? 3.4,
        torsoStrokeWidth: preset?.torsoStrokeWidth ?? 3.4,
        activeTypes: preset?.activeTypes ?? ['ninja_headband'],
        hasHardHat: false,
        hasLuckyHat: false,
        hasChaosCrown: false,
        headStack: { hardHatOffsetY: 0, luckyHatOffsetY: 0, crownOffsetY: 0 },
      },
      {
        animTimeMs: this.animTimeMs,
        vx: this.body?.velocity?.x ?? 0,
        vy: this.body?.velocity?.y ?? 0,
        grounded: this.isGrounded(),
        attackProgress,
      }
    );
  }

  _redrawHpBar() {
    if (!this.hpBar || this.destroyed) return;
    const key = `${this.state.currentHp}/${this.state.maxHp}`;
    if (key === this._lastHpKey) return;

    this._lastHpKey = key;
    this.hpBar.clear();
    const barWidth = 34;
    const barHeight = 5;
    const ratio = Math.max(0, this.state.currentHp / this.state.maxHp);
    const offsetY = -this.state.bodyHeight / 2 - 12;

    this.hpBar.fillStyle(0x020617, 0.92);
    this.hpBar.fillRect(-barWidth / 2 - 1, offsetY - 1, barWidth + 2, barHeight + 2);
    this.hpBar.fillStyle(0x1e293b, 0.95);
    this.hpBar.fillRect(-barWidth / 2, offsetY, barWidth, barHeight);
    this.hpBar.fillStyle(this.state.color ?? 0xf43f5e, 1);
    this.hpBar.fillRect(-barWidth / 2, offsetY, barWidth * ratio, barHeight);
  }

  moveHorizontal(moveDir) {
    if (this.isDead()) return;
    const velocityX = moveDir * this.state.moveSpeed;
    this.body.setVelocityX(velocityX);

    if (Math.abs(moveDir) > 0.1) {
      this.facing = moveDir >= 0 ? 1 : -1;
    }
  }

  jump() {
    if (this.isDead() || !this.isGrounded()) {
      return false;
    }
    this.body.setVelocityY(this.state.jumpVelocity);
    return true;
  }

  startAttack(facing) {
    if (this.isDead()) return false;
    this.facing = facing ?? this.facing;
    this.state.setBehaviorState(ENEMY_CONFIG.STATES.WINDUP);
    this.attackTimerMs = this.state.attack.windupMs;
    this.currentHitboxBounds = null;
    this.body.setVelocityX(0);
    return true;
  }

  _spawnHitFeedbackText(hitInfo) {
    if (!this.scene?.add?.text || !hitInfo?.attack) return;

    const origin = this.getCombatOrigin();
    const isCombo = Boolean(hitInfo.attack.isCombo);
    const label = isCombo
      ? `COMBO! ${hitInfo.attack.name}\n-${hitInfo.damage}`
      : `${hitInfo.attack.name}\n-${hitInfo.damage}`;

    const text = this.scene.add
      .text(origin.x, origin.y - 34, label, {
        fontFamily: 'sans-serif',
        fontSize: isCombo ? '15px' : '12px',
        fontStyle: isCombo ? 'bold' : 'normal',
        color: isCombo ? '#facc15' : '#f8fafc',
        stroke: '#0f172a',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(55);

    if (this.scene.tweens?.add) {
      this.scene.tweens.add({
        targets: text,
        y: text.y - 28,
        alpha: 0,
        duration: 700,
        onComplete: () => text.destroy(),
      });
    } else {
      text.destroy();
    }
  }

  onHit(hitInfo) {
    if (this.isDead() || !hitInfo) return;

    const applied = this.state.applyDamage(hitInfo.damage);
    this.flashTimerMs = 110;
    this.currentHitboxBounds = null;
    this._redrawHpBar();
    this._spawnHitFeedbackText({ ...hitInfo, damage: applied || hitInfo.damage });

    if (this.state.isDead()) {
      this.body.setVelocityX(0);
      if (!this.state.defeatedHandled) {
        this.state.defeatedHandled = true;
        if (typeof this.onDefeated === 'function') {
          this.onDefeated(this, hitInfo);
        }
      }
      return;
    }

    this.state.setBehaviorState(ENEMY_CONFIG.STATES.HURT);
    this.hurtTimerMs = ENEMY_CONFIG.HURT_DURATION_MS;
    const dir = hitInfo.direction ?? 1;
    const knockbackSpeed =
      (hitInfo.knockback ?? 0) * ENEMY_CONFIG.KNOCKBACK_VELOCITY_SCALE;
    this.body.setVelocityX(dir * knockbackSpeed);
  }

  stopCombat() {
    this.currentHitboxBounds = null;
    this.attackTimerMs = 0;
    this.hitTargetIds.clear();
    this.body?.setVelocityX?.(0);

    const behavior = this.state.behaviorState;
    if (
      !this.isDead() &&
      (behavior === ENEMY_CONFIG.STATES.WINDUP ||
        behavior === ENEMY_CONFIG.STATES.ATTACKING ||
        behavior === ENEMY_CONFIG.STATES.RECOVERING)
    ) {
      this.state.setBehaviorState(
        this.isGrounded()
          ? ENEMY_CONFIG.STATES.CHASING
          : ENEMY_CONFIG.STATES.FALLING
      );
      this._redrawVisual();
    }
  }

  update(deltaMs, aiIntent, player) {
    if (this.destroyed || this.isDead()) return;
    this.animTimeMs += deltaMs;

    if (player?.isDead?.()) {
      this.stopCombat();
      return;
    }

    if (this.flashTimerMs > 0) {
      this.flashTimerMs = Math.max(0, this.flashTimerMs - deltaMs);
    }

    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs = Math.max(0, this.attackCooldownMs - deltaMs);
    }

    const behavior = this.state.behaviorState;

    if (behavior === ENEMY_CONFIG.STATES.HURT) {
      this.hurtTimerMs -= deltaMs;
      if (this.hurtTimerMs <= 0) {
        this.state.setBehaviorState(
          this.isGrounded()
            ? ENEMY_CONFIG.STATES.CHASING
            : ENEMY_CONFIG.STATES.FALLING
        );
      }
      this._redrawVisual();
      return;
    }

    if (behavior === ENEMY_CONFIG.STATES.WINDUP) {
      this.body.setVelocityX(0);
      this.attackTimerMs -= deltaMs;
      if (this.attackTimerMs <= 0) {
        this.state.setBehaviorState(ENEMY_CONFIG.STATES.ATTACKING);
        this.attackTimerMs = this.state.attack.activeMs;
        this.attackInstanceId += 1;
        this.hitTargetIds.clear();
      }
      this._redrawVisual();
      return;
    }

    if (behavior === ENEMY_CONFIG.STATES.ATTACKING) {
      this.body.setVelocityX(0);
      this.currentHitboxBounds = Hitbox.getWorldBounds(
        this.getCombatOrigin(),
        this.state.attack.hitbox,
        this.facing
      );

      if (player && !player.isDead?.()) {
        CombatSystem.resolveHits({
          attacker: this,
          attack: this.state.attack,
          hitboxBounds: this.currentHitboxBounds,
          targets: [player],
          hitTargetIds: this.hitTargetIds,
          attackInstanceId: this.attackInstanceId,
        });
      }

      this.attackTimerMs -= deltaMs;
      if (this.attackTimerMs <= 0) {
        this.currentHitboxBounds = null;
        this.state.setBehaviorState(ENEMY_CONFIG.STATES.RECOVERING);
        this.attackTimerMs = this.state.attack.recoveryMs;
        this.attackCooldownMs = this.state.attack.recoveryMs;
      }
      this._redrawVisual();
      return;
    }

    if (behavior === ENEMY_CONFIG.STATES.RECOVERING) {
      this.body.setVelocityX(0);
      this.currentHitboxBounds = null;
      this.attackTimerMs -= deltaMs;
      if (this.attackTimerMs <= 0) {
        this.state.setBehaviorState(
          this.isGrounded()
            ? ENEMY_CONFIG.STATES.CHASING
            : ENEMY_CONFIG.STATES.FALLING
        );
      }
      this._redrawVisual();
      return;
    }

    // FALLING -> CHASING ao tocar superfície
    if (behavior === ENEMY_CONFIG.STATES.FALLING && this.isGrounded()) {
      this.state.setBehaviorState(ENEMY_CONFIG.STATES.CHASING);
    }

    if (aiIntent) {
      if (aiIntent.shouldAttack && this.attackCooldownMs <= 0) {
        this.startAttack(aiIntent.facing);
      } else {
        this.moveHorizontal(aiIntent.moveDir ?? 0);
        if (aiIntent.jump) {
          this.jump();
        }
      }
    }

    this._redrawVisual();
  }

  syncVisualToBody() {
    if (this.destroyed || !this.body) return;
    const centerX = this.body.x + this.body.halfWidth;
    const centerY = this.body.y + this.body.halfHeight;
    this.visual?.setPosition(centerX, centerY);
    this.hpBar?.setPosition(centerX, centerY);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.scene?.events?.off && this._onPostUpdate) {
      this.scene.events.off('postupdate', this._onPostUpdate);
    }
    this.visual?.destroy();
    this.hpBar?.destroy();
    this.collider?.destroy();
  }
}
