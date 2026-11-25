import { CombatSystem } from '../combat/CombatSystem.js';
import { Hitbox } from '../combat/Hitbox.js';
import { BOSS_CONFIG } from '../constants/boss.js';
import { ENEMY_CONFIG } from '../constants/enemies.js';
import { BossState } from './BossState.js';
import { drawStickFigure } from './Player.js';

/**
 * Entidade independente do Boss Final (GAME_DESIGN.md §13 / ARCHITECTURE.md §15).
 * Reutiliza sistemas genéricos de dano, colisão e combate (`CombatSystem.resolveHits`).
 */
export class Boss {
  constructor(
    scene,
    x,
    y,
    bossData,
    { id = 'boss_final', onDefeated = null, onPhaseChanged = null } = {}
  ) {
    this.scene = scene;
    this.state = new BossState(bossData, { id });
    this.id = this.state.id;
    this.onDefeated = onDefeated;
    this.onPhaseChanged = onPhaseChanged;

    this.facing = -1;
    this.animTimeMs = 0;
    this.flashTimerMs = 0;
    this.attackTimerMs = 0;
    this.attackCooldownMs = 400;
    this.attackInstanceId = 0;
    this.currentAttackConfig = null;
    this.hitTargetIds = new Set();
    this.currentHitboxBounds = null;
    this.destroyed = false;

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
    this.body.setCollideWorldBounds?.(true);
    this.body.setSize?.(this.state.bodyWidth, this.state.bodyHeight);

    this.visual = scene.add.graphics({ x, y });
    this.visual.setScale?.(1.32);
    this.hpBar = scene.add.graphics({ x, y });
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
      x: this.body.x + (this.body.halfWidth ?? this.state.bodyWidth / 2),
      y: this.body.y + (this.body.halfHeight ?? this.state.bodyHeight / 2),
    };
  }

  getHurtbox() {
    return {
      x: this.body.x,
      y: this.body.y,
      width: this.body.width ?? this.state.bodyWidth,
      height: this.body.height ?? this.state.bodyHeight,
    };
  }

  _redrawVisual() {
    if (!this.visual || this.destroyed) return;
    const behavior = this.state.behaviorState;

    let pose = 'idle';
    let color = this.state.color;
    let auraColor = this.state.phase >= 2 ? 0xa855f7 : 0xef4444;

    if (this.flashTimerMs > 0) {
      color = 0xffffff;
    } else if (behavior === BOSS_CONFIG.STATES.WINDUP) {
      pose = 'special';
      color = 0xfbbf24;
    } else if (behavior === BOSS_CONFIG.STATES.ATTACKING) {
      pose =
        this.state.activeAttackKey === 'shockwave'
          ? 'combo_special'
          : 'combo_heavy';
    }

    drawStickFigure(
      this.visual,
      color,
      this.facing,
      pose,
      auraColor,
      {
        scale: 1.32,
        armStrokeWidth: 5,
        torsoStrokeWidth: 4.2,
        activeTypes: ['chaos_crown', 'concrete_shoulders', 'hero_cape'],
        hasHardHat: false,
        hasLuckyHat: false,
        hasChaosCrown: true,
        headStack: { hardHatOffsetY: 0, luckyHatOffsetY: 0, crownOffsetY: 0 },
      },
      {
        animTimeMs: this.animTimeMs,
        vx: this.body?.velocity?.x ?? 0,
        vy: this.body?.velocity?.y ?? 0,
        grounded: this.isGrounded(),
        attackProgress: 0.5,
      }
    );
  }

  _redrawHpBar() {
    if (!this.hpBar || this.destroyed) return;
    this.hpBar.clear();

    const barWidth = 54;
    const barHeight = 6;
    const ratio = Math.max(0, this.state.currentHp / this.state.maxHp);
    const offsetY = -this.state.bodyHeight / 2 - 14;
    const fillColor = this.state.phase >= 2 ? 0xa855f7 : 0xdc2626;

    this.hpBar.fillStyle(0x0f172a, 0.92);
    this.hpBar.fillRect?.(-barWidth / 2, offsetY, barWidth, barHeight);
    this.hpBar.fillStyle(fillColor, 1);
    this.hpBar.fillRect?.(-barWidth / 2, offsetY, barWidth * ratio, barHeight);
  }

  moveHorizontal(moveDir) {
    if (this.isDead()) return;
    this.body.setVelocityX(moveDir * this.state.moveSpeed);
    if (Math.abs(moveDir) > 0.1) {
      this.facing = moveDir >= 0 ? 1 : -1;
    }
  }

  jump() {
    if (this.isDead() || !this.isGrounded()) return false;
    this.body.setVelocityY(this.state.jumpVelocity);
    return true;
  }

  startAttack(attackKey = 'crush', facing = this.facing) {
    if (this.isDead()) return false;
    this.facing = facing ?? this.facing;
    this.state.activeAttackKey = attackKey;
    this.currentAttackConfig = this.state.getAttackConfig(attackKey);
    this.state.setBehaviorState(BOSS_CONFIG.STATES.WINDUP);
    this.attackTimerMs = this.currentAttackConfig.windupMs;
    this.currentHitboxBounds = null;
    this.body.setVelocityX(0);
    return true;
  }

  onHit(hitInfo) {
    if (this.isDead() || !hitInfo) return;

    const { applied, phaseChanged } = this.state.applyDamage(hitInfo.damage);
    this.flashTimerMs = BOSS_CONFIG.HURT_FLASH_MS;
    this._redrawHpBar();

    if (this.scene?.add?.text && hitInfo.attack) {
      const origin = this.getCombatOrigin();
      const text = this.scene.add
        .text(origin.x, origin.y - 48, `-${applied || hitInfo.damage}`, {
          fontFamily: 'sans-serif',
          fontSize: hitInfo.attack.isCombo ? '16px' : '13px',
          fontStyle: 'bold',
          color: hitInfo.attack.isCombo ? '#facc15' : '#f8fafc',
          stroke: '#0f172a',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(56);

      if (this.scene.tweens?.add) {
        this.scene.tweens.add({
          targets: text,
          y: text.y - 26,
          alpha: 0,
          duration: 650,
          onComplete: () => text.destroy(),
        });
      } else {
        text.destroy();
      }
    }

    if (this.state.isDead()) {
      this.currentHitboxBounds = null;
      this.body.setVelocityX(0);
      if (!this.state.defeatedHandled) {
        this.state.defeatedHandled = true;
        if (typeof this.onDefeated === 'function') {
          this.onDefeated(this, hitInfo);
        }
      }
      return;
    }

    if (phaseChanged && typeof this.onPhaseChanged === 'function') {
      this.onPhaseChanged(this.state.phase, this);
    }

    // Boss possui resistência elevada a knockback para não ser interrompido trivialmente
    if (this.state.behaviorState === BOSS_CONFIG.STATES.CHASING) {
      const dir = hitInfo.direction ?? 1;
      const kb =
        (hitInfo.knockback ?? 0) *
        (1 - BOSS_CONFIG.KNOCKBACK_RESISTANCE) *
        ENEMY_CONFIG.KNOCKBACK_VELOCITY_SCALE;
      this.body.setVelocityX(dir * kb);
    }

    this._redrawVisual();
  }

  stopCombat() {
    this.currentHitboxBounds = null;
    this.attackTimerMs = 0;
    this.hitTargetIds.clear();
    this.body?.setVelocityX?.(0);
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

    if (behavior === BOSS_CONFIG.STATES.WINDUP) {
      this.body.setVelocityX(0);
      this.attackTimerMs -= deltaMs;
      if (this.attackTimerMs <= 0) {
        this.state.setBehaviorState(BOSS_CONFIG.STATES.ATTACKING);
        this.currentAttackConfig =
          this.currentAttackConfig ??
          this.state.getAttackConfig(this.state.activeAttackKey);
        this.attackTimerMs = this.currentAttackConfig.activeMs;
        this.attackInstanceId += 1;
        this.hitTargetIds.clear();
      }
      this._redrawVisual();
      return;
    }

    if (behavior === BOSS_CONFIG.STATES.ATTACKING) {
      const atk =
        this.currentAttackConfig ??
        this.state.getAttackConfig(this.state.activeAttackKey);
      const dashSpeed = atk.dashSpeed ?? 0;
      this.body.setVelocityX(dashSpeed > 0 ? this.facing * dashSpeed : 0);

      this.currentHitboxBounds = Hitbox.getWorldBounds(
        this.getCombatOrigin(),
        atk.hitbox,
        this.facing
      );

      if (player && !player.isDead?.()) {
        CombatSystem.resolveHits({
          attacker: this,
          attack: atk,
          hitboxBounds: this.currentHitboxBounds,
          targets: [player],
          hitTargetIds: this.hitTargetIds,
          attackInstanceId: this.attackInstanceId,
        });
      }

      this.attackTimerMs -= deltaMs;
      if (this.attackTimerMs <= 0) {
        this.currentHitboxBounds = null;
        this.body.setVelocityX(0);
        this.state.setBehaviorState(BOSS_CONFIG.STATES.RECOVERING);
        this.attackTimerMs = atk.recoveryMs;
        this.attackCooldownMs = atk.recoveryMs;
      }
      this._redrawVisual();
      return;
    }

    if (behavior === BOSS_CONFIG.STATES.RECOVERING) {
      this.body.setVelocityX(0);
      this.currentHitboxBounds = null;
      this.attackTimerMs -= deltaMs;
      if (this.attackTimerMs <= 0) {
        this.state.setBehaviorState(
          this.isGrounded()
            ? BOSS_CONFIG.STATES.CHASING
            : BOSS_CONFIG.STATES.FALLING
        );
      }
      this._redrawVisual();
      return;
    }

    if (behavior === BOSS_CONFIG.STATES.FALLING && this.isGrounded()) {
      this.state.setBehaviorState(BOSS_CONFIG.STATES.CHASING);
    }

    if (aiIntent) {
      if (aiIntent.shouldAttack && this.attackCooldownMs <= 0) {
        this.startAttack(aiIntent.attackKey ?? 'crush', aiIntent.facing);
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
    const origin = this.getCombatOrigin();
    this.visual?.setPosition(origin.x, origin.y);
    this.hpBar?.setPosition(origin.x, origin.y);
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
