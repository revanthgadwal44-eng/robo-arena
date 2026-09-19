import { BOSS_RUSH_BOSS_COUNT } from '../constants.js';

/**
 * Boss Rush flow — chains boss fights with escalating difficulty.
 * Reuses BossManager.spawn; does not duplicate boss logic.
 */
export class BossRushManager {
  constructor(bossManager, getPlayerPosition) {
    this.bossManager = bossManager;
    this._getPlayerPosition = getPlayerPosition;
    this.currentBossIndex = 0;
    this.bossesDefeated = 0;
    this.runActive = false;
    this.runStartTime = 0;
  }

  startRun() {
    this.currentBossIndex = 0;
    this.bossesDefeated = 0;
    this.runActive = true;
    this.runStartTime = performance.now();
    this._spawnCurrentBoss();
  }

  reset() {
    this.currentBossIndex = 0;
    this.bossesDefeated = 0;
    this.runActive = false;
    this.runStartTime = 0;
    this.bossManager.clearAll();
  }

  onBossDefeated() {
    if (!this.runActive) {
      return { completed: false, hasNext: false };
    }
    this.bossesDefeated += 1;
    this.currentBossIndex += 1;
    if (this.currentBossIndex >= BOSS_RUSH_BOSS_COUNT) {
      this.runActive = false;
      return { completed: true, hasNext: false };
    }
    return { completed: false, hasNext: true };
  }

  spawnNextBoss() {
    this._spawnCurrentBoss();
  }

  getElapsedSeconds() {
    if (!this.runStartTime) {
      return 0;
    }
    return (performance.now() - this.runStartTime) / 1000;
  }

  getDifficultyScale() {
    return 1 + this.currentBossIndex * 0.22;
  }

  _spawnCurrentBoss() {
    this.bossManager.spawn(this._getPlayerPosition(), {
      difficultyScale: this.getDifficultyScale(),
    });
  }
}
