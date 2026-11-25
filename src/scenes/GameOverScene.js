import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../audio/SoundBank.js';
import { InputController } from '../systems/InputController.js';
import { createCyberNightBackdrop } from '../ui/ArenaBackdrop.js';
import { setupCrispScene } from '../utils/display.js';

export function formatGameOverSummaryLines(summary = {}) {
  const upgradesCount = Array.isArray(summary.acquiredUpgrades)
    ? summary.acquiredUpgrades.length
    : 0;
  return [
    `Personagem: ${summary.characterName ?? 'Personagem'}`,
    `Inimigos derrotados: ${summary.defeatedEnemies ?? 0} / ${summary.totalEnemyTarget ?? 100}`,
    `Boss alcançado: ${summary.bossSpawned ? 'Sim' : 'Não'}`,
    `Lojas visitadas: ${(summary.officialShopsVisited ?? 0) + (summary.specialShopsVisited ?? 0)}`,
    `Upgrades adquiridos: ${upgradesCount}`,
    `Bebidas coletadas: ${summary.drinksCollected ?? 0}`,
    `Tempo de sobrevivência: ${summary.elapsedSeconds ?? 0}s`,
  ];
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data = {}) {
    this.summary = data.summary ?? {};
  }

  create() {
    const { width, height } = setupCrispScene(this);
    registerDefaultSoundBank(audioManager);
    audioManager.play(SOUND_KEYS.DEFEAT);

    createCyberNightBackdrop(this, width, height, 'gameover-city');
    this.cameras.main.fadeIn?.(250, 9, 13, 22);
    this.inputController = new InputController(this);
    this.escapeKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    this.add.rectangle(width / 2, height / 2 + 6, 632, 412, 0x000000, 0.55);
    this.add
      .rectangle(width / 2, height / 2, 624, 404, 0x090d16, 0.96)
      .setStrokeStyle(2.5, 0xef4444);

    this.add
      .text(width / 2, 96, '💀 FIM DE JOGO', {
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f87171',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 132, 'Você caiu em combate durante a partida.', {
        fontSize: '15px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const lines = formatGameOverSummaryLines(this.summary);
    this.add
      .text(width / 2, 248, lines.join('\n'), {
        fontSize: '15px',
        color: '#f8fafc',
        align: 'center',
        lineSpacing: 7,
      })
      .setOrigin(0.5);

    const retryBtn = this.add
      .rectangle(width / 2 - 120, 398, 206, 44, 0xdc2626, 1)
      .setStrokeStyle(2, 0xfca5a5)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 - 120, 398, 'TENTAR NOVAMENTE', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const menuBtn = this.add
      .rectangle(width / 2 + 120, 398, 214, 44, 0x1e293b, 1)
      .setStrokeStyle(2, 0x64748b)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 + 120, 398, 'SELEÇÃO DE PERSONAGEM', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xef4444, 1));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0xdc2626, 1));
    retryBtn.on('pointerup', () => this.retryRun());

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x334155, 1));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x1e293b, 1));
    menuBtn.on('pointerup', () => this.goToTitle());

    this.add
      .text(
        width / 2,
        444,
        'Enter / Espaço: Tentar Novamente   •   ESC: Seleção de Personagem',
        {
          fontSize: '12px',
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);
  }

  retryRun() {
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
      this.retryRun();
    }
  }
}
