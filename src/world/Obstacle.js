import * as THREE from 'three';

export const OBSTACLE_TYPES = {
  WOODEN_CRATE: 'Wooden Crate',
  CONCRETE_BARRIER: 'Concrete Barrier',
  METAL_PILLAR: 'Metal Pillar',
  ROCK: 'Rock',
};

const OBSTACLE_DEFINITIONS = {
  [OBSTACLE_TYPES.WOODEN_CRATE]: {
    size: new THREE.Vector3(2, 2, 2),
    createMesh: () => new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.8,
        metalness: 0.1,
      })
    ),
  },
  [OBSTACLE_TYPES.CONCRETE_BARRIER]: {
    size: new THREE.Vector3(4, 2, 1),
    createMesh: () => new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 1),
      new THREE.MeshStandardMaterial({
        color: 0x8f8f8f,
        roughness: 0.95,
        metalness: 0.05,
      })
    ),
  },
  [OBSTACLE_TYPES.METAL_PILLAR]: {
    size: new THREE.Vector3(1.6, 3, 1.6),
    createMesh: () => new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 3, 16),
      new THREE.MeshStandardMaterial({
        color: 0xb0c4de,
        roughness: 0.4,
        metalness: 0.9,
      })
    ),
  },
  [OBSTACLE_TYPES.ROCK]: {
    size: new THREE.Vector3(3, 1.5, 2.5),
    createMesh: () => {
      const geometry = new THREE.DodecahedronGeometry(1.5, 0);
      geometry.scale(1.2, 0.9, 1.0);
      return new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: 0x606060,
          roughness: 1,
          metalness: 0.1,
        })
      );
    },
  },
};

export class Obstacle {
  /**
   * @param {THREE.Scene} scene
   * @param {string} type
   * @param {THREE.Vector3} position
   */
  constructor(scene, type, position) {
    const definition = OBSTACLE_DEFINITIONS[type];
    this.type = type;
    this.size = definition.size.clone();
    this.mesh = definition.createMesh();
    this.mesh.position.copy(position);
    this.mesh.position.y = this.size.y / 2;

    if (type === OBSTACLE_TYPES.CONCRETE_BARRIER && Math.random() < 0.5) {
      this.mesh.rotation.y = Math.PI / 2;
    }

    scene.add(this.mesh);
    this.boundingBox = new THREE.Box3();
    this.updateBoundingBox();
  }

  updateBoundingBox() {
    this.boundingBox.setFromObject(this.mesh);
  }
}
