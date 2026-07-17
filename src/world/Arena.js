import * as THREE from 'three';
import {
  ARENA_SIZE,
  ARENA_HALF,
  WALL_HEIGHT,
  WALL_THICKNESS,
  FLOOR_COLOR,
  WALL_COLOR,
} from '../constants.js';

/**
 * Arena world geometry — floor, boundary walls, and shared bounds constants.
 */
export class Arena {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.size = ARENA_SIZE;
    this.half = ARENA_HALF;
    this._build(scene);
  }

  _build(scene) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size, this.size),
      new THREE.MeshStandardMaterial({ color: FLOOR_COLOR })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    this._createWall(scene, 0, -this.half, this.size, WALL_THICKNESS);
    this._createWall(scene, 0, this.half, this.size, WALL_THICKNESS);
    this._createWall(scene, -this.half, 0, WALL_THICKNESS, this.size);
    this._createWall(scene, this.half, 0, WALL_THICKNESS, this.size);
  }

  _createWall(scene, x, z, width, depth) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, WALL_HEIGHT, depth),
      new THREE.MeshStandardMaterial({ color: WALL_COLOR })
    );
    wall.position.set(x, WALL_HEIGHT / 2, z);
    scene.add(wall);
  }
}
