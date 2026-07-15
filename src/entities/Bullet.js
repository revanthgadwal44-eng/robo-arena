/**
 * Lightweight bullet entity — holds mesh reference and travel direction.
 */
export class Bullet {
  /**
   * @param {import('three').Mesh} mesh
   * @param {import('three').Vector3} direction
   */
  constructor(mesh, direction) {
    this.mesh = mesh;
    this.direction = direction;
  }
}
