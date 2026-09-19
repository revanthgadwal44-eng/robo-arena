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

  PICKUP_RAPID_FIRE_COOLDOWN_MS,

  GAME_MODES,

} from './constants.js';

import { Player } from './entities/Player.js';

import { Arena } from './world/Arena.js';

import { ObstacleManager } from './world/ObstacleManager.js';

import { InputSystem } from './systems/InputSystem.js';

import { CameraSystem } from './systems/CameraSystem.js';

import { UISystem } from './systems/UISystem.js';

import { CombatFeedbackSystem } from './systems/CombatFeedbackSystem.js';

import { GraphicsSystem } from './systems/GraphicsSystem.js';

import { MobileControls } from './systems/MobileControls.js';

import { EnemyManager } from './managers/EnemyManager.js';

import { BulletManager } from './managers/BulletManager.js';

import { WaveManager } from './managers/WaveManager.js';

import { PickupManager } from './managers/PickupManager.js';

import { AudioManager } from './managers/AudioManager.js';

import { BossManager } from './managers/BossManager.js';

import { WeaponManager } from './managers/WeaponManager.js';

import { SaveManager } from './managers/SaveManager.js';

import { GameModeManager } from './managers/GameModeManager.js';

import { BossRushManager } from './managers/BossRushManager.js';

import { GameRunManager } from './managers/GameRunManager.js';



const GAME_STATES = {

  MAIN_MENU: 'main_menu',

  PLAYING: 'playing',

  PAUSED: 'paused',

};



const scene = new THREE.Scene();

scene.background = new THREE.Color(SCENE_BACKGROUND);



const camera = new THREE.PerspectiveCamera(

  CAMERA_FOV,

  window.innerWidth / window.innerHeight,

  CAMERA_NEAR,

  CAMERA_FAR

);

camera.position.set(0, CAMERA_INITIAL_Y, CAMERA_INITIAL_Z);



const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFShadowMap;

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

directionalLight.shadow.camera.near = 1;

directionalLight.shadow.camera.far = 90;

directionalLight.shadow.camera.left = -32;

directionalLight.shadow.camera.right = 32;

directionalLight.shadow.camera.top = 32;

directionalLight.shadow.camera.bottom = -32;

scene.add(directionalLight);



new Arena(scene);

const obstacleManager = new ObstacleManager(scene);



const saveManager = new SaveManager();

const gameModeManager = new GameModeManager();

const player = new Player(scene, obstacleManager);

const input = new InputSystem();

const mobileControls = new MobileControls(input);

input.attachMobileControls(mobileControls);

player.setMobileMoveProvider(() => mobileControls.getMoveVector());
player.setDashCallback(() => audioManager.playDash());



const cameraSystem = new CameraSystem(camera);

const ui = new UISystem();

const combatFeedback = new CombatFeedbackSystem(ui.root);

const graphicsSystem = new GraphicsSystem(renderer, camera, directionalLight);

graphicsSystem.registerShadowCaster(directionalLight);

graphicsSystem.applyQuality(saveManager.settings.graphicsQuality);

combatFeedback.setProjector((pos) => graphicsSystem.projectToScreen(pos));



const enemyManager = new EnemyManager(scene, obstacleManager);

enemyManager.setPlayerPositionProvider(() => player.mesh.position);

const bossManager = new BossManager(scene, obstacleManager, enemyManager);

const bulletManager = new BulletManager(scene, obstacleManager);

const waveManager = new WaveManager(enemyManager, bossManager, () => player.mesh.position);

const pickupManager = new PickupManager(scene, obstacleManager, enemyManager);

const audioManager = new AudioManager();

audioManager.applyVolumes(saveManager.settings);

const weaponManager = new WeaponManager(bulletManager, audioManager, input);

const bossRushManager = new BossRushManager(bossManager, () => player.mesh.position);



pickupManager.setShootCooldownProvider(() => weaponManager.getShootCooldownMs());

weaponManager.setResolveCooldownMs(() => (

  pickupManager.rapidFireRemaining > 0

    ? PICKUP_RAPID_FIRE_COOLDOWN_MS

    : weaponManager.getShootCooldownMs()

));

weaponManager.syncInputCooldown();

ui.updateWeapon(weaponManager.getCurrentWeapon());

ui.bindSettings(saveManager, audioManager, graphicsSystem);



const gameRun = new GameRunManager({

  player,

  input,

  ui,

  camera,

  cameraSystem,

  combatFeedback,

  enemyManager,

  bossManager,

  bulletManager,

  waveManager,

  pickupManager,

  audioManager,

  weaponManager,

  bossRushManager,

  gameModeManager,

  saveManager,

});



let lastFrameTime = performance.now();

let gameState = GAME_STATES.MAIN_MENU;

let hasStartedMusic = false;



enemyManager.spawnInitialEnemies();

enemyManager.setShootingEnabled(false);



function setGameState(nextState) {

  gameState = nextState;

  const isPlaying = gameState === GAME_STATES.PLAYING;

  const isMainMenu = gameState === GAME_STATES.MAIN_MENU;

  const isPaused = gameState === GAME_STATES.PAUSED;



  input.setEnabled(isPlaying);

  enemyManager.setShootingEnabled(isPlaying);

  mobileControls.setVisible(isPlaying);

  ui.setInGameHudVisible(!isMainMenu && !gameRun.isGameOver);

  ui.setMainMenuVisible(isMainMenu);

  ui.setPauseMenuVisible(isPaused);

  if (isMainMenu) {

    ui.hideGameOver();

    audioManager.startMenuMusic?.();

  }

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

    gameRun.startRun();

    setGameState(GAME_STATES.PLAYING);

    ui.updateWeapon(weaponManager.getCurrentWeapon());

    ui.showWaveAnnouncement(waveManager.wave);

  },

  onResume: () => {

    audioManager.resume();

    setGameState(GAME_STATES.PLAYING);

  },

  onRestart: () => {

    audioManager.resume();

    ui.hideGameOver();

    gameRun.startRun();

    setGameState(GAME_STATES.PLAYING);

    ui.showWaveAnnouncement(waveManager.wave);

  },

  onMainMenu: () => {

    ui.hideGameOver();

    gameRun.reset();

    setGameState(GAME_STATES.MAIN_MENU);

  },

  onSettings: () => ui.menus.showSettings(),

  onStatistics: () => ui.showStatistics(saveManager.statistics, saveManager.achievements),

  onSelectMode: (mode) => {

    gameModeManager.setMode(mode);

    ui.menus.hideGameModes();

    ui.showNotification(mode === GAME_MODES.BOSS_RUSH ? 'Mode: Boss Rush' : 'Mode: Survival');

  },

  onQuit: () => {

    ui.showNotification('Thanks for playing Robo Arena Alpha!');

  },

});



input.onShoot = () => {

  if (gameState !== GAME_STATES.PLAYING || gameRun.isGameOver) {

    return;

  }

  audioManager.resume();

  weaponManager.fire(player);

};



input.onWeaponSwitch = (weaponId) => {

  if (gameState !== GAME_STATES.PLAYING) {

    return;

  }

  if (weaponManager.switchWeapon(weaponId)) {

    ui.updateWeapon(weaponManager.getCurrentWeapon());

  }

};



input.onTogglePause = () => {

  if (gameState === GAME_STATES.MAIN_MENU || gameRun.isGameOver) {

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



function animate(time) {

  requestAnimationFrame(animate);



  const delta = Math.min((time - lastFrameTime) / 1000, 0.1);

  lastFrameTime = time;



  if (gameState === GAME_STATES.PLAYING) {

    input.pollMobileShoot();

    gameRun.updatePlaying(delta);

    if (gameRun.isGameOver) {

      input.setEnabled(false);

      mobileControls.setVisible(false);

      ui.setInGameHudVisible(false);

    }

  }



  ui.updateDamageEffects(delta);

  cameraSystem.update(player.mesh.position, player.mesh.rotation.y);



  ui.update(

    player.health,

    player.maxHealth,

    gameRun.kills,

    waveManager.wave,

    enemyManager.count + (bossManager.hasBoss ? 1 : 0),

    delta > 0 ? 1 / delta : 0,

    pickupManager.getActivePowerUps(),

    bossManager.getBossHealthState(),

    gameRun.score,

    gameRun.combo

  );



  renderer.render(scene, camera);

}



setGameState(GAME_STATES.MAIN_MENU);

animate();



window.addEventListener('resize', () => graphicsSystem.onResize());
