/**
 * Tracks wave progression and spawns the next wave when all enemies are destroyed.
 */
export class WaveManager {
  constructor(enemyManager) {
    this.enemyManager = enemyManager;
    this.wave = 1;
    this.enemiesKilledThisWave = 0;
    this.spawnWave();
  }

  onEnemyKilled() {
    this.enemiesKilledThisWave++;
  }

  spawnWave() {
    for (let i = 0; i < this.wave + 2; i++) {
      this.enemyManager.spawn();
    }
  }

  /**
   * @returns {number|null} new wave number when wave advances, else null
   */
  checkAndSpawnNextWave() {
    if (this.enemyManager.count > 0) {
      return null;
    }

    this.wave++;
    this.enemiesKilledThisWave = 0;
    this.spawnWave();
    return this.wave;
  }

  reset() {
    this.wave = 1;
    this.enemiesKilledThisWave = 0;
    this.spawnWave();
  }
}