import * as THREE from 'three';
import {
  CAMERA_HEIGHT,
  CAMERA_DISTANCE,
  CAMERA_LERP,
} from '../constants.js';

/**
 * Third-person camera follow with smooth lerp behind the player.
 */
export class CameraSystem {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.camera = camera;
    this._offset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    this._yAxis = new THREE.Vector3(0, 1, 0);
    this._desiredPosition = new THREE.Vector3();
  }

  /**
   * Computes offset from player rotation, lerps camera, and looks at target.
   * @param {THREE.Vector3} targetPosition
   * @param {number} targetRotationY
   */
  update(targetPosition, targetRotationY) {
    this._offset.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    this._offset.applyAxisAngle(this._yAxis, targetRotationY);

    this._desiredPosition.copy(targetPosition).add(this._offset);
    this.camera.position.lerp(this._desiredPosition, CAMERA_LERP);
    this.camera.lookAt(targetPosition);
  }
}
