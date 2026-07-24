import * as THREE from 'three';
import {
  ARENA_SIZE,
  ARENA_HALF,
  WALL_HEIGHT,
  FLOOR_COLOR,
  WALL_COLOR,
} from '../constants.js';

/**
 * Arena world geometry — floor, boundary walls, and environment decorations.
 */
export class Arena {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.size = ARENA_SIZE;
    this.half = ARENA_HALF;
    this._build(scene);
  }

  _build(scene) {
    this._buildFloor(scene);
    this._buildWalls(scene);
    this._buildDecorations(scene);
    this._addPerimeterAccentLights(scene);
  }

  _buildFloor(scene) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size, this.size),
      new THREE.MeshStandardMaterial({
        color: 0x3e434a,
        roughness: 0.95,
        metalness: 0.05,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    scene.add(this._createFloorGrid());
    scene.add(this._createCenterRing());
  }

  _buildWalls(scene) {
    this._createWall(scene, 0, -this.half, this.size, 1);
    this._createWall(scene, 0, this.half, this.size, 1);
    this._createWall(scene, -this.half, 0, 1, this.size);
    this._createWall(scene, this.half, 0, 1, this.size);
    this._addWarningStripes(scene);
    this._addWallLights(scene);
  }

  _buildDecorations(scene) {
    this._addEnergyGenerators(scene);
    this._addRepairStations(scene);
    this._addArenaProps(scene);
  }

  _createWall(scene, x, z, width, depth) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, WALL_HEIGHT, depth),
      new THREE.MeshStandardMaterial({ color: WALL_COLOR })
    );
    wall.position.set(x, WALL_HEIGHT / 2, z);
    scene.add(wall);
  }

  _createFloorGrid() {
    const grid = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x5a6170 });
    const lines = new THREE.BufferGeometry();
    const positions = [];
    const spacing = 4;

    for (let x = -this.half; x <= this.half; x += spacing) {
      positions.push(x, 0.01, -this.half, x, 0.01, this.half);
    }
    for (let z = -this.half; z <= this.half; z += spacing) {
      positions.push(-this.half, 0.01, z, this.half, 0.01, z);
    }

    lines.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    grid.add(new THREE.LineSegments(lines, material));
    return grid;
  }

  _createCenterRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 4.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fc7ff, emissive: 0x2f9cff, emissiveIntensity: 0.15, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    return ring;
  }

  _addWarningStripes(scene) {
    const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.6, metalness: 0.1 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.1 });
    const stripeLength = 6;
    const stripeWidth = 0.5;
    const stripeHeight = 0.05;

    const positions = [
      { x: 0, z: -this.half + 0.5, rotation: 0 },
      { x: 0, z: this.half - 0.5, rotation: 0 },
      { x: -this.half + 0.5, z: 0, rotation: Math.PI / 2 },
      { x: this.half - 0.5, z: 0, rotation: Math.PI / 2 },
    ];

    for (const placement of positions) {
      for (let offset = -12; offset <= 12; offset += stripeLength * 2) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(stripeLength, stripeHeight, stripeWidth),
          stripeMaterial
        );
        stripe.position.set(placement.x, 0.02, placement.z + offset);
        stripe.rotation.y = placement.rotation;
        scene.add(stripe);

        const darkStripe = new THREE.Mesh(
          new THREE.BoxGeometry(stripeLength, stripeHeight, stripeWidth),
          darkMaterial
        );
        darkStripe.position.set(placement.x, 0.02, placement.z + offset + stripeLength);
        darkStripe.rotation.y = placement.rotation;
        scene.add(darkStripe);
      }
    }
  }

  _addWallLights(scene) {
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x73d4ff });
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2a35, roughness: 0.9, metalness: 0.2 });
    const positions = [
      { x: -this.half + 1.5, z: -this.half + 1.5 },
      { x: this.half - 1.5, z: -this.half + 1.5 },
      { x: -this.half + 1.5, z: this.half - 1.5 },
      { x: this.half - 1.5, z: this.half - 1.5 },
    ];

    for (const placement of positions) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.1, 10),
        standMaterial
      );
      pole.position.set(placement.x, 0.55, placement.z);
      scene.add(pole);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 10),
        lightMaterial
      );
      bulb.position.set(placement.x, 1.15, placement.z);
      scene.add(bulb);

      const pointLight = new THREE.PointLight(0x73d4ff, 0.4, 10);
      pointLight.position.set(placement.x, 1.15, placement.z);
      scene.add(pointLight);

      const warningLight = new THREE.PointLight(0xff8b2b, 0.28, 8);
      warningLight.position.set(placement.x, 0.6, placement.z);
      scene.add(warningLight);
    }
  }

  _addEnergyGenerators(scene) {
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x222832, roughness: 0.7, metalness: 0.3 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x7be9ff, emissive: 0x2788c7, emissiveIntensity: 0.35 });
    const generatorPositions = [
      { x: -this.half + 8, z: -this.half + 8 },
      { x: this.half - 8, z: -this.half + 8 },
      { x: -this.half + 8, z: this.half - 8 },
      { x: this.half - 8, z: this.half - 8 },
    ];

    for (const position of generatorPositions) {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.0, 1.2, 12),
        baseMaterial
      );
      base.position.set(position.x, 0.6, position.z);
      scene.add(base);

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.6, 12),
        topMaterial
      );
      core.position.set(position.x, 1.4, position.z);
      scene.add(core);

      const glow = new THREE.PointLight(0x77dfff, 0.3, 8);
      glow.position.set(position.x, 1.4, position.z);
      scene.add(glow);
    }
  }

  _addRepairStations(scene) {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8, metalness: 0.2 });
    const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x4bc1ff, emissive: 0x1d80b3, emissiveIntensity: 0.2 });
    const stationPositions = [
      { x: 0, z: -this.half + 6 },
      { x: 0, z: this.half - 6 },
      { x: -this.half + 6, z: 0 },
      { x: this.half - 6, z: 0 },
    ];

    for (const placement of stationPositions) {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.3, 1.2),
        bodyMaterial
      );
      base.position.set(placement.x, 0.15, placement.z);
      scene.add(base);

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        panelMaterial
      );
      panel.position.set(placement.x, 0.7, placement.z - 0.15);
      panel.rotation.x = -Math.PI / 6;
      scene.add(panel);
    }
  }

  _addPerimeterAccentLights(scene) {
    const placements = [
      { x: -this.half + 2, z: -this.half / 2 },
      { x: -this.half + 2, z: this.half / 2 },
      { x: this.half - 2, z: -this.half / 2 },
      { x: this.half - 2, z: this.half / 2 },
      { x: -this.half / 2, z: -this.half + 2 },
      { x: this.half / 2, z: -this.half + 2 },
      { x: -this.half / 2, z: this.half - 2 },
      { x: this.half / 2, z: this.half - 2 },
    ];

    for (const placement of placements) {
      const blueLight = new THREE.PointLight(0x47b9ff, 0.55, 16);
      blueLight.position.set(placement.x, 2.4, placement.z);
      scene.add(blueLight);

      const warningLight = new THREE.PointLight(0xff7a1a, 0.26, 11);
      warningLight.position.set(placement.x * 0.94, 1.1, placement.z * 0.94);
      scene.add(warningLight);
    }
  }

  _addArenaProps(scene) {
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2633, roughness: 0.9, metalness: 0.2 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x4dbdff, emissive: 0x1f7eb1, emissiveIntensity: 0.25 });
    const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x324158, roughness: 0.8, metalness: 0.25 });

    const postPositions = [
      { x: -14, z: -14 },
      { x: 14, z: -14 },
      { x: -14, z: 14 },
      { x: 14, z: 14 },
      { x: 0, z: -18 },
      { x: 0, z: 18 },
    ];

    for (const position of postPositions) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 2.4, 10),
        postMaterial
      );
      post.position.set(position.x, 1.2, position.z);
      scene.add(post);

      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 10),
        topMaterial
      );
      top.position.set(position.x, 2.45, position.z);
      scene.add(top);
    }

    const cratePositions = [
      { x: -10, z: 2 },
      { x: 10, z: -2 },
      { x: -4, z: 12 },
      { x: 4, z: -12 },
      { x: -18, z: 0 },
      { x: 18, z: 0 },
    ];
    for (const position of cratePositions) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.2, 1.5),
        crateMaterial
      );
      crate.position.set(position.x, 0.6, position.z);
      scene.add(crate);
    }
  }
}
