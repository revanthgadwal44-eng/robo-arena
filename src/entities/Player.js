import * as THREE from 'three';
import {
  PLAYER_MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_ROTATION_SPEED,
  PLAYER_Y,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
  PLAYER_BODY_COLOR,
  PLAYER_HEAD_COLOR,
  PLAYER_WHEEL_COLOR,
  ARENA_HALF,
} from '../constants.js';

/**
 * Player-controlled tank robot.
 * Owns mesh creation, tank movement, rotation, and shoot origin/direction.
 */
export class Player {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.health = PLAYER_MAX_HEALTH;
    this.mesh = this._createRobot();
    this.mesh.position.y = PLAYER_Y;
    scene.add(this.mesh);

    /** Reused each frame to avoid per-frame Vector3 allocation during movement. */
    this._facing = new THREE.Vector3();
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

    return robot;
  }

  /**
   * Applies tank controls: A/D rotate, W/S move relative to facing.
   * Clamps position to stay within arena bounds.
   * @param {import('../systems/InputSystem.js').InputSystem} input
   */
  update(input) {
    if (input.isPressed('a')) {
      this.mesh.rotation.y += PLAYER_ROTATION_SPEED;
    }
    if (input.isPressed('d')) {
      this.mesh.rotation.y -= PLAYER_ROTATION_SPEED;
    }

    const rotationY = this.mesh.rotation.y;

    if (input.isPressed('w')) {
      this.mesh.position.x -= Math.sin(rotationY) * PLAYER_SPEED;
      this.mesh.position.z -= Math.cos(rotationY) * PLAYER_SPEED;
    }
    if (input.isPressed('s')) {
      this.mesh.position.x += Math.sin(rotationY) * PLAYER_SPEED;
      this.mesh.position.z += Math.cos(rotationY) * PLAYER_SPEED;
    }

    // Clamp position to arena bounds with 1 unit safety margin
    const max = ARENA_HALF - 1;
    const min = -ARENA_HALF + 1;
    this.mesh.position.x = Math.max(min, Math.min(max, this.mesh.position.x));
    this.mesh.position.z = Math.max(min, Math.min(max, this.mesh.position.z));
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

  /** Resets health and position after death — matches original behavior. */
  respawn() {
    this.health = PLAYER_MAX_HEALTH;
    this.mesh.position.set(PLAYER_SPAWN_X, PLAYER_Y, PLAYER_SPAWN_Z);
  }
}
