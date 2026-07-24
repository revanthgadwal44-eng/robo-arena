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
  BOSS_MISSILE_DAMAGE,
  BOSS_MISSILE_SPEED,
  BOSS_MISSILE_SPLASH_RADIUS,
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
};

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

    this._movement = new THREE.Vector3();
    this._originalPosition = new THREE.Vector3();
    this._testPosition = new THREE.Vector3();
    this._chargeDirection = new THREE.Vector3();
    this._leftShoulderWorld = new THREE.Vector3();
    this._rightShoulderWorld = new THREE.Vector3();

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
    return { health: this.boss.health, maxHealth: this.boss.mesh.userData.maxHealth };
  }

  spawn(playerPosition) {
    if (this.boss) {
      return this.boss;
    }

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
    this._state = BOSS_STATES.CHASE;
    this._stateTimer = 0;
    this._shotsRemaining = 0;
    this._shootTimer = 0;
    this._didChargeDamage = false;
    this._pendingDamage = 0;
    this._chargePhase = 'windup';
    this._missilesLaunched = false;
    return this.boss;
  }

  update(delta, playerPosition, handlers = {}) {
    if (!this.boss) {
      this._warningLight.visible = false;
      return 0;
    }

    this._stateTimer += delta;
    const distance = this.boss.mesh.position.distanceTo(playerPosition);

    switch (this._state) {
      case BOSS_STATES.CHASE:
        this.boss.setChargeWarning(false);
        this._warningLight.visible = false;
        this._moveToward(playerPosition, this.boss.mesh.userData.speed);
        if (this._stateTimer >= BOSS_CHASE_MIN_DURATION_SECONDS) {
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
        }
        if (this._shotsRemaining > 0 && this._shootTimer >= BOSS_SHOT_COOLDOWN_SECONDS) {
          this._shootTimer = 0;
          this._shotsRemaining -= 1;
          this._shootAt(playerPosition, handlers.onShoot);
        }
        if (this._shotsRemaining === 0) {
          this._setState(BOSS_STATES.COOLDOWN);
        }
        break;
      case BOSS_STATES.CHARGE:
        this._updateCharge(delta, playerPosition, handlers);
        break;
      case BOSS_STATES.COOLDOWN:
      default:
        this.boss.setChargeWarning(false);
        this._warningLight.visible = false;
        if (this._stateTimer >= BOSS_COOLDOWN_SECONDS) {
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
      this._warningLight.position.copy(this.boss.mesh.position).add(new THREE.Vector3(0, 2.8, 0));
      if (this._stateTimer >= BOSS_CHARGE_WINDUP_SECONDS) {
        this._stateTimer = 0;
        this._chargePhase = 'dash';
        this.boss.setChargeWarning(false);
        handlers.onCameraShake?.(0.55);
      }
      return;
    }

    this._warningLight.visible = false;
    this._moveTowardDirection(this._chargeDirection, BOSS_CHARGE_SPEED);
    const distance = this.boss.mesh.position.distanceTo(playerPosition);
    if (!this._didChargeDamage && distance <= BOSS_MELEE_RANGE + 0.6) {
      this._didChargeDamage = true;
      this._setState(BOSS_STATES.COOLDOWN);
      this._pendingDamage += BOSS_CHARGE_DAMAGE;
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
    this._setState(BOSS_STATES.CHASE);
  }

  clearAll() {
    this.removeBoss();
  }

  _setState(state) {
    this._state = state;
    this._stateTimer = 0;
  }

  _startShooting() {
    this._setState(BOSS_STATES.SHOOT);
    this._shotsRemaining = BOSS_SHOTS_PER_BURST;
    this._shootTimer = BOSS_SHOT_COOLDOWN_SECONDS;
    this._missilesLaunched = false;
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
    bulletMesh.position.copy(this.boss.mesh.position).add(new THREE.Vector3(0, 0.7, 0));
    bulletMesh.castShadow = true;
    this.scene.add(bulletMesh);

    const direction = playerPosition.clone().sub(bulletMesh.position).normalize();
    onShoot(new Bullet(bulletMesh, direction, this.boss.mesh.userData.damage, {
      speed: 0.16,
      radius: BULLET_RADIUS * 1.6,
      trailType: 'energy',
      explosionSize: 1.2,
    }));
  }

  _launchMissiles(playerPosition, onShoot) {
    if (!this.boss || !onShoot) {
      return;
    }
    this.boss.getShoulderWorldPositions(this._leftShoulderWorld, this._rightShoulderWorld);
    this._spawnMissile(this._leftShoulderWorld, playerPosition, onShoot);
    this._spawnMissile(this._rightShoulderWorld, playerPosition, onShoot);
  }

  _spawnMissile(origin, playerPosition, onShoot) {
    const missileMesh = new THREE.Mesh(MISSILE_GEOMETRY, MISSILE_MATERIAL);
    missileMesh.rotation.x = Math.PI / 2;
    missileMesh.position.copy(origin);
    missileMesh.castShadow = true;
    this.scene.add(missileMesh);
    const direction = playerPosition.clone().sub(origin).normalize();
    onShoot(new Bullet(missileMesh, direction, BOSS_MISSILE_DAMAGE, {
      speed: BOSS_MISSILE_SPEED,
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
