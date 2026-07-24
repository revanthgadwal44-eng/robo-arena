/**
 * Lightweight bullet entity — holds mesh reference, travel direction, and damage.
 */
export class Bullet {
  /**
   * @param {import('three').Mesh} mesh
   * @param {import('three').Vector3} direction
   * @param {number} [damage]
   * @param {{
   *   speed?: number,
   *   radius?: number,
   *   splashDamage?: number,
   *   splashRadius?: number,
   *   trailType?: 'energy' | 'smoke' | 'player',
   *   explosionSize?: number,
   *   isMissile?: boolean
   * }} [options]
   */
  constructor(mesh, direction, damage, options = {}) {
    this.mesh = mesh;
    this.direction = direction;
    this.damage = damage;
    this.speed = options.speed;
    this.radius = options.radius;
    this.splashDamage = options.splashDamage;
    this.splashRadius = options.splashRadius;
    this.trailType = options.trailType;
    this.explosionSize = options.explosionSize;
    this.isMissile = options.isMissile ?? false;
    this._trailCooldown = 0;
  }
}
