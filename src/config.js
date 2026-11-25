import Phaser from 'phaser';
import { GAMEPLAY } from './constants/gameplay.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { MainScene } from './scenes/MainScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

export const createGameConfig = (overrides = {}) => ({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAMEPLAY.SCREEN_WIDTH,
  height: GAMEPLAY.SCREEN_HEIGHT,
  backgroundColor: '#090d16',
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale?.NONE ?? 0,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [TitleScene, MainScene, VictoryScene, GameOverScene],
  ...overrides,
});
