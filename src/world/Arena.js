import * as THREE from 'three';
import {
  ARENA_SIZE,
  ARENA_HALF,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from '../constants.js';

const METAL_FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x2f3745,
  roughness: 0.58,
  metalness: 0.66,
});
const METAL_TILE_DARK = new THREE.MeshStandardMaterial({
  color: 0x222a38,
  roughness: 0.64,
  metalness: 0.6,
});
const METAL_TILE_LIGHT = new THREE.MeshStandardMaterial({
  color: 0x3c4658,
  roughness: 0.52,
  metalness: 0.68,
});
const STRIPE_YELLOW = new THREE.MeshStandardMaterial({ color: 0xe6bc2a, roughness: 0.44, metalness: 0.52 });
const STRIPE_BLACK = new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.72, metalness: 0.4 });
const WALL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x4b5361, roughness: 0.56, metalness: 0.62 });
const WALL_TRIM_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x1d2430, roughness: 0.36, metalness: 0.86 });
const WARNING_LIGHT_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff9140,
  emissive: 0xff5e1a,
  emissiveIntensity: 0.8,
  roughness: 0.3,
  metalness: 0.3,
});
const BLUE_GLOW_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x7ec5ff,
  emissive: 0x2f8ed9,
  emissiveIntensity: 0.5,
  roughness: 0.34,
  metalness: 0.4,
});
const DECOR_DARK = new THREE.MeshStandardMaterial({ color: 0x27303f, roughness: 0.62, metalness: 0.62 });
const DECOR_LIGHT = new THREE.MeshStandardMaterial({ color: 0x657286, roughness: 0.52, metalness: 0.66 });
const PIPE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x4e627c, roughness: 0.46, metalness: 0.78 });

const BOX = {
  FLOOR: new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
  TILE: new THREE.BoxGeometry(3.8, 0.05, 3.8),
  SECTION_PLATE: new THREE.BoxGeometry(10, 0.06, 10),
  STRIPE: new THREE.BoxGeometry(2.2, 0.06, 0.44),
  SCRATCH: new THREE.BoxGeometry(0.8, 0.012, 0.1),
  WALL_NS: new THREE.BoxGeometry(ARENA_SIZE, WALL_HEIGHT, WALL_THICKNESS),
  WALL_EW: new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE),
  WALL_TRIM_LONG: new THREE.BoxGeometry(ARENA_SIZE + 0.3, 0.35, 0.28),
  WALL_TRIM_SIDE: new THREE.BoxGeometry(0.28, 0.35, ARENA_SIZE + 0.3),
  PILLAR: new THREE.BoxGeometry(1.4, WALL_HEIGHT + 1.8, 1.4),
  PILLAR_CAP: new THREE.BoxGeometry(1.9, 0.4, 1.9),
  CRATE: new THREE.BoxGeometry(1.8, 1.3, 1.8),
  GENERATOR_BASE: new THREE.BoxGeometry(2.1, 1.3, 2.1),
  GENERATOR_CORE: new THREE.BoxGeometry(1.1, 1.6, 1.1),
  ROBOT_PART: new THREE.BoxGeometry(0.9, 0.35, 0.6),
  ANTENNA_BASE: new THREE.BoxGeometry(0.42, 0.3, 0.42),
  REPAIR_BASE: new THREE.BoxGeometry(2.3, 0.45, 1.4),
  REPAIR_PANEL: new THREE.BoxGeometry(1.6, 0.9, 0.15),
  LIGHT_POLE_BASE: new THREE.BoxGeometry(0.5, 0.3, 0.5),
};
const CYLINDER = {
  PIPE: new THREE.CylinderGeometry(0.24, 0.24, 3.2, 12),
  ANTENNA_STEM: new THREE.CylinderGeometry(0.06, 0.08, 1.5, 8),
  LIGHT_POLE_STEM: new THREE.CylinderGeometry(0.12, 0.14, 3.2, 10),
  LIGHT_BULB: new THREE.SphereGeometry(0.25, 12, 10),
};

function setShadow(object) {
  object.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.size = ARENA_SIZE;
    this.half = ARENA_HALF;
    this._build();
  }

  _build() {
    this._buildFloor();
    this._buildWalls();
    this._addEnvironmentProps();
  }

  _buildFloor() {
    const floor = new THREE.Mesh(BOX.FLOOR, METAL_FLOOR_MATERIAL);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this._addFloorTileGrid();
    this._addFloorSections();
    this._addHazardStripes();
    this._addFloorWear();
  }

  _addFloorTileGrid() {
    const tileGroup = new THREE.Group();
    const spacing = 4;
    for (let x = -this.half + 2; x <= this.half - 2; x += spacing) {
      for (let z = -this.half + 2; z <= this.half - 2; z += spacing) {
        const tile = new THREE.Mesh(
          BOX.TILE,
          (Math.floor((x + z) / spacing) % 2 === 0) ? METAL_TILE_DARK : METAL_TILE_LIGHT
        );
        tile.position.set(x, 0.03, z);
        tile.receiveShadow = true;
        tileGroup.add(tile);
      }
    }
    this.scene.add(tileGroup);
  }

  _addFloorSections() {
    const sectionPositions = [
      { x: -14, z: -14, rot: 0.14 },
      { x: 14, z: -14, rot: -0.12 },
      { x: -14, z: 14, rot: -0.08 },
      { x: 14, z: 14, rot: 0.1 },
      { x: 0, z: -18, rot: 0.07 },
      { x: 0, z: 18, rot: -0.07 },
    ];
    for (const section of sectionPositions) {
      const plate = new THREE.Mesh(BOX.SECTION_PLATE, METAL_TILE_LIGHT);
      plate.position.set(section.x, 0.04, section.z);
      plate.rotation.y = section.rot;
      plate.receiveShadow = true;
      this.scene.add(plate);
    }
  }

  _addHazardStripes() {
    for (let i = -7; i <= 7; i++) {
      const yellow = new THREE.Mesh(BOX.STRIPE, STRIPE_YELLOW);
      yellow.position.set(i * 1.7, 0.06, -6.2);
      yellow.rotation.y = Math.PI / 4;
      yellow.receiveShadow = true;
      this.scene.add(yellow);

      const black = new THREE.Mesh(BOX.STRIPE, STRIPE_BLACK);
      black.position.set(i * 1.7 + 0.8, 0.06, -6.2);
      black.rotation.y = Math.PI / 4;
      black.receiveShadow = true;
      this.scene.add(black);

      const yellowMirror = yellow.clone();
      yellowMirror.position.z = 6.2;
      this.scene.add(yellowMirror);

      const blackMirror = black.clone();
      blackMirror.position.z = 6.2;
      this.scene.add(blackMirror);
    }
  }

  _addFloorWear() {
    for (let i = 0; i < 48; i++) {
      const scratch = new THREE.Mesh(BOX.SCRATCH, STRIPE_BLACK);
      scratch.position.set(
        this._randomBetween(-this.half + 3, this.half - 3),
        0.051,
        this._randomBetween(-this.half + 3, this.half - 3)
      );
      scratch.rotation.y = this._randomBetween(0, Math.PI);
      scratch.scale.x = this._randomBetween(0.4, 1.5);
      this.scene.add(scratch);
    }
  }

  _buildWalls() {
    const north = new THREE.Mesh(BOX.WALL_NS, WALL_MATERIAL);
    north.position.set(0, WALL_HEIGHT / 2, -this.half);
    const south = north.clone();
    south.position.z = this.half;
    const west = new THREE.Mesh(BOX.WALL_EW, WALL_MATERIAL);
    west.position.set(-this.half, WALL_HEIGHT / 2, 0);
    const east = west.clone();
    east.position.x = this.half;
    this.scene.add(north, south, west, east);

    const trimNorth = new THREE.Mesh(BOX.WALL_TRIM_LONG, WALL_TRIM_MATERIAL);
    trimNorth.position.set(0, WALL_HEIGHT - 0.5, -this.half + WALL_THICKNESS * 0.5);
    const trimSouth = trimNorth.clone();
    trimSouth.position.z = this.half - WALL_THICKNESS * 0.5;
    const trimWest = new THREE.Mesh(BOX.WALL_TRIM_SIDE, WALL_TRIM_MATERIAL);
    trimWest.position.set(-this.half + WALL_THICKNESS * 0.5, WALL_HEIGHT - 0.5, 0);
    const trimEast = trimWest.clone();
    trimEast.position.x = this.half - WALL_THICKNESS * 0.5;
    this.scene.add(trimNorth, trimSouth, trimWest, trimEast);

    this._addWallPillars();
    this._addWarningLights();
    setShadow(north);
    setShadow(south);
    setShadow(west);
    setShadow(east);
  }

  _addWallPillars() {
    const points = [];
    for (let i = -3; i <= 3; i++) {
      points.push({ x: i * 10, z: -this.half + 0.95 });
      points.push({ x: i * 10, z: this.half - 0.95 });
      if (Math.abs(i) !== 3) {
        points.push({ x: -this.half + 0.95, z: i * 10 });
        points.push({ x: this.half - 0.95, z: i * 10 });
      }
    }

    for (const point of points) {
      const pillar = new THREE.Mesh(BOX.PILLAR, WALL_TRIM_MATERIAL);
      pillar.position.set(point.x, (WALL_HEIGHT + 1.8) / 2, point.z);
      const cap = new THREE.Mesh(BOX.PILLAR_CAP, DECOR_LIGHT);
      cap.position.set(point.x, WALL_HEIGHT + 1.6, point.z);
      this.scene.add(pillar, cap);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      cap.castShadow = true;
      cap.receiveShadow = true;
    }
  }

  _addWarningLights() {
    const markers = [
      { x: -this.half + 1.5, z: -this.half + 1.5 },
      { x: this.half - 1.5, z: -this.half + 1.5 },
      { x: -this.half + 1.5, z: this.half - 1.5 },
      { x: this.half - 1.5, z: this.half - 1.5 },
      { x: 0, z: -this.half + 1.5 },
      { x: 0, z: this.half - 1.5 },
    ];

    for (const marker of markers) {
      const emitter = new THREE.Mesh(BOX.LIGHT_POLE_BASE, WARNING_LIGHT_MATERIAL);
      emitter.position.set(marker.x, 1.2, marker.z);
      this.scene.add(emitter);

      const warningLight = new THREE.PointLight(0xff7e2e, 0.42, 12);
      warningLight.position.set(marker.x, 1.4, marker.z);
      this.scene.add(warningLight);

      const blueLight = new THREE.PointLight(0x57b8ff, 0.5, 14);
      blueLight.position.set(marker.x * 0.95, 2.2, marker.z * 0.95);
      this.scene.add(blueLight);
    }
  }

  _addEnvironmentProps() {
    const propPositions = this._scatterPositions(32, 14, this.half - 5, 12);
    let cursor = 0;

    for (let i = 0; i < 9; i++, cursor++) {
      this._addCrate(propPositions[cursor]);
    }
    for (let i = 0; i < 5; i++, cursor++) {
      this._addEnergyGenerator(propPositions[cursor]);
    }
    for (let i = 0; i < 6; i++, cursor++) {
      this._addBrokenRobotParts(propPositions[cursor]);
    }
    for (let i = 0; i < 4; i++, cursor++) {
      this._addPipes(propPositions[cursor]);
    }
    for (let i = 0; i < 3; i++, cursor++) {
      this._addAntenna(propPositions[cursor]);
    }
    for (let i = 0; i < 3; i++, cursor++) {
      this._addRepairStation(propPositions[cursor]);
    }
    for (let i = 0; i < 2; i++, cursor++) {
      this._addLightPole(propPositions[cursor]);
    }
  }

  _addCrate(position) {
    const crate = new THREE.Mesh(BOX.CRATE, (Math.random() > 0.5 ? DECOR_DARK : DECOR_LIGHT));
    crate.position.set(position.x, 0.65, position.z);
    crate.rotation.y = this._randomBetween(0, Math.PI * 2);
    crate.scale.setScalar(this._randomBetween(0.9, 1.25));
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
  }

  _addEnergyGenerator(position) {
    const base = new THREE.Mesh(BOX.GENERATOR_BASE, DECOR_DARK);
    base.position.set(position.x, 0.65, position.z);
    const core = new THREE.Mesh(BOX.GENERATOR_CORE, BLUE_GLOW_MATERIAL);
    core.position.set(position.x, 1.95, position.z);
    const glow = new THREE.PointLight(0x4fb4ff, 0.42, 9);
    glow.position.set(position.x, 2.1, position.z);
    this.scene.add(base, core, glow);
    base.castShadow = true;
    base.receiveShadow = true;
    core.castShadow = true;
  }

  _addBrokenRobotParts(position) {
    const partCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < partCount; i++) {
      const part = new THREE.Mesh(BOX.ROBOT_PART, DECOR_LIGHT);
      part.position.set(
        position.x + this._randomBetween(-0.9, 0.9),
        0.2 + this._randomBetween(0, 0.25),
        position.z + this._randomBetween(-0.9, 0.9)
      );
      part.rotation.set(
        this._randomBetween(-0.5, 0.5),
        this._randomBetween(0, Math.PI * 2),
        this._randomBetween(-0.5, 0.5)
      );
      part.castShadow = true;
      part.receiveShadow = true;
      this.scene.add(part);
    }
  }

  _addPipes(position) {
    for (let i = 0; i < 2; i++) {
      const pipe = new THREE.Mesh(CYLINDER.PIPE, PIPE_MATERIAL);
      pipe.position.set(position.x + (i === 0 ? -0.35 : 0.35), 0.28, position.z);
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = this._randomBetween(0, Math.PI);
      pipe.castShadow = true;
      pipe.receiveShadow = true;
      this.scene.add(pipe);
    }
  }

  _addAntenna(position) {
    const base = new THREE.Mesh(BOX.ANTENNA_BASE, DECOR_DARK);
    base.position.set(position.x, 0.15, position.z);
    const stem = new THREE.Mesh(CYLINDER.ANTENNA_STEM, DECOR_LIGHT);
    stem.position.set(position.x, 0.95, position.z);
    const tip = new THREE.Mesh(CYLINDER.LIGHT_BULB, BLUE_GLOW_MATERIAL);
    tip.scale.setScalar(0.55);
    tip.position.set(position.x, 1.8, position.z);
    const glow = new THREE.PointLight(0x61bfff, 0.34, 6);
    glow.position.copy(tip.position);
    this.scene.add(base, stem, tip, glow);
    base.receiveShadow = true;
    stem.castShadow = true;
  }

  _addRepairStation(position) {
    const base = new THREE.Mesh(BOX.REPAIR_BASE, DECOR_DARK);
    base.position.set(position.x, 0.22, position.z);
    const panel = new THREE.Mesh(BOX.REPAIR_PANEL, BLUE_GLOW_MATERIAL);
    panel.position.set(position.x, 0.95, position.z - 0.45);
    panel.rotation.x = -Math.PI / 6;
    panel.rotation.y = this._randomBetween(-0.25, 0.25);
    this.scene.add(base, panel);
    base.castShadow = true;
    base.receiveShadow = true;
  }

  _addLightPole(position) {
    const base = new THREE.Mesh(BOX.LIGHT_POLE_BASE, DECOR_DARK);
    base.position.set(position.x, 0.15, position.z);
    const stem = new THREE.Mesh(CYLINDER.LIGHT_POLE_STEM, DECOR_LIGHT);
    stem.position.set(position.x, 1.75, position.z);
    const bulb = new THREE.Mesh(CYLINDER.LIGHT_BULB, WARNING_LIGHT_MATERIAL);
    bulb.position.set(position.x, 3.45, position.z);
    const glow = new THREE.PointLight(0xff8f40, 0.38, 10);
    glow.position.copy(bulb.position);
    this.scene.add(base, stem, bulb, glow);
    base.receiveShadow = true;
    stem.castShadow = true;
  }

  _scatterPositions(count, minRadius, maxRadius, safeCenterRadius) {
    const points = [];
    let attempts = 0;
    while (points.length < count && attempts < count * 30) {
      attempts += 1;
      const angle = Math.random() * Math.PI * 2;
      const radius = this._randomBetween(minRadius, maxRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.hypot(x, z) < safeCenterRadius) {
        continue;
      }
      let valid = true;
      for (const point of points) {
        if (Math.hypot(point.x - x, point.z - z) < 3.6) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        continue;
      }
      points.push({ x, z });
    }
    return points;
  }

  _randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }
}
