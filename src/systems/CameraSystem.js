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
    this._shakeOffset = new THREE.Vector3();
    this._shakeIntensity = 0;
    this._shakeDamping = 3.8;
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
    if (this._shakeIntensity > 0) {
      this._shakeOffset.set(
        (Math.random() - 0.5) * this._shakeIntensity,
        (Math.random() - 0.5) * this._shakeIntensity * 0.7,
        (Math.random() - 0.5) * this._shakeIntensity
      );
      this._desiredPosition.add(this._shakeOffset);
      this._shakeIntensity = Math.max(0, this._shakeIntensity - this._shakeDamping * 0.016);
    }
    this.camera.position.lerp(this._desiredPosition, CAMERA_LERP);
    this.camera.lookAt(targetPosition);
  }

  addShake(intensity) {
    this._shakeIntensity = Math.min(1.4, this._shakeIntensity + intensity);
  }
}
