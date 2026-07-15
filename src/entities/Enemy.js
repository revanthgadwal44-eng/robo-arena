import * as THREE from 'three';
import {
  ENEMY_HEALTH,
  ENEMY_SPEED,
  ENEMY_MELEE_RANGE,
  ENEMY_MELEE_DAMAGE,
  ENEMY_COLOR,
  ENEMY_DAMAGED_ORANGE,
  ENEMY_DAMAGED_YELLOW,
  BULLET_DAMAGE,
  PLAYER_Y,
} from '../constants.js';

/** Shared geometry/material — cloned per enemy to preserve independent color changes. */
const ENEMY_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const ENEMY_MATERIAL = new THREE.MeshStandardMaterial({ color: ENEMY_COLOR });

/**
 * Single enemy entity with health, chase movement, and melee range check.
 */
export class Enemy {
  /**
   * @param {THREE.Scene} scene
   * @param {number} x
   * @param {number} z
   */
  constructor(scene, x, z) {
    this.mesh = new THREE.Mesh(ENEMY_GEOMETRY, ENEMY_MATERIAL.clone());
    this.mesh.position.set(x, PLAYER_Y, z);
    this.health = ENEMY_HEALTH;
    this.mesh.userData = { health: this.health };
    scene.add(this.mesh);

    /** Reused for chase direction — avoids allocating each frame. */
    this._direction = new THREE.Vector3();
  }

  /** Moves toward the player at constant speed. */
  chase(playerPosition) {
    this._direction.copy(playerPosition).sub(this.mesh.position).normalize();
    this.mesh.position.add(this._direction.multiplyScalar(ENEMY_SPEED));
  }

  /**
   * Applies bullet damage and updates damage color states.
   * @returns {boolean} true if the enemy died this hit
   */
  takeDamage(amount = BULLET_DAMAGE) {
    this.health -= amount;
    this.mesh.userData.health = this.health;

    if (this.health === 40) {
      this.mesh.material.color.set(ENEMY_DAMAGED_ORANGE);
    }
    if (this.health === 20) {
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
