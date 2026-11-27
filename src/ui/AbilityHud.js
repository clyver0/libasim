import { TYPOGRAPHY } from '../constants/typography.js';

/**
 * HUD compacto da Expansão: barra da habilidade especial (carga/recarga/ativa) e indicador de fase.
 * Mantido separado do Hud principal para não acoplar sistemas.
 */
export class AbilityHud {
  constructor(scene, { width = 960, height = 540 } = {}) {
    this.scene = scene;
    this.panelWidth = 252;
    this.panelHeight = 46;
    this.x = 16;
    this.y = height - this.panelHeight - 14;
    this.lastKey = '';

    this.gfx = scene.add.graphics().setDepth(30);

    this.title = scene.add
      .text(this.x + 10, this.y + 4, '', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 2.5,
      })
      .setDepth(31);
    this.status = scene.add
      .text(this.x + 10, this.y + 23, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '11px',
        color: '#cbd5e1',
      })
      .setDepth(31);

    this.phaseText = scene.add
      .text(width / 2, 7, '', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#38bdf8',
        stroke: '#090d16',
        strokeThickness: 5,
        letterSpacing: 1,
      })
      .setOrigin(0.5, 0)
      .setDepth(31);
    this.drunkText = scene.add
      .text(this.x + this.panelWidth + 12, this.y + 28, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '10.5px',
        color: '#94a3b8',
      })
      .setDepth(31);

    for (const obj of [
      this.gfx,
      this.title,
      this.status,
      this.phaseText,
      this.drunkText,
    ]) {
      obj?.setScrollFactor?.(0);
    }
  }

  setPhase(phase, kills = 0, total = 100) {
    this.phaseText?.setText(`${phase.name} · ${phase.subtitle} · ${kills}/${total}`);
    this.phaseText?.setColor(phase.color);
  }

  setDrunkLevelLabel(label) {
    this.drunkText?.setText(`[N] Bebida: ${label}  •  [ / ] Música`);
  }

  update(snapshot, definition) {
    if (this.gfx && snapshot) {
      const color = definition?.color ?? 0x38bdf8;
      const key = `${snapshot.state}|${Math.round(snapshot.progress * 100)}|${snapshot.kills}`;
      if (key !== this.lastKey) {
        this.lastKey = key;

        let statusLabel;
        let barColor = color;
        if (snapshot.state === 'active') {
          statusLabel = `ATIVA  ${(snapshot.remainingMs / 1000).toFixed(1)}s`;
          barColor = 0xfacc15;
        } else if (snapshot.state === 'ready') {
          statusLabel = '[E] PRONTA!  (Q também)';
          barColor = 0x4ade80;
        } else if (snapshot.chargeType === 'kills') {
          statusLabel = `Carga: ${snapshot.kills}/${snapshot.killsRequired} abates`;
        } else {
          statusLabel = `Recarga: ${(snapshot.cooldownRemainingMs / 1000).toFixed(0)}s`;
        }

        this.title.setText(`✨ ${snapshot.name}`);
        this.status.setText(statusLabel);
        this.status.setColor(snapshot.state === 'ready' ? '#86efac' : '#cbd5e1');

        const g = this.gfx;
        g.clear();
        g.fillStyle(0x0f172a, 0.9);
        g.fillRoundedRect(this.x, this.y, this.panelWidth, this.panelHeight, 8);
        g.lineStyle(2, snapshot.state === 'ready' ? 0x4ade80 : 0x334155, 1);
        g.strokeRoundedRect(this.x, this.y, this.panelWidth, this.panelHeight, 8);
        g.fillStyle(0x1e293b, 1);
        g.fillRect(this.x + 8, this.y + this.panelHeight - 9, this.panelWidth - 16, 5);
        g.fillStyle(barColor, 1);
        g.fillRect(
          this.x + 8,
          this.y + this.panelHeight - 9,
          (this.panelWidth - 16) * snapshot.progress,
          5
        );
      }
    }
  }

  destroy() {
    for (const obj of [
      this.gfx,
      this.title,
      this.status,
      this.phaseText,
      this.drunkText,
    ]) {
      obj?.destroy?.();
    }
    this.gfx = null;
  }
}
