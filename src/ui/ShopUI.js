import Phaser from 'phaser';
import { GAMEPLAY } from '../constants/gameplay.js';
import { summarizeUpgradeEffects } from '../data/upgrades.js';

/**
 * Interface polida de Loja (Oficial Chiquinho Promos e Especial Coquinho Extra).
 */
export class ShopUI {
  constructor(scene, { onSelectOption = null, tooltip = null } = {}) {
    this.scene = scene;
    this.onSelectOption = onSelectOption;
    this.tooltip = tooltip;
    this.visible = false;
    this.selectionLocked = false;
    this.selectedIndex = 0;
    this.currentOptions = [];
    this.cardElements = [];

    const width = GAMEPLAY.SCREEN_WIDTH;
    const height = GAMEPLAY.SCREEN_HEIGHT;

    this.container = scene.add.container(width / 2, height / 2).setDepth(130);
    this.container.setVisible(false);

    this.backdrop = scene.add.rectangle(0, 0, width, height, 0x020617, 0.82);

    this.panelShadow = scene.add.rectangle(0, 6, 804, 412, 0x000000, 0.55);

    this.panel = scene.add
      .rectangle(0, 0, 796, 404, 0x0b1120, 0.98)
      .setStrokeStyle(2.5, 0x38bdf8);

    this.headerBar = scene.add
      .rectangle(0, -162, 792, 66, 0x0f172a, 0.95)
      .setStrokeStyle(1, 0x1e293b);

    this.titleText = scene.add
      .text(0, -172, '', {
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.subtitleText = scene.add
      .text(0, -144, '', {
        fontSize: '12.5px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.footerText = scene.add
      .text(
        0,
        176,
        'Setas / A-D: navegar   •   Enter / Espaço / Clique ou [1] [2] [3]: escolher upgrade',
        {
          fontSize: '12px',
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);

    this.cardsContainer = scene.add.container(0, 16);
    this.container.add([
      this.backdrop,
      this.panelShadow,
      this.panel,
      this.headerBar,
      this.titleText,
      this.subtitleText,
      this.cardsContainer,
      this.footerText,
    ]);

    if (scene.input?.keyboard) {
      this.quickKeys = [
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      ];
    } else {
      this.quickKeys = [];
    }
  }

  open(session) {
    if (!session) return;

    this.visible = true;
    this.selectionLocked = false;
    this.selectedIndex = 0;
    this.currentOptions = session.options ?? [];
    this.currentTheme = session.theme;

    const accentColor = session.theme?.accentColor ?? 0x38bdf8;
    const panelBg = session.theme?.panelBg ?? 0x0b1120;
    const milestoneSuffix = session.milestone
      ? `  •  ${session.milestone} INIMIGOS`
      : '';

    this.panel.setFillStyle(panelBg, 0.98);
    this.panel.setStrokeStyle(2.5, accentColor);
    this.titleText
      .setText(`${session.theme?.title ?? 'LOJA'}${milestoneSuffix}`)
      .setColor(session.theme?.accentHex ?? '#38bdf8');
    this.subtitleText.setText(session.theme?.subtitle ?? '');

    this._rebuildCards(accentColor);
    this.container.setVisible(true);
  }

  close() {
    this.visible = false;
    this.selectionLocked = false;
    this.currentOptions = [];
    this.tooltip?.hide();
    this.container.setVisible(false);
    this._clearCards();
  }

  _clearCards() {
    for (const card of this.cardElements) {
      try {
        card.bg?.disableInteractive?.();
        card.root?.destroy?.();
      } catch {
        // Ignora caso já destruído pelo shutdown da cena
      }
    }
    this.cardElements = [];
    try {
      this.cardsContainer?.removeAll?.(true);
    } catch {
      // Ignora em shutdown
    }
  }

  _rebuildCards(accentColor) {
    this._clearCards();

    if (this.currentOptions.length === 0) {
      const emptyLabel = this.scene.add
        .text(
          0,
          0,
          'Todos os upgrades compatíveis já foram adquiridos!\nPressione Enter ou clique para continuar.',
          {
            fontSize: '15px',
            color: '#e2e8f0',
            align: 'center',
          }
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      emptyLabel.on('pointerup', () => this._confirmSelection(0));
      this.cardsContainer.add(emptyLabel);
      return;
    }

    const cardWidth = 232;
    const cardHeight = 250;
    const spacing = 250;
    const startX = -((this.currentOptions.length - 1) * spacing) / 2;

    this.currentOptions.forEach((upgrade, index) => {
      const x = startX + index * spacing;
      const root = this.scene.add.container(x, 0);
      const swatchColor = upgrade.visual?.color ?? accentColor;

      const bg = this.scene.add
        .rectangle(0, 0, cardWidth, cardHeight, 0x131c31, 0.96)
        .setStrokeStyle(2, 0x334155)
        .setInteractive({ useHandCursor: true });

      const badge = this.scene.add
        .text(-cardWidth / 2 + 18, -cardHeight / 2 + 16, `TECLA [${index + 1}]`, {
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#64748b',
        })
        .setOrigin(0, 0.5);

      const medallionOuter = this.scene.add
        .circle(0, -cardHeight / 2 + 52, 20, swatchColor, 0.2)
        .setStrokeStyle(2, swatchColor, 0.95);
      const medallionInner = this.scene.add.circle(
        0,
        -cardHeight / 2 + 52,
        9,
        swatchColor,
        1
      );

      const nameText = this.scene.add
        .text(0, -26, upgrade.name, {
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: cardWidth - 24 },
        })
        .setOrigin(0.5);

      const statsTagText = this.scene.add
        .text(0, 6, summarizeUpgradeEffects(upgrade), {
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: '#38bdf8',
          align: 'center',
          wordWrap: { width: cardWidth - 20 },
        })
        .setOrigin(0.5);

      const descText = this.scene.add
        .text(0, 48, upgrade.description, {
          fontSize: '12.5px',
          color: '#cbd5e1',
          align: 'center',
          lineSpacing: 3,
          wordWrap: { width: cardWidth - 26 },
        })
        .setOrigin(0.5);

      const btnBg = this.scene.add
        .rectangle(0, cardHeight / 2 - 24, cardWidth - 28, 30, 0x1e293b, 1)
        .setStrokeStyle(1.5, 0x475569);

      const chooseHint = this.scene.add
        .text(0, cardHeight / 2 - 24, 'ADQUIRIR UPGRADE', {
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: '#e2e8f0',
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => {
        if (!this.visible || this.selectionLocked) return;
        this.selectedIndex = index;
        this._refreshHighlight(accentColor);
      });

      // Usa pointerup + trava de seleção para nunca destruir o card no meio de pointerdown
      bg.on('pointerup', () => {
        this._confirmSelection(index);
      });

      if (this.tooltip) {
        this.tooltip.attach(bg, () => ({
          title: `${upgrade.name} (#${upgrade.number})`,
          description: `${upgrade.description}\nEfeito mecânico e visual ativos durante toda a partida.`,
        }));
      }

      root.add([
        bg,
        badge,
        medallionOuter,
        medallionInner,
        nameText,
        statsTagText,
        descText,
        btnBg,
        chooseHint,
      ]);
      this.cardsContainer.add(root);
      this.cardElements.push({ root, bg, badge, btnBg, chooseHint });
    });

    this._refreshHighlight(accentColor);
  }

  _refreshHighlight(accentColor = this.currentTheme?.accentColor ?? 0x38bdf8) {
    this.cardElements.forEach((card, idx) => {
      const active = idx === this.selectedIndex;
      card.bg.setFillStyle(active ? 0x0f172a : 0x131c31, 0.99);
      card.bg.setStrokeStyle(active ? 3 : 1.5, active ? accentColor : 0x334155);
      card.btnBg.setFillStyle(active ? accentColor : 0x1e293b, active ? 0.22 : 1);
      card.btnBg.setStrokeStyle(1.5, active ? accentColor : 0x475569);
      card.chooseHint.setColor(
        active ? this.currentTheme?.accentHex ?? '#38bdf8' : '#94a3b8'
      );
    });
  }

  _confirmSelection(index) {
    if (!this.visible || this.selectionLocked) return;
    this.selectionLocked = true;
    this.tooltip?.hide();
    if (typeof this.onSelectOption === 'function') {
      this.onSelectOption(index);
    }
  }

  handleInput(inputController) {
    if (!this.visible || this.selectionLocked || !inputController) return;

    const count = this.currentOptions.length;
    if (count > 0) {
      if (inputController.isActionJustPressed('MOVE_LEFT')) {
        this.selectedIndex = (this.selectedIndex - 1 + count) % count;
        this._refreshHighlight();
      } else if (inputController.isActionJustPressed('MOVE_RIGHT')) {
        this.selectedIndex = (this.selectedIndex + 1) % count;
        this._refreshHighlight();
      }

      for (let i = 0; i < Math.min(count, this.quickKeys.length); i += 1) {
        if (
          this.quickKeys[i] &&
          Phaser.Input.Keyboard.JustDown(this.quickKeys[i])
        ) {
          this._confirmSelection(i);
          return;
        }
      }
    }

    if (inputController.isActionJustPressed('CONFIRM')) {
      this._confirmSelection(this.selectedIndex);
    }
  }

  destroy() {
    this.visible = false;
    this.cardElements = [];
    try {
      this.container?.destroy?.();
    } catch {
      // Ignora em shutdown
    }
  }
}
