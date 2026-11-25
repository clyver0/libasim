import { SHOP_CONFIG } from '../constants/shops.js';

/**
 * Controla eventos de abertura, fila sequencial, seleção e aplicação de recompensas
 * das lojas oficial (Chiquinho Promos) e especial (Coquinho Extra).
 *
 * Regras garantidas (GAME_DESIGN.md §10-11 / ARCHITECTURE.md §13):
 * - Loja oficial abre aos 25, 50 e 75 inimigos derrotados.
 * - Loja oficial atualiza dificuldade e sinaliza regeneração de plataformas.
 * - Loja especial NÃO altera dificuldade e NÃO regenera plataformas.
 * - Eventos simultâneos são enfileirados e processados sequencialmente sem perda.
 */
export class ShopSystem {
  constructor({
    upgradeSystem,
    difficultySystem,
    milestones = SHOP_CONFIG.OFFICIAL_MILESTONES,
    optionsCount = SHOP_CONFIG.OPTIONS_PER_VISIT,
    onShopOpened = null,
    onShopClosed = null,
  } = {}) {
    this.upgradeSystem = upgradeSystem;
    this.difficultySystem = difficultySystem;
    this.milestones = [...milestones];
    this.optionsCount = optionsCount;
    this.onShopOpened = onShopOpened;
    this.onShopClosed = onShopClosed;

    this.triggeredMilestones = new Set();
    this.pendingQueue = [];
    this.activeSession = null;
    this.officialVisitsCompleted = 0;
    this.specialVisitsCompleted = 0;
    this.sessionCounter = 0;
  }

  isOpen() {
    return this.activeSession !== null;
  }

  hasPendingShops() {
    return this.pendingQueue.length > 0;
  }

  getActiveSession() {
    return this.activeSession;
  }

  /**
   * Verifica se o número atual de inimigos derrotados atingiu algum marco oficial (25, 50, 75).
   */
  checkOfficialMilestones(defeatedCount, { autoOpen = true } = {}) {
    let enqueued = false;

    for (const milestone of this.milestones) {
      if (
        defeatedCount >= milestone &&
        !this.triggeredMilestones.has(milestone)
      ) {
        this.triggeredMilestones.add(milestone);
        this.enqueueOfficialShop({ milestone });
        enqueued = true;
      }
    }

    if (autoOpen && enqueued && !this.isOpen()) {
      return this.openNextShop();
    }

    return this.activeSession;
  }

  enqueueOfficialShop({ milestone = null } = {}) {
    const event = {
      type: 'official',
      isOfficial: true,
      milestone,
      theme: SHOP_CONFIG.OFFICIAL_THEME,
    };
    this.pendingQueue.push(event);
    return event;
  }

  enqueueSpecialShop(metadata = {}, { autoOpen = true } = {}) {
    const event = {
      type: 'special',
      isOfficial: false,
      milestone: null,
      source: metadata.source ?? 'coquinho_extra',
      theme: SHOP_CONFIG.SPECIAL_THEME,
    };
    this.pendingQueue.push(event);

    if (autoOpen && !this.isOpen()) {
      this.openNextShop();
    }

    return event;
  }

  openNextShop() {
    if (this.isOpen() || this.pendingQueue.length === 0) {
      return this.activeSession;
    }

    const nextEvent = this.pendingQueue.shift();
    const options = this.upgradeSystem
      ? this.upgradeSystem.rollOptions(this.optionsCount)
      : [];

    this.sessionCounter += 1;
    this.activeSession = {
      sessionId: `shop_${this.sessionCounter}`,
      type: nextEvent.type,
      isOfficial: nextEvent.isOfficial,
      milestone: nextEvent.milestone,
      theme: nextEvent.theme,
      options,
    };

    if (typeof this.onShopOpened === 'function') {
      this.onShopOpened(this.activeSession);
    }

    return this.activeSession;
  }

  /**
   * Confirma a escolha de 1 upgrade pelo índice (0..options.length-1), aplica o efeito,
   * processa progressão apenas se for loja oficial e encerra a sessão atual.
   */
  selectOption(optionIndex, playerState = null, { autoOpenNext = true } = {}) {
    if (!this.activeSession) {
      return null;
    }

    const { options } = this.activeSession;
    let appliedUpgrade = null;

    if (options.length > 0) {
      if (optionIndex < 0 || optionIndex >= options.length) {
        return null;
      }
      const chosen = options[optionIndex];
      appliedUpgrade = this.upgradeSystem?.acquireUpgrade(chosen, playerState) ?? null;
    }

    const closedSession = this.activeSession;
    this.activeSession = null;

    let difficultyResult = null;
    let shouldRegeneratePlatforms = false;

    if (closedSession.isOfficial) {
      this.officialVisitsCompleted += 1;
      difficultyResult =
        this.difficultySystem?.handleShopVisit({
          isOfficial: true,
          milestone: closedSession.milestone,
        }) ?? null;
      shouldRegeneratePlatforms = true;
    } else {
      this.specialVisitsCompleted += 1;
      difficultyResult =
        this.difficultySystem?.handleShopVisit({
          isOfficial: false,
          source: 'coquinho_extra',
        }) ?? null;
      shouldRegeneratePlatforms = false;
    }

    const summary = {
      closedSession,
      appliedUpgrade,
      difficultyResult,
      shouldRegeneratePlatforms,
      hasNextQueued: this.pendingQueue.length > 0,
    };

    if (typeof this.onShopClosed === 'function') {
      this.onShopClosed(summary);
    }

    if (autoOpenNext && this.pendingQueue.length > 0) {
      this.openNextShop();
    }

    return summary;
  }

  getSnapshot() {
    return {
      isOpen: this.isOpen(),
      pendingCount: this.pendingQueue.length,
      officialVisitsCompleted: this.officialVisitsCompleted,
      specialVisitsCompleted: this.specialVisitsCompleted,
      triggeredMilestones: Array.from(this.triggeredMilestones),
    };
  }

  reset() {
    this.triggeredMilestones.clear();
    this.pendingQueue = [];
    this.activeSession = null;
    this.officialVisitsCompleted = 0;
    this.specialVisitsCompleted = 0;
    this.sessionCounter = 0;
  }
}
