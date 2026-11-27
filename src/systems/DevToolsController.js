import { PHASE_CONFIG } from '../constants/expansion.js';

export const DEV_TOOLS_CONFIG = {
  SIMULATED_ENEMY_INTERVAL_MS: 200,
  ENEMIES_PER_PHASE: PHASE_CONFIG.KILLS_PER_PHASE,
  DRINKS_PER_PHASE_STEP: 2,
};

export function isDevEnvironment(env = import.meta.env) {
  return Boolean(env?.DEV);
}

/**
 * Controlador desacoplado de progressão de fases para a modal de Dev Tools.
 * Reaproveita os sistemas e catálogos reais da run sem duplicar fórmulas de cálculo.
 */
export class DevToolsController {
  constructor({
    phaseSystem,
    difficultySystem,
    shopSystem,
    spawnSystem,
    trackSystem,
    drinkSystem,
    drinkEffectManager,
    upgradeSystem,
    goldenScheduler = null,
    runManager = null,
    antManager = null,
    phaseOpeningSystem = null,
    getPlayerState = () => null,
    onPhaseApplied = null,
    simulatedEnemyIntervalMs = DEV_TOOLS_CONFIG.SIMULATED_ENEMY_INTERVAL_MS,
    enemiesPerPhase = DEV_TOOLS_CONFIG.ENEMIES_PER_PHASE,
    drinksPerPhaseStep = DEV_TOOLS_CONFIG.DRINKS_PER_PHASE_STEP,
  } = {}) {
    this.phaseSystem = phaseSystem;
    this.difficultySystem = difficultySystem;
    this.shopSystem = shopSystem;
    this.spawnSystem = spawnSystem;
    this.trackSystem = trackSystem;
    this.drinkSystem = drinkSystem;
    this.drinkEffectManager = drinkEffectManager;
    this.upgradeSystem = upgradeSystem;
    this.goldenScheduler = goldenScheduler;
    this.runManager = runManager;
    this.antManager = antManager;
    this.phaseOpeningSystem = phaseOpeningSystem;
    this.getPlayerState = getPlayerState;
    this.onPhaseApplied = onPhaseApplied;

    this.simulatedEnemyIntervalMs = Math.max(16, simulatedEnemyIntervalMs);
    this.enemiesPerPhase = Math.max(1, enemiesPerPhase);
    this.drinksPerPhaseStep = Math.max(1, drinksPerPhaseStep);

    this.autoProgressionEnabled = false;
    this.simulatedEnemiesInStep = 0;
    this.autoTimerMs = 0;
  }

  get maxPhaseId() {
    return this.phaseSystem?.config?.PHASES?.length ?? PHASE_CONFIG.PHASES.length;
  }

  getCurrentPhaseId() {
    return this.phaseSystem?.currentPhaseId ?? 1;
  }

  setAutoProgression(enabled) {
    const canEnable = Boolean(enabled) && this.getCurrentPhaseId() < this.maxPhaseId;
    this.autoProgressionEnabled = canEnable;
    this.simulatedEnemiesInStep = 0;
    this.autoTimerMs = 0;
    return this.autoProgressionEnabled;
  }

  toggleAutoProgression() {
    return this.setAutoProgression(!this.autoProgressionEnabled);
  }

  advanceToNextPhase(options = {}) {
    const current = this.getCurrentPhaseId();
    if (current >= this.maxPhaseId) {
      this.setAutoProgression(false);
      return null;
    }
    return this.selectPhase(current + 1, options);
  }

  /**
   * Simula passagem de tempo/inimigos quando a progressão automática está ativa.
   * Avança de fase automaticamente a cada `enemiesPerPhase` (25) inimigos simulados.
   */
  update(deltaMs) {
    if (!this.autoProgressionEnabled || !(deltaMs > 0)) {
      return null;
    }

    if (this.getCurrentPhaseId() >= this.maxPhaseId) {
      this.setAutoProgression(false);
      return null;
    }

    this.autoTimerMs += deltaMs;
    const steps = Math.floor(this.autoTimerMs / this.simulatedEnemyIntervalMs);
    if (steps <= 0) {
      return null;
    }
    this.autoTimerMs -= steps * this.simulatedEnemyIntervalMs;
    return this.simulateEnemies(steps);
  }

  simulateEnemies(count = 1) {
    if (!this.autoProgressionEnabled || !(count > 0)) {
      return null;
    }

    let lastTransition = null;
    for (let i = 0; i < count; i += 1) {
      if (this.getCurrentPhaseId() >= this.maxPhaseId) {
        this.setAutoProgression(false);
        break;
      }

      this.simulatedEnemiesInStep += 1;
      if (this.simulatedEnemiesInStep >= this.enemiesPerPhase) {
        this.simulatedEnemiesInStep = 0;
        lastTransition = this.advanceToNextPhase({ source: 'auto' });
        if (this.getCurrentPhaseId() >= this.maxPhaseId) {
          this.setAutoProgression(false);
          break;
        }
      }
    }

    return lastTransition;
  }

  /**
   * Seleciona diretamente qualquer uma das 4 fases (1..4), sincronizando
   * abates, dificuldade (visitas oficiais), cenário, perspectiva e simulando
   * bebidas e upgrades reais proporcionais à fase escolhida.
   */
  selectPhase(targetPhaseId, { simulateLoadout = true, source = 'manual' } = {}) {
    const clampedPhaseId = Math.min(
      this.maxPhaseId,
      Math.max(1, Math.floor(Number(targetPhaseId) || 1))
    );
    const previousPhaseId = this.getCurrentPhaseId();
    const targetDefeatedCount = (clampedPhaseId - 1) * this.enemiesPerPhase;
    const officialVisits = clampedPhaseId - 1;
    const playerState = this.getPlayerState?.() ?? null;

    this.simulatedEnemiesInStep = 0;
    this.autoTimerMs = 0;
    if (clampedPhaseId >= this.maxPhaseId) {
      this.autoProgressionEnabled = false;
    }

    // Sincroniza fase e dificuldade oficial correspondente ao marco da fase (0, 1, 2 ou 3 lojas oficiais)
    if (this.phaseSystem) {
      this.phaseSystem.currentPhaseId = clampedPhaseId;
    }
    if (this.difficultySystem) {
      this.difficultySystem.officialShopVisits = officialVisits;
    }

    // Sincroniza marcos de lojas oficiais para não disparar lojas retroativas ao retomar gameplay
    if (this.shopSystem) {
      this.shopSystem.pendingQueue = [];
      this.shopSystem.activeSession = null;
      this.shopSystem.triggeredMilestones = new Set(
        (this.shopSystem.milestones ?? []).filter((m) => m <= targetDefeatedCount)
      );
      this.shopSystem.officialVisitsCompleted = officialVisits;
      if (!simulateLoadout || clampedPhaseId === 1) {
        this.shopSystem.specialVisitsCompleted = 0;
      }
    }

    // Sincroniza contador de abates do SpawnSystem sem disparar fim de run indevido
    if (this.spawnSystem) {
      this.spawnSystem.defeatedIds.clear();
      this.spawnSystem.removedIds.clear();
      for (let i = 1; i <= targetDefeatedCount; i += 1) {
        this.spawnSystem.defeatedIds.add(`dev_sim_${i}`);
      }
      this.spawnSystem.defeatedCount = targetDefeatedCount;
      this.spawnSystem.allDefeatedNotified =
        targetDefeatedCount >= this.spawnSystem.totalTarget;
    }

    // Sincroniza eventos agendados do Coquinho Extra já ultrapassados
    if (this.goldenScheduler?.scheduledEvents) {
      for (const ev of this.goldenScheduler.scheduledEvents) {
        ev.triggered = ev.triggerAtDefeated <= targetDefeatedCount;
      }
    }

    const simulatedUpgrades = [];
    const simulatedDrinks = [];

    if (simulateLoadout) {
      const targetUpgradeCount = officialVisits;
      const targetDrinkCount = officialVisits * this.drinksPerPhaseStep;

      // Em recuo de fase (ou retorno à Fase 1), reconstrói a partir do estado limpo para manter proporcionalidade
      const currentUpgradesCount =
        this.upgradeSystem?.getAcquiredUpgrades().length ?? 0;
      if (clampedPhaseId === 1 || currentUpgradesCount > targetUpgradeCount) {
        this.upgradeSystem?.reset(playerState);
        this.drinkEffectManager?.clear(playerState);
      } else {
        // Renova bebidas temporárias proporcionalmente à nova fase
        this.drinkEffectManager?.clear(playerState);
      }

      const upgradesNeeded = Math.max(
        0,
        targetUpgradeCount - (this.upgradeSystem?.getAcquiredUpgrades().length ?? 0)
      );
      for (let i = 0; i < upgradesNeeded; i += 1) {
        const [pickedUpgrade] = this.upgradeSystem?.rollOptions(1) ?? [];
        if (!pickedUpgrade) break;
        const acquired = this.upgradeSystem.acquireUpgrade(
          pickedUpgrade,
          playerState
        );
        if (acquired) {
          simulatedUpgrades.push(acquired);
          if (acquired.temporaryDrinkEffect && this.drinkEffectManager && playerState) {
            this.drinkEffectManager.applyDrink(
              {
                ...acquired.temporaryDrinkEffect,
                id: `${acquired.id}_effect`,
                name: acquired.name,
              },
              playerState
            );
          }
        }
      }

      for (let i = 0; i < targetDrinkCount; i += 1) {
        if (!this.drinkSystem || !this.drinkEffectManager || !playerState) break;
        const rarityBonus = playerState.gameplayModifiers?.drinkRarityBonus ?? 0;
        const pickedDrink = this.drinkSystem.pickDrink({ rarityBonus });
        if (!pickedDrink) break;
        const applied = this.drinkEffectManager.applyDrink(pickedDrink, playerState);
        if (applied) {
          simulatedDrinks.push(pickedDrink);
          this.runManager?.registerDrinkCollected?.();
        }
      }
    }

    // Atualiza sistema de cenário para a fase selecionada
    this.trackSystem?.setPhase(clampedPhaseId);

    const phase = this.phaseSystem?.getPhase(clampedPhaseId) ??
      PHASE_CONFIG.PHASES[clampedPhaseId - 1];

    const result = {
      fromPhaseId: previousPhaseId,
      toPhaseId: clampedPhaseId,
      phase,
      defeatedCount: targetDefeatedCount,
      officialShopVisits: officialVisits,
      simulatedUpgrades,
      simulatedDrinks,
      source,
    };

    this.onPhaseApplied?.(result);
    return result;
  }

  getSnapshot() {
    const phaseId = this.getCurrentPhaseId();
    return {
      currentPhaseId: phaseId,
      maxPhaseId: this.maxPhaseId,
      canAdvance: phaseId < this.maxPhaseId,
      autoProgressionEnabled: this.autoProgressionEnabled,
      simulatedEnemiesInStep: this.simulatedEnemiesInStep,
      enemiesPerPhase: this.enemiesPerPhase,
    };
  }
}
