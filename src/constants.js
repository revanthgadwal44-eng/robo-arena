/** Shared game configuration — single source for all magic numbers. */

export const SCENE_BACKGROUND = 0x87ceeb;

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
export const PLAYER_Y = 1;
export const PLAYER_SPAWN_X = 0;
export const PLAYER_SPAWN_Z = 0;

export const PLAYER_BODY_COLOR = 0x0000ff;
export const PLAYER_HEAD_COLOR = 0x00ffff;
export const PLAYER_WHEEL_COLOR = 0x000000;

export const BULLET_RADIUS = 0.15;
export const BULLET_SPEED = 0.3;
export const ENEMY_BULLET_SPEED = 0.1;
export const BULLET_DAMAGE = 10;
export const ENEMY_BULLET_DAMAGE = 10;
export const PLAYER_BULLET_COLOR = 0xffff00;
export const ENEMY_BULLET_COLOR = 0xff0000;

export const ENEMY_HEALTH = 50;
export const ENEMY_SPEED = 0.02;
export const ENEMY_MELEE_RANGE = 1.5;
export const ENEMY_MELEE_DAMAGE = 0.1;
export const ENEMY_COLLISION_RADIUS = 1;
export const ENEMY_SHOOT_INTERVAL = 1000;
export const ENEMY_COLOR = 0xff0000;
export const ENEMY_DAMAGED_ORANGE = 0xff8800;
export const ENEMY_DAMAGED_YELLOW = 0xffff00;

/** Enemy type stats — type, health, speed, damage, color */
export const ENEMY_TYPES = {
  normal: {
    health: 50,
    speed: 0.02,
    damage: 10,
    color: 0xff0000,
  },
  fast: {
    health: 30,
    speed: 0.04,
    damage: 8,
    color: 0xff6600,
  },
  tank: {
    health: 100,
    speed: 0.01,
    damage: 15,
    color: 0x990000,
  },
};

/** Weighted spawn probabilities — must sum to 1.0 */
export const ENEMY_SPAWN_WEIGHTS = {
  normal: 0.7,
  fast: 0.2,
  tank: 0.1,
};

/** Arena geometry — 80x80 scalable arena */
export const ARENA_SIZE = 80;
export const ARENA_HALF = ARENA_SIZE / 2;
export const WALL_HEIGHT = 2;
export const WALL_THICKNESS = 1;
export const SPAWN_PADDING = 5;
export const FLOOR_COLOR = 0x808080;
export const WALL_COLOR = 0x555555;

/** Spawn range ensures enemies always spawn safely inside walls */
export const SPAWN_RANGE = ARENA_HALF - SPAWN_PADDING;
export const SPAWN_RANGE_DOUBLED = SPAWN_RANGE * 2;

export const AMBIENT_LIGHT_COLOR = 0xffffff;
export const AMBIENT_LIGHT_INTENSITY = 1;
export const DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DIRECTIONAL_LIGHT_INTENSITY = 2;
export const DIRECTIONAL_LIGHT_X = 5;
export const DIRECTIONAL_LIGHT_Y = 10;
export const DIRECTIONAL_LIGHT_Z = 5;
