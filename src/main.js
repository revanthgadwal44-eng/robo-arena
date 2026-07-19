import './style.css';
import * as THREE from 'three';
import {
  SCENE_BACKGROUND,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_INITIAL_Y,
  CAMERA_INITIAL_Z,
  AMBIENT_LIGHT_COLOR,
  AMBIENT_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_COLOR,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_X,
  DIRECTIONAL_LIGHT_Y,
  DIRECTIONAL_LIGHT_Z,
} from './constants.js';
import { Player } from './entities/Player.js';
import { Arena } from './world/Arena.js';
import { InputSystem } from './systems/InputSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { UISystem } from './systems/UISystem.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { BulletManager } from './managers/BulletManager.js';
import { WaveManager } from './managers/WaveManager.js';

// --- Scene bootstrap ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_BACKGROUND);

const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  window.innerWidth / window.innerHeight,
  CAMERA_NEAR,
  CAMERA_FAR
);
camera.position.set(0, CAMERA_INITIAL_Y, CAMERA_INITIAL_Z);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY));

const directionalLight = new THREE.DirectionalLight(
  DIRECTIONAL_LIGHT_COLOR,
  DIRECTIONAL_LIGHT_INTENSITY
);
directionalLight.position.set(DIRECTIONAL_LIGHT_X, DIRECTIONAL_LIGHT_Y, DIRECTIONAL_LIGHT_Z);
scene.add(directionalLight);

// --- Systems & managers ---
new Arena(scene);

const player = new Player(scene);
const input = new InputSystem();
const cameraSystem = new CameraSystem(camera);
const ui = new UISystem();
const enemyManager = new EnemyManager(scene);
const bulletManager = new BulletManager(scene);
const waveManager = new WaveManager(enemyManager);

let kills = 0;
let lastFrameTime = performance.now();

enemyManager.spawnInitialEnemies();

input.onShoot = () => {
  bulletManager.shootPlayer(player.getShootOrigin(), player.getShootDirection());
};

enemyManager.startShooting(
  () => player.mesh.position,
  (bullet) => bulletManager.addEnemyBullet(bullet)
);

// --- Game loop (update order preserved from original main.js) ---
function animate(time) {
  requestAnimationFrame(animate);

  const delta = Math.min((time - lastFrameTime) / 1000, 0.1);
  lastFrameTime = time;

  player.update(input);

  const frameKills = bulletManager.updatePlayerBullets(
    enemyManager.getEnemies(),
    (enemy) => {
      enemyManager.remove(enemy);
      waveManager.onEnemyKilled();
    }
  );
  kills += frameKills;

  cameraSystem.update(player.mesh.position, player.mesh.rotation.y);
  renderer.render(scene, camera);

  ui.update(player.health, kills, waveManager.wave, enemyManager.count, delta > 0 ? 1 / delta : 0);

  const meleeDamage = enemyManager.update(player.mesh.position, camera);
  player.health -= meleeDamage;

  const bulletDamage = bulletManager.updateEnemyBullets(player.mesh.position);
  player.health -= bulletDamage;

  bulletManager.updateEffects(delta);

  if (player.health <= 0) {
    player.respawn();
  }

  waveManager.checkAndSpawnNextWave();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
