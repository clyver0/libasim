import { CONTROLS } from '../constants/controls.js';
import { GAMEPLAY } from '../constants/gameplay.js';
import { TYPOGRAPHY } from '../constants/typography.js';
import { BASIC_ATTACKS, COMBOS } from '../data/attacks.js';

/**
 * Painel de interface com o guia de golpes individuais, dash e combos.
 */
export class ComboGuide {
  constructor(scene, controls = CONTROLS, combos = COMBOS) {
    this.scene = scene;
    this.visible = false;

    const width = GAMEPLAY.SCREEN_WIDTH;
    const height = GAMEPLAY.SCREEN_HEIGHT;
    const panelWidth = 576;
    const panelHeight = 356;

    this.container = scene.add.container(width / 2, height / 2);
    this.container.setDepth(140);
    this.container.setScrollFactor?.(0);

    const shadow = scene.add.rectangle(0, 6, panelWidth + 6, panelHeight + 6, 0x000000, 0.55);

    const bg = scene.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x090d16, 0.96)
      .setStrokeStyle(2.5, 0x38bdf8);

    const header = scene.add
      .rectangle(0, -panelHeight / 2 + 24, panelWidth - 4, 44, 0x0f172a, 0.95);

    const title = scene.add
      .text(0, -panelHeight / 2 + 24, '🥊 GUIA DE COMBATE, DASH E COMBOS', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setOrigin(0.5);

    const keyLabels = {
      LIGHT: controls.ATTACK_LIGHT.join('/'),
      HEAVY: controls.ATTACK_HEAVY.join('/'),
      SPECIAL: controls.ATTACK_SPECIAL.join('/'),
      DASH: (controls.DASH ?? ['SHIFT', 'S']).join('/'),
    };

    const basicLines = [
      `Golpes:  [${keyLabels.LIGHT}] ${BASIC_ATTACKS.LIGHT.name}  •  [${keyLabels.HEAVY}] ${BASIC_ATTACKS.HEAVY.name}  •  [${keyLabels.SPECIAL}] ${BASIC_ATTACKS.SPECIAL.name}`,
      `Esquiva Rápida:  [${keyLabels.DASH}] Dash / Slide (comando normal de esquiva)`,
      '',
      'Sequências de Combos (dano e alcance ampliados):',
      ...combos.map((combo, idx) => {
        const seqText = combo.sequence.map((cmd) => `[${keyLabels[cmd]}]`).join('  →  ');
        return `  ${idx + 1}. ${combo.name}:   ${seqText}`;
      }),
    ].join('\n');

    const bodyText = scene.add
      .text(-panelWidth / 2 + 28, -panelHeight / 2 + 60, basicLines, {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '13.5px',
        color: '#e2e8f0',
        lineSpacing: 8,
      })
      .setOrigin(0, 0);

    const footer = scene.add
      .text(
        0,
        panelHeight / 2 - 22,
        `Pressione [${controls.COMBO_GUIDE.join(' / ')}] para fechar`,
        {
          fontFamily: TYPOGRAPHY.UI,
          fontSize: '12px',
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);

    this.container.add([shadow, bg, header, title, bodyText, footer]);
    this.container.setVisible(false);
  }

  toggle() {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
    return this.visible;
  }

  destroy() {
    this.container?.destroy();
  }
}
