/**
 * Tracks wave progression and spawns the next wave
 * when all enemies are destroyed.
 */
export class WaveManager {

    constructor(enemyManager) {

        this.enemyManager = enemyManager;

        this.wave = 1;

        this.enemiesKilledThisWave = 0;

        // Spawn first wave
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

    checkAndSpawnNextWave() {

        if (this.enemyManager.count > 0) return;

        this.wave++;

        this.enemiesKilledThisWave = 0;

        this.spawnWave();

    }

}