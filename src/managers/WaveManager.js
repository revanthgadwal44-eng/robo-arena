import {
  SPAWN_RANGE,
  SPAWN_RANGE_DOUBLED,
} from '../constants.js';

/**
 * Tracks wave progression and spawns the next wave when all enemies are cleared.
 */
export class WaveManager {
  /** @param {import('./EnemyManager.js').EnemyManager} enemyManager */
  constructor(enemyManager) {
    this.enemyManager = enemyManager;
    this.wave = 1;
    this.enemiesKilledThisWave = 0;
  }

  /** Called when an enemy dies — reserved for future wave UI/progression hooks. */
  onEnemyKilled() {
    this.enemiesKilledThisWave++;
  }

  /** Advances wave and spawns wave + 2 enemies at random arena positions. */
  checkAndSpawnNextWave() {
    if (this.enemyManager.count > 0) {
      return;
    }

    this.wave++;
    this.enemiesKilledThisWave = 0;

    for (let i = 0; i < this.wave + 2; i++) {
      const x = Math.random() * SPAWN_RANGE_DOUBLED - SPAWN_RANGE;
      const z = Math.random() * SPAWN_RANGE_DOUBLED - SPAWN_RANGE;
      this.enemyManager.spawn(x, z);
    }
  }
}
