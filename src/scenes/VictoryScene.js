import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../audio/SoundBank.js';
import { InputController } from '../systems/InputController.js';
import { TYPOGRAPHY } from '../constants/typography.js';
import { createCyberNightBackdrop } from '../ui/ArenaBackdrop.js';
import { setupCrispScene } from '../utils/display.js';

export function formatVictorySummaryLines(summary = {}) {
  const upgradesCount = Array.isArray(summary.acquiredUpgrades)
    ? summary.acquiredUpgrades.length
    : 0;
  return [
    `Personagem: ${summary.characterName ?? 'Personagem'}`,
    `Inimigos comuns derrotados: ${summary.defeatedEnemies ?? 0} / ${summary.totalEnemyTarget ?? 100}`,
    `Boss Final derrotado: ${summary.bossDefeated ? 'Sim' : 'Não'}`,
    `Lojas oficiais visitadas: ${summary.officialShopsVisited ?? 0}`,
    `Lojas especiais (Coquinho Extra): ${summary.specialShopsVisited ?? 0}`,
    `Upgrades adquiridos: ${upgradesCount}`,
    `Bebidas coletadas: ${summary.drinksCollected ?? 0}`,
    `Tempo de partida: ${summary.elapsedSeconds ?? 0}s`,
  ];
}

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(data = {}) {
    this.summary = data.summary ?? {};
  }

  create() {
    const { width, height } = setupCrispScene(this);
    registerDefaultSoundBank(audioManager);
    audioManager.play(SOUND_KEYS.VICTORY);

    createCyberNightBackdrop(this, width, height, 'victory-city');
    this.cameras.main.fadeIn?.(250, 9, 13, 22);
    this.inputController = new InputController(this);
    this.escapeKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    this.add.rectangle(width / 2, height / 2 + 6, 650, 428, 0x000000, 0.55);
    this.add
      .rectangle(width / 2, height / 2, 642, 420, 0x090d16, 0.96)
      .setStrokeStyle(2.5, 0x22c55e);

    this.add
      .text(width / 2, 86, '🏆 VITÓRIA! RUN CONCLUÍDA!', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#4ade80',
        stroke: '#020617',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 126, 'Você atravessou todas as fases e derrotou o Boss Final!', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '15px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const lines = formatVictorySummaryLines(this.summary);
    this.add
      .text(width / 2, 248, lines.join('\n'), {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '15px',
        color: '#f8fafc',
        align: 'center',
        lineSpacing: 7,
      })
      .setOrigin(0.5);

    const playAgainBtn = this.add
      .rectangle(width / 2 - 122, 406, 214, 44, 0x16a34a, 1)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 - 122, 406, 'JOGAR NOVAMENTE', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const menuBtn = this.add
      .rectangle(width / 2 + 122, 406, 214, 44, 0x1e293b, 1)
      .setStrokeStyle(2, 0x64748b)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 + 122, 406, 'SELEÇÃO DE PERSONAGEM', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    playAgainBtn.on('pointerover', () => playAgainBtn.setFillStyle(0x22c55e, 1));
    playAgainBtn.on('pointerout', () => playAgainBtn.setFillStyle(0x16a34a, 1));
    playAgainBtn.on('pointerup', () => this.restartRun());

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x334155, 1));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x1e293b, 1));
    menuBtn.on('pointerup', () => this.goToTitle());

    this.add
      .text(
        width / 2,
        450,
        'Enter / Espaço: Jogar Novamente   •   ESC: Seleção de Personagem',
        {
          fontSize: '12px',
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);
  }

  restartRun() {
    this.scene.start('MainScene', {
      characterId: this.summary.characterId,
    });
  }

  goToTitle() {
    this.scene.start('TitleScene');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.goToTitle();
      return;
    }
    if (this.inputController.isActionJustPressed('CONFIRM')) {
      this.restartRun();
    }
  }
}
