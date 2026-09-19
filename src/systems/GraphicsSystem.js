import * as THREE from 'three';

const QUALITY_PRESETS = {
  low: { pixelRatioCap: 1, shadowMapSize: 512, antialias: false },
  medium: { pixelRatioCap: 1.25, shadowMapSize: 1024, antialias: true },
  high: { pixelRatioCap: 1.5, shadowMapSize: 1024, antialias: true },
};

/**
 * Applies renderer quality settings without removing gameplay features.
 */
export class GraphicsSystem {
  constructor(renderer, camera, directionalLight) {
    this.renderer = renderer;
    this.camera = camera;
    this.directionalLight = directionalLight;
    this.quality = 'medium';
    this._shadowCasters = [];
  }

  registerShadowCaster(object) {
    if (object && !this._shadowCasters.includes(object)) {
      this._shadowCasters.push(object);
    }
  }

  applyQuality(qualityKey) {
    const preset = QUALITY_PRESETS[qualityKey] ?? QUALITY_PRESETS.medium;
    this.quality = qualityKey in QUALITY_PRESETS ? qualityKey : 'medium';
    const ratio = Math.min(window.devicePixelRatio, preset.pixelRatioCap);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.directionalLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    const castShadows = qualityKey !== 'low';
    this.directionalLight.castShadow = castShadows;
    for (const obj of this._shadowCasters) {
      obj.castShadow = castShadows;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.applyQuality(this.quality);
  }

  projectToScreen(worldPosition, target = new THREE.Vector3()) {
    target.copy(worldPosition);
    target.project(this.camera);
    const x = (target.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-target.y * 0.5 + 0.5) * window.innerHeight;
    if (target.z > 1) {
      return null;
    }
    return { x, y };
  }
}
