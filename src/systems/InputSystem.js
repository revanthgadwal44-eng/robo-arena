/**
 * Centralized keyboard input — tracks key state and fires shoot callback on Space.
 */
import { WEAPON_IDS } from '../constants.js';

const WEAPON_KEY_MAP = {
  '1': WEAPON_IDS.PISTOL,
  '2': WEAPON_IDS.ASSAULT_RIFLE,
  '3': WEAPON_IDS.SHOTGUN,
};

export class InputSystem {
  constructor() {
    /** @type {Record<string, boolean>} */
    this.keys = {};

    /** @type {(() => void) | null} */
    this.onShoot = null;
    /** @type {(() => void) | null} */
    this.onTogglePause = null;
    /** @type {((weaponId: string) => void) | null} */
    this.onWeaponSwitch = null;

    this._lastShootTime = 0;
    this._shootCooldownMs = 250;
    this._dashQueued = false;
    this._enabled = true;

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        this.onTogglePause?.();
        return;
      }

      if (!this._enabled) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        const now = performance.now();
        if (now - this._lastShootTime >= this._shootCooldownMs) {
          this._lastShootTime = now;
          this.onShoot?.();
        }
      }
      if (event.code === 'ShiftLeft' && !event.repeat) {
        this._dashQueued = true;
      }

      const weaponId = WEAPON_KEY_MAP[event.key];
      if (weaponId && !event.repeat) {
        this.onWeaponSwitch?.(weaponId);
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

  /** @param {number} cooldownMs */
  setShootCooldownMs(cooldownMs) {
    this._shootCooldownMs = cooldownMs;
  }

  setEnabled(enabled) {
    this._enabled = enabled;
    if (!enabled) {
      this.keys = {};
      this._dashQueued = false;
    }
  }

  consumeDashPressed() {
    if (!this._dashQueued) {
      return false;
    }
    this._dashQueued = false;
    return true;
  }
}
