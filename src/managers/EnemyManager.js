import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { Bullet } from '../entities/Bullet.js';
import {
  ENEMY_SPAWN_WEIGHTS,
  ENEMY_SHOOT_INTERVAL,
  ENEMY_BULLET_COLOR,
  BULLET_RADIUS,
  ENEMY_CHASE_STOP_DISTANCE,
  ENEMY_MELEE_RANGE,
} from '../constants.js';

/** Shared bullet geometry/material for enemy shots — mesh is still created per shot. */
const ENEMY_BULLET_GEOMETRY = new THREE.SphereGeometry(BULLET_RADIUS);
const ENEMY_BULLET_MATERIAL = new THREE.MeshStandardMaterial({ color: ENEMY_BULLET_COLOR });

/**
 * Manages enemy lifecycle, AI updates, and periodic enemy shooting.
 */
export class EnemyManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {Enemy[]} */
    this.enemies = [];
    this._shootIntervalId = null;
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
   * Spawns an enemy at world coordinates.
   * @param {number} x
   * @param {number} z
   * @param {string} [type] — defaults to weighted random pick
   */
  spawn(x, z, type = this._pickRandomType()) {
    const enemy = new Enemy(this.scene, x, z, type);
    this.enemies.push(enemy);
    return enemy;
  }

  /** Initial wave setup — three fixed spawn positions from original game. */
  spawnInitialEnemies() {
    this.spawn(5, 0);
    this.spawn(-5, 5);
    this.spawn(0, -6);
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
      const isTooClose = distance <= ENEMY_MELEE_RANGE;
      const shouldChase = distance > ENEMY_CHASE_STOP_DISTANCE || isTooClose;

      if (shouldChase) {
        enemy.chase(playerPosition);
      }

      enemy.updateHealthBar(camera);
      meleeDamage += enemy.getMeleeDamage(playerPosition);
    }
    return meleeDamage;
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
