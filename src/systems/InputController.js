import Phaser from 'phaser';
import { CONTROLS } from '../constants/controls.js';
import { ATTACK_TYPES } from '../data/attacks.js';

/**
 * Centraliza a leitura de comandos do teclado com base em src/constants/controls.js.
 * Retorna apenas intenções de comando, sem acoplar regras de física ou combate.
 */
export class InputController {
  constructor(scene, controlMap = CONTROLS) {
    this.scene = scene;
    this.controlMap = controlMap;
    this.keys = {};

    if (scene?.input?.keyboard) {
      this._registerKeys(scene.input.keyboard);
    }
  }

  _registerKeys(keyboard) {
    const keyByCode = new Map();
    for (const [action, keyNames] of Object.entries(this.controlMap)) {
      this.keys[action] = keyNames.map((name) => {
        const keyCode = Phaser.Input.Keyboard.KeyCodes[name] ?? name;
        if (!keyByCode.has(keyCode)) {
          keyByCode.set(keyCode, keyboard.addKey(keyCode));
        }
        return keyByCode.get(keyCode);
      });
    }
  }

  isActionDown(action) {
    const actionKeys = this.keys[action] ?? [];
    return actionKeys.some((key) => Boolean(key?.isDown));
  }

  isActionJustPressed(action) {
    const actionKeys = this.keys[action] ?? [];
    return actionKeys.some((key) =>
      key ? Phaser.Input.Keyboard.JustDown(key) : false
    );
  }

  getHorizontalAxis() {
    const left = this.isActionDown('MOVE_LEFT') ? -1 : 0;
    const right = this.isActionDown('MOVE_RIGHT') ? 1 : 0;
    return left + right;
  }

  getVerticalAxis() {
    const up = this.isActionDown('MOVE_UP') ? -1 : 0;
    const down = this.isActionDown('MOVE_DOWN') ? 1 : 0;
    return up + down;
  }

  isJumpPressed() {
    return this.isActionJustPressed('JUMP') || this.isActionDown('JUMP');
  }

  isDashPressed() {
    return this.isActionJustPressed('DASH');
  }

  readMovementIntent() {
    return {
      horizontal: this.getHorizontalAxis(),
      vertical: 0,
      jump: this.isJumpPressed(),
      dash: this.isDashPressed(),
    };
  }

  readCombatIntent() {
    let attackType = null;
    if (this.isActionJustPressed('ATTACK_LIGHT')) {
      attackType = ATTACK_TYPES.LIGHT;
    } else if (this.isActionJustPressed('ATTACK_HEAVY')) {
      attackType = ATTACK_TYPES.HEAVY;
    } else if (this.isActionJustPressed('ATTACK_SPECIAL')) {
      attackType = ATTACK_TYPES.SPECIAL;
    }

    return {
      attackType,
      toggleComboGuide: this.isActionJustPressed('COMBO_GUIDE'),
      specialAbility: this.isActionJustPressed('SPECIAL_ABILITY'),
    };
  }
}
