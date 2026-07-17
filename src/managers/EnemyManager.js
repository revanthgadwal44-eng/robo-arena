import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { Bullet } from '../entities/Bullet.js';
import {
  ENEMY_SHOOT_INTERVAL,
  ENEMY_BULLET_COLOR,
  BULLET_RADIUS,
  ENEMY_SPAWN_WEIGHTS,
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
   * Spawns an enemy at world coordinates with a specific type.
   * @param {number} x
   * @param {number} z
   * @param {string} type - 'normal' | 'fast' | 'tank' (optional, defaults to weighted random)
   */
  spawn(x, z, type = null) {
    // If no type specified, use weighted random selection
    if (!type) {
      type = this._selectRandomEnemyType();
    }
    const enemy = new Enemy(this.scene, x, z, type);
    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Selects a random enemy type based on spawn weights.
   * @returns {string} 'normal' | 'fast' | 'tank'
   */
  _selectRandomEnemyType() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [type, weight] of Object.entries(ENEMY_SPAWN_WEIGHTS)) {
      cumulative += weight;
      if (rand < cumulative) {
        return type;
      }
    }

    // Fallback to normal (shouldn't happen with proper weights)
    return 'normal';
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
      const bulletMesh = new THREE.Mesh(ENEMY_BULLET_GEOMETRY, ENEMY_BULLET_MATERIAL);
      bulletMesh.position.copy(enemy.mesh.position);
      // Store damage from enemy's userData so BulletManager can access it
      bulletMesh.userData.damage = enemy.mesh.userData.damage;
      this.scene.add(bulletMesh);

      const direction = playerPosition.clone().sub(enemy.mesh.position).normalize();
      onEnemyShoot(new Bullet(bulletMesh, direction));
    }
  }

  /** Updates chase AI and returns total melee damage against the player. */
  update(playerPosition) {
    let meleeDamage = 0;
    for (const enemy of this.enemies) {
      enemy.chase(playerPosition);
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
