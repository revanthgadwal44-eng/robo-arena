import * as THREE from 'three';
import { WEAPON_IDS, WEAPONS } from '../constants.js';

/**
 * Tracks the active weapon, fire cooldown, and bullet spawn requests.
 * Does not handle bullet movement, collision, or hit effects — those stay in BulletManager.
 */
export class WeaponManager {
  /**
   * @param {import('./BulletManager.js').BulletManager} bulletManager
   * @param {import('./AudioManager.js').AudioManager} audioManager
   * @param {import('../systems/InputSystem.js').InputSystem} input
   * @param {(() => number) | null} [resolveCooldownMs]
   */
  constructor(bulletManager, audioManager, input, resolveCooldownMs = null) {
    this.bulletManager = bulletManager;
    this.audioManager = audioManager;
    this.input = input;
    this._resolveCooldownMs = resolveCooldownMs;
    this.currentWeaponId = WEAPON_IDS.PISTOL;
    /** Reused when applying spread — avoids per-pellet Vector3 allocation. */
    this._spreadDirection = new THREE.Vector3();
  }

  /** @param {() => number} resolver */
  setResolveCooldownMs(resolver) {
    this._resolveCooldownMs = resolver;
  }

  syncInputCooldown() {
    this._syncInputCooldown();
  }

  /** @returns {typeof WEAPONS[keyof typeof WEAPONS]} */
  getCurrentWeapon() {
    return WEAPONS[this.currentWeaponId];
  }

  /** Fire-rate cooldown in milliseconds for the active weapon. */
  getShootCooldownMs() {
    return this.getCurrentWeapon().cooldown * 1000;
  }

  /**
   * Switch to a weapon by id. Returns true when the weapon actually changed.
   * @param {string} weaponId
   */
  switchWeapon(weaponId) {
    if (!WEAPONS[weaponId] || weaponId === this.currentWeaponId) {
      return false;
    }
    this.currentWeaponId = weaponId;
    this._syncInputCooldown();
    return true;
  }

  /**
   * Fire the current weapon using the player's aim origin and direction.
   * @param {import('../entities/Player.js').Player} player
   */
  fire(player) {
    const weapon = this.getCurrentWeapon();
    const origin = player.getShootOrigin();
    const baseDirection = player.getShootDirection();

    for (let i = 0; i < weapon.bulletCount; i++) {
      const direction = this._getSpreadDirection(baseDirection, weapon.spread);
      this.bulletManager.shootPlayer(origin, direction, {
        damage: weapon.damage,
        spawnEffects: i === 0,
      });
    }

    this.audioManager.playWeaponShoot(weapon.sound);
  }

  reset() {
    this.currentWeaponId = WEAPON_IDS.PISTOL;
    this._syncInputCooldown();
  }

  _syncInputCooldown() {
    const cooldownMs = this._resolveCooldownMs?.() ?? this.getShootCooldownMs();
    this.input.setShootCooldownMs(cooldownMs);
  }

  /**
   * Applies horizontal spread around the Y axis.
   * @param {THREE.Vector3} baseDirection
   * @param {number} spread
   */
  _getSpreadDirection(baseDirection, spread) {
    if (spread <= 0) {
      this._spreadDirection.copy(baseDirection);
      return this._spreadDirection;
    }

    const angle = (Math.random() - 0.5) * 2 * spread;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = baseDirection.x;
    const z = baseDirection.z;
    this._spreadDirection.set(
      x * cos - z * sin,
      0,
      x * sin + z * cos
    );
    return this._spreadDirection;
  }
}
