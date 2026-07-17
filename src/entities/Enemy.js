import * as THREE from 'three';
import {
  ENEMY_TYPES,
  ENEMY_TYPE_STATS,
  ENEMY_MELEE_RANGE,
  ENEMY_MELEE_DAMAGE,
  ENEMY_DAMAGED_ORANGE,
  ENEMY_DAMAGED_YELLOW,
  BULLET_DAMAGE,
  PLAYER_Y,
} from '../constants.js';

/** Shared geometry/material — cloned per enemy to preserve independent color changes. */
const ENEMY_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const ENEMY_MATERIAL = new THREE.MeshStandardMaterial();

/**
 * Single enemy entity with health, chase movement, and melee range check.
 */
export class Enemy {
  /**
   * @param {THREE.Scene} scene
   * @param {number} x
   * @param {number} z
   * @param {string} [type='normal']
   */
  constructor(scene, x, z, type = ENEMY_TYPES.NORMAL) {
    const stats = ENEMY_TYPE_STATS[type] ?? ENEMY_TYPE_STATS[ENEMY_TYPES.NORMAL];

    this.mesh = new THREE.Mesh(ENEMY_GEOMETRY, ENEMY_MATERIAL.clone());
    this.mesh.material.color.set(stats.color);
    this.mesh.position.set(x, PLAYER_Y, z);

    this.health = stats.health;
    this.mesh.userData = {
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      type,
    };

    scene.add(this.mesh);

    /** Reused for chase direction — avoids allocating each frame. */
    this._direction = new THREE.Vector3();
  }

  /** Moves toward the player at speed stored in userData. */
  chase(playerPosition) {
    this._direction.copy(playerPosition).sub(this.mesh.position).normalize();
    this.mesh.position.add(this._direction.multiplyScalar(this.mesh.userData.speed));
  }

  /**
   * Applies bullet damage and updates damage color states.
   * @returns {boolean} true if the enemy died this hit
   */
  takeDamage(amount = BULLET_DAMAGE) {
    this.health -= amount;
    this.mesh.userData.health = this.health;

    const { maxHealth } = this.mesh.userData;

    if (this.health <= maxHealth * 0.8) {
      this.mesh.material.color.set(ENEMY_DAMAGED_ORANGE);
    }
    if (this.health <= maxHealth * 0.4) {
      this.mesh.material.color.set(ENEMY_DAMAGED_YELLOW);
    }

    return this.health <= 0;
  }

  /** Returns melee damage to apply to the player when in range, else 0. */
  getMeleeDamage(playerPosition) {
    const distance = this.mesh.position.distanceTo(playerPosition);
    return distance < ENEMY_MELEE_RANGE ? ENEMY_MELEE_DAMAGE : 0;
  }

  /** Removes mesh from scene. */
  dispose(scene) {
    scene.remove(this.mesh);
  }
}
