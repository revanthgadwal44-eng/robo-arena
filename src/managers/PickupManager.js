import * as THREE from 'three';
import { findValidSpawnPosition } from './findValidSpawnPosition.js';
import {
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
  PLAYER_COLLISION_RADIUS,
  PLAYER_SHOOT_COOLDOWN,
  ENEMY_COLLISION_RADIUS,
  ENEMY_SPAWN_ATTEMPTS,
  PICKUP_HEALTH_RESTORE,
  PICKUP_DURATION_SECONDS,
  PICKUP_RAPID_FIRE_COOLDOWN_MS,
  PICKUP_RESPAWN_MIN_SECONDS,
  PICKUP_RESPAWN_MAX_SECONDS,
} from '../constants.js';

const PICKUP_TYPES = {
  HEALTH_PACK: 'Health Pack',
  RAPID_FIRE: 'Rapid Fire',
  SHIELD: 'Shield',
};
const PICKUP_TYPE_LIST = Object.values(PICKUP_TYPES);

const PICKUP_RADIUS = 0.6;
const PICKUP_MIN_SPACING = 2;

export class PickupManager {
  constructor(scene, obstacleManager, enemyManager) {
    this.scene = scene;
    this.obstacleManager = obstacleManager;
    this.enemyManager = enemyManager;
    this.pickups = [];
    this.rapidFireRemaining = 0;
    this.shieldRemaining = 0;
    this._respawnTimers = new Map();
    this._spawnPlayerPosition = new THREE.Vector3(PLAYER_SPAWN_X, 0, PLAYER_SPAWN_Z);

    for (const pickupType of PICKUP_TYPE_LIST) {
      this._respawnTimers.set(pickupType, 0);
      this._spawnPickup(pickupType);
    }
  }

  update(delta, player, input) {
    this._spawnPlayerPosition.set(player.mesh.position.x, 0, player.mesh.position.z);
    this._updateTimedEffects(delta, player, input);
    this._collectPickups(player, input);
    this._updateRespawns(delta);
  }

  getActivePowerUps() {
    const active = [];
    if (this.rapidFireRemaining > 0) {
      active.push({ name: PICKUP_TYPES.RAPID_FIRE, remaining: this.rapidFireRemaining });
    }
    if (this.shieldRemaining > 0) {
      active.push({ name: PICKUP_TYPES.SHIELD, remaining: this.shieldRemaining });
    }
    return active;
  }

  _spawnPickup(type) {
    if (this.pickups.some((pickup) => pickup.type === type)) {
      return;
    }

    const position = findValidSpawnPosition({
      obstacleManager: this.obstacleManager,
      radius: PICKUP_RADIUS,
      playerPosition: this._spawnPlayerPosition,
      playerRadius: PLAYER_COLLISION_RADIUS,
      colliders: this._getSpawnColliders(),
      maxAttempts: ENEMY_SPAWN_ATTEMPTS,
    });
    if (!position) {
      return;
    }

    const mesh = this._createPickupMesh(type);
    mesh.position.set(position.x, PICKUP_RADIUS, position.z);
    this.scene.add(mesh);
    this.pickups.push({ type, mesh, radius: PICKUP_RADIUS });
  }

  _createPickupMesh(type) {
    switch (type) {
      case PICKUP_TYPES.HEALTH_PACK: {
        const group = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.4, 1.1),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        const stripeH = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.18, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xff3333 })
        );
        stripeH.position.y = 0.3;
        const stripeV = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.18, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xff3333 })
        );
        stripeV.position.y = 0.3;
        group.add(base, stripeH, stripeV);
        return group;
      }
      case PICKUP_TYPES.RAPID_FIRE:
        return new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xffb000, emissive: 0x552200, emissiveIntensity: 0.35 })
        );
      case PICKUP_TYPES.SHIELD:
      default:
        return new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.65, 0),
          new THREE.MeshStandardMaterial({ color: 0x3da5ff, emissive: 0x0f3f88, emissiveIntensity: 0.35 })
        );
    }
  }

  _collectPickups(player, input) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      const distance = pickup.mesh.position.distanceTo(player.mesh.position);
      if (distance > pickup.radius + PLAYER_COLLISION_RADIUS) {
        continue;
      }

      this._applyPickup(pickup.type, player, input);
      this.scene.remove(pickup.mesh);
      this.pickups.splice(i, 1);
      this._respawnTimers.set(
        pickup.type,
        this._randomBetween(PICKUP_RESPAWN_MIN_SECONDS, PICKUP_RESPAWN_MAX_SECONDS)
      );
    }
  }

  _applyPickup(type, player, input) {
    if (type === PICKUP_TYPES.HEALTH_PACK) {
      player.heal(PICKUP_HEALTH_RESTORE);
      return;
    }

    if (type === PICKUP_TYPES.RAPID_FIRE) {
      this.rapidFireRemaining = PICKUP_DURATION_SECONDS;
      input.setShootCooldownMs(PICKUP_RAPID_FIRE_COOLDOWN_MS);
      return;
    }

    this.shieldRemaining = PICKUP_DURATION_SECONDS;
    player.setDamageMultiplier(0.5);
  }

  _updateTimedEffects(delta, player, input) {
    if (this.rapidFireRemaining > 0) {
      this.rapidFireRemaining = Math.max(0, this.rapidFireRemaining - delta);
      if (this.rapidFireRemaining === 0) {
        input.setShootCooldownMs(PLAYER_SHOOT_COOLDOWN);
      }
    }

    if (this.shieldRemaining > 0) {
      this.shieldRemaining = Math.max(0, this.shieldRemaining - delta);
      if (this.shieldRemaining === 0) {
        player.setDamageMultiplier(1);
      }
    }
  }

  _updateRespawns(delta) {
    for (const pickupType of PICKUP_TYPE_LIST) {
      const timer = this._respawnTimers.get(pickupType);
      if (timer === undefined) {
        continue;
      }

      if (timer > 0) {
        const nextTimer = Math.max(0, timer - delta);
        this._respawnTimers.set(pickupType, nextTimer);
        if (nextTimer > 0) {
          continue;
        }
      }

      const beforeCount = this.pickups.length;
      this._spawnPickup(pickupType);
      const didSpawn = this.pickups.length > beforeCount;
      if (didSpawn) {
        this._respawnTimers.set(pickupType, Number.POSITIVE_INFINITY);
      } else {
        this._respawnTimers.set(pickupType, 1);
      }
    }
  }

  _getSpawnColliders() {
    const colliders = this.pickups.map((pickup) => ({
      position: pickup.mesh.position,
      radius: pickup.radius + PICKUP_MIN_SPACING,
    }));

    if (!this.enemyManager) {
      return colliders;
    }

    for (const enemy of this.enemyManager.getEnemies()) {
      colliders.push({
        position: enemy.mesh.position,
        radius: ENEMY_COLLISION_RADIUS,
      });
    }

    return colliders;
  }

  _randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }
}
