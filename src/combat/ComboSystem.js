import { COMBAT } from '../constants/combat.js';
import { COMBOS, getBasicAttack } from '../data/attacks.js';

/**
 * Gerencia o histórico de comandos de ataque dentro da janela de combo
 * e reconhece sequências válidas (incluindo prefixos compartilhados).
 */
export class ComboSystem {
  constructor(combos = COMBOS, comboWindowMs = COMBAT.COMBO_WINDOW_MS) {
    this.combos = combos;
    this.comboWindowMs = comboWindowMs;
    this.sequence = [];
    this.lastInputTime = null;
  }

  reset() {
    this.sequence = [];
    this.lastInputTime = null;
  }

  isWindowActive(currentTime) {
    if (this.lastInputTime === null) return false;
    return currentTime - this.lastInputTime <= this.comboWindowMs;
  }

  _matchesExact(seq, comboSeq) {
    if (seq.length !== comboSeq.length) return false;
    return seq.every((cmd, idx) => cmd === comboSeq[idx]);
  }

  _isPrefixOfAnyCombo(seq) {
    return this.combos.some((combo) => {
      if (seq.length > combo.sequence.length) return false;
      return seq.every((cmd, idx) => cmd === combo.sequence[idx]);
    });
  }

  /**
   * Registra um comando considerando o momento exato em que foi inserido (`inputTime`).
   * Retorna o ataque a ser executado (combo finalizado ou golpe individual).
   */
  registerCommand(attackType, inputTime) {
    const basicAttack = getBasicAttack(attackType);
    if (!basicAttack) {
      return null;
    }

    if (!this.isWindowActive(inputTime)) {
      this.sequence = [];
    }

    const candidate = [...this.sequence, attackType];

    // 1. Verifica se a sequência candidata fecha exatamente um combo
    const matchedCombo = this.combos.find((combo) =>
      this._matchesExact(candidate, combo.sequence)
    );

    if (matchedCombo) {
      this.reset();
      return matchedCombo;
    }

    // 2. Se for prefixo válido de algum combo, mantém a sequência aberta
    if (this._isPrefixOfAnyCombo(candidate)) {
      this.sequence = candidate;
      this.lastInputTime = inputTime;
      return basicAttack;
    }

    // 3. Sequência inválida: descarta histórico anterior e inicia nova com o comando atual
    const singleCandidate = [attackType];
    const singleMatchedCombo = this.combos.find((combo) =>
      this._matchesExact(singleCandidate, combo.sequence)
    );
    if (singleMatchedCombo) {
      this.reset();
      return singleMatchedCombo;
    }

    if (this._isPrefixOfAnyCombo(singleCandidate)) {
      this.sequence = singleCandidate;
      this.lastInputTime = inputTime;
    } else {
      this.reset();
    }

    return basicAttack;
  }

  getCurrentSequence() {
    return [...this.sequence];
  }
}
