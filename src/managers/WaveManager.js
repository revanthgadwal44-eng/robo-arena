/**
 * Tracks wave progression and spawns the next wave when all enemies are destroyed.
 */
export class WaveManager {
  constructor(enemyManager, bossManager, getPlayerPosition) {
    this.enemyManager = enemyManager;
    this.bossManager = bossManager;
    this._getPlayerPosition = getPlayerPosition;
    this.wave = 1;
    this.enemiesKilledThisWave = 0;
    this._pendingBossSpawn = false;
    this.spawnWave();
  }

  onEnemyKilled() {
    this.enemiesKilledThisWave++;
  }

  spawnWave() {
    if (this.wave % 5 === 0) {
      this._pendingBossSpawn = true;
      return;
    }
    this._pendingBossSpawn = false;
    for (let i = 0; i < this.wave + 2; i++) {
      this.enemyManager.spawn();
    }
  }

  get hasPendingBossSpawn() {
    return this._pendingBossSpawn;
  }

  spawnPendingBoss() {
    if (!this._pendingBossSpawn) {
      return null;
    }
    this._pendingBossSpawn = false;
    return this.bossManager.spawn(this._getPlayerPosition());
  }

  /**
   * @returns {number|null} new wave number when wave advances, else null
   */
  checkAndSpawnNextWave() {
    if (this.enemyManager.count > 0 || this.bossManager.hasBoss || this._pendingBossSpawn) {
      return null;
    }

    this.wave++;
    this.enemiesKilledThisWave = 0;
    this.spawnWave();
    return this.wave;
  }

  reset() {
    this.bossManager.clearAll();
    this._pendingBossSpawn = false;
    this.wave = 1;
    this.enemiesKilledThisWave = 0;
    this.spawnWave();
  }
}