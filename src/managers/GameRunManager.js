import { BOSS_PHASE_CONFIG } from '../constants.js';

/**
 * Active run state — score, combo, game-over; keeps main.js as bootstrap only.
 */
export class GameRunManager {
  constructor(deps) {
    Object.assign(this, deps);
    this.kills = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bossIncomingCountdown = null;
    this.isGameOver = false;
  }

  reset() {
    this.kills = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bossIncomingCountdown = null;
    this.isGameOver = false;
    this.player.respawn();
    this.bulletManager.clearAll();
    this.bossManager.clearAll();
    this.enemyManager.clearAll();
    const skipWaveSpawn = this.gameModeManager.isBossRush();
    this.waveManager.reset({ skipSpawn: skipWaveSpawn });
    this.pickupManager.reset(this.player, this.input);
    this.weaponManager.reset();
    this.bossRushManager.reset();
    if (this.gameModeManager.isSurvival()) {
      this.enemyManager.spawnInitialEnemies();
    } else {
      this.enemyManager.clearAll();
    }
    this.ui.updateWeapon(this.weaponManager.getCurrentWeapon());
  }

  startRun() {
    this.reset();
    this.isGameOver = false;
    if (this.gameModeManager.isBossRush()) {
      this.enemyManager.clearAll();
      this.waveManager.reset();
      this.bossRushManager.startRun();
      this.audioManager.startBossMusic?.();
    } else {
      this.audioManager.startGameplayMusic?.();
    }
  }

  addKillScore(base = 100) {
    this.combo = Math.min(99, this.combo + 1);
    this.comboTimer = 2.5;
    const multiplier = 1 + this.combo * 0.05;
    this.score += Math.round(base * multiplier);
  }

  updateCombo(delta) {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
  }

  onBossDefeated() {
    const bossPosition = this.bossManager.boss ? this.bossManager.boss.mesh.position.clone() : null;
    if (bossPosition) {
      this.bulletManager.spawnBossExplosion(bossPosition);
    }
    this.bossManager.removeBoss();
    this.pickupManager.spawnBurst(5);
    this.ui.showNotification('BOSS DEFEATED');
    this.cameraSystem.addShake(1.15);
    this.audioManager.playBossDeath?.();
    this.saveManager.unlockAchievement('boss_down', 'Boss Breaker');
    this.addKillScore(500);
    this.kills += 1;

    if (this.gameModeManager.isBossRush()) {
      const result = this.bossRushManager.onBossDefeated();
      if (result.completed) {
        this.endGame(true);
        return;
      }
      if (result.hasNext) {
        this.ui.showNotification(`BOSS ${this.bossRushManager.currentBossIndex + 1} INCOMING`);
        this.bossIncomingCountdown = 1.2;
      }
      return;
    }
    this.audioManager.stopBossMusic?.();
  }

  endGame(victory = false) {
    this.isGameOver = true;
    this.audioManager.playGameOver?.();
    this.audioManager.stopBossMusic?.();
    this.audioManager.stopGameplayMusic?.();
    const mode = this.gameModeManager.isBossRush() ? 'boss_rush' : 'survival';
    this.saveManager.recordRunEnd(mode, {
      score: this.score,
      kills: this.kills,
      wave: this.waveManager.wave,
      bossesDefeated: this.bossRushManager.bossesDefeated,
      timeSeconds: this.bossRushManager.getElapsedSeconds(),
      bossDefeated: victory,
    });
    this.ui.showGameOver({
      victory,
      score: this.score,
      kills: this.kills,
      wave: this.waveManager.wave,
      mode,
      timeSeconds: this.bossRushManager.getElapsedSeconds(),
    });
  }

  updatePlaying(delta) {
    if (this.isGameOver) {
      return;
    }

    const timeScale = this.combatFeedback.consumeHitStopScale();
    const scaledDelta = delta * timeScale;

    this.player.update(this.input, scaledDelta);
    if (this.player.isDashing()) {
      this.bulletManager.emitPlayerDashTrail(this.player.mesh.position);
    }

    this.updateCombo(scaledDelta);

    const collectedPickups = this.pickupManager.update(scaledDelta, this.player, this.input);
    if (collectedPickups.length > 0) {
      this.audioManager.playPickup();
    }

    let didDefeatBoss = false;
    const frameKills = this.bulletManager.updatePlayerBullets(
      this.enemyManager.getEnemies(),
      (enemy) => {
        this.enemyManager.remove(enemy);
        this.waveManager.onEnemyKilled();
        this.addKillScore(100);
        this.audioManager.playEnemyDeath?.();
      },
      (bullet) => {
        const result = this.bossManager.handlePlayerBulletHit(bullet);
        if (result.hit && this.bossManager.boss) {
          this.combatFeedback.onBossHit(this.bossManager.boss.mesh.position, bullet.damage);
          this.cameraSystem.addShake(0.18);
          this.audioManager.playBossHit?.();
        }
        if (result.died) {
          didDefeatBoss = true;
        }
        return result;
      },
      (enemy, damage) => {
        this.combatFeedback.onEnemyHit(enemy.mesh.position, damage);
      }
    );
    this.kills += frameKills;
    if (didDefeatBoss) {
      this.onBossDefeated();
    }
    if (frameKills > 0) {
      this.audioManager.playExplosion();
    }

    const meleeDamage = this.enemyManager.update(this.player.mesh.position, this.camera, scaledDelta);
    const bossDamage = this.bossManager.update(
      scaledDelta,
      this.player.mesh.position,
      {
        onShoot: (bullet) => {
          this.bulletManager.addEnemyBullet(bullet);
          this.audioManager.playEnemyShoot?.();
        },
        onCameraShake: (intensity) => this.cameraSystem.addShake(intensity),
        onBossPhaseChange: (phase, position) => {
          const config = BOSS_PHASE_CONFIG[phase];
          this.bulletManager.spawnBossPhaseTransition(position, phase);
          this.ui.showBossPhaseChange(phase, config?.label ?? `PHASE ${phase}`);
          this.audioManager.playBossPhaseTransition(phase);
        },
        onBossAreaSlam: (position) => {
          this.bulletManager.spawnBossAreaSlam(position);
          this.audioManager.playBossAreaSlam();
        },
      }
    );
    const bulletDamage = this.bulletManager.updateEnemyBullets(this.player.mesh.position);
    const incomingDamage = meleeDamage + bossDamage + bulletDamage;
    if (incomingDamage > 0) {
      this.player.applyDamage(incomingDamage);
      this.ui.flashDamage(Math.min(1, incomingDamage / 25));
      this.cameraSystem.addShake(0.3);
      this.audioManager.playPlayerDamage?.();
    }

    this.bulletManager.updateEffects(scaledDelta);
    this.combatFeedback.update(delta);

    if (this.player.health <= 0) {
      this.endGame(false);
      return;
    }

    if (this.gameModeManager.isSurvival()) {
      const newWave = this.waveManager.checkAndSpawnNextWave();
      if (newWave !== null) {
        this.ui.showWaveAnnouncement(newWave);
        this.audioManager.playWaveStart?.();
        this.audioManager.playWaveComplete();
      }

      if (this.waveManager.hasPendingBossSpawn) {
        if (this.bossIncomingCountdown === null) {
          this.bossIncomingCountdown = 1;
          this.ui.showNotification('BOSS INCOMING');
          this.cameraSystem.addShake(0.4);
          this.audioManager.startBossMusic?.();
        } else {
          this.bossIncomingCountdown = Math.max(0, this.bossIncomingCountdown - scaledDelta);
          if (this.bossIncomingCountdown === 0) {
            this.waveManager.spawnPendingBoss();
            this.bossIncomingCountdown = null;
          }
        }
      } else if (!this.bossManager.hasBoss) {
        this.audioManager.stopBossMusic?.();
      }
    } else if (this.bossIncomingCountdown !== null) {
      this.bossIncomingCountdown = Math.max(0, this.bossIncomingCountdown - scaledDelta);
      if (this.bossIncomingCountdown === 0) {
        this.bossRushManager.spawnNextBoss();
        this.bossIncomingCountdown = null;
        this.audioManager.startBossMusic?.();
      }
    }
  }
}
