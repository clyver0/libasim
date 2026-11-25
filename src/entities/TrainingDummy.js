import { COMBAT } from '../constants/combat.js';

/**
 * RECURSO TEMPORÁRIO DE DESENVOLVIMENTO (FASE 3)
 * Alvo de treino estático para validar visualmente hitboxes, acertos, dano e knockback
 * no navegador antes da implementação dos inimigos na Fase 4.
 * Não possui IA, spawn, HP real ou contagem de derrotas.
 */
export class TrainingDummy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.id = 'training_dummy_temp';
    this.baseX = x;
    this.baseY = y;
    this.width = 32;
    this.height = 56;
    this.stats = { damageReduction: 0 };

    this.visual = scene.add
      .rectangle(x, y, this.width, this.height, 0x475569, 0.9)
      .setStrokeStyle(2, 0x94a3b8);

    this.label = scene.add
      .text(x, y - 42, 'Alvo de Teste', {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.knockbackOffsetX = 0;
    this.knockbackTimerMs = 0;
    this.flashTimerMs = 0;
  }

  getHurtbox() {
    return {
      x: this.baseX + this.knockbackOffsetX - this.width / 2,
      y: this.baseY - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  onHit(hitInfo) {
    this.flashTimerMs = 120;
    this.visual.setFillStyle(0xef4444, 1);

    // Knockback puramente visual, sem alterar física/movimentação do jogador
    this.knockbackOffsetX = hitInfo.direction * Math.min(hitInfo.knockback * 0.4, 28);
    this.knockbackTimerMs = COMBAT.DEFAULT_KNOCKBACK_DURATION_MS;

    const text = this.scene.add
      .text(
        this.baseX + this.knockbackOffsetX,
        this.baseY - 28,
        `${hitInfo.attack.name}\n-${hitInfo.damage}`,
        {
          fontFamily: 'sans-serif',
          fontSize: hitInfo.attack.isCombo ? '14px' : '12px',
          fontStyle: hitInfo.attack.isCombo ? 'bold' : 'normal',
          color: hitInfo.attack.isCombo ? '#facc15' : '#f8fafc',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    this.scene.tweens?.add({
      targets: text,
      y: text.y - 26,
      alpha: 0,
      duration: 650,
      onComplete: () => text.destroy(),
    });
  }

  update(deltaMs) {
    if (this.flashTimerMs > 0) {
      this.flashTimerMs -= deltaMs;
      if (this.flashTimerMs <= 0) {
        this.visual.setFillStyle(0x475569, 0.9);
      }
    }

    if (this.knockbackTimerMs > 0) {
      this.knockbackTimerMs -= deltaMs;
      if (this.knockbackTimerMs <= 0) {
        this.knockbackOffsetX = 0;
      }
    }

    const currentX = this.baseX + this.knockbackOffsetX;
    this.visual.setPosition(currentX, this.baseY);
    this.label.setPosition(currentX, this.baseY - 42);
  }

  destroy() {
    this.visual?.destroy();
    this.label?.destroy();
  }
}
