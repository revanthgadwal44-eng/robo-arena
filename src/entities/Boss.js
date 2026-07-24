import * as THREE from 'three';
import {
  BOSS_MAX_HEALTH,
  BOSS_SPEED,
  BOSS_BULLET_DAMAGE,
  BOSS_COLOR,
  BOSS_DAMAGED_COLOR,
  BOSS_CRITICAL_COLOR,
  BULLET_DAMAGE,
  PLAYER_Y,
} from '../constants.js';

const BODY_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x202733, roughness: 0.42, metalness: 0.9 });
const ARMOR_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x313a4a, roughness: 0.48, metalness: 0.86 });
const DARK_METAL = new THREE.MeshStandardMaterial({ color: 0x1a1f2c, roughness: 0.52, metalness: 0.82 });
const CORE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff4242,
  emissive: 0xaa1111,
  emissiveIntensity: 0.8,
  roughness: 0.3,
  metalness: 0.4,
});
const EYE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff6b6b,
  emissive: 0xff2424,
  emissiveIntensity: 1.4,
  roughness: 0.25,
  metalness: 0.25,
});
const SPARK_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff7a33 });
const SMOKE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x2f2f2f,
  roughness: 0.9,
  metalness: 0.05,
  transparent: true,
  opacity: 0,
});

const G = {
  BODY: new THREE.BoxGeometry(5.4, 3.1, 4.7),
  CORE: new THREE.SphereGeometry(0.9, 16, 14),
  SHOULDER: new THREE.BoxGeometry(2.2, 1.1, 2.1),
  CANNON_PIVOT: new THREE.BoxGeometry(1.2, 0.9, 1.2),
  CANNON: new THREE.CylinderGeometry(0.38, 0.5, 3.6, 14),
  LEG_UPPER: new THREE.BoxGeometry(1.5, 1.1, 1.5),
  LEG_LOWER: new THREE.BoxGeometry(1.3, 1.3, 1.3),
  FOOT: new THREE.BoxGeometry(1.8, 0.55, 1.9),
  EYE: new THREE.SphereGeometry(0.22, 10, 10),
  ANTENNA: new THREE.CylinderGeometry(0.07, 0.1, 1.2, 8),
  ANTENNA_TIP: new THREE.SphereGeometry(0.15, 8, 8),
  EXHAUST: new THREE.CylinderGeometry(0.22, 0.28, 1.1, 10),
  SPARK: new THREE.SphereGeometry(0.07, 8, 8),
  SMOKE: new THREE.SphereGeometry(0.22, 8, 8),
};

function shadowize(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export class Boss {
  constructor(scene, x, z) {
    this.group = new THREE.Group();
    this.group.position.set(x, PLAYER_Y + 1.4, z);
    this.group.scale.setScalar(1.18);
    this.mesh = this.group;

    this.health = BOSS_MAX_HEALTH;
    this.mesh.userData = {
      health: BOSS_MAX_HEALTH,
      maxHealth: BOSS_MAX_HEALTH,
      speed: BOSS_SPEED,
      damage: BOSS_BULLET_DAMAGE,
    };

    this._time = 0;
    this._walkTime = 0;
    this._isMoving = false;
    this._isChargeWarning = false;
    this._sparkSpawnCooldown = 0;
    this._smokeSpawnCooldown = 0;
    this._sparks = [];
    this._smokes = [];

    this._buildModel();
    this._initEffectPool(scene);
    shadowize(this.group);
    scene.add(this.group);
  }

  _buildModel() {
    this._body = new THREE.Mesh(G.BODY, BODY_MATERIAL.clone());
    this.group.add(this._body);

    this._core = new THREE.Mesh(G.CORE, CORE_MATERIAL.clone());
    this._core.position.set(0, 0.3, 1.45);
    this.group.add(this._core);

    this._leftShoulder = new THREE.Mesh(G.SHOULDER, ARMOR_MATERIAL.clone());
    this._leftShoulder.position.set(-2.7, 1.05, -0.2);
    this.group.add(this._leftShoulder);
    this._rightShoulder = new THREE.Mesh(G.SHOULDER, ARMOR_MATERIAL.clone());
    this._rightShoulder.position.set(2.7, 1.05, -0.2);
    this.group.add(this._rightShoulder);

    this._cannonPivot = new THREE.Group();
    this._cannonPivot.position.set(0, 0.65, -2.2);
    this.group.add(this._cannonPivot);
    const cannonMount = new THREE.Mesh(G.CANNON_PIVOT, ARMOR_MATERIAL.clone());
    this._cannonPivot.add(cannonMount);
    this._cannon = new THREE.Mesh(G.CANNON, DARK_METAL.clone());
    this._cannon.rotation.x = Math.PI / 2;
    this._cannon.position.z = -1.65;
    this._cannonPivot.add(this._cannon);

    this._leftEye = new THREE.Mesh(G.EYE, EYE_MATERIAL.clone());
    this._leftEye.position.set(-0.8, 0.78, -2.4);
    this.group.add(this._leftEye);
    this._rightEye = new THREE.Mesh(G.EYE, EYE_MATERIAL.clone());
    this._rightEye.position.set(0.8, 0.78, -2.4);
    this.group.add(this._rightEye);

    this._legs = [];
    const legOffsets = [
      [-1.8, -2.15, -1.35],
      [1.8, -2.15, -1.35],
      [-1.8, -2.15, 1.35],
      [1.8, -2.15, 1.35],
    ];
    for (const [x, y, z] of legOffsets) {
      const legGroup = new THREE.Group();
      legGroup.position.set(x, y, z);
      const upper = new THREE.Mesh(G.LEG_UPPER, ARMOR_MATERIAL.clone());
      upper.position.y = 0.5;
      const lower = new THREE.Mesh(G.LEG_LOWER, DARK_METAL.clone());
      lower.position.y = -0.65;
      const foot = new THREE.Mesh(G.FOOT, DARK_METAL.clone());
      foot.position.y = -1.5;
      legGroup.add(upper, lower, foot);
      this.group.add(legGroup);
      this._legs.push(legGroup);
    }

    this._antenna = new THREE.Mesh(G.ANTENNA, DARK_METAL.clone());
    this._antenna.position.set(0, 2.4, -0.3);
    this.group.add(this._antenna);
    this._antennaTip = new THREE.Mesh(G.ANTENNA_TIP, EYE_MATERIAL.clone());
    this._antennaTip.position.set(0, 3.05, -0.3);
    this.group.add(this._antennaTip);

    this._leftExhaust = new THREE.Mesh(G.EXHAUST, DARK_METAL.clone());
    this._leftExhaust.rotation.x = Math.PI / 2;
    this._leftExhaust.position.set(-1.2, 0.1, 2.45);
    this.group.add(this._leftExhaust);
    this._rightExhaust = new THREE.Mesh(G.EXHAUST, DARK_METAL.clone());
    this._rightExhaust.rotation.x = Math.PI / 2;
    this._rightExhaust.position.set(1.2, 0.1, 2.45);
    this.group.add(this._rightExhaust);
  }

  _initEffectPool(scene) {
    for (let i = 0; i < 18; i++) {
      const spark = new THREE.Mesh(G.SPARK, SPARK_MATERIAL);
      spark.visible = false;
      scene.add(spark);
      this._sparks.push({ mesh: spark, velocity: new THREE.Vector3(), life: 0, maxLife: 0.22 });
    }
    for (let i = 0; i < 14; i++) {
      const smoke = new THREE.Mesh(G.SMOKE, SMOKE_MATERIAL.clone());
      smoke.visible = false;
      scene.add(smoke);
      this._smokes.push({ mesh: smoke, velocity: new THREE.Vector3(), life: 0, maxLife: 0.65 });
    }
  }

  update(delta, playerPosition, moving, chargeWarning) {
    this._time += delta;
    this._isMoving = moving;
    this._isChargeWarning = chargeWarning;
    if (this._isMoving) {
      this._walkTime += delta * 8;
    }

    const breath = Math.sin(this._time * 2.3) * 0.06;
    const sway = Math.sin(this._time * 1.5) * 0.03;
    this._body.position.y = breath;
    this.group.rotation.z = sway;

    const stepA = Math.sin(this._walkTime) * 0.14;
    const stepB = Math.sin(this._walkTime + Math.PI) * 0.14;
    this._legs[0].rotation.x = moving ? stepA : 0;
    this._legs[3].rotation.x = moving ? stepA : 0;
    this._legs[1].rotation.x = moving ? stepB : 0;
    this._legs[2].rotation.x = moving ? stepB : 0;

    const target = playerPosition.clone().sub(this.group.position);
    const desiredYaw = Math.atan2(target.x, target.z);
    const relativeYaw = THREE.MathUtils.clamp(desiredYaw - this.group.rotation.y, -0.8, 0.8);
    this._cannonPivot.rotation.y = THREE.MathUtils.lerp(this._cannonPivot.rotation.y, relativeYaw, 0.08);

    this._updateDamageVisuals(delta);
  }

  _updateDamageVisuals(delta) {
    const healthRatio = Math.max(0, this.health / this.mesh.userData.maxHealth);
    if (healthRatio > 0.75) {
      this._core.material.emissiveIntensity = 0.8;
      this._core.material.color.set(0xff4242);
      this._body.material.color.set(0x202733);
      return;
    }

    if (healthRatio > 0.5) {
      this._core.material.emissiveIntensity = 1;
      this._core.material.color.set(BOSS_COLOR);
      this._body.material.color.set(0x2a3341);
      return;
    }

    if (healthRatio > 0.25) {
      this._core.material.emissiveIntensity = 1.45;
      this._core.material.color.set(BOSS_DAMAGED_COLOR);
      this._body.material.color.set(0x3a2630);
      return;
    }

    const flash = (Math.sin(this._time * 23) + 1) * 0.5;
    this._core.material.emissiveIntensity = 1.5 + flash;
    this._core.material.color.set(BOSS_CRITICAL_COLOR);
    this._body.material.color.set(flash > 0.45 ? 0x4d2323 : 0x2f2020);
    this._spawnCriticalEffects(delta);
  }

  _spawnCriticalEffects(delta) {
    this._sparkSpawnCooldown -= delta;
    this._smokeSpawnCooldown -= delta;
    if (this._sparkSpawnCooldown <= 0) {
      this._sparkSpawnCooldown = 0.06;
      this._spawnSpark();
    }
    if (this._smokeSpawnCooldown <= 0) {
      this._smokeSpawnCooldown = 0.14;
      this._spawnSmoke();
    }
    this._updateParticles(delta);
  }

  _spawnSpark() {
    const particle = this._sparks.find((item) => item.life <= 0);
    if (!particle) {
      return;
    }
    particle.life = particle.maxLife;
    particle.mesh.visible = true;
    particle.mesh.position.copy(this.group.position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 3.2,
      Math.random() * 2.2,
      (Math.random() - 0.5) * 3.2
    ));
    particle.velocity.set(
      (Math.random() - 0.5) * 1.3,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 1.3
    );
  }

  _spawnSmoke() {
    const particle = this._smokes.find((item) => item.life <= 0);
    if (!particle) {
      return;
    }
    particle.life = particle.maxLife;
    particle.mesh.visible = true;
    particle.mesh.position.copy(this.group.position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      0.9 + Math.random() * 1.6,
      (Math.random() - 0.5) * 2.2
    ));
    particle.velocity.set((Math.random() - 0.5) * 0.2, 0.42 + Math.random() * 0.26, (Math.random() - 0.5) * 0.2);
    particle.mesh.scale.setScalar(1);
    particle.mesh.material.opacity = 0.32;
  }

  _updateParticles(delta) {
    for (const spark of this._sparks) {
      if (spark.life <= 0) {
        continue;
      }
      spark.life -= delta;
      spark.mesh.position.addScaledVector(spark.velocity, delta);
      spark.mesh.visible = spark.life > 0;
    }
    for (const smoke of this._smokes) {
      if (smoke.life <= 0) {
        continue;
      }
      smoke.life -= delta;
      smoke.mesh.position.addScaledVector(smoke.velocity, delta);
      smoke.mesh.scale.multiplyScalar(1 + delta * 1.25);
      smoke.mesh.material.opacity = Math.max(0, (smoke.life / smoke.maxLife) * 0.35);
      smoke.mesh.visible = smoke.life > 0;
    }
  }

  takeDamage(amount = BULLET_DAMAGE) {
    this.health -= amount;
    this.mesh.userData.health = this.health;
    if (this.health <= this.mesh.userData.maxHealth * 0.45) {
      this._core.material.color.set(BOSS_DAMAGED_COLOR);
    }
    return this.health <= 0;
  }

  getShoulderWorldPositions(targetA, targetB) {
    targetA.copy(this._leftShoulder.position);
    targetB.copy(this._rightShoulder.position);
    this.group.localToWorld(targetA);
    this.group.localToWorld(targetB);
  }

  setChargeWarning(active) {
    this._isChargeWarning = active;
    const intensity = active ? 2 : 1.4;
    this._leftEye.material.emissiveIntensity = intensity;
    this._rightEye.material.emissiveIntensity = intensity;
    this._antennaTip.material.emissiveIntensity = active ? 2.1 : 1.3;
  }

  dispose(scene) {
    scene.remove(this.group);
    for (const spark of this._sparks) {
      scene.remove(spark.mesh);
    }
    for (const smoke of this._smokes) {
      scene.remove(smoke.mesh);
    }
  }
}
