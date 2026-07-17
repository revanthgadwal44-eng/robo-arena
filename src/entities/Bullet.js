/**
 * Lightweight bullet entity — holds mesh reference, travel direction, and damage.
 */
export class Bullet {
  /**
   * @param {import('three').Mesh} mesh
   * @param {import('three').Vector3} direction
   * @param {number} [damage]
   */
  constructor(mesh, direction, damage) {
    this.mesh = mesh;
    this.direction = direction;
    this.damage = damage;
  }
}
