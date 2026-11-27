import { ENEMY_CONFIG } from '../constants/enemies.js';
import { GAMEPLAY } from '../constants/gameplay.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * Controla o surgimento dos inimigos comuns pela região superior da tela,
 * respeitando limites simultâneos, intervalo de spawn e a meta total de 100 derrotas.
 */
export class SpawnSystem {
  constructor({
    totalTarget = ENEMY_CONFIG.TOTAL_COMMON_ENEMIES,
    limitsConfig = ENEMY_CONFIG.SIMULTANEOUS_LIMITS,
    spawnConfig = ENEMY_CONFIG.SPAWN,
    screenWidth = GAMEPLAY.SCREEN_WIDTH,
    seed = Date.now(),
    onAllDefeated = null,
  } = {}) {
    this.totalTarget = totalTarget;
    this.limitsConfig = limitsConfig;
    this.spawnConfig = spawnConfig;
    this.screenWidth = screenWidth;
    this.rng = new SeededRandom(seed);
    this.onAllDefeated = onAllDefeated;

    this.defeatedIds = new Set();
    this.removedIds = new Set();
    this.activeIds = new Set();
    this.defeatedCount = 0;
    this.spawnCounter = 0;
    this.spawnTimerMs = spawnConfig.INITIAL_DELAY_MS ?? spawnConfig.INTERVAL_MS;
    this.allDefeatedNotified = false;
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
  }

  resume() {
    this.stopped = false;
  }

  isCompleted() {
    return this.defeatedCount >= this.totalTarget;
  }

  getMaxSimultaneous() {
    if (this.defeatedCount <= this.limitsConfig.EARLY_MAX_DEFEATED) {
      return this.limitsConfig.EARLY_LIMIT;
    }
    if (this.defeatedCount <= this.limitsConfig.MID_MAX_DEFEATED) {
      return this.limitsConfig.MID_LIMIT;
    }
    return this.limitsConfig.LATE_LIMIT;
  }

  getRemainingQuota(activeCount = this.activeIds.size) {
    return Math.max(0, this.totalTarget - (this.defeatedCount + activeCount));
  }

  canSpawn(activeCount = this.activeIds.size) {
    if (this.stopped || this.isCompleted()) return false;
    if (activeCount >= this.getMaxSimultaneous()) return false;
    return this.getRemainingQuota(activeCount) > 0;
  }

  chooseSpawnPosition({
    playerX = null,
    activeEnemies = [],
    viewportLeft = 0,
    viewportWidth = this.screenWidth,
    holes = null,
  } = {}) {
    const minX = viewportLeft + this.spawnConfig.MARGIN_X;
    const maxX = Math.max(
      minX,
      viewportLeft + viewportWidth - this.spawnConfig.MARGIN_X
    );

    const topEnemiesX = [];
    for (const enemy of activeEnemies) {
      const ex = enemy.getCombatOrigin ? enemy.getCombatOrigin().x : enemy.x;
      const ey = enemy.getCombatOrigin ? enemy.getCombatOrigin().y : enemy.y;
      if (
        typeof ex === 'number' &&
        (typeof ey !== 'number' || ey < this.spawnConfig.TOP_CHECK_Y)
      ) {
        topEnemiesX.push(ex);
      }
    }

    let bestX = (minX + maxX) / 2;
    let bestScore = -Infinity;

    const attempts = Math.max(1, this.spawnConfig.MAX_POSITION_ATTEMPTS ?? 10);
    for (let i = 0; i < attempts; i += 1) {
      const candidateX = this.rng.range(minX, maxX);

      const overHole =
        Array.isArray(holes) &&
        holes.some(
          (h) => candidateX > h.left - 18 && candidateX < h.right + 18
        );

      const playerDist =
        typeof playerX === 'number' ? Math.abs(candidateX - playerX) : Infinity;

      let minEnemyDist = Infinity;
      for (const otherX of topEnemiesX) {
        const dist = Math.abs(candidateX - otherX);
        if (dist < minEnemyDist) minEnemyDist = dist;
      }

      const respectsPlayer = playerDist >= this.spawnConfig.MIN_PLAYER_DISTANCE_X;
      const respectsTopEnemies =
        minEnemyDist >= this.spawnConfig.MIN_ACTIVE_TOP_SPACING_X;

      if (!overHole && respectsPlayer && respectsTopEnemies) {
        bestX = candidateX;
        break;
      }

      // Pontuação de fallback para escolher o ponto menos conflituoso possível
      const holePenalty = overHole ? -300 : 0;
      const score =
        holePenalty +
        Math.min(playerDist, this.spawnConfig.MIN_PLAYER_DISTANCE_X) * 2 +
        Math.min(minEnemyDist, this.spawnConfig.MIN_ACTIVE_TOP_SPACING_X);
      if (score > bestScore) {
        bestScore = score;
        bestX = candidateX;
      }
    }

    return {
      x: Math.round(bestX),
      y: this.spawnConfig.TOP_Y,
    };
  }

  update(
    deltaMs,
    {
      playerX = null,
      activeEnemies = null,
      playerDead = false,
      viewportLeft = 0,
      viewportWidth = this.screenWidth,
      holes = null,
    } = {}
  ) {
    if (this.stopped || playerDead) {
      return null;
    }

    const enemiesList = Array.isArray(activeEnemies) ? activeEnemies : [];
    const activeCount = Array.isArray(activeEnemies)
      ? enemiesList.length
      : this.activeIds.size;
    if (!this.canSpawn(activeCount)) {
      return null;
    }

    this.spawnTimerMs -= deltaMs;
    if (this.spawnTimerMs > 0) {
      return null;
    }

    this.spawnTimerMs = this.spawnConfig.INTERVAL_MS;
    this.spawnCounter += 1;
    const id = `enemy_${this.spawnCounter}`;
    const position = this.chooseSpawnPosition({
      playerX,
      activeEnemies: enemiesList,
      viewportLeft,
      viewportWidth,
      holes,
    });
    this.activeIds.add(id);

    return {
      id,
      x: position.x,
      y: position.y,
    };
  }

  /**
   * Registra uma derrota real de forma idempotente.
   * Remoções administrativas (ex.: reset de cena) devem usar `unregisterActiveEnemy`.
   */
  markEnemyDefeated(enemyId) {
    if (
      !enemyId ||
      this.defeatedIds.has(enemyId) ||
      this.removedIds.has(enemyId)
    ) {
      return false;
    }

    this.defeatedIds.add(enemyId);
    this.activeIds.delete(enemyId);
    this.defeatedCount += 1;

    if (this.defeatedCount >= this.totalTarget && !this.allDefeatedNotified) {
      this.allDefeatedNotified = true;
      if (typeof this.onAllDefeated === 'function') {
        this.onAllDefeated(this.getSnapshot());
      }
    }

    return true;
  }

  unregisterActiveEnemy(enemyId) {
    if (!enemyId) return false;
    if (!this.defeatedIds.has(enemyId)) {
      this.removedIds.add(enemyId);
    }
    return this.activeIds.delete(enemyId);
  }

  getSnapshot() {
    return {
      defeatedCount: this.defeatedCount,
      totalTarget: this.totalTarget,
      activeCount: this.activeIds.size,
      maxSimultaneous: this.getMaxSimultaneous(),
      completed: this.isCompleted(),
      stopped: this.stopped,
    };
  }
}
