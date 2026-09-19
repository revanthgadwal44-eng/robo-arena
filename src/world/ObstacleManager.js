import * as THREE from 'three';
import { Obstacle, OBSTACLE_TYPES } from './Obstacle.js';
import {
  ARENA_HALF,
  WALL_THICKNESS,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
  ARENA_ZONES,
} from '../constants.js';

const MIN_OBSTACLE_COUNT = 20;
const MAX_OBSTACLE_COUNT = 30;
const RESERVE_DISTANCE = 8;
const MIN_OBSTACLE_SPACING = 5;
const RESERVED_ZONES = [
  { x: PLAYER_SPAWN_X, z: PLAYER_SPAWN_Z, radius: RESERVE_DISTANCE + 2 },
  { x: ARENA_ZONES.OPEN_CENTER.x, z: ARENA_ZONES.OPEN_CENTER.z, radius: ARENA_ZONES.OPEN_CENTER.radius },
  { x: ARENA_ZONES.BOSS_ARENA.x, z: ARENA_ZONES.BOSS_ARENA.z, radius: 8 },
];

const ZONE_LAYOUT = [
  { zone: ARENA_ZONES.COVER_NW, count: 4, types: [OBSTACLE_TYPES.CONCRETE_BARRIER, OBSTACLE_TYPES.METAL_PILLAR, OBSTACLE_TYPES.ROCK] },
  { zone: ARENA_ZONES.COVER_NE, count: 4, types: [OBSTACLE_TYPES.CONCRETE_BARRIER, OBSTACLE_TYPES.WOODEN_CRATE, OBSTACLE_TYPES.ROCK] },
  { zone: ARENA_ZONES.COVER_SW, count: 4, types: [OBSTACLE_TYPES.WOODEN_CRATE, OBSTACLE_TYPES.ROCK, OBSTACLE_TYPES.METAL_PILLAR] },
  { zone: ARENA_ZONES.COVER_SE, count: 4, types: [OBSTACLE_TYPES.CONCRETE_BARRIER, OBSTACLE_TYPES.ROCK] },
  { zone: ARENA_ZONES.SPAWN_N, count: 2, types: [OBSTACLE_TYPES.WOODEN_CRATE] },
  { zone: ARENA_ZONES.SPAWN_S, count: 2, types: [OBSTACLE_TYPES.WOODEN_CRATE] },
  { zone: ARENA_ZONES.SPAWN_E, count: 2, types: [OBSTACLE_TYPES.ROCK] },
  { zone: ARENA_ZONES.SPAWN_W, count: 2, types: [OBSTACLE_TYPES.ROCK] },
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
    for (const layout of ZONE_LAYOUT) {
      for (let i = 0; i < layout.count; i++) {
        const type = layout.types[i % layout.types.length];
        const obstacleSize = this._getSizeForType(type);
        const position = this._pickZonePosition(layout.zone, obstacleSize);
        if (!position) {
          continue;
        }
        this.obstacles.push(new Obstacle(this.scene, type, new THREE.Vector3(position.x, 0, position.z)));
      }
    }

    const target = MIN_OBSTACLE_COUNT + Math.floor(Math.random() * (MAX_OBSTACLE_COUNT - MIN_OBSTACLE_COUNT + 1));
    let attempts = 0;
    while (this.obstacles.length < target && attempts < 800) {
      attempts += 1;
      const type = this._pickRandomType();
      const obstacleSize = this._getSizeForType(type);
      const position = this._pickSpawnPosition(obstacleSize);
      if (!position) {
        continue;
      }
      this.obstacles.push(new Obstacle(this.scene, type, new THREE.Vector3(position.x, 0, position.z)));
    }

    this.updateBoundingBoxes();
  }

  _pickZonePosition(zone, size) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * zone.radius;
      const candidate = {
        x: zone.x + Math.cos(angle) * radius,
        z: zone.z + Math.sin(angle) * radius,
      };
      if (!this._isFarFromReservedZones(candidate, size)) {
        continue;
      }
      if (!this._isFarFromExistingObstacles(candidate, size)) {
        continue;
      }
      const marginX = size.x / 2 + WALL_THICKNESS / 2 + 1;
      const marginZ = size.z / 2 + WALL_THICKNESS / 2 + 1;
      if (
        candidate.x < -ARENA_HALF + marginX || candidate.x > ARENA_HALF - marginX
        || candidate.z < -ARENA_HALF + marginZ || candidate.z > ARENA_HALF - marginZ
      ) {
        continue;
      }
      return candidate;
    }
    return null;
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
