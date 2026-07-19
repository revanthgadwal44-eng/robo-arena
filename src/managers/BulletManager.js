import * as THREE from 'three';
import { Bullet } from '../entities/Bullet.js';
import {
  BULLET_RADIUS,
  BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  BULLET_CLEANUP_DISTANCE,
  ENEMY_BULLET_DAMAGE,
  ENEMY_COLLISION_RADIUS,
  PLAYER_BULLET_COLOR,
  MUZZLE_FLASH_COLOR,
  MUZZLE_FLASH_DURATION,
  MUZZLE_FLASH_RADIUS,
  HIT_PARTICLE_COLOR,
  HIT_PARTICLE_COUNT,
  HIT_PARTICLE_LIFETIME,
  HIT_PARTICLE_SPEED,
} from '../constants.js';

/** Shared geometry/material for player shots. */
const PLAYER_BULLET_GEOMETRY = new THREE.SphereGeometry(BULLET_RADIUS);
const PLAYER_BULLET_MATERIAL = new THREE.MeshStandardMaterial({ color: PLAYER_BULLET_COLOR });
const MUZZLE_FLASH_GEOMETRY = new THREE.SphereGeometry(MUZZLE_FLASH_RADIUS);
const MUZZLE_FLASH_MATERIAL = new THREE.MeshBasicMaterial({ color: MUZZLE_FLASH_COLOR });
const HIT_PARTICLE_GEOMETRY = new THREE.SphereGeometry(0.05);
const HIT_PARTICLE_MATERIAL = new THREE.MeshBasicMaterial({ color: HIT_PARTICLE_COLOR, transparent: true });

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
    this._muzzleFlashes = [];
    this._hitParticles = [];

    /** Reused each frame to avoid direction.clone() during movement. */
    this._movement = new THREE.Vector3();
  }

  /** Fires a player bullet from the given origin along direction. */
  shootPlayer(origin, direction) {
    const bulletMesh = new THREE.Mesh(PLAYER_BULLET_GEOMETRY, PLAYER_BULLET_MATERIAL);
    bulletMesh.position.copy(origin);
    this.scene.add(bulletMesh);
    this.playerBullets.push(new Bullet(bulletMesh, direction));

    const flashMesh = new THREE.Mesh(MUZZLE_FLASH_GEOMETRY, MUZZLE_FLASH_MATERIAL);
    flashMesh.position.copy(origin).add(direction.clone().multiplyScalar(0.8));
    this.scene.add(flashMesh);
    this._muzzleFlashes.push({ mesh: flashMesh, life: MUZZLE_FLASH_DURATION });
  }

  /** Registers an enemy bullet created by EnemyManager. */
  addEnemyBullet(bullet) {
    this.enemyBullets.push(bullet);
  }

  /**
   * Moves player bullets and resolves enemy hits.
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
          this._spawnHitParticles(bullet.mesh.position);
          this._removePlayerBullet(i);

          if (died) {
            kills++;
            onEnemyKilled(enemy);
          }
          removed = true;
          break;
        }
      }

      if (!removed && bullet.mesh.position.length() > BULLET_CLEANUP_DISTANCE) {
        this._removePlayerBullet(i);
      }
    }

    return kills;
  }

  _spawnHitParticles(position) {
    for (let i = 0; i < HIT_PARTICLE_COUNT; i++) {
      const particleMesh = new THREE.Mesh(HIT_PARTICLE_GEOMETRY, HIT_PARTICLE_MATERIAL.clone());
      particleMesh.position.copy(position);
      this.scene.add(particleMesh);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * HIT_PARTICLE_SPEED,
        Math.random() * HIT_PARTICLE_SPEED,
        (Math.random() - 0.5) * HIT_PARTICLE_SPEED
      );

      this._hitParticles.push({ mesh: particleMesh, velocity, life: HIT_PARTICLE_LIFETIME });
    }
  }

  updateEffects(delta) {
    for (let i = this._muzzleFlashes.length - 1; i >= 0; i--) {
      const flash = this._muzzleFlashes[i];
      flash.life -= delta;
      if (flash.life <= 0) {
        this._removeMuzzleFlash(i);
      }
    }

    for (let i = this._hitParticles.length - 1; i >= 0; i--) {
      const particle = this._hitParticles[i];
      particle.life -= delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.material.opacity = Math.max(particle.life / HIT_PARTICLE_LIFETIME, 0);
      if (particle.life <= 0) {
        this._removeHitParticle(i);
      }
    }
  }

  /**
   * Moves enemy bullets, applies player hits, and cleans up out-of-range shots.
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
        damage += bullet.damage ?? ENEMY_BULLET_DAMAGE;
        this._removeEnemyBullet(i);
        continue;
      }

      if (bullet.mesh.position.length() > BULLET_CLEANUP_DISTANCE) {
        this._removeEnemyBullet(i);
      }
    }

    return damage;
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

  _removeMuzzleFlash(index) {
    const flash = this._muzzleFlashes[index];
    this.scene.remove(flash.mesh);
    this._muzzleFlashes.splice(index, 1);
  }

  _removeHitParticle(index) {
    const particle = this._hitParticles[index];
    this.scene.remove(particle.mesh);
    this._hitParticles.splice(index, 1);
  }
}
