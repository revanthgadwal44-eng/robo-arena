/**
 * Centralized keyboard input — tracks key state and fires shoot callback on Space.
 */
export class InputSystem {
  constructor() {
    /** @type {Record<string, boolean>} */
    this.keys = {};

    /** @type {(() => void) | null} */
    this.onShoot = null;

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        this.onShoot?.();
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
