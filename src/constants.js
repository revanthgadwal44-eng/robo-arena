/** Shared game configuration — single source for all magic numbers. */

export const SCENE_BACKGROUND = 0x080f18;

export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const CAMERA_INITIAL_Y = 6;
export const CAMERA_INITIAL_Z = 10;
export const CAMERA_HEIGHT = 5;
export const CAMERA_DISTANCE = 8;
export const CAMERA_LERP = 0.1;

export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_SPEED = 0.1;
export const PLAYER_ROTATION_SPEED = 0.03;
export const PLAYER_COLLISION_RADIUS = 1.2;
export const PLAYER_SHOOT_COOLDOWN = 200;
export const PLAYER_DASH_COOLDOWN_SECONDS = 3;
export const PLAYER_DASH_DURATION_SECONDS = 0.2;
export const PLAYER_DASH_SPEED = 24;
export const PLAYER_Y = 1;
export const PLAYER_SPAWN_X = 0;
export const PLAYER_SPAWN_Z = 0;

export const PLAYER_BODY_COLOR = 0x0000ff;
export const PLAYER_HEAD_COLOR = 0x00ffff;
export const PLAYER_WHEEL_COLOR = 0x000000;

export const BULLET_RADIUS = 0.15;
export const BULLET_SPEED = 0.3;
export const ENEMY_BULLET_SPEED = 0.1;
export const BULLET_CLEANUP_DISTANCE = 50;
export const BULLET_DAMAGE = 10;
export const ENEMY_BULLET_DAMAGE = 10;
export const PLAYER_BULLET_COLOR = 0xffff00;
export const ENEMY_BULLET_COLOR = 0xff0000;
export const MUZZLE_FLASH_COLOR = 0xffff99;
export const MUZZLE_FLASH_RADIUS = 0.25;
export const MUZZLE_FLASH_DURATION = 0.25;
export const HIT_PARTICLE_COLOR = 0xffdd66;
export const HIT_PARTICLE_COUNT = 8;
export const HIT_PARTICLE_LIFETIME = 0.25;
export const HIT_PARTICLE_SPEED = 0.2;

export const ENEMY_HEALTH = 50;
export const ENEMY_SPEED = 0.02;
export const ENEMY_MELEE_RANGE = 1.5;
export const ENEMY_CHASE_STOP_DISTANCE = 6;
export const ENEMY_MELEE_DAMAGE = 0.1;
export const ENEMY_COLLISION_RADIUS = 1;
export const ENEMY_SHOOT_INTERVAL = 1000;
export const ENEMY_SPAWN_ATTEMPTS = 50;
export const ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER = 5;
export const ENEMY_COLOR = 0xff0000;
export const ENEMY_DAMAGED_ORANGE = 0xff8800;
export const ENEMY_DAMAGED_YELLOW = 0xffff00;

export const BOSS_MAX_HEALTH = 500;
export const BOSS_SPEED = 0.012;
export const BOSS_CHARGE_SPEED = 0.42;
export const BOSS_BULLET_DAMAGE = 20;
export const BOSS_CHARGE_DAMAGE = 30;
export const BOSS_MISSILE_DAMAGE = 8;
export const BOSS_COLLISION_RADIUS = 2.1;
export const BOSS_MELEE_RANGE = 2.4;
export const BOSS_SHOOT_RANGE = 20;
export const BOSS_SHOT_COOLDOWN_SECONDS = 0.32;
export const BOSS_SHOTS_PER_BURST = 3;
export const BOSS_CHASE_MIN_DURATION_SECONDS = 1.2;
export const BOSS_CHARGE_WINDUP_SECONDS = 1;
export const BOSS_CHARGE_DURATION_SECONDS = 0.7;
export const BOSS_COOLDOWN_SECONDS = 1.25;
export const BOSS_COLOR = 0x6b1f8f;
export const BOSS_DAMAGED_COLOR = 0xb54762;
export const BOSS_CRITICAL_COLOR = 0xff4141;
export const BOSS_MISSILE_SPEED = 0.12;
export const BOSS_MISSILE_SPLASH_RADIUS = 2.8;

/** Enemy archetypes — stats drive behavior via mesh.userData at spawn time. */
export const ENEMY_TYPES = {
  NORMAL: 'normal',
  FAST: 'fast',
  TANK: 'tank',
};

export const ENEMY_TYPE_STATS = {
  [ENEMY_TYPES.NORMAL]: {
    health: 50,
    speed: 0.02,
    damage: 10,
    color: ENEMY_COLOR,
  },
  [ENEMY_TYPES.FAST]: {
    health: 30,
    speed: 0.04,
    damage: 8,
    color: 0xff6600,
  },
  [ENEMY_TYPES.TANK]: {
    health: 100,
    speed: 0.01,
    damage: 15,
    color: 0x880000,
  },
};

/** Weighted spawn table — cumulative thresholds for random roll. */
export const ENEMY_SPAWN_WEIGHTS = [
  { type: ENEMY_TYPES.NORMAL, weight: 0.7 },
  { type: ENEMY_TYPES.FAST, weight: 0.2 },
  { type: ENEMY_TYPES.TANK, weight: 0.1 },
];

// =======================
// Arena Configuration
// =======================

export const ARENA_SIZE = 80;

export const ARENA_HALF = ARENA_SIZE / 2;

export const WALL_HEIGHT = 6;

export const WALL_THICKNESS = 2;

export const FLOOR_COLOR = 0x808080;

export const WALL_COLOR = 0x555555;

// Enemy spawn settings

export const SPAWN_PADDING = 5;

export const SPAWN_RANGE =
    ARENA_HALF - SPAWN_PADDING;

export const AMBIENT_LIGHT_COLOR = 0x6e8fc5;
export const AMBIENT_LIGHT_INTENSITY = 0.4;
export const DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DIRECTIONAL_LIGHT_INTENSITY = 1.3;
export const DIRECTIONAL_LIGHT_X = 18;
export const DIRECTIONAL_LIGHT_Y = 26;
export const DIRECTIONAL_LIGHT_Z = 12;
export const HEMISPHERE_LIGHT_SKY_COLOR = 0x6aa8ff;
export const HEMISPHERE_LIGHT_GROUND_COLOR = 0x10131a;
export const HEMISPHERE_LIGHT_INTENSITY = 0.62;

export const PICKUP_HEALTH_RESTORE = 25;
export const PICKUP_DURATION_SECONDS = 10;
export const PICKUP_RAPID_FIRE_COOLDOWN_MS = 80;
export const PICKUP_RESPAWN_MIN_SECONDS = 15;
export const PICKUP_RESPAWN_MAX_SECONDS = 20;
