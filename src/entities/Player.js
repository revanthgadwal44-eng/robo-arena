import * as THREE from 'three';
import {
  PLAYER_MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_ROTATION_SPEED,
  PLAYER_Y,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
  PLAYER_COLLISION_RADIUS,
  PLAYER_DASH_COOLDOWN_SECONDS,
  PLAYER_DASH_DURATION_SECONDS,
  PLAYER_DASH_SPEED,
  PLAYER_BODY_COLOR,
  PLAYER_HEAD_COLOR,
  PLAYER_WHEEL_COLOR,
} from '../constants.js';

/**
 * Player-controlled tank robot.
 * Owns mesh creation, tank movement, rotation, and shoot origin/direction.
 */
export class Player {
  /** @param {THREE.Scene} scene */
  constructor(scene, obstacleManager) {
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.mesh = this._createRobot();
    this.mesh.position.y = PLAYER_Y;
    scene.add(this.mesh);
    this.obstacleManager = obstacleManager;
    this._collisionRadius = PLAYER_COLLISION_RADIUS;

    /** Reused each frame to avoid per-frame Vector3 allocation during movement. */
    this._facing = new THREE.Vector3();
    this._movement = new THREE.Vector3();
    this._dashMovement = new THREE.Vector3();
    this._dashRemainingSeconds = 0;
    this._dashCooldownUntilMs = 0;
    this._damageMultiplier = 1;
  }

  /** Builds the robot as a THREE.Group with body, head, and wheels. */
  _createRobot() {
    const robot = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 1),
      new THREE.MeshStandardMaterial({ color: PLAYER_BODY_COLOR })
    );
    robot.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: PLAYER_HEAD_COLOR })
    );
    head.position.set(0, 0.9, 0);
    robot.add(head);

    const wheelGeometry = new THREE.BoxGeometry(0.3, 0.5, 0.5);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: PLAYER_WHEEL_COLOR });

    const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    leftWheel.position.set(-1.2, -0.5, 0);
    robot.add(leftWheel);

    const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rightWheel.position.set(1.2, -0.5, 0);
    robot.add(rightWheel);

    robot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return robot;
  }

  /**
   * Applies tank controls: A/D rotate, W/S move relative to facing.
   * @param {import('../systems/InputSystem.js').InputSystem} input
   */
  update(input, delta) {
    const now = performance.now();
    if (input.consumeDashPressed() && now >= this._dashCooldownUntilMs) {
      this._dashRemainingSeconds = PLAYER_DASH_DURATION_SECONDS;
      this._dashCooldownUntilMs = now + PLAYER_DASH_COOLDOWN_SECONDS * 1000;
    }

    if (input.isPressed('a')) {
      this.mesh.rotation.y += PLAYER_ROTATION_SPEED;
    }
    if (input.isPressed('d')) {
      this.mesh.rotation.y -= PLAYER_ROTATION_SPEED;
    }

    const rotationY = this.mesh.rotation.y;
    this._movement.set(0, 0, 0);

    if (input.isPressed('w')) {
      this._movement.x -= Math.sin(rotationY) * PLAYER_SPEED;
      this._movement.z -= Math.cos(rotationY) * PLAYER_SPEED;
    }
    if (input.isPressed('s')) {
      this._movement.x += Math.sin(rotationY) * PLAYER_SPEED;
      this._movement.z += Math.cos(rotationY) * PLAYER_SPEED;
    }

    if (this._movement.lengthSq() > 0) {
      this._moveWithCollision(this._movement);
    }

    if (this._dashRemainingSeconds > 0) {
      this._dashMovement.copy(this.getShootDirection()).multiplyScalar(PLAYER_DASH_SPEED * delta);
      this._moveWithCollision(this._dashMovement);
      this._dashRemainingSeconds = Math.max(0, this._dashRemainingSeconds - delta);
    }
  }

  _moveWithCollision(delta) {
    const initialPosition = this.mesh.position.clone();
    this.mesh.position.add(delta);

    if (this.obstacleManager && this.obstacleManager.isCircleBlocked(this.mesh.position, this._collisionRadius)) {
      this.mesh.position.copy(initialPosition);

      this.mesh.position.x += delta.x;
      if (this.obstacleManager.isCircleBlocked(this.mesh.position, this._collisionRadius)) {
        this.mesh.position.x = initialPosition.x;
      }

      this.mesh.position.z += delta.z;
      if (this.obstacleManager.isCircleBlocked(this.mesh.position, this._collisionRadius)) {
        this.mesh.position.z = initialPosition.z;
      }
    }
  }

  /** World position where player bullets spawn. */
  getShootOrigin() {
    const origin = this.mesh.position.clone();
    origin.y = PLAYER_Y;
    return origin;
  }

  /** Normalized horizontal direction the robot is facing. */
  getShootDirection() {
    this._facing.set(
      -Math.sin(this.mesh.rotation.y),
      0,
      -Math.cos(this.mesh.rotation.y)
    );
    return this._facing.clone();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  setDamageMultiplier(multiplier) {
    this._damageMultiplier = multiplier;
  }

  applyDamage(amount) {
    this.health -= amount * this._damageMultiplier;
  }

  isDashing() {
    return this._dashRemainingSeconds > 0;
  }

  /** Resets health and position after death — matches original behavior. */
  respawn() {
    this.health = this.maxHealth;
    this.mesh.position.set(PLAYER_SPAWN_X, PLAYER_Y, PLAYER_SPAWN_Z);
  }
}
