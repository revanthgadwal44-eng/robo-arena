import * as THREE from 'three';
import { Obstacle, OBSTACLE_TYPES } from './Obstacle.js';
import {
  ARENA_HALF,
  WALL_THICKNESS,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
} from '../constants.js';

const MIN_OBSTACLE_COUNT = 20;
const MAX_OBSTACLE_COUNT = 30;
const RESERVE_DISTANCE = 8;
const MIN_OBSTACLE_SPACING = 5;
const RESERVED_ZONES = [
  { x: PLAYER_SPAWN_X, z: PLAYER_SPAWN_Z, radius: RESERVE_DISTANCE },
  { x: 5, z: 0, radius: RESERVE_DISTANCE },
  { x: -5, z: 5, radius: RESERVE_DISTANCE },
  { x: 0, z: -6, radius: RESERVE_DISTANCE },
];
const OBSTACLE_TYPE_LIST = Object.values(OBSTACLE_TYPES);

export class ObstacleManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.spawnObstacles();
  }

  spawnObstacles() {
    const count = MIN_OBSTACLE_COUNT + Math.floor(Math.random() * (MAX_OBSTACLE_COUNT - MIN_OBSTACLE_COUNT + 1));
    let attempts = 0;

    while (this.obstacles.length < count && attempts < 1200) {
      attempts += 1;
      const type = this._pickRandomType();
      const obstacleSize = this._getSizeForType(type);
      const position = this._pickSpawnPosition(obstacleSize);

      if (!position) {
        continue;
      }

      const obstacle = new Obstacle(this.scene, type, new THREE.Vector3(position.x, 0, position.z));
      this.obstacles.push(obstacle);
    }

    this.updateBoundingBoxes();
  }

  updateBoundingBoxes() {
    for (const obstacle of this.obstacles) {
      obstacle.updateBoundingBox();
    }
  }

  /**
   * Returns true if the circle is blocked by an obstacle or outside the walkable arena.
   * @param {{x:number,z:number}} position
   * @param {number} radius
   */
  isCircleBlocked(position, radius) {
    return !this.isWithinArena(position, radius) || this.findObstacleCollision(position, radius) !== null;
  }

  /**
   * Returns the first obstacle intersecting a horizontal circle, or null if none.
   * @param {{x:number,z:number}} position
   * @param {number} radius
   * @returns {Obstacle|null}
   */
  findObstacleCollision(position, radius) {
    for (const obstacle of this.obstacles) {
      if (this._isCircleIntersectingBox(position, radius, obstacle.boundingBox)) {
        return obstacle;
      }
    }
    return null;
  }

  /**
   * Returns the first obstacle intersecting a 3D sphere, or null if none.
   * @param {{x:number,y:number,z:number}} position
   * @param {number} radius
   * @returns {Obstacle|null}
   */
  checkBulletCollision(position, radius) {
    for (const obstacle of this.obstacles) {
      if (this._isSphereIntersectingBox(position, radius, obstacle.boundingBox)) {
        return obstacle;
      }
    }
    return null;
  }

  _pickRandomType() {
    const index = Math.floor(Math.random() * OBSTACLE_TYPE_LIST.length);
    return OBSTACLE_TYPE_LIST[index];
  }

  _getSizeForType(type) {
    switch (type) {
      case OBSTACLE_TYPES.WOODEN_CRATE:
        return new THREE.Vector3(2.1, 1.9, 2.1);
      case OBSTACLE_TYPES.CONCRETE_BARRIER:
        return new THREE.Vector3(4.3, 1.8, 1.4);
      case OBSTACLE_TYPES.METAL_PILLAR:
        return new THREE.Vector3(2.6, 9.6, 2.6);
      case OBSTACLE_TYPES.ROCK:
        return new THREE.Vector3(3.2, 1.7, 2.7);
      default:
        return new THREE.Vector3(2, 2, 2);
    }
  }

  _pickSpawnPosition(size) {
    const marginX = size.x / 2 + WALL_THICKNESS / 2 + 1;
    const marginZ = size.z / 2 + WALL_THICKNESS / 2 + 1;
    const bounds = {
      minX: -ARENA_HALF + marginX,
      maxX: ARENA_HALF - marginX,
      minZ: -ARENA_HALF + marginZ,
      maxZ: ARENA_HALF - marginZ,
    };

    const candidate = {
      x: this._randomBetween(bounds.minX, bounds.maxX),
      z: this._randomBetween(bounds.minZ, bounds.maxZ),
    };

    if (!this._isFarFromReservedZones(candidate, size)) {
      return null;
    }

    if (!this._isFarFromExistingObstacles(candidate, size)) {
      return null;
    }

    return candidate;
  }

  _isFarFromReservedZones(position, size) {
    const clearance = MIN_OBSTACLE_SPACING + Math.max(size.x, size.z) / 2;

    for (const reserved of RESERVED_ZONES) {
      const dx = position.x - reserved.x;
      const dz = position.z - reserved.z;
      const distance = Math.hypot(dx, dz);
      if (distance < reserved.radius + clearance) {
        return false;
      }
    }

    return true;
  }

  _isFarFromExistingObstacles(position, size) {
    const clearance = MIN_OBSTACLE_SPACING + Math.max(size.x, size.z) / 2;
    for (const obstacle of this.obstacles) {
      const center = obstacle.boundingBox.getCenter(new THREE.Vector3());
      const existingSize = obstacle.size;
      const minimumDistance = clearance + Math.max(existingSize.x, existingSize.z) / 2;
      const distance = Math.hypot(position.x - center.x, position.z - center.z);
      if (distance < minimumDistance) {
        return false;
      }
    }
    return true;
  }

  isWithinArena(position, radius) {
    const limit = ARENA_HALF - WALL_THICKNESS / 2 - radius;
    return (
      position.x >= -limit &&
      position.x <= limit &&
      position.z >= -limit &&
      position.z <= limit
    );
  }

  _isCircleIntersectingBox(position, radius, box) {
    const x = Math.max(box.min.x, Math.min(position.x, box.max.x));
    const z = Math.max(box.min.z, Math.min(position.z, box.max.z));
    const dx = position.x - x;
    const dz = position.z - z;
    return dx * dx + dz * dz < radius * radius;
  }

  _isSphereIntersectingBox(position, radius, box) {
    return box.distanceToPoint(position) <= radius;
  }

  _randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }
}
