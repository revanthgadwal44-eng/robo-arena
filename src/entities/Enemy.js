import * as THREE from 'three';
import {
  ENEMY_MELEE_RANGE,
  ENEMY_MELEE_DAMAGE,
  ENEMY_DAMAGED_ORANGE,
  ENEMY_DAMAGED_YELLOW,
  BULLET_DAMAGE,
  PLAYER_Y,
  ENEMY_TYPES,
  ARENA_HALF,
} from '../constants.js';

/** Shared geometry/material — cloned per enemy to preserve independent color changes. */
const ENEMY_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

/**
 * Single enemy entity with health, chase movement, and melee range check.
 * Each enemy has a type with associated stats (health, speed, damage).
 */
export class Enemy {
  /**
   * @param {THREE.Scene} scene
   * @param {number} x
   * @param {number} z
   * @param {string} type - 'normal' | 'fast' | 'tank'
   */
  constructor(scene, x, z, type = 'normal') {
    const typeStats = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
    const material = new THREE.MeshStandardMaterial({ color: typeStats.color });

    this.mesh = new THREE.Mesh(ENEMY_GEOMETRY, material);
    this.mesh.position.set(x, PLAYER_Y, z);

    // Store all stats in userData for easy access and modification
    this.mesh.userData = {
      type,
      health: typeStats.health,
      maxHealth: typeStats.health,
      speed: typeStats.speed,
      damage: typeStats.damage,
    };

    scene.add(this.mesh);

    /** Reused for chase direction — avoids allocating each frame. */
    this._direction = new THREE.Vector3();
  }

  /** Moves toward the player using speed from userData, clamped to arena bounds. */
  chase(playerPosition) {
    this._direction.copy(playerPosition).sub(this.mesh.position).normalize();
    this.mesh.position.add(
      this._direction.multiplyScalar(this.mesh.userData.speed)
    );

    // Clamp position to arena bounds
    const max = ARENA_HALF - 1;
    const min = -ARENA_HALF + 1;
    this.mesh.position.x = Math.max(min, Math.min(max, this.mesh.position.x));
    this.mesh.position.z = Math.max(min, Math.min(max, this.mesh.position.z));
  }

  /**
   * Applies bullet damage and updates damage color states.
   * @returns {boolean} true if the enemy died this hit
   */
  takeDamage(amount = BULLET_DAMAGE) {
    this.mesh.userData.health -= amount;

    if (this.mesh.userData.health === 40) {
      this.mesh.material.color.set(ENEMY_DAMAGED_ORANGE);
    }
    if (this.mesh.userData.health === 20) {
      this.mesh.material.color.set(ENEMY_DAMAGED_YELLOW);
    }

    return this.mesh.userData.health <= 0;
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
