import * as THREE from 'three';

export const OBSTACLE_TYPES = {
  WOODEN_CRATE: 'Wooden Crate',
  CONCRETE_BARRIER: 'Concrete Barrier',
  METAL_PILLAR: 'Metal Pillar',
  ROCK: 'Rock',
};

const OBSTACLE_DEFINITIONS = {
  [OBSTACLE_TYPES.WOODEN_CRATE]: { size: new THREE.Vector3(2.1, 1.9, 2.1) },
  [OBSTACLE_TYPES.CONCRETE_BARRIER]: { size: new THREE.Vector3(4.3, 1.8, 1.4) },
  [OBSTACLE_TYPES.METAL_PILLAR]: { size: new THREE.Vector3(2.6, 9.6, 2.6) },
  [OBSTACLE_TYPES.ROCK]: { size: new THREE.Vector3(3.2, 1.7, 2.7) },
};

const BOX_GEOMETRIES = new Map();
const MATERIAL_VARIANTS = [
  new THREE.MeshStandardMaterial({ color: 0x6c7687, roughness: 0.48, metalness: 0.62 }),
  new THREE.MeshStandardMaterial({ color: 0x566071, roughness: 0.52, metalness: 0.66 }),
  new THREE.MeshStandardMaterial({ color: 0x738095, roughness: 0.44, metalness: 0.58 }),
];
const TRIM_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x2b313d, roughness: 0.36, metalness: 0.82 });

function getSharedBoxGeometry(x, y, z) {
  const key = `${x.toFixed(2)}-${y.toFixed(2)}-${z.toFixed(2)}`;
  if (!BOX_GEOMETRIES.has(key)) {
    BOX_GEOMETRIES.set(key, new THREE.BoxGeometry(x, y, z));
  }
  return BOX_GEOMETRIES.get(key);
}

function applyShadow(meshOrGroup) {
  meshOrGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.geometry) {
        child.geometry.computeVertexNormals();
      }
    }
  });
}

function buildChamferIllusion(group, size) {
  const edgeThickness = 0.14;
  const topInset = 0.08;
  const edgeLongX = getSharedBoxGeometry(size.x - 0.12, edgeThickness, edgeThickness);
  const edgeLongZ = getSharedBoxGeometry(edgeThickness, edgeThickness, size.z - 0.12);
  const cornerGeometry = getSharedBoxGeometry(edgeThickness, size.y - 0.22, edgeThickness);

  const topY = size.y / 2 - topInset;
  const bottomY = -size.y / 2 + topInset;
  const hz = size.z / 2 - edgeThickness * 0.5;
  const hx = size.x / 2 - edgeThickness * 0.5;

  const topFront = new THREE.Mesh(edgeLongX, TRIM_MATERIAL);
  topFront.position.set(0, topY, hz);
  const topBack = new THREE.Mesh(edgeLongX, TRIM_MATERIAL);
  topBack.position.set(0, topY, -hz);
  const topLeft = new THREE.Mesh(edgeLongZ, TRIM_MATERIAL);
  topLeft.position.set(-hx, topY, 0);
  const topRight = new THREE.Mesh(edgeLongZ, TRIM_MATERIAL);
  topRight.position.set(hx, topY, 0);

  const bottomFront = new THREE.Mesh(edgeLongX, TRIM_MATERIAL);
  bottomFront.position.set(0, bottomY, hz);
  const bottomBack = new THREE.Mesh(edgeLongX, TRIM_MATERIAL);
  bottomBack.position.set(0, bottomY, -hz);
  const bottomLeft = new THREE.Mesh(edgeLongZ, TRIM_MATERIAL);
  bottomLeft.position.set(-hx, bottomY, 0);
  const bottomRight = new THREE.Mesh(edgeLongZ, TRIM_MATERIAL);
  bottomRight.position.set(hx, bottomY, 0);

  const corners = [
    [-hx, 0, -hz],
    [hx, 0, -hz],
    [-hx, 0, hz],
    [hx, 0, hz],
  ];
  for (const [x, y, z] of corners) {
    const corner = new THREE.Mesh(cornerGeometry, TRIM_MATERIAL);
    corner.position.set(x, y, z);
    group.add(corner);
  }

  group.add(topFront, topBack, topLeft, topRight, bottomFront, bottomBack, bottomLeft, bottomRight);
}

function createObstacleMesh(type, size) {
  const group = new THREE.Group();
  const baseMaterial = MATERIAL_VARIANTS[Math.floor(Math.random() * MATERIAL_VARIANTS.length)];
  const base = new THREE.Mesh(getSharedBoxGeometry(size.x, size.y, size.z), baseMaterial);
  group.add(base);

  buildChamferIllusion(group, size);

  if (type === OBSTACLE_TYPES.METAL_PILLAR) {
    const collar = new THREE.Mesh(
      getSharedBoxGeometry(size.x + 0.4, 0.3, size.z + 0.4),
      TRIM_MATERIAL
    );
    collar.position.y = size.y / 2 - 0.42;
    group.add(collar);
  }

  if (type === OBSTACLE_TYPES.ROCK) {
    base.scale.set(1.05, 0.95, 0.88 + Math.random() * 0.24);
    base.rotation.y = Math.random() * Math.PI * 2;
  }

  applyShadow(group);
  return group;
}

export class Obstacle {
  constructor(scene, type, position) {
    const definition = OBSTACLE_DEFINITIONS[type];
    this.type = type;
    this.size = definition.size.clone();
    this.mesh = createObstacleMesh(type, this.size);
    this.mesh.position.copy(position);
    this.mesh.position.y = this.size.y / 2;

    if (type === OBSTACLE_TYPES.CONCRETE_BARRIER && Math.random() < 0.5) {
      this.mesh.rotation.y = Math.PI / 2;
    }

    scene.add(this.mesh);
    this.boundingBox = new THREE.Box3();
    this.updateBoundingBox();
  }

  hit() {
    return false;
  }

  updateBoundingBox() {
    this.boundingBox.setFromObject(this.mesh);
  }
}
