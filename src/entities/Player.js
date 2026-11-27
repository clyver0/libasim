import { ENEMY_CONFIG } from '../constants/enemies.js';
import { PHYSICS } from '../constants/physics.js';
import { CharacterAppearanceSystem } from '../systems/CharacterAppearanceSystem.js';
import { drawAntForm, drawCar } from '../ui/AbilityVisuals.js';
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
  constructor(
    scene,
    x,
    y,
    characterData,
    physicsConfig = PHYSICS,
    options = {}
  ) {
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

    // Corrida horizontal contínua, abertura de fase, dash/slide e proteção de buraco
    this.continuousRun = Boolean(options.continuousRun);
    this.introAutoWalk = false;
    this.dashTimerMs = 0;
    this.dashCooldownMs = 0;
    this.dashDirection = 1;
    this.dashSpeed = 0;
    this.isSlideDash = false;
    this.pitRecoveryTimerMs = 0;
    this.pitContactLocked = false;

    // Estado temporário de habilidade especial (sempre limpo por `clearAbilityState`)
    this.abilityInvulnerable = false;
    this.abilityMoveSpeed = null;
    this.abilityAutoRun = false;
    this.abilityForm = null;
    this.abilityVisualScale = 1;
    this.powerMode = false;
    this.powerStacks = 0;
    this.drinkPowerStacks = 0;
    this.powerFx = null;
    this.cheatMode = false;
    this.upgradeAppearance = null;
    this.appearanceState = this._composeAppearance(null);

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
    this.face =
      characterData.portraitKey && typeof scene?.add?.image === 'function'
        ? scene.add.image(x, y, characterData.portraitKey).setDepth(11)
        : null;
    this.syncBodyScale();
    this._applyVisualScale();

    this._onPostUpdate = () => this.syncVisualToBody();
    if (scene?.events?.on) {
      scene.events.on('postupdate', this._onPostUpdate);
    }
  }

  /** Combina o visual-base do personagem com os visuais de upgrades e do modo de força. */
  _composeAppearance(upgradeState) {
    const baseTypes = this.state?.visualTypes ?? [];
    const up =
      upgradeState ?? CharacterAppearanceSystem.resolveAppearanceState([]);
    const types = new Set([...baseTypes, ...(up.activeTypes ?? [])]);
    if (this.powerMode || this.cheatMode) types.add('gorilla_arms');
    const flags = CharacterAppearanceSystem.resolveAppearanceState(
      [...types].map((type) => ({ visual: { type } }))
    );
    return {
      ...up,
      ...flags,
      scale: up.scale ?? 1,
      armStrokeWidth: Math.max(
        up.armStrokeWidth ?? 3.4,
        flags.armStrokeWidth ?? 3.4,
        this.powerMode || this.cheatMode ? 7.5 : 0
      ),
      torsoStrokeWidth: up.torsoStrokeWidth ?? 3.8,
    };
  }

  /** Escala visual = visual de upgrades × tamanho do personagem × habilidade (× pulso de força). */
  _applyVisualScale() {
    if (!this.visual?.setScale) return;
    const charScale = this.state?.multipliers?.bodyScale ?? 1;
    const pulse = this.powerMode
      ? 1.1 + Math.sin(this.animTimeMs * 0.012) * 0.04
      : 1;
    const scale =
      (this.upgradeAppearance?.scale ?? 1) *
      charScale *
      this.abilityVisualScale *
      pulse;
    this.visual.setScale(scale);
    if (this.face) {
      this.face.setScale(scale * 0.105);
      this.face.setFlipX(this.facing < 0);
    }
  }

  /** Aplica o estado temporário de uma habilidade especial (invulnerabilidade, velocidade, forma). */
  setAbilityState({
    invulnerable = false,
    moveSpeed = null,
    autoRun = false,
    form = null,
    scale = 1,
  } = {}) {
    this.abilityInvulnerable = Boolean(invulnerable);
    this.abilityMoveSpeed = moveSpeed;
    this.abilityAutoRun = Boolean(autoRun);
    this.abilityForm = form;
    this.abilityVisualScale = scale;
    this._applyVisualScale();
    this._redrawVisual();
  }

  clearAbilityState() {
    this.setAbilityState({});
  }

  /** Modo de força (Açougue + Cantinho do Vale): braços grossos, pulso e chamas. */
  setPowerMode(active, stackCount = active ? 1 : 0) {
    this.drinkPowerStacks = active
      ? Math.max(1, Math.min(10, Math.floor(stackCount)))
      : 0;
    this._syncPowerMode();
  }

  setCheatMode(active) {
    this.cheatMode = Boolean(active);
    this.state.setCheatMode(this.cheatMode);
    this._syncPowerMode();
  }

  _syncPowerMode() {
    const next = this.cheatMode || this.drinkPowerStacks > 0;
    const nextStacks = this.cheatMode ? 10 : this.drinkPowerStacks;
    if (this.powerMode === next && this.powerStacks === nextStacks) return;
    this.powerMode = next;
    this.powerStacks = nextStacks;
    this.appearanceState = this._composeAppearance(this.upgradeAppearance);
    if (!next && this.powerFx) {
      this.powerFx.destroy();
      this.powerFx = null;
    }
    if (next && !this.powerFx && this.scene?.add?.graphics) {
      this.powerFx = this.scene.add.graphics().setDepth(9);
    }
    this._applyVisualScale();
    this._redrawVisual();
  }

  _drawPowerFx() {
    if (!this.powerFx) return;
    this.powerFx.setVisible?.(true);
    const cx = this.body.x + this.body.halfWidth;
    const cy = this.body.y + this.body.halfHeight;
    const t = this.animTimeMs * 0.012;
    const h = this.body.height;
    const g = this.powerFx;
    const intensity = 0.35 + (this.powerStacks / 10) * 0.65;
    g.clear();
    g.setPosition(cx, cy);
    for (let i = 0; i < 3; i += 1) {
      const r = 1 + i * 0.22 + Math.sin(t + i) * 0.07;
      g.fillStyle(i === 0 ? 0xfacc15 : i === 1 ? 0xf97316 : 0xef4444, (0.2 - i * 0.04) * intensity);
      g.fillEllipse(0, 0, h * 0.95 * r, h * 1.3 * r);
    }
    g.lineStyle(3, 0xfacc15, 0.45 + intensity * 0.45);
    g.strokeEllipse(0, 0, h * 0.95 + Math.sin(t * 1.3) * 4, h * 1.3 + Math.sin(t * 1.3) * 5);
    // Chamas subindo
    const flameCount = 5 + this.powerStacks;
    for (let i = 0; i < flameCount; i += 1) {
      const ph = (t * 0.7 + i / flameCount) % 1;
      const fx = (i - (flameCount - 1) / 2) * h * 0.13;
      g.fillStyle(0xfb923c, (1 - ph) * intensity);
      g.fillTriangle(fx - 4, h * 0.45 - ph * h, fx + 4, h * 0.45 - ph * h, fx, h * 0.45 - ph * h - 12 - ph * 6);
    }
  }

  get stats() {
    return this.state.effectiveStats;
  }

  isDead() {
    return this.state.isDead();
  }

  isInvulnerable() {
    return (
      this.invulnerabilityTimerMs > 0 ||
      this.pitRecoveryTimerMs > 0 ||
      this.dashTimerMs > 0 ||
      this.introAutoWalk ||
      this.abilityInvulnerable ||
      this.cheatMode
    );
  }

  setContinuousRun(enabled) {
    this.continuousRun = Boolean(enabled);
  }

  setIntroWalk(enabled) {
    this.introAutoWalk = Boolean(enabled);
    if (this.introAutoWalk) {
      this.dashTimerMs = 0;
      this.hurtKnockbackTimerMs = 0;
      this.facing = 1;
    }
  }

  isDashing() {
    return this.dashTimerMs > 0;
  }

  canDash() {
    return (
      !this.isDead() &&
      !this.introAutoWalk &&
      this.dashTimerMs <= 0 &&
      this.dashCooldownMs <= 0 &&
      this.hurtKnockbackTimerMs <= 0 &&
      this.abilityForm !== 'car'
    );
  }

  startDash(directionHint = 0) {
    if (!this.canDash()) return false;

    const dashCfg = this.physicsConfig.DASH ?? PHYSICS.DASH;
    const dir = directionHint !== 0 ? Math.sign(directionHint) : this.facing || 1;

    const speedMultiplier =
      this.state.gameplayModifiers?.moveSpeedMultiplier ?? 1;
    const baseSpeed =
      this.abilityMoveSpeed ??
      this.physicsConfig.PLAYER_MOVE_SPEED * speedMultiplier;

    this.facing = dir;
    this.dashDirection = dir;
    this.isSlideDash = this.isGrounded();
    this.dashSpeed = Math.max(
      dashCfg.MIN_SPEED,
      baseSpeed * dashCfg.SPEED_MULTIPLIER
    );
    this.dashTimerMs = dashCfg.DURATION_MS;
    this.dashCooldownMs = dashCfg.COOLDOWN_MS;
    this.invulnerabilityTimerMs = Math.max(
      this.invulnerabilityTimerMs,
      dashCfg.INVULNERABILITY_MS
    );
    this.body.setVelocityX(dir * this.dashSpeed);

    const origin = this.getCombatOrigin();
    this.scene?.events?.emit?.('player:dash', {
      x: origin.x,
      y: origin.y,
      direction: this.facing,
      slide: this.isSlideDash,
    });
    this._redrawVisual();
    return true;
  }

  getDashSnapshot() {
    const dashCfg = this.physicsConfig.DASH ?? PHYSICS.DASH;
    const total = Math.max(1, dashCfg.COOLDOWN_MS);
    const progress =
      this.dashTimerMs > 0
        ? 1
        : Math.max(0, Math.min(1, 1 - this.dashCooldownMs / total));
    return {
      active: this.dashTimerMs > 0,
      ready: this.canDash(),
      cooldownRemainingMs: Math.max(0, this.dashCooldownMs),
      cooldownTotalMs: total,
      progress,
    };
  }

  /**
   * Aplica queda em buraco: perde exatamente 30 HP uma única vez por contato,
   * ativa proteção contra dano repetido durante a recuperação e impulsiona de volta.
   */
  handlePitFall({
    groundTopY = 500,
    safeLandingX = null,
  } = {}) {
    if (this.isDead()) {
      return { triggered: false, damaged: false, damageApplied: 0 };
    }

    const pitCfg = this.physicsConfig.PIT_HAZARD ?? PHYSICS.PIT_HAZARD;
    const protectedFromDamage =
      this.pitContactLocked || this.pitRecoveryTimerMs > 0;

    this.pitContactLocked = true;
    this.dashTimerMs = 0;

    let damageApplied = 0;
    let damaged = false;
    if (!protectedFromDamage) {
      this.pitRecoveryTimerMs = pitCfg.RECOVERY_PROTECTION_MS;
      this.invulnerabilityTimerMs = Math.max(
        this.invulnerabilityTimerMs,
        pitCfg.RECOVERY_PROTECTION_MS
      );
      this.flashTimerMs = 240;
      if (!this.cheatMode) {
        damageApplied = this.state.applyDamage(pitCfg.DAMAGE);
        damaged = damageApplied > 0;
      }
    }

    if (this.isDead()) {
      this.body.setVelocityX(0);
      this.body.setVelocityY?.(0);
      this._redrawVisual();
      return { triggered: true, damaged, damageApplied, fatal: true };
    }

    // Reposiciona logo acima do nível do chão e aplica ricochete parabólico para área segura
    this.body.y = groundTopY - this.body.height - 6;
    const centerX = this.body.x + this.body.halfWidth;
    const desiredVx =
      typeof safeLandingX === 'number' && safeLandingX > centerX
        ? Math.min(430, Math.max(pitCfg.BOUNCE_FORWARD_VX, (safeLandingX - centerX) * 2.1))
        : pitCfg.BOUNCE_FORWARD_VX;

    this.facing = 1;
    this.hurtKnockbackVx = desiredVx;
    this.hurtKnockbackVy = 0;
    this.hurtKnockbackTimerMs = 230;
    this.body.setVelocityX(desiredVx);
    this.body.setVelocityY?.(pitCfg.BOUNCE_VELOCITY_Y);
    this.syncVisualToBody();
    this._redrawVisual();

    return { triggered: true, damaged, damageApplied, fatal: false };
  }

  playDeathAnimation(onComplete = null) {
    this.visual?.setVisible?.(true);
    const targets = [this.visual, this.face].filter(Boolean);
    if (!targets.length || typeof this.scene?.tweens?.add !== 'function') {
      onComplete?.();
      return null;
    }

    return this.scene.tweens.add({
      targets,
      alpha: 0,
      angle: '+=260',
      duration: 720,
      ease: 'Cubic.In',
      onComplete: () => onComplete?.(),
    });
  }

  _getVisualFootOffset() {
    const visualScale = Math.abs(
      this.visual?.scaleY ?? this.visual?.scale ?? 1
    );
    return (
      (this.body?.halfHeight ?? this.physicsConfig.PLAYER_BODY_HEIGHT / 2) /
      Math.max(0.001, visualScale)
    );
  }

  _redrawVisual() {
    this.visual?.setVisible?.(true);
    const color = this.isDead()
      ? 0x64748b
      : this.flashTimerMs > 0
      ? 0xffffff
      : this.state.color;
    const auraColor = this.isDead() ? null : this.activeAuraColor;
    const effectivePose =
      this.combatPose !== 'idle'
        ? this.combatPose
        : this.dashTimerMs > 0
          ? 'dash'
          : this.locomotionPose;

    const motion = {
      animTimeMs: this.animTimeMs,
      vx: this.body?.velocity?.x ?? 0,
      vy: this.body?.velocity?.y ?? 0,
      grounded: this.isGrounded(),
      attackProgress: this.attackProgress,
    };

    if (this.abilityForm === 'car') {
      drawCar(this.visual, {
        color: this.state.color,
        facing: this.facing,
        timeMs: this.animTimeMs,
        footOffset: this._getVisualFootOffset(),
      });
      if (this.face) this.face.setVisible(false);
      return;
    }
    if (this.abilityForm === 'ant') {
      drawAntForm(this.visual, {
        color: this.state.color,
        facing: this.facing,
        timeMs: this.animTimeMs,
        footOffset: this._getVisualFootOffset(),
      });
      if (this.face) this.face.setVisible(false);
      return;
    }

    if (this.face) this.face.setVisible(true);
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
    this.upgradeAppearance = appearanceState;
    this.appearanceState = this._composeAppearance(appearanceState);
    this._applyVisualScale();
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
    const kbSpeed = effectiveKnockback * ENEMY_CONFIG.KNOCKBACK_VELOCITY_SCALE;
    this.hurtKnockbackVx = dir * kbSpeed;
    this.hurtKnockbackVy = 0;
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
      8,
      Math.round(this.physicsConfig.PLAYER_BODY_WIDTH * targetScale)
    );
    const newHeight = Math.max(
      12,
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

    this._applyVisualScale();
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
    // Habilidades (carro/formiga) definem velocidade absoluta própria e temporária
    const speed =
      this.abilityMoveSpeed ??
      this.physicsConfig.PLAYER_MOVE_SPEED * speedMultiplier;
    this.body.setVelocityX(clampedDir * speed);

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
    if (this.introAutoWalk) {
      const walkSpeed =
        (this.physicsConfig.CONTINUOUS_RUN ?? PHYSICS.CONTINUOUS_RUN)
          .INTRO_WALK_SPEED;
      this.facing = 1;
      this.body.setVelocityX(walkSpeed);
      return;
    }

    if (!intent) return;

    if (intent.dash) {
      const dirHint = intent.horizontal !== 0 ? intent.horizontal : this.facing || 1;
      this.startDash(dirHint);
    }

    if (this.dashTimerMs > 0) {
      if (
        (this.dashDirection > 0 && this.body?.blocked?.right) ||
        (this.dashDirection < 0 && this.body?.blocked?.left)
      ) {
        this.dashTimerMs = 0;
        this.body.setVelocityX(0);
      } else {
        this.body.setVelocityX(this.dashDirection * this.dashSpeed);
      }
      if (intent.jump) {
        this.jump();
      }
      return;
    }

    let horizontal = intent.horizontal ?? 0;
    if (this.abilityAutoRun) {
      // Carro: avança sozinho; no modo horizontal segue sempre adiante sem parede artificial
      if (this.body.blocked?.left) this.facing = 1;
      if (!this.continuousRun && this.body.blocked?.right) this.facing = -1;
      if (horizontal === 0) horizontal = this.continuousRun ? 1 : this.facing;
    }
    this.moveHorizontal(horizontal);

    if (intent.jump) {
      this.jump();
    }
  }

  syncVisualToBody() {
    const centerX = this.body.x + this.body.halfWidth;
    const centerY = this.body.y + this.body.halfHeight;
    this.visual.setPosition(centerX, centerY);
    if (this.face) {
      const charScale = this.state?.multipliers?.bodyScale ?? 1;
      const portraitScale =
        (this.upgradeAppearance?.scale ?? 1) *
        charScale *
        this.abilityVisualScale *
        (this.powerMode ? 1.1 : 1);
      this.face.setPosition(
        centerX,
        centerY - 18 * portraitScale
      );
      this.face.setFlipX(this.facing < 0);
    }
  }

  update(intent, deltaMs = 16.67) {
    this.animTimeMs += deltaMs;

    if (this.invulnerabilityTimerMs > 0) {
      this.invulnerabilityTimerMs = Math.max(
        0,
        this.invulnerabilityTimerMs - deltaMs
      );
    }

    if (this.pitRecoveryTimerMs > 0) {
      this.pitRecoveryTimerMs = Math.max(0, this.pitRecoveryTimerMs - deltaMs);
    }
    if (this.pitContactLocked && this.isGrounded() && this.pitRecoveryTimerMs <= 0) {
      this.pitContactLocked = false;
    }

    if (this.dashCooldownMs > 0) {
      this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
    }
    if (this.dashTimerMs > 0) {
      this.dashTimerMs = Math.max(0, this.dashTimerMs - deltaMs);
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
    if (this.powerMode) {
      this._applyVisualScale();
      this._drawPowerFx();
    }
    this.syncVisualToBody();
  }

  destroy() {
    this.powerFx?.destroy();
    this.powerFx = null;
    if (this.scene?.events?.off && this._onPostUpdate) {
      this.scene.events.off('postupdate', this._onPostUpdate);
    }
    this.visual?.destroy();
    this.collider?.destroy();
  }
}
