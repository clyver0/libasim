import { GAMEPLAY } from '../constants/gameplay.js';
import { TYPOGRAPHY } from '../constants/typography.js';

/**
 * Calcula posição segura para um tooltip dentro dos limites visíveis da tela lógica (960x540).
 */
export function computeTooltipPosition(
  pointerX,
  pointerY,
  boxWidth,
  boxHeight,
  screenWidth = GAMEPLAY.SCREEN_WIDTH,
  screenHeight = GAMEPLAY.SCREEN_HEIGHT,
  margin = 12
) {
  let x = pointerX + 14;
  let y = pointerY + 14;

  if (x + boxWidth + margin > screenWidth) {
    x = Math.max(margin, pointerX - boxWidth - 14);
  }
  if (y + boxHeight + margin > screenHeight) {
    y = Math.max(margin, screenHeight - boxHeight - margin);
  }

  x = Math.max(margin, x);
  y = Math.max(margin, y);

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Componente reutilizável de Tooltip (GAME_DESIGN.md §14):
 * Exibe título e explicação nítidos em HiDPI ao passar o mouse sobre elementos relevantes.
 */
export class Tooltip {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.maxWidth = 270;

    this.container = scene.add.container(0, 0).setDepth(220);
    this.container.setScrollFactor?.(0);
    this.container.setVisible(false);

    this.shadowBg = scene.add
      .rectangle(3, 4, 220, 68, 0x000000, 0.45)
      .setOrigin(0, 0);

    this.bg = scene.add
      .rectangle(0, 0, 220, 68, 0x090d16, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1.5, 0x38bdf8, 0.95);

    this.titleText = scene.add
      .text(12, 9, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#38bdf8',
        wordWrap: { width: this.maxWidth - 24 },
      })
      .setOrigin(0, 0);

    this.bodyText = scene.add
      .text(12, 29, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '12px',
        color: '#e2e8f0',
        lineSpacing: 3,
        wordWrap: { width: this.maxWidth - 24 },
      })
      .setOrigin(0, 0);

    this.container.add([this.shadowBg, this.bg, this.titleText, this.bodyText]);
  }

  show({ title = '', description = '', x = 0, y = 0 } = {}) {
    if (!title && !description) {
      this.hide();
      return;
    }

    this.titleText.setText(title);
    this.bodyText.setText(description);

    const titleHeight = this.titleText.height || 18;
    this.bodyText.setY(9 + titleHeight + 4);

    const contentWidth = Math.max(
      this.titleText.width || 120,
      this.bodyText.width || 140
    );
    const boxWidth = Math.min(this.maxWidth, Math.max(160, contentWidth + 24));
    const boxHeight = Math.max(
      54,
      9 + titleHeight + 4 + (this.bodyText.height || 20) + 12
    );

    this.bg.setSize(boxWidth, boxHeight);
    this.shadowBg.setSize(boxWidth, boxHeight);

    const pos = computeTooltipPosition(
      x,
      y,
      boxWidth,
      boxHeight,
      GAMEPLAY.SCREEN_WIDTH,
      GAMEPLAY.SCREEN_HEIGHT
    );
    this.container.setPosition(pos.x, pos.y);
    this.container.setVisible(true);
    this.visible = true;
  }

  hide() {
    this.visible = false;
    try {
      this.container?.setVisible?.(false);
    } catch {
      // Ignora caso container já esteja em destruição
    }
  }

  attach(gameObject, getContent) {
    if (!gameObject?.on) return;

    const getPointerCoords = (pointer) => ({
      px: pointer?.x ?? pointer?.worldX ?? gameObject.x ?? 0,
      py: pointer?.y ?? pointer?.worldY ?? gameObject.y ?? 0,
    });

    gameObject.on('pointerover', (pointer) => {
      const data =
        typeof getContent === 'function' ? getContent() : getContent;
      if (data) {
        const { px, py } = getPointerCoords(pointer);
        this.show({
          title: data.title,
          description: data.description,
          x: px,
          y: py,
        });
      }
    });

    gameObject.on('pointermove', (pointer) => {
      if (!this.visible) return;
      const data =
        typeof getContent === 'function' ? getContent() : getContent;
      if (data) {
        const { px, py } = getPointerCoords(pointer);
        this.show({
          title: data.title,
          description: data.description,
          x: px,
          y: py,
        });
      }
    });

    gameObject.on('pointerout', () => {
      this.hide();
    });
  }

  destroy() {
    this.visible = false;
    try {
      this.container?.destroy?.();
    } catch {
      // Ignora em shutdown
    }
  }
}
