/**
 * Centralized keyboard input — tracks key state and fires shoot callback on Space.
 */
import { PLAYER_SHOOT_COOLDOWN } from '../constants.js';

export class InputSystem {
  constructor() {
    /** @type {Record<string, boolean>} */
    this.keys = {};

    /** @type {(() => void) | null} */
    this.onShoot = null;

    this._lastShootTime = 0;

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        const now = performance.now();
        if (now - this._lastShootTime >= PLAYER_SHOOT_COOLDOWN) {
          this._lastShootTime = now;
          this.onShoot?.();
        }
      }
      this.keys[event.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false;
    });
  }

  /** @param {string} key */
  isPressed(key) {
    return !!this.keys[key];
  }
}
