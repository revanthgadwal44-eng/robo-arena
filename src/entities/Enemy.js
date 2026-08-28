import * as THREE from 'three';
import {
  ENEMY_TYPES,
  ENEMY_TYPE_STATS,
  ENEMY_MELEE_RANGE,
  ENEMY_MELEE_DAMAGE,
  ENEMY_DAMAGED_ORANGE,
  ENEMY_DAMAGED_YELLOW,
  ENEMY_FLASH_COLOR,
  ENEMY_STATES,
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
   this.mesh.castShadow = true;
   this.mesh.receiveShadow = true;

   this.health = stats.health;
   this.mesh.userData = {
     health: stats.health,
     maxHealth: stats.health,
     speed: stats.speed,
     damage: stats.damage,
     type,
     color: stats.color,
     attackRange: stats.attackRange,
     attackCooldown: stats.attackCooldown,
     detectionRange: stats.detectionRange,
     hurtDuration: stats.hurtDuration,
     knockback: stats.knockback,
   };

   this.state = ENEMY_STATES.IDLE;
   this.stateTimer = 0;
   this.hurtTimer = 0;
   this.attackCooldown = 0;
   this.isDead = false;
   this._direction = new THREE.Vector3();
   this._knockback = new THREE.Vector3();

   scene.add(this.mesh);

   this._healthBar = this._createHealthBar();
   scene.add(this._healthBar);
  }

  setState(nextState) {
   if (this.state === nextState) {
     return;
   }
   this.state = nextState;
   this.stateTimer = 0;
   if (nextState === ENEMY_STATES.HURT) {
     this.hurtTimer = this.mesh.userData.hurtDuration;
   }
  }

  updateTimers(delta = 0) {
   if (this.state === ENEMY_STATES.DEAD) {
     return;
   }

   this.stateTimer += delta;
   if (this.state === ENEMY_STATES.HURT) {
     this.hurtTimer = Math.max(0, this.hurtTimer - delta);
     if (this.hurtTimer <= 0) {
       this.setState(ENEMY_STATES.IDLE);
     }
   }

   if (this.attackCooldown > 0) {
     this.attackCooldown = Math.max(0, this.attackCooldown - delta * 1000);
   }
  }

  /** Moves toward the player at speed stored in userData. */
  chase(playerPosition) {
   this._direction.copy(playerPosition).sub(this.mesh.position);
   this._direction.y = 0;
   if (this._direction.lengthSq() === 0) {
     return;
   }
   this._direction.normalize().multiplyScalar(this.mesh.userData.speed);
   this.mesh.position.add(this._direction);
  }

  _createHealthBar() {
   const group = new THREE.Group();

   const background = new THREE.Mesh(
     new THREE.PlaneGeometry(1.2, 0.18),
     new THREE.MeshBasicMaterial({ color: 0x222222 })
   );
   background.position.set(0, 1.4, 0);
   group.add(background);

   this._healthFill = new THREE.Mesh(
     new THREE.PlaneGeometry(1.1, 0.12),
     new THREE.MeshBasicMaterial({ color: 0x00cc00 })
    );
   this._healthFill.position.set(0, 1.4, 0.01);
   group.add(this._healthFill);

   return group;
  }

  _syncDamageColor() {
   if (this.state === ENEMY_STATES.HURT) {
     this.mesh.material.color.set(ENEMY_FLASH_COLOR);
     return;
   }

   const maxHealth = this.mesh.userData.maxHealth;
   if (this.health <= maxHealth * 0.4) {
     this.mesh.material.color.set(ENEMY_DAMAGED_YELLOW);
   } else if (this.health <= maxHealth * 0.8) {
     this.mesh.material.color.set(ENEMY_DAMAGED_ORANGE);
   } else {
     this.mesh.material.color.set(this.mesh.userData.color);
   }
  }

  /**
   * Applies bullet damage and updates damage color states.
   * @returns {boolean} true if the enemy died this hit
   */
  takeDamage(amount = BULLET_DAMAGE, knockbackDirection = null) {
   this.health -= amount;
   this.mesh.userData.health = this.health;

   if (knockbackDirection) {
     this._knockback.copy(knockbackDirection).setLength(this.mesh.userData.knockback || 0.4);
     this.mesh.position.add(this._knockback);
   }

   if (this.health <= 0) {
     this.health = 0;
     this.mesh.userData.health = 0;
     this.isDead = true;
     this.setState(ENEMY_STATES.DEAD);
     this._syncDamageColor();
     return true;
   }

   this.setState(ENEMY_STATES.HURT);
   this._syncDamageColor();
   return false;
  }

  /** Returns melee damage to apply to the player when in range, else 0. */
  getMeleeDamage(playerPosition) {
   const dx = this.mesh.position.x - playerPosition.x;
   const dy = this.mesh.position.y - playerPosition.y;
   const dz = this.mesh.position.z - playerPosition.z;
   const distanceSq = dx * dx + dy * dy + dz * dz;
   return distanceSq < ENEMY_MELEE_RANGE * ENEMY_MELEE_RANGE ? ENEMY_MELEE_DAMAGE : 0;
  }

  updateHealthBar(camera) {
   const maxHealth = this.mesh.userData.maxHealth;
   const healthRatio = Math.max(this.health / maxHealth, 0);

   this._healthFill.scale.x = healthRatio;
   this._healthFill.position.x = -(1 - healthRatio) * 0.5 * 1.1;

   this._healthBar.position.set(
     this.mesh.position.x,
     this.mesh.position.y + 1.5,
     this.mesh.position.z
   );
   this._healthBar.lookAt(camera.position);
  }

  /** Removes mesh from scene. */
  dispose(scene) {
   scene.remove(this.mesh);
   scene.remove(this._healthBar);
  }
}
