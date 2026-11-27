import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../audio/SoundBank.js';
import { GAMEPLAY } from '../constants/gameplay.js';
import { TYPOGRAPHY } from '../constants/typography.js';
import { CHARACTERS } from '../data/characters.js';
import { CharacterAppearanceSystem } from '../systems/CharacterAppearanceSystem.js';
import { drawStickFigure } from '../entities/Player.js';
import { InputController } from '../systems/InputController.js';
import { StatCalculator } from '../systems/StatCalculator.js';
import { createCyberNightBackdrop } from '../ui/ArenaBackdrop.js';
import { Tooltip } from '../ui/Tooltip.js';
import { setupCrispScene } from '../utils/display.js';
import { MusicDirector } from '../audio/MusicDirector.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
    this.selectedIndex = 0;
    this.cards = [];
    this.previewTimerMs = 0;
  }

  preload() {
    for (const character of CHARACTERS) {
      if (character.portraitKey && character.portraitSrc) {
        this.load.image(character.portraitKey, character.portraitSrc);
      }
    }
  }

  create() {
    const { width, height } = setupCrispScene(this);
    this.selectedIndex = 0;
    this.cards = [];
    this.previewTimerMs = 0;

    registerDefaultSoundBank(audioManager);
    this.musicDirector = new MusicDirector({ audio: audioManager });
    this.musicDirector.startMenu();

    createCyberNightBackdrop(this, width, height, 'title-city-night');
    this.cameras.main.fadeIn?.(220, 9, 13, 22);
    this.inputController = new InputController(this);
    this.tooltip = new Tooltip(this);

    // Título estilizado cartunesco com contorno forte e brilho neon
    this.add
      .text(width / 2, 54, GAMEPLAY.GAME_TITLE.toUpperCase(), {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#090d16',
        strokeThickness: 8,
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 99, GAMEPLAY.GAME_SUBTITLE, {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '14.5px',
        fontStyle: 'bold',
        color: '#7dd3fc',
        stroke: '#090d16',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.muteBadge = this.add
      .text(width - 20, 18, this._getAudioLabel(), {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e2e8f0',
        backgroundColor: '#0f172a',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.muteBadge.on('pointerup', () => {
      audioManager.toggleMute();
      this.muteBadge.setText(this._getAudioLabel());
    });
    this.tooltip.attach(this.muteBadge, () => ({
      title: 'Controle de Áudio [M]',
      description: 'Clique ou pressione [M] para alternar entre som ligado e mudo.',
    }));

    this._createCharacterCards(width, height);
    this._createStartButton(width, height);

    this.add
      .text(
        width / 2,
        height - 24,
        'Setas / A-D: escolher lutador   •   Enter / Espaço: iniciar   •   M: áudio   •   Passe o mouse nos cards',
        {
          fontSize: '12px',
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);

    this.events.once('shutdown', () => {
      this.tooltip?.destroy();
    });

    this._refreshSelectionVisuals();
  }

  _getAudioLabel() {
    return audioManager.muted ? '🔇 [M] MUDO' : '🔊 [M] SOM ATIVO';
  }

  _createCharacterCards(width, height) {
    const cardWidth = 264;
    const cardHeight = 258;
    const spacing = 304;
    const startX = width / 2 - ((CHARACTERS.length - 1) * spacing) / 2;
    const centerY = height / 2 + 4;

    CHARACTERS.forEach((character, index) => {
      const cardX = startX + index * spacing;
      const effective = StatCalculator.calculateEffectiveStats({
        baseStats: character.baseStats,
        multipliers: character.multipliers,
      });
      const gpMods = StatCalculator.calculateGameplayModifiers({
        characterMultipliers: character.multipliers,
      });
      const moveSpeed = Math.round(260 * gpMods.moveSpeedMultiplier);

      const shadow = this.add.rectangle(
        cardX,
        centerY + 6,
        cardWidth,
        cardHeight + 14,
        0x000000,
        0.45
      );

      const bg = this.add
        .rectangle(cardX, centerY, cardWidth, cardHeight + 14, 0x0f172a, 0.94)
        .setStrokeStyle(2, 0x334155)
        .setInteractive({ useHandCursor: true });

      const pedestal = this.add.ellipse(
        cardX,
        centerY - 22,
        74,
        16,
        character.color,
        0.22
      );

      const portrait = this.add
        .image(cardX, centerY - 82, character.portraitKey)
        .setScale(0.25)
        .setDepth(3);

      const stickPreview = this.add.graphics({ x: cardX, y: centerY - 54 });
      stickPreview.setScale?.(character.multipliers.bodyScale ?? 1);
      drawStickFigure(
        stickPreview,
        character.color,
        1,
        'idle',
        null,
        CharacterAppearanceSystem.resolveAppearanceState(
          (character.visualTypes ?? []).map((type) => ({ visual: { type } }))
        )
      );

      const nameLabel = this.add
        .text(cardX, centerY + 6, character.name, {
          fontFamily: TYPOGRAPHY.DISPLAY,
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#f8fafc',
          stroke: '#020617',
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      const roleLabel = this.add
        .text(cardX, centerY + 27, character.role ?? '', {
          fontFamily: TYPOGRAPHY.UI,
          fontSize: '12px',
          fontStyle: 'bold',
          color: character.colorHex ?? '#38bdf8',
        })
        .setOrigin(0.5);

      const statsLabel = this.add
        .text(
          cardX,
          centerY + 82,
          [
            `❤ HP Máximo: ${effective.maxHp}`,
            `⚔ Força: ${effective.strength}`,
            `🛡 Resist. Bebidas: ${effective.drinkResistance}`,
            `👟 Velocidade: ${moveSpeed}`,
            `✨ [E] ${character.ability?.name ?? '-'}`,
          ].join('\n'),
          {
            fontFamily: TYPOGRAPHY.UI,
            fontSize: '13px',
            color: '#cbd5e1',
            align: 'center',
            lineSpacing: 4,
          }
        )
        .setOrigin(0.5);

      bg.on('pointerup', () => {
        if (this.selectedIndex !== index) {
          this.selectedIndex = index;
          audioManager.play(SOUND_KEYS.UI_MOVE);
          this._refreshSelectionVisuals();
        }
      });

      bg.on('pointerover', () => {
        if (this.selectedIndex !== index) {
          bg.setFillStyle(0x162238, 0.96);
        }
      });

      bg.on('pointerout', () => {
        this._refreshSelectionVisuals();
      });

      this.tooltip.attach(bg, () => ({
        title: `${character.name} — ${character.role ?? ''}`,
        description: [
          `HP Máximo (${effective.maxHp}): vida inicial na partida.`,
          `Força (${effective.strength}): poder base de golpes e combos.`,
          `Resistência (${effective.drinkResistance}): controla duração da embriaguez.`,
          `Velocidade (${moveSpeed}): rapidez de deslocamento horizontal.`,
        ].join('\n'),
      }));

      this.cards.push({
        character,
        shadow,
        bg,
        pedestal,
        nameLabel,
        roleLabel,
        statsLabel,
        stickPreview,
      });
    });
  }

  _createStartButton(width, height) {
    const btnY = height - 68;
    const shadow = this.add.rectangle(width / 2, btnY + 4, 244, 48, 0x000000, 0.45);
    const buttonBg = this.add
      .rectangle(width / 2, btnY, 244, 48, 0x0284c7, 1)
      .setStrokeStyle(2, 0x7dd3fc)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, btnY, '▶  PARTIU CORRERIA!', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 4,
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x0ea5e9, 1));
    buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x0284c7, 1));
    buttonBg.on('pointerup', () => this.startGame());
    return shadow;
  }

  _refreshSelectionVisuals() {
    this.cards.forEach((card, index) => {
      const isSelected = index === this.selectedIndex;
      if (isSelected) {
        card.bg.setFillStyle(0x090d16, 0.98);
        card.bg.setStrokeStyle(3, card.character.color);
        card.pedestal.setFillStyle(card.character.color, 0.35);
      } else {
        card.bg.setFillStyle(0x0f172a, 0.88);
        card.bg.setStrokeStyle(1.5, 0x334155);
        card.pedestal.setFillStyle(card.character.color, 0.12);
        drawStickFigure(card.stickPreview, card.character.color, 1, 'idle');
      }
    });
  }

  update(_time, delta = 16.67) {
    this.previewTimerMs += delta;
    const selectedCard = this.cards[this.selectedIndex];
    if (selectedCard) {
      const cycle = Math.floor(this.previewTimerMs / 900) % 4;
      const poses = ['idle', 'light', 'idle', 'special'];
      const pose = poses[cycle];
      const localProgress = (this.previewTimerMs % 900) / 900;
      drawStickFigure(
        selectedCard.stickPreview,
        selectedCard.character.color,
        1,
        pose,
        selectedCard.character.color,
        null,
        {
          animTimeMs: this.previewTimerMs,
          vx: 0,
          vy: 0,
          grounded: true,
          attackProgress: localProgress,
        }
      );
    }

    if (this.inputController.isActionJustPressed('MUTE_AUDIO')) {
      audioManager.toggleMute();
      this.muteBadge?.setText(this._getAudioLabel());
    }

    if (this.inputController.isActionJustPressed('MOVE_LEFT')) {
      this.selectedIndex =
        (this.selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
      audioManager.play(SOUND_KEYS.UI_MOVE);
      this._refreshSelectionVisuals();
    } else if (this.inputController.isActionJustPressed('MOVE_RIGHT')) {
      this.selectedIndex = (this.selectedIndex + 1) % CHARACTERS.length;
      audioManager.play(SOUND_KEYS.UI_MOVE);
      this._refreshSelectionVisuals();
    }

    if (this.inputController.isActionJustPressed('CONFIRM')) {
      this.startGame();
    }
  }

  startGame() {
    audioManager.play(SOUND_KEYS.UI_CONFIRM);
    const selectedCharacter = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0];
    this.scene.start('MainScene', { characterId: selectedCharacter.id });
  }
}
