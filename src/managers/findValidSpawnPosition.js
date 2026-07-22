import * as THREE from 'three';
import { ARENA_HALF, WALL_THICKNESS } from '../constants.js';

const DEFAULT_ARENA_PADDING = 0.5;

/**
 * Finds a random valid spawn point inside the arena.
 * Returns null if no valid point is found within maxAttempts.
 */
export function findValidSpawnPosition({
  obstacleManager,
  radius,
  playerPosition = null,
  playerRadius = 0,
  minPlayerDistance = 0,
  colliders = [],
  maxAttempts = 50,
  arenaPadding = DEFAULT_ARENA_PADDING,
}) {
  const limit = ARENA_HALF - WALL_THICKNESS / 2 - radius - arenaPadding;
  const requiredPlayerDistance = Math.max(minPlayerDistance, radius + playerRadius);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = new THREE.Vector3(
      randomBetween(-limit, limit),
      0,
      randomBetween(-limit, limit)
    );

    if (obstacleManager?.isCircleBlocked(candidate, radius)) {
      continue;
    }

    if (playerPosition && horizontalDistance(candidate, playerPosition) < requiredPlayerDistance) {
      continue;
    }

    let blocked = false;
    for (const collider of colliders) {
      const minimumDistance = radius + collider.radius;
      if (horizontalDistance(candidate, collider.position) < minimumDistance) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      continue;
    }

    return candidate;
  }

  return null;
}

function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

