import { UPGRADE_CONFIG } from '../constants/upgrades.js';
import { UPGRADES, getUpgradeById } from '../data/upgrades.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * Gerencia seleção, validação de compatibilidade, aquisição e aplicação de upgrades na run.
 * Separado de CharacterAppearanceSystem (que trata apenas a camada visual).
 */
export class UpgradeSystem {
  constructor({
    catalog = UPGRADES,
    seed = Date.now(),
    onUpgradesChanged = null,
  } = {}) {
    this.catalog = catalog;
    this.rng = new SeededRandom(seed);
    this.onUpgradesChanged = onUpgradesChanged;

    this.acquiredUpgrades = [];
    this.acquiredCounts = new Map();
  }

  getAcquiredUpgrades() {
    return [...this.acquiredUpgrades];
  }

  getAcquiredIds() {
    return this.acquiredUpgrades.map((u) => u.id);
  }

  hasUpgrade(upgradeId) {
    return (this.acquiredCounts.get(upgradeId) ?? 0) > 0;
  }

  /**
   * Verifica se um upgrade pode ser selecionado/aplicado considerando:
   * 1. Repetição (apenas se `stackable === true` e abaixo de `maxStacks`).
   * 2. Incompatibilidade bidirecional com upgrades já adquiridos.
   * 3. Requisitos prévios (`requirements`).
   */
  canAcquire(upgradeOrId) {
    const upgrade =
      typeof upgradeOrId === 'string'
        ? this.catalog.find((u) => u.id === upgradeOrId) ?? getUpgradeById(upgradeOrId)
        : upgradeOrId;

    if (!upgrade || !upgrade.id) {
      return false;
    }

    const currentCount = this.acquiredCounts.get(upgrade.id) ?? 0;
    if (currentCount > 0) {
      if (!upgrade.stackable) {
        return false;
      }
      if (
        typeof upgrade.maxStacks === 'number' &&
        currentCount >= upgrade.maxStacks
      ) {
        return false;
      }
    }

    // Verifica incompatibilidades declaradas no candidato ou nos já adquiridos
    const candidateIncompat = new Set(upgrade.incompatibleWith ?? []);
    for (const acquired of this.acquiredUpgrades) {
      if (candidateIncompat.has(acquired.id)) {
        return false;
      }
      if (
        Array.isArray(acquired.incompatibleWith) &&
        acquired.incompatibleWith.includes(upgrade.id)
      ) {
        return false;
      }
    }

    // Verifica requisitos opcionais
    if (Array.isArray(upgrade.requirements) && upgrade.requirements.length > 0) {
      for (const reqId of upgrade.requirements) {
        if (!this.hasUpgrade(reqId)) {
          return false;
        }
      }
    }

    return true;
  }

  getEligibleUpgrades() {
    return this.catalog.filter((upgrade) => this.canAcquire(upgrade));
  }

  /**
   * Sorteia até `count` opções distintas e válidas para exibição em lojas.
   */
  rollOptions(count = UPGRADE_CONFIG.DEFAULT_SHOP_OPTIONS_COUNT) {
    const pool = [...this.getEligibleUpgrades()];
    const selected = [];
    const targetCount = Math.max(0, count);

    while (selected.length < targetCount && pool.length > 0) {
      const idx = this.rng.int(0, pool.length - 1);
      const [picked] = pool.splice(idx, 1);
      selected.push(picked);
    }

    return selected;
  }

  /**
   * Adquire um upgrade válido, recalcula os atributos em `playerState`
   * e notifica ouvintes (ex.: CharacterAppearanceSystem).
   */
  acquireUpgrade(upgradeOrId, playerState = null) {
    const upgrade =
      typeof upgradeOrId === 'string'
        ? this.catalog.find((u) => u.id === upgradeOrId) ?? getUpgradeById(upgradeOrId)
        : upgradeOrId;

    if (!upgrade || !this.canAcquire(upgrade)) {
      return null;
    }

    this.acquiredUpgrades.push(upgrade);
    this.acquiredCounts.set(
      upgrade.id,
      (this.acquiredCounts.get(upgrade.id) ?? 0) + 1
    );

    if (playerState?.setUpgrades) {
      playerState.setUpgrades(this.getActiveModifiers(), this.getAcquiredIds());
    }

    if (typeof this.onUpgradesChanged === 'function') {
      this.onUpgradesChanged(this.getAcquiredUpgrades());
    }

    return upgrade;
  }

  getActiveModifiers() {
    return this.acquiredUpgrades.map((upgrade) => upgrade.modifiers ?? {});
  }

  reset(playerState = null, seed = null) {
    this.acquiredUpgrades = [];
    this.acquiredCounts.clear();
    if (seed !== null && seed !== undefined) {
      this.rng = new SeededRandom(seed);
    }
    if (playerState?.setUpgrades) {
      playerState.setUpgrades([], []);
    }
    if (typeof this.onUpgradesChanged === 'function') {
      this.onUpgradesChanged([]);
    }
  }
}
