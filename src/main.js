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
  HEMISPHERE_LIGHT_SKY_COLOR,
  HEMISPHERE_LIGHT_GROUND_COLOR,
  HEMISPHERE_LIGHT_INTENSITY,
} from './constants.js';
import { Player } from './entities/Player.js';
import { Arena } from './world/Arena.js';
import { ObstacleManager } from './world/ObstacleManager.js';
import { InputSystem } from './systems/InputSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { UISystem } from './systems/UISystem.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { BulletManager } from './managers/BulletManager.js';
import { WaveManager } from './managers/WaveManager.js';
import { PickupManager } from './managers/PickupManager.js';
import { AudioManager } from './managers/AudioManager.js';
import { BossManager } from './managers/BossManager.js';

const GAME_STATES = {
  MAIN_MENU: 'main_menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
};

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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY));
scene.add(new THREE.HemisphereLight(
  HEMISPHERE_LIGHT_SKY_COLOR,
  HEMISPHERE_LIGHT_GROUND_COLOR,
  HEMISPHERE_LIGHT_INTENSITY
));

const directionalLight = new THREE.DirectionalLight(
  DIRECTIONAL_LIGHT_COLOR,
  DIRECTIONAL_LIGHT_INTENSITY
);
directionalLight.position.set(DIRECTIONAL_LIGHT_X, DIRECTIONAL_LIGHT_Y, DIRECTIONAL_LIGHT_Z);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.0005;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 90;
directionalLight.shadow.camera.left = -38;
directionalLight.shadow.camera.right = 38;
directionalLight.shadow.camera.top = 38;
directionalLight.shadow.camera.bottom = -38;
scene.add(directionalLight);

// --- Systems & managers ---
new Arena(scene);
const obstacleManager = new ObstacleManager(scene);

const player = new Player(scene, obstacleManager);
const input = new InputSystem();
const cameraSystem = new CameraSystem(camera);
const ui = new UISystem();
const enemyManager = new EnemyManager(scene, obstacleManager);
enemyManager.setPlayerPositionProvider(() => player.mesh.position);
const bossManager = new BossManager(scene, obstacleManager, enemyManager);
const bulletManager = new BulletManager(scene, obstacleManager);
const waveManager = new WaveManager(enemyManager, bossManager, () => player.mesh.position);
const pickupManager = new PickupManager(scene, obstacleManager, enemyManager);
const audioManager = new AudioManager();

let kills = 0;
let lastFrameTime = performance.now();
let gameState = GAME_STATES.MAIN_MENU;
let hasStartedMusic = false;
let bossIncomingCountdown = null;

enemyManager.spawnInitialEnemies();
enemyManager.setShootingEnabled(false);

function setGameState(nextState) {
  gameState = nextState;
  const isPlaying = gameState === GAME_STATES.PLAYING;
  const isMainMenu = gameState === GAME_STATES.MAIN_MENU;
  const isPaused = gameState === GAME_STATES.PAUSED;

  input.setEnabled(isPlaying);
  enemyManager.setShootingEnabled(isPlaying);
  ui.setInGameHudVisible(!isMainMenu);
  ui.setMainMenuVisible(isMainMenu);
  ui.setPauseMenuVisible(isPaused);
}

function resetRun() {
  kills = 0;
  player.respawn();
  bulletManager.clearAll();
  bossManager.clearAll();
  enemyManager.clearAll();
  waveManager.reset();
  enemyManager.spawnInitialEnemies();
  pickupManager.reset(player, input);
  bossIncomingCountdown = null;
  ui.update(
    player.health,
    player.maxHealth,
    kills,
    waveManager.wave,
    enemyManager.count,
    0,
    pickupManager.getActivePowerUps(),
    bossManager.getBossHealthState()
  );
}

function onBossDefeated() {
  const bossPosition = bossManager.boss ? bossManager.boss.mesh.position.clone() : null;
  if (bossPosition) {
    bulletManager.spawnBossExplosion(bossPosition);
  }
  bossManager.removeBoss();
  pickupManager.spawnBurst(5);
  ui.showNotification('BOSS DEFEATED');
  cameraSystem.addShake(1.15);
  audioManager.playExplosion();
}

function startMusicIfNeeded() {
  if (hasStartedMusic) {
    return;
  }
  audioManager.startBackgroundMusic();
  hasStartedMusic = true;
}

ui.setCallbacks({
  onPlay: () => {
    audioManager.resume();
    startMusicIfNeeded();
    setGameState(GAME_STATES.PLAYING);
    ui.showWaveAnnouncement(waveManager.wave);
  },
  onResume: () => {
    audioManager.resume();
    setGameState(GAME_STATES.PLAYING);
  },
  onRestart: () => {
    audioManager.resume();
    resetRun();
    setGameState(GAME_STATES.PLAYING);
    ui.showWaveAnnouncement(waveManager.wave);
  },
  onMainMenu: () => {
    resetRun();
    setGameState(GAME_STATES.MAIN_MENU);
  },
  onSettings: () => {
    audioManager.resume();
  },
});

input.onShoot = () => {
  if (gameState !== GAME_STATES.PLAYING) {
    return;
  }
  audioManager.resume();
  bulletManager.shootPlayer(player.getShootOrigin(), player.getShootDirection());
  audioManager.playShoot();
};

input.onTogglePause = () => {
  if (gameState === GAME_STATES.MAIN_MENU) {
    return;
  }
  if (gameState === GAME_STATES.PAUSED) {
    setGameState(GAME_STATES.PLAYING);
    return;
  }
  setGameState(GAME_STATES.PAUSED);
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

  if (gameState === GAME_STATES.PLAYING) {
    player.update(input, delta);
    if (player.isDashing()) {
      bulletManager.emitPlayerDashTrail(player.mesh.position);
    }

    const collectedPickups = pickupManager.update(delta, player, input);
    if (collectedPickups.length > 0) {
      audioManager.playPickup();
    }

    let didDefeatBoss = false;
    const frameKills = bulletManager.updatePlayerBullets(
      enemyManager.getEnemies(),
      (enemy) => {
        enemyManager.remove(enemy);
        waveManager.onEnemyKilled();
      },
      (bullet) => {
        const result = bossManager.handlePlayerBulletHit(bullet);
        if (result.died) {
          didDefeatBoss = true;
        }
        return result;
      }
    );
    kills += frameKills;
    if (didDefeatBoss) {
      kills += 1;
      onBossDefeated();
    }
    if (frameKills > 0) {
      audioManager.playExplosion();
    }

    const meleeDamage = enemyManager.update(player.mesh.position, camera);
    const bossDamage = bossManager.update(
      delta,
      player.mesh.position,
      {
        onShoot: (bullet) => bulletManager.addEnemyBullet(bullet),
        onCameraShake: (intensity) => cameraSystem.addShake(intensity),
      }
    );
    const bulletDamage = bulletManager.updateEnemyBullets(player.mesh.position);
    const incomingDamage = meleeDamage + bossDamage + bulletDamage;
    if (incomingDamage > 0) {
      player.applyDamage(incomingDamage);
      ui.flashDamage(Math.min(1, incomingDamage / 25));
      cameraSystem.addShake(0.3);
      audioManager.playHit();
    }

    bulletManager.updateEffects(delta);

    if (player.health <= 0) {
      player.respawn();
      ui.flashDamage(0.9);
      cameraSystem.addShake(0.8);
      audioManager.playExplosion();
    }

    const newWave = waveManager.checkAndSpawnNextWave();
    if (newWave !== null) {
      ui.showWaveAnnouncement(newWave);
      audioManager.playWaveComplete();
    }

    if (waveManager.hasPendingBossSpawn) {
      if (bossIncomingCountdown === null) {
        bossIncomingCountdown = 1;
        ui.showNotification('BOSS INCOMING');
        cameraSystem.addShake(0.4);
      } else {
        bossIncomingCountdown = Math.max(0, bossIncomingCountdown - delta);
        if (bossIncomingCountdown === 0) {
          waveManager.spawnPendingBoss();
          bossIncomingCountdown = null;
        }
      }
    }
  }

  ui.updateDamageEffects(delta);
  cameraSystem.update(player.mesh.position, player.mesh.rotation.y);

  ui.update(
    player.health,
    player.maxHealth,
    kills,
    waveManager.wave,
    enemyManager.count + (bossManager.hasBoss ? 1 : 0),
    delta > 0 ? 1 / delta : 0,
    pickupManager.getActivePowerUps(),
    bossManager.getBossHealthState()
  );

  renderer.render(scene, camera);
}

setGameState(GAME_STATES.MAIN_MENU);
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
