import * as THREE from 'three';
import { Boss } from '../entities/Boss.js';
import { Bullet } from '../entities/Bullet.js';
import { findValidSpawnPosition } from './findValidSpawnPosition.js';
import {
  BOSS_COLLISION_RADIUS,
  BOSS_MELEE_RANGE,
  BOSS_SHOOT_RANGE,
  BOSS_SHOT_COOLDOWN_SECONDS,
  BOSS_SHOTS_PER_BURST,
  BOSS_CHASE_MIN_DURATION_SECONDS,
  BOSS_CHARGE_WINDUP_SECONDS,
  BOSS_CHARGE_DURATION_SECONDS,
  BOSS_CHARGE_SPEED,
  BOSS_COOLDOWN_SECONDS,
  BOSS_CHARGE_DAMAGE,
  BOSS_SPEED,
  BOSS_BULLET_DAMAGE,
  BOSS_MAX_HEALTH,
  BOSS_MISSILE_DAMAGE,
  BOSS_MISSILE_SPEED,
  BOSS_MISSILE_SPLASH_RADIUS,
  BOSS_PHASE2_HEALTH_RATIO,
  BOSS_PHASE3_HEALTH_RATIO,
  BOSS_PHASE_TRANSITION_SECONDS,
  BOSS_AREA_SLAM_WINDUP_SECONDS,
  BOSS_AREA_SLAM_DAMAGE,
  BOSS_AREA_SLAM_RADIUS,
  BOSS_AREA_SLAM_INTERVAL_SECONDS,
  BOSS_PHASES,
  BOSS_PHASE_CONFIG,
  ENEMY_BULLET_COLOR,
  BULLET_RADIUS,
  ENEMY_SPAWN_ATTEMPTS,
  ENEMY_COLLISION_RADIUS,
  ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  PLAYER_COLLISION_RADIUS,
} from '../constants.js';

const BOSS_STATES = {
  CHASE: 'chase',
  SHOOT: 'shoot',
  CHARGE: 'charge',
  COOLDOWN: 'cooldown',
  PHASE_TRANSITION: 'phase_transition',
  AREA_SLAM: 'area_slam',
};

const FAN_SPREAD_ANGLES = [-0.38, -0.2, 0, 0.2, 0.38];

const ENERGY_PROJECTILE_MATERIAL = new THREE.MeshStandardMaterial({
  color: ENEMY_BULLET_COLOR,
  emissive: 0xaa3322,
  emissiveIntensity: 0.7,
  roughness: 0.35,
  metalness: 0.2,
});
const ENERGY_PROJECTILE_GEOMETRY = new THREE.SphereGeometry(BULLET_RADIUS * 2.6, 12, 12);
const MISSILE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x6d747e,
  roughness: 0.44,
  metalness: 0.74,
  emissive: 0x641414,
  emissiveIntensity: 0.45,
});
const MISSILE_GEOMETRY = new THREE.CylinderGeometry(0.2, 0.32, 1.2, 10);

export class BossManager {
  constructor(scene, obstacleManager, enemyManager) {
    this.scene = scene;
    this.obstacleManager = obstacleManager;
    this.enemyManager = enemyManager;
    this.boss = null;

    this._state = BOSS_STATES.CHASE;
    this._stateTimer = 0;
    this._shotsRemaining = 0;
    this._shootTimer = 0;
    this._didChargeDamage = false;
    this._pendingDamage = 0;
    this._chargePhase = 'windup';
    this._missilesLaunched = false;
    this._currentPhase = BOSS_PHASES.ONE;
    this._areaSlamPhase = 'windup';
    this._areaSlamTimer = BOSS_AREA_SLAM_INTERVAL_SECONDS;
    this._fanPatternFired = false;
    this._radialPatternFired = false;

    this._movement = new THREE.Vector3();
    this._originalPosition = new THREE.Vector3();
    this._testPosition = new THREE.Vector3();
    this._chargeDirection = new THREE.Vector3();
    this._leftShoulderWorld = new THREE.Vector3();
    this._rightShoulderWorld = new THREE.Vector3();
    this._warningLightOffset = new THREE.Vector3(0, 2.8, 0);
    this._shotOrigin = new THREE.Vector3();
    this._shotDirection = new THREE.Vector3();
    this._rotatedDirection = new THREE.Vector3();

    this._warningLight = new THREE.PointLight(0xff3d2e, 0.75, 16);
    this._warningLight.visible = false;
    this.scene.add(this._warningLight);
  }

  get hasBoss() {
    return this.boss !== null;
  }

  getBossHealthState() {
    if (!this.boss) {
      return null;
    }
    return {
      health: this.boss.health,
      maxHealth: this.boss.mesh.userData.maxHealth,
      phase: this._currentPhase,
      transitioning: this._state === BOSS_STATES.PHASE_TRANSITION,
    };
  }

  spawn(playerPosition, options = {}) {
    if (this.boss) {
      return this.boss;
    }

    const difficultyScale = options.difficultyScale ?? 1;
    const colliders = this.enemyManager.getEnemies().map((enemy) => ({
      position: enemy.mesh.position,
      radius: ENEMY_COLLISION_RADIUS,
    }));
    const position = findValidSpawnPosition({
      obstacleManager: this.obstacleManager,
      radius: BOSS_COLLISION_RADIUS,
      playerPosition,
      playerRadius: PLAYER_COLLISION_RADIUS,
      minPlayerDistance: ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER + 5,
      colliders,
      maxAttempts: ENEMY_SPAWN_ATTEMPTS,
    });
    if (!position) {
      return null;
    }

    this.boss = new Boss(this.scene, position.x, position.z);
    if (difficultyScale > 1) {
      const scaledHealth = Math.round(BOSS_MAX_HEALTH * difficultyScale);
      this.boss.health = scaledHealth;
      this.boss.mesh.userData.health = scaledHealth;
      this.boss.mesh.userData.maxHealth = scaledHealth;
      this.boss.mesh.userData.damage = Math.round(BOSS_BULLET_DAMAGE * (0.85 + difficultyScale * 0.15));
      this.boss.mesh.userData.speed = BOSS_SPEED * (1 + (difficultyScale - 1) * 0.35);
    }
    this._state = BOSS_STATES.CHASE;
    this._stateTimer = 0;
    this._shotsRemaining = 0;
    this._shootTimer = 0;
    this._didChargeDamage = false;
    this._pendingDamage = 0;
    this._chargePhase = 'windup';
    this._missilesLaunched = false;
    this._currentPhase = BOSS_PHASES.ONE;
    this._areaSlamTimer = BOSS_AREA_SLAM_INTERVAL_SECONDS;
    this._applyPhaseStats();
    return this.boss;
  }

  update(delta, playerPosition, handlers = {}) {
    if (!this.boss) {
      this._warningLight.visible = false;
      return 0;
    }

    this._evaluatePhaseTransition(playerPosition, handlers);
    this._stateTimer += delta;
    const distance = this.boss.mesh.position.distanceTo(playerPosition);
    const phaseConfig = this._getPhaseConfig();

    switch (this._state) {
      case BOSS_STATES.PHASE_TRANSITION:
        this.boss.setChargeWarning(false);
        this.boss.setAreaSlamWarning(false);
        this._warningLight.visible = true;
        this._warningLight.position.copy(this.boss.mesh.position).add(this._warningLightOffset);
        if (this._stateTimer >= BOSS_PHASE_TRANSITION_SECONDS) {
          this._setState(BOSS_STATES.CHASE);
        }
        break;
      case BOSS_STATES.CHASE:
        this.boss.setChargeWarning(false);
        this.boss.setAreaSlamWarning(false);
        this._warningLight.visible = false;
        this._moveToward(playerPosition, this.boss.mesh.userData.speed);
        if (this._currentPhase >= BOSS_PHASES.THREE) {
          this._areaSlamTimer -= delta;
          if (this._areaSlamTimer <= 0 && this._stateTimer >= BOSS_CHASE_MIN_DURATION_SECONDS * phaseConfig.chaseMinDurationMultiplier * 0.5) {
            this._startAreaSlam(handlers);
            break;
          }
        }
        if (this._stateTimer >= BOSS_CHASE_MIN_DURATION_SECONDS * phaseConfig.chaseMinDurationMultiplier) {
          if (distance <= BOSS_MELEE_RANGE + 2.2) {
            this._startCharge(playerPosition, handlers);
          } else if (distance <= BOSS_SHOOT_RANGE) {
            this._startShooting();
          }
        }
        break;
      case BOSS_STATES.SHOOT:
        this._warningLight.visible = false;
        this._shootTimer += delta;
        if (!this._missilesLaunched) {
          this._missilesLaunched = true;
          this._launchMissiles(playerPosition, handlers.onShoot);
          if (phaseConfig.fanShots > 0 && !this._fanPatternFired) {
            this._fanPatternFired = true;
            this._shootFanPattern(playerPosition, handlers.onShoot);
          }
        }
        const shotCooldown = BOSS_SHOT_COOLDOWN_SECONDS * phaseConfig.shotCooldownMultiplier;
        if (this._shotsRemaining > 0 && this._shootTimer >= shotCooldown) {
          this._shootTimer = 0;
          this._shotsRemaining -= 1;
          this._shootAt(playerPosition, handlers.onShoot);
        }
        if (this._shotsRemaining === 0) {
          if (phaseConfig.radialShots > 0 && !this._radialPatternFired) {
            this._radialPatternFired = true;
            this._shootRadialPattern(handlers.onShoot);
          }
          this._setState(BOSS_STATES.COOLDOWN);
        }
        break;
      case BOSS_STATES.CHARGE:
        this._updateCharge(delta, playerPosition, handlers);
        break;
      case BOSS_STATES.AREA_SLAM:
        this._updateAreaSlam(delta, playerPosition, handlers);
        break;
      case BOSS_STATES.COOLDOWN:
      default:
        this.boss.setChargeWarning(false);
        this.boss.setAreaSlamWarning(false);
        this._warningLight.visible = false;
        if (this._stateTimer >= BOSS_COOLDOWN_SECONDS * phaseConfig.cooldownMultiplier) {
          this._setState(BOSS_STATES.CHASE);
        }
        break;
    }

    this.boss.update(
      delta,
      playerPosition,
      this._state === BOSS_STATES.CHASE || (this._state === BOSS_STATES.CHARGE && this._chargePhase === 'dash'),
      this._state === BOSS_STATES.CHARGE && this._chargePhase === 'windup'
    );

    this._updateFacingYOnly();
    const damage = this._pendingDamage;
    this._pendingDamage = 0;
    return damage;
  }

  _updateCharge(delta, playerPosition, handlers) {
    if (this._chargePhase === 'windup') {
      this.boss.setChargeWarning(true);
      this._warningLight.visible = true;
      this._warningLight.position.copy(this.boss.mesh.position).add(this._warningLightOffset);
      if (this._stateTimer >= BOSS_CHARGE_WINDUP_SECONDS) {
        this._stateTimer = 0;
        this._chargePhase = 'dash';
        this.boss.setChargeWarning(false);
        handlers.onCameraShake?.(0.55);
      }
      return;
    }

    this._warningLight.visible = false;
    const chargeSpeed = BOSS_CHARGE_SPEED * this._getPhaseConfig().chargeSpeedMultiplier;
    this._moveTowardDirection(this._chargeDirection, chargeSpeed);
    const distance = this.boss.mesh.position.distanceTo(playerPosition);
    if (!this._didChargeDamage && distance <= BOSS_MELEE_RANGE + 0.6) {
      this._didChargeDamage = true;
      this._setState(BOSS_STATES.COOLDOWN);
      this._pendingDamage += BOSS_CHARGE_DAMAGE * (1 + (this._currentPhase - 1) * 0.14);
      return;
    }

    if (this._stateTimer >= BOSS_CHARGE_DURATION_SECONDS) {
      this._setState(BOSS_STATES.COOLDOWN);
    }
  }

  handlePlayerBulletHit(bullet) {
    if (!this.boss) {
      return { hit: false, died: false };
    }
    const distance = bullet.mesh.position.distanceTo(this.boss.mesh.position);
    if (distance >= BOSS_COLLISION_RADIUS * 1.35) {
      return { hit: false, died: false };
    }
    const died = this.boss.takeDamage(bullet.damage);
    return { hit: true, died };
  }

  removeBoss() {
    if (!this.boss) {
      return;
    }
    this.boss.dispose(this.scene);
    this.boss = null;
    this._warningLight.visible = false;
    this._pendingDamage = 0;
    this._currentPhase = BOSS_PHASES.ONE;
    this._setState(BOSS_STATES.CHASE);
  }

  clearAll() {
    this.removeBoss();
  }

  _setState(state) {
    this._state = state;
    this._stateTimer = 0;
  }

  _getPhaseConfig() {
    return BOSS_PHASE_CONFIG[this._currentPhase] ?? BOSS_PHASE_CONFIG[BOSS_PHASES.ONE];
  }

  _applyPhaseStats() {
    if (!this.boss) {
      return;
    }
    const config = this._getPhaseConfig();
    this.boss.mesh.userData.speed = BOSS_SPEED * config.speedMultiplier;
    this.boss.mesh.userData.damage = Math.round(BOSS_BULLET_DAMAGE * (1 + (this._currentPhase - 1) * 0.12));
  }

  _evaluatePhaseTransition(playerPosition, handlers) {
    if (!this.boss || this._state === BOSS_STATES.PHASE_TRANSITION) {
      return;
    }
    const ratio = this.boss.health / this.boss.mesh.userData.maxHealth;
    let nextPhase = this._currentPhase;
    if (ratio <= BOSS_PHASE3_HEALTH_RATIO && this._currentPhase < BOSS_PHASES.THREE) {
      nextPhase = BOSS_PHASES.THREE;
    } else if (ratio <= BOSS_PHASE2_HEALTH_RATIO && this._currentPhase < BOSS_PHASES.TWO) {
      nextPhase = BOSS_PHASES.TWO;
    }
    if (nextPhase === this._currentPhase) {
      return;
    }
    this._currentPhase = nextPhase;
    this._applyPhaseStats();
    this.boss.setPhase(nextPhase);
    this._beginPhaseTransition(playerPosition, handlers);
  }

  _beginPhaseTransition(playerPosition, handlers) {
    this._setState(BOSS_STATES.PHASE_TRANSITION);
    this._fanPatternFired = false;
    this._radialPatternFired = false;
    handlers.onBossPhaseChange?.(this._currentPhase, this.boss.mesh.position);
    handlers.onCameraShake?.(this._currentPhase >= BOSS_PHASES.THREE ? 1 : 0.75);
  }

  _startShooting() {
    this._setState(BOSS_STATES.SHOOT);
    const config = this._getPhaseConfig();
    this._shotsRemaining = config.shotsPerBurst;
    this._shootTimer = BOSS_SHOT_COOLDOWN_SECONDS * config.shotCooldownMultiplier;
    this._missilesLaunched = false;
    this._fanPatternFired = false;
    this._radialPatternFired = false;
  }

  _startAreaSlam(handlers) {
    this._setState(BOSS_STATES.AREA_SLAM);
    this._areaSlamPhase = 'windup';
    this._areaSlamTimer = BOSS_AREA_SLAM_INTERVAL_SECONDS;
    this.boss.setAreaSlamWarning(true);
    handlers.onCameraShake?.(0.45);
  }

  _updateAreaSlam(delta, playerPosition, handlers) {
    if (this._areaSlamPhase === 'windup') {
      this.boss.setAreaSlamWarning(true);
      this._warningLight.visible = true;
      this._warningLight.position.copy(this.boss.mesh.position).add(this._warningLightOffset);
      if (this._stateTimer >= BOSS_AREA_SLAM_WINDUP_SECONDS) {
        this._areaSlamPhase = 'slam';
        this._stateTimer = 0;
        this.boss.setAreaSlamWarning(false);
        this._warningLight.visible = false;
        handlers.onBossAreaSlam?.(this.boss.mesh.position);
        handlers.onCameraShake?.(0.95);
        const dx = playerPosition.x - this.boss.mesh.position.x;
        const dz = playerPosition.z - this.boss.mesh.position.z;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq <= BOSS_AREA_SLAM_RADIUS * BOSS_AREA_SLAM_RADIUS) {
          const distance = Math.sqrt(distanceSq);
          const falloff = 1 - distance / BOSS_AREA_SLAM_RADIUS;
          this._pendingDamage += BOSS_AREA_SLAM_DAMAGE * Math.max(0.35, falloff);
        }
        this._setState(BOSS_STATES.COOLDOWN);
      }
      return;
    }
  }

  _startCharge(playerPosition, handlers) {
    this._setState(BOSS_STATES.CHARGE);
    this._didChargeDamage = false;
    this._chargePhase = 'windup';
    this._chargeDirection.copy(playerPosition).sub(this.boss.mesh.position);
    this._chargeDirection.y = 0;
    if (this._chargeDirection.lengthSq() === 0) {
      this._chargeDirection.set(0, 0, 1);
    } else {
      this._chargeDirection.normalize();
    }
    handlers.onCameraShake?.(0.35);
  }

  _shootAt(playerPosition, onShoot) {
    if (!this.boss || !onShoot) {
      return;
    }
    const bulletMesh = new THREE.Mesh(ENERGY_PROJECTILE_GEOMETRY, ENERGY_PROJECTILE_MATERIAL);
    this._shotOrigin.set(
      this.boss.mesh.position.x,
      this.boss.mesh.position.y + 0.7,
      this.boss.mesh.position.z
    );
    bulletMesh.position.copy(this._shotOrigin);
    bulletMesh.castShadow = true;
    this.scene.add(bulletMesh);

    this._shotDirection.copy(playerPosition).sub(this._shotOrigin).normalize();
    onShoot(new Bullet(bulletMesh, this._shotDirection, this.boss.mesh.userData.damage, {
      speed: 0.16 + this._currentPhase * 0.015,
      radius: BULLET_RADIUS * 1.6,
      trailType: 'energy',
      explosionSize: 1.2,
    }));
  }

  _shootFanPattern(playerPosition, onShoot) {
    if (!this.boss || !onShoot) {
      return;
    }
    this._shotDirection.copy(playerPosition).sub(this.boss.mesh.position);
    this._shotDirection.y = 0;
    if (this._shotDirection.lengthSq() === 0) {
      this._shotDirection.set(0, 0, 1);
    } else {
      this._shotDirection.normalize();
    }
    for (const angle of FAN_SPREAD_ANGLES) {
      this._spawnEnergyBullet(this._rotateDirectionY(this._shotDirection, angle), onShoot, 0.14, 0.85);
    }
  }

  _shootRadialPattern(onShoot) {
    if (!this.boss || !onShoot) {
      return;
    }
    const count = this._getPhaseConfig().radialShots || 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      this._rotatedDirection.set(Math.sin(angle), 0, Math.cos(angle));
      this._spawnEnergyBullet(this._rotatedDirection, onShoot, 0.12, 0.75);
    }
  }

  _spawnEnergyBullet(direction, onShoot, speed, damageScale = 1) {
    const bulletMesh = new THREE.Mesh(ENERGY_PROJECTILE_GEOMETRY, ENERGY_PROJECTILE_MATERIAL);
    this._shotOrigin.set(
      this.boss.mesh.position.x,
      this.boss.mesh.position.y + 0.85,
      this.boss.mesh.position.z
    );
    bulletMesh.position.copy(this._shotOrigin);
    bulletMesh.castShadow = true;
    this.scene.add(bulletMesh);
    onShoot(new Bullet(bulletMesh, direction, Math.round(this.boss.mesh.userData.damage * damageScale), {
      speed,
      radius: BULLET_RADIUS * 1.5,
      trailType: 'energy',
      explosionSize: 1.05,
    }));
  }

  _rotateDirectionY(direction, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = direction.x;
    const z = direction.z;
    this._rotatedDirection.set(
      x * cos - z * sin,
      0,
      x * sin + z * cos
    );
    return this._rotatedDirection;
  }

  _launchMissiles(playerPosition, onShoot) {
    if (!this.boss || !onShoot) {
      return;
    }
    this.boss.getShoulderWorldPositions(this._leftShoulderWorld, this._rightShoulderWorld);
    this._spawnMissile(this._leftShoulderWorld, playerPosition, onShoot);
    this._spawnMissile(this._rightShoulderWorld, playerPosition, onShoot);
    const bonus = this._getPhaseConfig().bonusMissiles ?? 0;
    for (let i = 0; i < bonus; i++) {
      this._shotOrigin.copy(this.boss.mesh.position);
      this._shotOrigin.x += (i % 2 === 0 ? -1.4 : 1.4);
      this._shotOrigin.y += 1.2;
      this._spawnMissile(this._shotOrigin, playerPosition, onShoot);
    }
  }

  _spawnMissile(origin, playerPosition, onShoot) {
    const missileMesh = new THREE.Mesh(MISSILE_GEOMETRY, MISSILE_MATERIAL);
    missileMesh.rotation.x = Math.PI / 2;
    missileMesh.position.copy(origin);
    missileMesh.castShadow = true;
    this.scene.add(missileMesh);
    this._shotDirection.copy(playerPosition).sub(origin).normalize();
    onShoot(new Bullet(missileMesh, this._shotDirection, BOSS_MISSILE_DAMAGE, {
      speed: BOSS_MISSILE_SPEED + this._currentPhase * 0.012,
      radius: BULLET_RADIUS * 2.2,
      splashDamage: BOSS_MISSILE_DAMAGE,
      splashRadius: BOSS_MISSILE_SPLASH_RADIUS,
      trailType: 'smoke',
      explosionSize: 1.9,
      isMissile: true,
    }));
  }

  _moveToward(targetPosition, speed) {
    this._movement.copy(targetPosition).sub(this.boss.mesh.position);
    this._movement.y = 0;
    if (this._movement.lengthSq() === 0) {
      return;
    }
    this._movement.normalize().multiplyScalar(speed);
    this._moveBy(this._movement);
  }

  _moveTowardDirection(direction, speed) {
    this._movement.copy(direction).multiplyScalar(speed);
    this._moveBy(this._movement);
  }

  _moveBy(step) {
    if (!this.boss) {
      return;
    }
    this._originalPosition.copy(this.boss.mesh.position);
    this._testPosition.copy(this._originalPosition).add(step);
    if (!this._isBlocked(this._testPosition)) {
      this.boss.mesh.position.copy(this._testPosition);
      return;
    }

    this._testPosition.set(
      this._originalPosition.x + step.x,
      this._originalPosition.y,
      this._originalPosition.z
    );
    if (!this._isBlocked(this._testPosition)) {
      this.boss.mesh.position.copy(this._testPosition);
      return;
    }

    this._testPosition.set(
      this._originalPosition.x,
      this._originalPosition.y,
      this._originalPosition.z + step.z
    );
    if (!this._isBlocked(this._testPosition)) {
      this.boss.mesh.position.copy(this._testPosition);
    }
  }

  _isBlocked(position) {
    if (!this.obstacleManager) {
      return false;
    }
    return this.obstacleManager.isCircleBlocked(position, BOSS_COLLISION_RADIUS);
  }

  _updateFacingYOnly() {
    if (!this.boss || this._movement.lengthSq() === 0) {
      return;
    }
    this.boss.mesh.rotation.y = Math.atan2(this._movement.x, this._movement.z);
  }
}
