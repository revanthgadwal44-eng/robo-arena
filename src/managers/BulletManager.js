import * as THREE from 'three';
import { Bullet } from '../entities/Bullet.js';
import {
  BULLET_RADIUS,
  BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_DAMAGE,
  ENEMY_COLLISION_RADIUS,
  PLAYER_BULLET_COLOR,
  ARENA_HALF,
} from '../constants.js';

/** Shared geometry/material for player shots. */
const PLAYER_BULLET_GEOMETRY = new THREE.SphereGeometry(BULLET_RADIUS);
const PLAYER_BULLET_MATERIAL = new THREE.MeshStandardMaterial({ color: PLAYER_BULLET_COLOR });

/**
 * Manages player and enemy bullets — creation, movement, collisions, and cleanup.
 */
export class BulletManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {Bullet[]} */
    this.playerBullets = [];
    /** @type {Bullet[]} */
    this.enemyBullets = [];

    /** Reused each frame to avoid direction.clone() during movement. */
    this._movement = new THREE.Vector3();
  }

  /** Fires a player bullet from the given origin along direction. */
  shootPlayer(origin, direction) {
    const bulletMesh = new THREE.Mesh(PLAYER_BULLET_GEOMETRY, PLAYER_BULLET_MATERIAL);
    bulletMesh.position.copy(origin);
    this.scene.add(bulletMesh);
    this.playerBullets.push(new Bullet(bulletMesh, direction));
  }

  /** Registers an enemy bullet created by EnemyManager. */
  addEnemyBullet(bullet) {
    this.enemyBullets.push(bullet);
  }

  /**
   * Moves player bullets and resolves enemy hits.
   * Cleans up bullets that leave the arena bounds.
   * @returns {number} kill count from this frame
   */
  updatePlayerBullets(enemies, onEnemyKilled) {
    let kills = 0;

    for (const bullet of this.playerBullets) {
      this._movement.copy(bullet.direction).multiplyScalar(BULLET_SPEED);
      bullet.mesh.position.add(this._movement);
    }

    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];
      let removed = false;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);

        if (distance < ENEMY_COLLISION_RADIUS) {
          const died = enemy.takeDamage();
          this._removePlayerBullet(i);

          if (died) {
            kills++;
            onEnemyKilled(enemy);
          }
          removed = true;
          break;
        }
      }

      if (!removed && this._isOutsideArena(bullet.mesh.position)) {
        this._removePlayerBullet(i);
      }
    }

    return kills;
  }

  /**
   * Moves enemy bullets, applies player hits, and cleans up out-of-arena shots.
   * Uses damage from bullet.mesh.userData (set by EnemyManager).
   * @returns {number} damage dealt to player this frame
   */
  updateEnemyBullets(playerPosition) {
    let damage = 0;

    for (const bullet of this.enemyBullets) {
      this._movement.copy(bullet.direction).multiplyScalar(ENEMY_BULLET_SPEED);
      bullet.mesh.position.add(this._movement);
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      const distance = bullet.mesh.position.distanceTo(playerPosition);

      if (distance < ENEMY_COLLISION_RADIUS) {
        // Use damage from enemy's userData (stored in bulletMesh.userData),
        // fall back to ENEMY_BULLET_DAMAGE if not set
        const bulletDamage = bullet.mesh.userData.damage ?? ENEMY_BULLET_DAMAGE;
        damage += bulletDamage;
        this._removeEnemyBullet(i);
        continue;
      }

      if (this._isOutsideArena(bullet.mesh.position)) {
        this._removeEnemyBullet(i);
      }
    }

    return damage;
  }

  /** Checks if position is outside arena bounds. */
  _isOutsideArena(position) {
    return Math.abs(position.x) > ARENA_HALF || Math.abs(position.z) > ARENA_HALF;
  }

  _removePlayerBullet(index) {
    const bullet = this.playerBullets[index];
    this.scene.remove(bullet.mesh);
    this.playerBullets.splice(index, 1);
  }

  _removeEnemyBullet(index) {
    const bullet = this.enemyBullets[index];
    this.scene.remove(bullet.mesh);
    this.enemyBullets.splice(index, 1);
  }
}
