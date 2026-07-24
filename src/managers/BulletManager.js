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
} from '../constants.js';

const PLAYER_BULLET_GEOMETRY = new THREE.SphereGeometry(BULLET_RADIUS * 1.15, 10, 10);
const PLAYER_BULLET_MATERIAL = new THREE.MeshStandardMaterial({
  color: PLAYER_BULLET_COLOR,
  emissive: 0xbb9d33,
  emissiveIntensity: 0.45,
  roughness: 0.3,
  metalness: 0.25,
});
const TRAIL_GEOMETRY = new THREE.SphereGeometry(0.08, 8, 8);
const SPARK_GEOMETRY = new THREE.SphereGeometry(0.07, 8, 8);
const SMOKE_GEOMETRY = new THREE.SphereGeometry(0.25, 8, 8);
const FLASH_GEOMETRY = new THREE.SphereGeometry(MUZZLE_FLASH_RADIUS * 2.2, 10, 10);
const SHOCKWAVE_GEOMETRY = new THREE.RingGeometry(0.5, 0.7, 24);

function createPool(scene, size, meshFactory) {
  const entries = [];
  for (let i = 0; i < size; i++) {
    const mesh = meshFactory();
    mesh.visible = false;
    scene.add(mesh);
    entries.push({
      mesh,
      life: 0,
      maxLife: 1,
      velocity: new THREE.Vector3(),
      scaleVelocity: 0,
      fadeOnly: false,
      active: false,
    });
  }
  return entries;
}

export class BulletManager {
  constructor(scene, obstacleManager) {
    this.scene = scene;
    this.obstacleManager = obstacleManager;
    this.playerBullets = [];
    this.enemyBullets = [];

    this._movement = new THREE.Vector3();
    this._trailDirection = new THREE.Vector3();
    this._upDirection = new THREE.Vector3(0, 1, 0);

    this._flashPool = createPool(scene, 20, () => {
      const material = new THREE.MeshBasicMaterial({ color: MUZZLE_FLASH_COLOR, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(FLASH_GEOMETRY, material);
      return mesh;
    });
    this._trailPool = createPool(scene, 180, () => {
      const material = new THREE.MeshBasicMaterial({ color: 0xffd76e, transparent: true, opacity: 0 });
      return new THREE.Mesh(TRAIL_GEOMETRY, material);
    });
    this._sparkPool = createPool(scene, 220, () => {
      const material = new THREE.MeshBasicMaterial({ color: 0xff9b4a, transparent: true, opacity: 0 });
      return new THREE.Mesh(SPARK_GEOMETRY, material);
    });
    this._smokePool = createPool(scene, 140, () => {
      const material = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.9,
        metalness: 0.08,
        transparent: true,
        opacity: 0,
      });
      return new THREE.Mesh(SMOKE_GEOMETRY, material);
    });
    this._shockwavePool = createPool(scene, 8, () => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xff8440,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(SHOCKWAVE_GEOMETRY, material);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    });
  }

  shootPlayer(origin, direction) {
    const bulletMesh = new THREE.Mesh(PLAYER_BULLET_GEOMETRY, PLAYER_BULLET_MATERIAL);
    bulletMesh.position.copy(origin);
    bulletMesh.castShadow = true;
    this.scene.add(bulletMesh);
    this.playerBullets.push(new Bullet(bulletMesh, direction, undefined, {
      trailType: 'player',
      speed: BULLET_SPEED,
      radius: BULLET_RADIUS,
    }));

    this._spawnFlash(origin, direction);
    this._spawnTrail(origin, direction, 0xfff2b0, 0.22);
  }

  addEnemyBullet(bullet) {
    this.enemyBullets.push(bullet);
  }

  updatePlayerBullets(enemies, onEnemyKilled, onBossHit = null) {
    let kills = 0;

    for (const bullet of this.playerBullets) {
      this._movement.copy(bullet.direction).multiplyScalar(bullet.speed ?? BULLET_SPEED);
      bullet.mesh.position.add(this._movement);
      bullet._trailCooldown -= 1;
      if (bullet._trailCooldown <= 0) {
        bullet._trailCooldown = 1;
        this._spawnTrail(bullet.mesh.position, bullet.direction, 0xffd56e, 0.15);
      }
    }

    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];
      let removed = false;
      const bulletRadius = bullet.radius ?? BULLET_RADIUS;

      if (this.obstacleManager) {
        const obstacle = this.obstacleManager.checkBulletCollision(bullet.mesh.position, bulletRadius);
        if (obstacle) {
          obstacle.hit(bullet.damage);
          this._spawnSparks(bullet.mesh.position, 5, 0xffb765, 0.36);
          this._removePlayerBullet(i);
          continue;
        }
        if (!this.obstacleManager.isWithinArena(bullet.mesh.position, bulletRadius)) {
          this._removePlayerBullet(i);
          continue;
        }
      }

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (bullet.mesh.position.distanceTo(enemy.mesh.position) >= ENEMY_COLLISION_RADIUS) {
          continue;
        }

        const died = enemy.takeDamage();
        this._spawnSparks(bullet.mesh.position, 8, 0xffa45c, 0.4);
        this._removePlayerBullet(i);
        if (died) {
          this.spawnEnemyExplosion(enemy.mesh.position);
          kills++;
          onEnemyKilled(enemy);
        }
        removed = true;
        break;
      }

      if (!removed && onBossHit) {
        const bossHitResult = onBossHit(bullet);
        if (bossHitResult.hit) {
          this._spawnSparks(bullet.mesh.position, 10, 0xff5f5f, 0.45);
          this._removePlayerBullet(i);
          removed = true;
        }
      }

      if (!removed && bullet.mesh.position.length() > BULLET_CLEANUP_DISTANCE) {
        this._removePlayerBullet(i);
      }
    }

    return kills;
  }

  updateEnemyBullets(playerPosition) {
    let damage = 0;

    for (const bullet of this.enemyBullets) {
      this._movement.copy(bullet.direction).multiplyScalar(bullet.speed ?? ENEMY_BULLET_SPEED);
      bullet.mesh.position.add(this._movement);
      bullet._trailCooldown -= 1;
      if (bullet.trailType === 'smoke' && bullet._trailCooldown <= 0) {
        bullet._trailCooldown = 1;
        this._spawnSmoke(bullet.mesh.position, 0.42, 0.24);
      } else if (bullet.trailType === 'energy' && bullet._trailCooldown <= 0) {
        bullet._trailCooldown = 1;
        this._spawnTrail(bullet.mesh.position, bullet.direction, 0xff6f52, 0.25);
      }
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      const bulletRadius = bullet.radius ?? BULLET_RADIUS;

      if (this.obstacleManager) {
        const obstacle = this.obstacleManager.checkBulletCollision(bullet.mesh.position, bulletRadius);
        if (obstacle) {
          obstacle.hit(bullet.damage);
          damage += this._explodeEnemyBullet(i, playerPosition);
          continue;
        }
        if (!this.obstacleManager.isWithinArena(bullet.mesh.position, bulletRadius)) {
          damage += this._explodeEnemyBullet(i, playerPosition);
          continue;
        }
      }

      const distance = bullet.mesh.position.distanceTo(playerPosition);
      const hitRadius = ENEMY_COLLISION_RADIUS + bulletRadius * 0.35;
      if (distance < hitRadius) {
        if (bullet.isMissile) {
          damage += this._explodeEnemyBullet(i, playerPosition);
        } else {
          damage += bullet.damage ?? ENEMY_BULLET_DAMAGE;
          this._spawnSparks(bullet.mesh.position, 8, 0xff7e46, 0.35);
          this._removeEnemyBullet(i);
        }
        continue;
      }

      if (bullet.mesh.position.length() > BULLET_CLEANUP_DISTANCE) {
        damage += this._explodeEnemyBullet(i, playerPosition);
      }
    }

    return damage;
  }

  _explodeEnemyBullet(index, playerPosition) {
    const bullet = this.enemyBullets[index];
    if (!bullet) {
      return 0;
    }
    let damage = 0;
    const splashRadius = bullet.splashRadius ?? 0;
    if (splashRadius > 0) {
      const distance = bullet.mesh.position.distanceTo(playerPosition);
      if (distance < splashRadius) {
        const normalized = 1 - distance / splashRadius;
        damage += (bullet.splashDamage ?? 0) * Math.max(0.2, normalized);
      }
      this._spawnSparks(bullet.mesh.position, 20, 0xff7340, 0.62, bullet.explosionSize ?? 1.4);
      this._spawnSmoke(bullet.mesh.position, 1.2, 0.55);
    } else {
      damage += bullet.damage ?? ENEMY_BULLET_DAMAGE;
      this._spawnSparks(bullet.mesh.position, 8, 0xff7e46, 0.35);
    }
    this._removeEnemyBullet(index);
    return damage;
  }

  spawnEnemyExplosion(position) {
    this._spawnSparks(position, 24, 0xff934a, 0.52, 1.35);
    this._spawnSmoke(position, 0.85, 0.45);
  }

  spawnBossExplosion(position) {
    this._spawnSparks(position, 54, 0xff5b42, 0.82, 2.1);
    this._spawnSmoke(position, 1.5, 0.65, 1.4);
    this._spawnShockwave(position, 0.95);
  }

  emitPlayerDashTrail(position) {
    this._spawnTrail(position, this._upDirection, 0x7ec9ff, 0.23);
  }

  _spawnFlash(origin, direction) {
    const entry = this._acquire(this._flashPool);
    if (!entry) {
      return;
    }
    entry.maxLife = MUZZLE_FLASH_DURATION * 1.4;
    entry.life = entry.maxLife;
    entry.mesh.material.opacity = 1;
    entry.mesh.scale.setScalar(1);
    entry.mesh.position.copy(origin).add(this._trailDirection.copy(direction).multiplyScalar(0.8));
  }

  _spawnTrail(position, direction, color, life) {
    const entry = this._acquire(this._trailPool);
    if (!entry) {
      return;
    }
    entry.maxLife = life;
    entry.life = life;
    entry.mesh.material.color.set(color);
    entry.mesh.material.opacity = 0.75;
    entry.mesh.position.copy(position).add(this._trailDirection.copy(direction).multiplyScalar(0.15));
    entry.mesh.scale.setScalar(1);
    entry.velocity.set(0, 0.06, 0);
    entry.scaleVelocity = 0.8;
  }

  _spawnSparks(position, count, color, speed, size = 1) {
    for (let i = 0; i < count; i++) {
      const entry = this._acquire(this._sparkPool);
      if (!entry) {
        return;
      }
      entry.maxLife = 0.26 + Math.random() * 0.18;
      entry.life = entry.maxLife;
      entry.mesh.material.color.set(color);
      entry.mesh.material.opacity = 1;
      entry.mesh.position.copy(position);
      entry.mesh.scale.setScalar(size * (0.7 + Math.random() * 0.9));
      entry.velocity.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed
      );
      entry.scaleVelocity = 0.45;
    }
  }

  _spawnSmoke(position, spread, life, size = 1) {
    for (let i = 0; i < 6; i++) {
      const entry = this._acquire(this._smokePool);
      if (!entry) {
        return;
      }
      entry.maxLife = life + Math.random() * 0.25;
      entry.life = entry.maxLife;
      entry.mesh.material.opacity = 0.35;
      entry.mesh.position.set(
        position.x + (Math.random() - 0.5) * spread,
        position.y + Math.random() * 0.5,
        position.z + (Math.random() - 0.5) * spread
      );
      entry.mesh.scale.setScalar(size * (0.7 + Math.random() * 0.7));
      entry.velocity.set((Math.random() - 0.5) * 0.18, 0.25 + Math.random() * 0.16, (Math.random() - 0.5) * 0.18);
      entry.scaleVelocity = 0.9;
    }
  }

  _spawnShockwave(position, life) {
    const entry = this._acquire(this._shockwavePool);
    if (!entry) {
      return;
    }
    entry.maxLife = life;
    entry.life = life;
    entry.mesh.material.opacity = 0.75;
    entry.mesh.position.set(position.x, 0.05, position.z);
    entry.mesh.scale.setScalar(1);
    entry.scaleVelocity = 4.5;
    entry.fadeOnly = true;
  }

  _acquire(pool) {
    for (const entry of pool) {
      if (entry.active) {
        continue;
      }
      entry.active = true;
      entry.mesh.visible = true;
      entry.fadeOnly = false;
      return entry;
    }
    return null;
  }

  updateEffects(delta) {
    this._updatePool(this._flashPool, delta, (entry) => {
      entry.mesh.material.opacity = Math.max(0, entry.life / entry.maxLife);
      entry.mesh.scale.multiplyScalar(1 + delta * 2.5);
    });
    this._updatePool(this._trailPool, delta, (entry) => {
      entry.mesh.position.addScaledVector(entry.velocity, delta);
      entry.mesh.material.opacity = Math.max(0, entry.life / entry.maxLife);
      entry.mesh.scale.multiplyScalar(1 + entry.scaleVelocity * delta);
    });
    this._updatePool(this._sparkPool, delta, (entry) => {
      entry.mesh.position.addScaledVector(entry.velocity, delta);
      entry.velocity.multiplyScalar(0.96);
      entry.mesh.material.opacity = Math.max(0, entry.life / entry.maxLife);
      entry.mesh.scale.multiplyScalar(1 + entry.scaleVelocity * delta);
    });
    this._updatePool(this._smokePool, delta, (entry) => {
      entry.mesh.position.addScaledVector(entry.velocity, delta);
      entry.mesh.material.opacity = Math.max(0, (entry.life / entry.maxLife) * 0.38);
      entry.mesh.scale.multiplyScalar(1 + entry.scaleVelocity * delta);
    });
    this._updatePool(this._shockwavePool, delta, (entry) => {
      entry.mesh.material.opacity = Math.max(0, entry.life / entry.maxLife);
      entry.mesh.scale.multiplyScalar(1 + entry.scaleVelocity * delta);
    });
  }

  _updatePool(pool, delta, updater) {
    for (const entry of pool) {
      if (!entry.active) {
        continue;
      }
      entry.life -= delta;
      updater(entry);
      if (entry.life > 0) {
        continue;
      }
      entry.active = false;
      entry.mesh.visible = false;
      entry.mesh.material.opacity = 0;
    }
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

  clearAll() {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      this._removePlayerBullet(i);
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      this._removeEnemyBullet(i);
    }
    for (const pool of [this._flashPool, this._trailPool, this._sparkPool, this._smokePool, this._shockwavePool]) {
      for (const entry of pool) {
        entry.active = false;
        entry.life = 0;
        entry.mesh.visible = false;
        if (entry.mesh.material?.opacity !== undefined) {
          entry.mesh.material.opacity = 0;
        }
      }
    }
  }
}
