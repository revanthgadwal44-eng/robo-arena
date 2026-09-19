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
/** Default bullet damage — used when a bullet has no explicit damage value. */
export const BULLET_DAMAGE = 10;

/** Weapon identifiers for keyboard switching and lookups. */
export const WEAPON_IDS = {
  PISTOL: 'pistol',
  ASSAULT_RIFLE: 'assault_rifle',
  SHOTGUN: 'shotgun',
};

/** Data-driven weapon definitions — single source for all player weapons. */
export const WEAPONS = {
  [WEAPON_IDS.PISTOL]: {
    id: WEAPON_IDS.PISTOL,
    name: 'Pistol',
    damage: 10,
    cooldown: 0.25,
    bulletCount: 1,
    spread: 0.01,
    sound: 'pistol',
  },
  [WEAPON_IDS.ASSAULT_RIFLE]: {
    id: WEAPON_IDS.ASSAULT_RIFLE,
    name: 'Assault Rifle',
    damage: 7,
    cooldown: 0.10,
    bulletCount: 1,
    spread: 0.04,
    sound: 'assault_rifle',
  },
  [WEAPON_IDS.SHOTGUN]: {
    id: WEAPON_IDS.SHOTGUN,
    name: 'Shotgun',
    damage: 8,
    cooldown: 0.8,
    bulletCount: 6,
    spread: 0.18,
    sound: 'shotgun',
  },
};
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
export const ENEMY_FLASH_COLOR = 0xffffff;
export const ENEMY_HURT_DURATION_SECONDS = 0.25;
export const ENEMY_DETECTION_RANGE = 16;
export const ENEMY_AVOIDANCE_RADIUS = 4.5;
export const ENEMY_LOS_CHECK_INTERVAL_SECONDS = 0.25;

export const ENEMY_STATES = {
  IDLE: 'idle',
  CHASE: 'chase',
  ATTACK: 'attack',
  HURT: 'hurt',
  DEAD: 'dead',
};

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

/** Boss phase thresholds (health ratio). */
export const BOSS_PHASE2_HEALTH_RATIO = 0.7;
export const BOSS_PHASE3_HEALTH_RATIO = 0.35;
export const BOSS_PHASE_TRANSITION_SECONDS = 0.85;
export const BOSS_AREA_SLAM_WINDUP_SECONDS = 1.05;
export const BOSS_AREA_SLAM_DAMAGE = 14;
export const BOSS_AREA_SLAM_RADIUS = 5.8;
export const BOSS_AREA_SLAM_INTERVAL_SECONDS = 9;

export const BOSS_PHASES = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
};

/** Per-phase combat modifiers — applied on top of base boss stats. */
export const BOSS_PHASE_CONFIG = {
  [BOSS_PHASES.ONE]: {
    label: 'PHASE I',
    speedMultiplier: 1,
    shotCooldownMultiplier: 1,
    shotsPerBurst: BOSS_SHOTS_PER_BURST,
    chargeSpeedMultiplier: 1,
    chaseMinDurationMultiplier: 1,
    cooldownMultiplier: 1,
    fanShots: 0,
    radialShots: 0,
    bonusMissiles: 0,
  },
  [BOSS_PHASES.TWO]: {
    label: 'PHASE II',
    speedMultiplier: 1.35,
    shotCooldownMultiplier: 0.72,
    shotsPerBurst: 5,
    chargeSpeedMultiplier: 1.22,
    chaseMinDurationMultiplier: 0.72,
    cooldownMultiplier: 0.82,
    fanShots: 5,
    radialShots: 0,
    bonusMissiles: 1,
  },
  [BOSS_PHASES.THREE]: {
    label: 'PHASE III — ENRAGED',
    speedMultiplier: 1.62,
    shotCooldownMultiplier: 0.52,
    shotsPerBurst: 6,
    chargeSpeedMultiplier: 1.48,
    chaseMinDurationMultiplier: 0.55,
    cooldownMultiplier: 0.62,
    fanShots: 5,
    radialShots: 8,
    bonusMissiles: 2,
  },
};

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
    attackRange: 5.5,
    attackCooldown: 1.1,
    detectionRange: 16,
    hurtDuration: 0.25,
    knockback: 0.6,
  },
  [ENEMY_TYPES.FAST]: {
    health: 30,
    speed: 0.04,
    damage: 8,
    color: 0xff6600,
    attackRange: 4.2,
    attackCooldown: 0.7,
    detectionRange: 18,
    hurtDuration: 0.18,
    knockback: 0.8,
  },
  [ENEMY_TYPES.TANK]: {
    health: 100,
    speed: 0.01,
    damage: 15,
    color: 0x880000,
    attackRange: 7.5,
    attackCooldown: 1.6,
    detectionRange: 14,
    hurtDuration: 0.35,
    knockback: 0.3,
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

export const GAME_VERSION = 'v0.3.0';

export const GAME_MODES = {
  SURVIVAL: 'survival',
  BOSS_RUSH: 'boss_rush',
};

export const BOSS_RUSH_BOSS_COUNT = 4;

/** Strategic arena layout zones — used for obstacle placement and spawn bias. */
export const ARENA_ZONES = {
  OPEN_CENTER: { x: 0, z: 0, radius: 10, label: 'open' },
  COVER_NW: { x: -22, z: -22, radius: 14, label: 'cover' },
  COVER_NE: { x: 22, z: -22, radius: 14, label: 'cover' },
  COVER_SW: { x: -22, z: 22, radius: 14, label: 'cover' },
  COVER_SE: { x: 22, z: 22, radius: 14, label: 'cover' },
  SPAWN_N: { x: 0, z: -28, radius: 12, label: 'spawn' },
  SPAWN_S: { x: 0, z: 28, radius: 12, label: 'spawn' },
  SPAWN_E: { x: 28, z: 0, radius: 12, label: 'spawn' },
  SPAWN_W: { x: -28, z: 0, radius: 12, label: 'spawn' },
  BOSS_ARENA: { x: 0, z: -18, radius: 16, label: 'boss' },
};

export const GRAPHICS_QUALITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};
