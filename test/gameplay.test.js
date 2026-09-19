import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

import { WaveManager } from '../src/managers/WaveManager.js';
import { findValidSpawnPosition } from '../src/managers/findValidSpawnPosition.js';
import {
  PLAYER_MAX_HEALTH,
  BULLET_DAMAGE,
  WEAPON_IDS,
  WEAPONS,
} from '../src/constants.js';

describe('constants', () => {
  it('has valid core combat constants', () => {
    expect(PLAYER_MAX_HEALTH).toBeGreaterThan(0);
    expect(BULLET_DAMAGE).toBeGreaterThan(0);
  });

  it('defines all three weapon IDs and matching weapon configs', () => {
    const ids = Object.values(WEAPON_IDS);

    expect(ids).toHaveLength(3);

    for (const id of ids) {
      expect(WEAPONS[id]).toBeDefined();
      expect(WEAPONS[id].damage).toBeGreaterThan(0);
    }
  });
});

describe('WaveManager', () => {
  let enemyManager;
  let bossManager;
  let playerPosition;
  let manager;

  beforeEach(() => {
    enemyManager = {
      count: 0,
      spawn: vi.fn(),
    };

    bossManager = {
      hasBoss: false,
      spawn: vi.fn(() => ({ id: 'boss-1' })),
      clearAll: vi.fn(),
    };

    playerPosition = new THREE.Vector3(5, 1, -3);

    manager = new WaveManager(
      enemyManager,
      bossManager,
      () => playerPosition,
    );
  });

  it('starts at wave 1 and spawns wave + 2 enemies', () => {
    expect(manager.wave).toBe(1);
    expect(enemyManager.spawn).toHaveBeenCalledTimes(3);
    expect(manager.hasPendingBossSpawn).toBe(false);
  });

  it('advances to the next wave only when no enemies or boss remain', () => {
    enemyManager.count = 0;
    bossManager.hasBoss = false;

    expect(manager.checkAndSpawnNextWave()).toBe(2);
    expect(manager.wave).toBe(2);
    expect(enemyManager.spawn).toHaveBeenCalledTimes(3 + 4);
  });

  it('does not advance while enemies remain', () => {
    enemyManager.count = 1;

    expect(manager.checkAndSpawnNextWave()).toBeNull();
    expect(manager.wave).toBe(1);
  });

  it('does not advance while a boss exists', () => {
    enemyManager.count = 0;
    bossManager.hasBoss = true;

    expect(manager.checkAndSpawnNextWave()).toBeNull();
    expect(manager.wave).toBe(1);
  });

  it('marks every fifth wave for a boss instead of spawning normal enemies', () => {
    manager.wave = 5;
    enemyManager.spawn.mockClear();

    manager.spawnWave();

    expect(manager.hasPendingBossSpawn).toBe(true);
    expect(enemyManager.spawn).not.toHaveBeenCalled();
  });

  it('spawns the pending boss at the player position', () => {
    manager.wave = 5;
    manager.spawnWave();

    const boss = manager.spawnPendingBoss();

    expect(boss).toEqual({ id: 'boss-1' });
    expect(bossManager.spawn).toHaveBeenCalledWith(playerPosition);
    expect(manager.hasPendingBossSpawn).toBe(false);
  });

  it('returns null when there is no pending boss', () => {
    expect(manager.spawnPendingBoss()).toBeNull();
    expect(bossManager.spawn).not.toHaveBeenCalled();
  });

  it('resets wave state and can skip the initial spawn', () => {
    manager.wave = 5;
    manager.enemiesKilledThisWave = 7;
    manager.spawnWave();

    manager.reset({ skipSpawn: true });

    expect(manager.wave).toBe(1);
    expect(manager.enemiesKilledThisWave).toBe(0);
    expect(manager.hasPendingBossSpawn).toBe(false);
    expect(bossManager.clearAll).toHaveBeenCalledTimes(1);
  });
});

describe('findValidSpawnPosition', () => {
  it('returns a position inside the arena bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    const result = findValidSpawnPosition({
      radius: 1,
      playerPosition: new THREE.Vector3(0, 1, 0),
      playerRadius: 1,
      minPlayerDistance: 10,
      obstacleManager: null,
      colliders: [],
    });

    expect(result).toBeInstanceOf(THREE.Vector3);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.z)).toBe(true);
    expect(Math.abs(result.x)).toBeLessThanOrEqual(40);
    expect(Math.abs(result.z)).toBeLessThanOrEqual(40);

    Math.random.mockRestore();
  });

  it('returns null when the only candidate is too close to the player', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const playerPosition = new THREE.Vector3(0, 1, 0);

    const result = findValidSpawnPosition({
      radius: 1,
      playerPosition,
      playerRadius: 1,
      minPlayerDistance: 10,
      obstacleManager: null,
      colliders: [],
      maxAttempts: 5,
    });

    expect(result).toBeNull();

    Math.random.mockRestore();
  });
});
