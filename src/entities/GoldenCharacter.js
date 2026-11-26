import { SHOP_CONFIG } from '../constants/shops.js';
import { drawStickFigure } from './Player.js';

/**
 * Personagem especial dourado: Coquinho Extra (GAME_DESIGN.md §11).
 *
 * Regras:
 * - Não é um inimigo comum (`countsAsCommonEnemy = false`).
 * - Não ataca nem persegue o jogador.
 * - Atravessa a tela horizontalmente em altura acessível.
 * - Ao ser atingido por qualquer golpe/combo do jogador, concede visita à loja especial.
 * - Se sair da tela sem ser atingido, desaparece sem recompensa.
 */
export class GoldenCharacter {
  constructor(
    scene,
    {
      id = `coquinho_${Date.now()}`,
      direction = 1,
      screenWidth = 960,
      y = 474,
      config = SHOP_CONFIG.COQUINHO,
      onHitReward = null,
    } = {}
  ) {
    this.scene = scene;
    this.id = id;
    this.direction = direction >= 0 ? 1 : -1;
    this.facing = this.direction;
    this.screenWidth = screenWidth;
    this.config = config;
    this.onHitReward = onHitReward;

    // Contrato explícito para nunca ser contabilizado como inimigo comum
    this.state = {
      countsAsCommonEnemy: false,
      effectiveStats: { damageReduction: 0 },
    };

    this.rewarded = false;
    this.expired = false;
    this.destroyed = false;
    this.animTimerMs = 0;

    const startX =
      this.direction > 0
        ? -config.SPAWN_OFFSET_X
        : screenWidth + config.SPAWN_OFFSET_X;

    this.collider = scene.add.rectangle(
      startX,
      y,
      config.BODY_WIDTH,
      config.BODY_HEIGHT,
      0xffffff,
      0
    );
    scene.physics.add.existing(this.collider);

    this.body = this.collider.body;
    this.body.setAllowGravity?.(false);
    this.body.setCollideWorldBounds?.(false);
    this.body.setSize?.(config.BODY_WIDTH, config.BODY_HEIGHT);
    this.body.setVelocityX?.(this.direction * config.MOVE_SPEED);
    this.body.setVelocityY?.(0);

    this.visual = scene.add.graphics({ x: startX, y }).setDepth?.(18) ??
      scene.add.graphics({ x: startX, y });
    this.nameLabel = scene.add?.text
      ? scene.add.text(
          startX,
          y - config.BODY_HEIGHT / 2 - 6,
          'NOIA',
          {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fef08a',
            stroke: '#451a03',
            strokeThickness: 4,
            backgroundColor: '#0f172a',
            padding: { x: 5, y: 2 },
          }
        )
      : null;
    this.nameLabel?.setOrigin?.(0.5, 1)?.setDepth?.(20);
    this._redraw('walk_1');

    this._onPostUpdate = () => this.syncVisualToBody();
    if (scene?.events?.on) {
      scene.events.on('postupdate', this._onPostUpdate);
    }
  }

  isDead() {
    return this.rewarded || this.expired || this.destroyed;
  }

  isInvulnerable() {
    return false;
  }

  getCombatOrigin() {
    return {
      x: this.body.x + (this.body.halfWidth ?? this.config.BODY_WIDTH / 2),
      y: this.body.y + (this.body.halfHeight ?? this.config.BODY_HEIGHT / 2),
    };
  }

  getHurtbox() {
    return {
      x: this.body.x,
      y: this.body.y,
      width: this.body.width ?? this.config.BODY_WIDTH,
      height: this.body.height ?? this.config.BODY_HEIGHT,
    };
  }

  _redraw(pose = 'idle') {
    if (!this.visual || this.destroyed) return;
    drawStickFigure(
      this.visual,
      this.config.COLOR,
      this.facing,
      pose,
      0xfef08a,
      null,
      {
        animTimeMs: this.animTimerMs,
        vx: this.direction * this.config.MOVE_SPEED,
        vy: 0,
        grounded: true,
      }
    );
  }

  onHit(hitInfo) {
    if (this.isDead()) return false;

    this.rewarded = true;
    this.body.setVelocityX?.(0);

    if (this.scene?.add?.text) {
      const origin = this.getCombatOrigin();
      const banner = this.scene.add
        .text(origin.x, origin.y - 36, 'COQUINHO EXTRA!\nLOJA ESPECIAL!', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fef08a',
          stroke: '#0f172a',
          strokeThickness: 3,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(65);

      if (this.scene.tweens?.add) {
        this.scene.tweens.add({
          targets: banner,
          y: banner.y - 30,
          alpha: 0,
          duration: 950,
          onComplete: () => banner.destroy(),
        });
      } else {
        banner.destroy();
      }
    }

    if (typeof this.onHitReward === 'function') {
      this.onHitReward(this, hitInfo);
    }

    return true;
  }

  update(deltaMs = 16.67) {
    if (this.isDead()) return true;

    this.body.setVelocityX?.(this.direction * this.config.MOVE_SPEED);
    this.body.setVelocityY?.(0);

    // Simula deslocamento horizontal caso o body seja um mock simples sem step do Arcade Physics
    if (this.body.velocity && !this.scene?.physics?.world) {
      this.body.x += (this.body.velocity.x * deltaMs) / 1000;
    }

    this.animTimerMs += deltaMs;
    const pose = Math.floor(this.animTimerMs / 110) % 2 === 0 ? 'walk_1' : 'walk_2';
    this._redraw(pose);

    const origin = this.getCombatOrigin();
    const outLeft =
      this.direction < 0 && origin.x < -this.config.DESPAWN_MARGIN_X;
    const outRight =
      this.direction > 0 &&
      origin.x > this.screenWidth + this.config.DESPAWN_MARGIN_X;

    if (outLeft || outRight) {
      this.expired = true;
      return true;
    }

    return false;
  }

  syncVisualToBody() {
    if (this.destroyed || !this.body || !this.visual) return;
    const origin = this.getCombatOrigin();
    this.visual.setPosition(origin.x, origin.y);
    this.nameLabel?.setPosition?.(
      origin.x,
      origin.y - this.config.BODY_HEIGHT / 2 - 6
    );
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.scene?.events?.off && this._onPostUpdate) {
      this.scene.events.off('postupdate', this._onPostUpdate);
    }
    this.visual?.destroy();
    this.nameLabel?.destroy();
    this.collider?.destroy();
  }
}
