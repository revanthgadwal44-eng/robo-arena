import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { Bullet } from '../entities/Bullet.js';
import { findValidSpawnPosition } from './findValidSpawnPosition.js';
import {
  ENEMY_SPAWN_WEIGHTS,
  ENEMY_SHOOT_INTERVAL,
  ENEMY_BULLET_COLOR,
  BULLET_RADIUS,
  ENEMY_CHASE_STOP_DISTANCE,
  ENEMY_MELEE_RANGE,
  ENEMY_COLLISION_RADIUS,
  PLAYER_COLLISION_RADIUS,
  ENEMY_SPAWN_ATTEMPTS,
  ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  ENEMY_STATES,
  ENEMY_AVOIDANCE_RADIUS,
  ENEMY_LOS_CHECK_INTERVAL_SECONDS,
} from '../constants.js';

/** Shared bullet geometry/material for enemy shots — mesh is still created per shot. */
const ENEMY_BULLET_GEOMETRY = new THREE.SphereGeometry(BULLET_RADIUS);
const ENEMY_BULLET_MATERIAL = new THREE.MeshStandardMaterial({ color: ENEMY_BULLET_COLOR });
const BLOCKED_TURN_RADIANS = 0.35;
const ENEMY_INITIAL_COUNT = 3;

/**
 * Manages enemy lifecycle, AI updates, and periodic enemy shooting.
 */
export class EnemyManager {
  /** @param {THREE.Scene} scene */
  constructor(scene, obstacleManager) {
   this.scene = scene;
   this.obstacleManager = obstacleManager;
   /** @type {Enemy[]} */
   this.enemies = [];
   this._shootIntervalId = null;
   this._movement = new THREE.Vector3();
   this._desiredDirection = new THREE.Vector3();
   this._avoidance = new THREE.Vector3();
   this._originalPosition = new THREE.Vector3();
   this._stepA = new THREE.Vector3();
   this._stepB = new THREE.Vector3();
   this._testPosition = new THREE.Vector3();
   this._obstacleCenter = new THREE.Vector3();
   this._upAxis = new THREE.Vector3(0, 1, 0);
   this._getPlayerPosition = null;
   this._shootingEnabled = true;
   this._healthBarTick = 0;
  }

  setPlayerPositionProvider(getPlayerPosition) {
   this._getPlayerPosition = getPlayerPosition;
  }

  /**
   * Picks an enemy type using weighted random selection.
   * @returns {string}
   */
  _pickRandomType() {
   const roll = Math.random();
   let cumulative = 0;

   for (const { type, weight } of ENEMY_SPAWN_WEIGHTS) {
     cumulative += weight;
     if (roll < cumulative) {
       return type;
     }
   }

   return ENEMY_SPAWN_WEIGHTS[0].type;
  }

  /**
   * Spawns an enemy at a valid random position.
   * @param {string} [type] — defaults to weighted random pick
   */
  spawn(type = this._pickRandomType()) {
   const playerPosition = this._getPlayerPosition ? this._getPlayerPosition() : null;
   const position = findValidSpawnPosition({
     obstacleManager: this.obstacleManager,
     radius: ENEMY_COLLISION_RADIUS,
     playerPosition,
     playerRadius: PLAYER_COLLISION_RADIUS,
     minPlayerDistance: ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
     colliders: this.enemies.map((enemy) => ({
       position: enemy.mesh.position,
       radius: ENEMY_COLLISION_RADIUS,
     })),
     maxAttempts: ENEMY_SPAWN_ATTEMPTS,
   });

   if (!position) {
     return null;
   }

   const enemy = new Enemy(this.scene, position.x, position.z, type);
   enemy.losCooldown = 0;
   this.enemies.push(enemy);
   return enemy;
  }

  /** Initial wave setup — three enemies, now using validated spawn points. */
  spawnInitialEnemies() {
   for (let i = 0; i < ENEMY_INITIAL_COUNT; i++) {
     this.spawn();
   }
  }

  /** Starts the enemy shoot timer — one volley per second from all enemies. */
  startShooting(getPlayerPosition, onEnemyShoot) {
   this._shootIntervalId = setInterval(() => {
     this._enemyShoot(getPlayerPosition(), onEnemyShoot);
   }, ENEMY_SHOOT_INTERVAL);
  }

  /** @param {THREE.Vector3} playerPosition */
  _enemyShoot(playerPosition, onEnemyShoot) {
   if (!this._shootingEnabled) {
     return;
   }

   for (const enemy of this.enemies) {
     if (enemy.state !== ENEMY_STATES.ATTACK || enemy.isDead) {
       continue;
     }

     const dx = enemy.mesh.position.x - playerPosition.x;
     const dy = enemy.mesh.position.y - playerPosition.y;
     const dz = enemy.mesh.position.z - playerPosition.z;
     const distanceSq = dx * dx + dy * dy + dz * dz;
     if (distanceSq > ENEMY_CHASE_STOP_DISTANCE * ENEMY_CHASE_STOP_DISTANCE) {
       continue;
     }

     if (enemy.attackCooldown > 0) {
       continue;
     }

     if (!this.hasLineOfSight(enemy.mesh.position, playerPosition)) {
       continue;
     }

     const bulletMesh = new THREE.Mesh(ENEMY_BULLET_GEOMETRY, ENEMY_BULLET_MATERIAL);
     bulletMesh.position.copy(enemy.mesh.position);
     this.scene.add(bulletMesh);

     const direction = playerPosition.clone().sub(enemy.mesh.position).normalize();
     const { damage } = enemy.mesh.userData;
     enemy.attackCooldown = enemy.mesh.userData.attackCooldown * 1000;
     onEnemyShoot(new Bullet(bulletMesh, direction, damage));
   }
  }

  /** Updates chase AI and returns total melee damage against the player. */
  update(playerPosition, camera, delta = 1 / 60) {
   let meleeDamage = 0;
   for (const enemy of this.enemies) {
     if (enemy.state === ENEMY_STATES.DEAD) {
       continue;
     }

     enemy.updateTimers(delta);
     const dx = enemy.mesh.position.x - playerPosition.x;
     const dy = enemy.mesh.position.y - playerPosition.y;
     const dz = enemy.mesh.position.z - playerPosition.z;
     const distanceSq = dx * dx + dy * dy + dz * dz;
     const detectionRangeSq = enemy.mesh.userData.detectionRange * enemy.mesh.userData.detectionRange;
     const attackRangeSq = enemy.mesh.userData.attackRange * enemy.mesh.userData.attackRange;

     if (enemy.state === ENEMY_STATES.IDLE && distanceSq <= detectionRangeSq) {
       enemy.setState(ENEMY_STATES.CHASE);
     }

     if (enemy.state === ENEMY_STATES.HURT && enemy.hurtTimer <= 0) {
       enemy.setState(distanceSq <= attackRangeSq ? ENEMY_STATES.ATTACK : ENEMY_STATES.CHASE);
     }

     if (enemy.state === ENEMY_STATES.CHASE) {
       if (distanceSq <= attackRangeSq) {
         enemy.setState(ENEMY_STATES.ATTACK);
       } else {
         this._moveEnemy(enemy, playerPosition);
       }
     }

     if (enemy.state === ENEMY_STATES.ATTACK) {
       this._faceTowards(enemy, playerPosition);
       if (distanceSq > attackRangeSq + 0.25) {
         enemy.setState(ENEMY_STATES.CHASE);
       }
     }

     meleeDamage += enemy.getMeleeDamage(playerPosition);
   }

   this._healthBarTick += 1;
   if (this._healthBarTick % 2 === 0) {
     for (const enemy of this.enemies) {
       enemy.updateHealthBar(camera);
     }
   }
   return meleeDamage;
  }

  _moveEnemy(enemy, targetPosition) {
   this._movement.copy(targetPosition).sub(enemy.mesh.position);
   this._movement.y = 0;
   if (this._movement.lengthSq() === 0) {
     return;
   }

   this._desiredDirection.copy(this._movement).normalize();
   const speed = enemy.mesh.userData.speed;
   const avoidancePower = 1.4;
   this._avoidance.set(0, 0, 0);

   if (this.obstacleManager) {
     for (const obstacle of this.obstacleManager.obstacles) {
       const center = obstacle.boundingBox.getCenter(this._obstacleCenter);
       const dx = enemy.mesh.position.x - center.x;
       const dz = enemy.mesh.position.z - center.z;
       const distanceSq = dx * dx + dz * dz;
       const radius = Math.max(obstacle.size.x, obstacle.size.z) * 0.7 + ENEMY_COLLISION_RADIUS + ENEMY_AVOIDANCE_RADIUS;
       if (distanceSq < radius * radius) {
         const distance = Math.sqrt(distanceSq) || 0.0001;
         const influence = (1 - distance / radius) * avoidancePower;
         this._avoidance.x += (dx / distance) * influence;
         this._avoidance.z += (dz / distance) * influence;
       }
     }
    }

   if (this._avoidance.lengthSq() > 0) {
     this._avoidance.normalize();
     this._desiredDirection.add(this._avoidance).normalize();
   }

   this._originalPosition.copy(enemy.mesh.position);
   this._movement.copy(this._desiredDirection).multiplyScalar(speed);
   if (this._tryStep(enemy, this._movement)) {
     return;
   }

   this._stepA.set(this._movement.x, 0, 0);
   if (this._tryStep(enemy, this._stepA)) {
     return;
   }

   this._stepA.set(0, 0, this._movement.z);
   if (this._tryStep(enemy, this._stepA)) {
     return;
   }

   this._stepA.set(-this._movement.z, 0, this._movement.x).normalize().multiplyScalar(speed);
   if (this._tryStep(enemy, this._stepA)) {
     return;
   }

   this._stepB.copy(this._stepA).multiplyScalar(-1);
   if (this._tryStep(enemy, this._stepB)) {
     return;
   }

   this._stepA.copy(this._movement).applyAxisAngle(this._upAxis, BLOCKED_TURN_RADIANS);
   if (this._tryStep(enemy, this._stepA)) {
     return;
   }

   this._stepB.copy(this._movement).applyAxisAngle(this._upAxis, -BLOCKED_TURN_RADIANS);
   this._tryStep(enemy, this._stepB);
  }

  _faceTowards(enemy, targetPosition) {
   const dx = targetPosition.x - enemy.mesh.position.x;
   const dz = targetPosition.z - enemy.mesh.position.z;
   if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) {
     return;
   }
   enemy.mesh.rotation.y = Math.atan2(dx, dz);
  }

  _tryStep(enemy, step) {
   this._testPosition.copy(this._originalPosition).add(step);
   if (this._isBlocked(this._testPosition)) {
     return false;
   }
   enemy.mesh.position.copy(this._testPosition);
   return true;
  }

  _isBlocked(position) {
   if (!this.obstacleManager) {
     return false;
   }
   return this.obstacleManager.isCircleBlocked(position, ENEMY_COLLISION_RADIUS);
  }

  hasLineOfSight(from, to) {
   if (!this.obstacleManager) {
     return true;
   }

   for (const obstacle of this.obstacleManager.obstacles) {
     if (this._segmentIntersectsBox(from, to, obstacle.boundingBox)) {
       return false;
     }
   }

   return true;
  }

  _segmentIntersectsBox(start, end, box) {
   const dirX = end.x - start.x;
   const dirY = end.y - start.y;
   const dirZ = end.z - start.z;
   let tMin = 0;
   let tMax = 1;

   const checkAxis = (axis, min, max, dir) => {
     if (Math.abs(dir) < 1e-6) {
       if (start[axis] < min || start[axis] > max) {
         return false;
       }
       return true;
     }

     const inv = 1 / dir;
     let t1 = (min - start[axis]) * inv;
     let t2 = (max - start[axis]) * inv;
     if (t1 > t2) {
       const swap = t1;
       t1 = t2;
       t2 = swap;
     }
     if (t1 > tMax || t2 < tMin) {
       return false;
     }
     tMin = Math.max(tMin, t1);
     tMax = Math.min(tMax, t2);
     return true;
   };

   if (!checkAxis('x', box.min.x, box.max.x, dirX)) {
     return false;
   }
   if (!checkAxis('y', box.min.y, box.max.y, dirY)) {
     return false;
   }
   if (!checkAxis('z', box.min.z, box.max.z, dirZ)) {
     return false;
   }

   return tMin <= tMax && tMax >= 0 && tMin <= 1;
  }

  /** @returns {Enemy[]} */
  getEnemies() {
   return this.enemies;
  }

  /** @returns {number} */
  get count() {
   return this.enemies.length;
  }

  /** Removes a dead enemy from the active list and scene. */
  remove(enemy) {
   const index = this.enemies.indexOf(enemy);
   if (index !== -1) {
     enemy.dispose(this.scene);
     this.enemies.splice(index, 1);
   }
  }

  setShootingEnabled(enabled) {
   this._shootingEnabled = enabled;
  }

  clearAll() {
   for (let i = this.enemies.length - 1; i >= 0; i--) {
     this.enemies[i].dispose(this.scene);
   }
   this.enemies = [];
  }
}
