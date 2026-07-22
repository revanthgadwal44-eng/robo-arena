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
    this._originalPosition = new THREE.Vector3();
    this._stepA = new THREE.Vector3();
    this._stepB = new THREE.Vector3();
    this._testPosition = new THREE.Vector3();
    this._upAxis = new THREE.Vector3(0, 1, 0);
    this._getPlayerPosition = null;
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
    for (const enemy of this.enemies) {
      const distance = enemy.mesh.position.distanceTo(playerPosition);
      if (distance > ENEMY_CHASE_STOP_DISTANCE) {
        continue;
      }

      const bulletMesh = new THREE.Mesh(ENEMY_BULLET_GEOMETRY, ENEMY_BULLET_MATERIAL);
      bulletMesh.position.copy(enemy.mesh.position);
      this.scene.add(bulletMesh);

      const direction = playerPosition.clone().sub(enemy.mesh.position).normalize();
      const { damage } = enemy.mesh.userData;
      onEnemyShoot(new Bullet(bulletMesh, direction, damage));
    }
  }

  /** Updates chase AI and returns total melee damage against the player. */
  update(playerPosition, camera) {
    let meleeDamage = 0;
    for (const enemy of this.enemies) {
      const distance = enemy.mesh.position.distanceTo(playerPosition);
      const shouldChase = distance > ENEMY_MELEE_RANGE;

      if (shouldChase) {
        this._moveEnemy(enemy, playerPosition);
      }

      enemy.updateHealthBar(camera);
      meleeDamage += enemy.getMeleeDamage(playerPosition);
    }
    return meleeDamage;
  }
 
  _moveEnemy(enemy, targetPosition) {
    this._movement.copy(targetPosition).sub(enemy.mesh.position);
    this._movement.y = 0;
    if (this._movement.lengthSq() === 0) {
      return;
    }
    this._movement.normalize().multiplyScalar(enemy.mesh.userData.speed);

    this._originalPosition.copy(enemy.mesh.position);
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

    this._stepA.set(-this._movement.z, 0, this._movement.x).normalize().multiplyScalar(enemy.mesh.userData.speed);
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
}
