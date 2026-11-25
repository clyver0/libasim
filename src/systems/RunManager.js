/**
 * Acompanha o estado global e as estatísticas consolidadas da run (ARCHITECTURE.md §14).
 * Não concentra a lógica interna dos sistemas especializados.
 */
export class RunManager {
  constructor({
    characterId = 'character_1',
    characterName = 'Personagem 1',
    seed = Date.now(),
    totalEnemyTarget = 100,
  } = {}) {
    this.characterId = characterId;
    this.characterName = characterName;
    this.seed = seed;
    this.totalEnemyTarget = totalEnemyTarget;

    this.status = 'running'; // 'running' | 'victory' | 'defeat'
    this.elapsedMs = 0;
    this.defeatedEnemies = 0;
    this.officialShopsVisited = 0;
    this.specialShopsVisited = 0;
    this.drinksCollected = 0;
    this.acquiredUpgrades = [];
    this.miniBossSpawned = false;
    this.miniBossDefeated = false;
    this.bossSpawned = false;
    this.bossPhase = 0;
    this.bossDefeated = false;
  }

  updateTime(deltaMs) {
    if (this.status !== 'running' || typeof deltaMs !== 'number' || deltaMs <= 0) {
      return;
    }
    this.elapsedMs += deltaMs;
  }

  syncProgress({
    defeatedEnemies,
    officialShopsVisited,
    specialShopsVisited,
    acquiredUpgrades,
  } = {}) {
    if (typeof defeatedEnemies === 'number') {
      this.defeatedEnemies = defeatedEnemies;
    }
    if (typeof officialShopsVisited === 'number') {
      this.officialShopsVisited = officialShopsVisited;
    }
    if (typeof specialShopsVisited === 'number') {
      this.specialShopsVisited = specialShopsVisited;
    }
    if (Array.isArray(acquiredUpgrades)) {
      this.acquiredUpgrades = acquiredUpgrades.map((u) =>
        typeof u === 'string' ? u : u.name ?? u.id
      );
    }
  }

  registerDrinkCollected() {
    this.drinksCollected += 1;
  }

  markMiniBossSpawned() {
    this.miniBossSpawned = true;
  }

  markMiniBossDefeated() {
    this.miniBossDefeated = true;
  }

  markBossSpawned(phase = 1) {
    this.bossSpawned = true;
    this.bossPhase = phase;
  }

  setBossPhase(phase) {
    this.bossPhase = phase;
  }

  markVictory() {
    if (this.status !== 'running') return false;
    this.bossDefeated = true;
    this.status = 'victory';
    return true;
  }

  markDefeat() {
    if (this.status !== 'running') return false;
    this.status = 'defeat';
    return true;
  }

  isFinished() {
    return this.status === 'victory' || this.status === 'defeat';
  }

  getSummary() {
    return {
      status: this.status,
      characterId: this.characterId,
      characterName: this.characterName,
      seed: this.seed,
      elapsedMs: Math.round(this.elapsedMs),
      elapsedSeconds: Math.round(this.elapsedMs / 100) / 10,
      defeatedEnemies: this.defeatedEnemies,
      totalEnemyTarget: this.totalEnemyTarget,
      officialShopsVisited: this.officialShopsVisited,
      specialShopsVisited: this.specialShopsVisited,
      drinksCollected: this.drinksCollected,
      acquiredUpgrades: [...this.acquiredUpgrades],
      miniBossSpawned: this.miniBossSpawned,
      miniBossDefeated: this.miniBossDefeated,
      bossSpawned: this.bossSpawned,
      bossPhase: this.bossPhase,
      bossDefeated: this.bossDefeated,
    };
  }
}
