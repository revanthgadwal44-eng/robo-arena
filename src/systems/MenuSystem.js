import { GAME_VERSION, GAME_MODES } from '../constants.js';

export class MenuSystem {
  constructor(root) {
    this._callbacks = {};
    this.mainMenu = this._createMainMenu();
    this.pauseMenu = this._createPauseMenu();
    this.settingsMenu = this._createSettingsMenu();
    this.controlsMenu = this._createControlsMenu();
    this.statisticsMenu = this._createStatisticsMenu();
    this.gameModesMenu = this._createGameModesMenu();
    this.gameOverMenu = this._createGameOverMenu();
    root.append(
      this.mainMenu,
      this.pauseMenu,
      this.settingsMenu,
      this.controlsMenu,
      this.statisticsMenu,
      this.gameModesMenu,
      this.gameOverMenu
    );
  }

  setCallbacks(callbacks) {
    this._callbacks = callbacks;
  }

  hideAllOverlays() {
    for (const menu of [
      this.mainMenu, this.pauseMenu, this.settingsMenu, this.controlsMenu,
      this.statisticsMenu, this.gameModesMenu, this.gameOverMenu,
    ]) {
      menu.classList.add('hidden');
    }
  }

  showMainMenu() {
    this.hideAllOverlays();
    this.mainMenu.classList.remove('hidden');
  }

  showPauseMenu() {
    this.pauseMenu.classList.remove('hidden');
  }

  hidePauseMenu() {
    this.pauseMenu.classList.add('hidden');
  }

  showSettings() {
    this.settingsMenu.classList.remove('hidden');
  }

  hideSettings() {
    this.settingsMenu.classList.add('hidden');
  }

  showControls() {
    this.controlsMenu.classList.remove('hidden');
  }

  hideControls() {
    this.controlsMenu.classList.add('hidden');
  }

  showStatistics(stats, achievements) {
    this.statisticsBody.textContent = '';
    const survival = stats.survival;
    const rush = stats.bossRush;
    this.statisticsBody.innerHTML = `
      <h3>Survival</h3>
      <p>Highest Wave: ${survival.highestWave}</p>
      <p>Best Score: ${survival.bestScore}</p>
      <p>Total Kills: ${survival.totalKills}</p>
      <p>Runs: ${survival.runsPlayed}</p>
      <h3>Boss Rush</h3>
      <p>Bosses Defeated (best run): ${rush.bossesDefeated}</p>
      <p>Best Time: ${rush.bestTimeSeconds > 0 ? rush.bestTimeSeconds.toFixed(1) + 's' : '—'}</p>
      <p>Best Score: ${rush.bestScore}</p>
      <p>Runs: ${rush.runsPlayed}</p>
      <h3>Achievements</h3>
      <p>${Object.keys(achievements).length === 0 ? 'None unlocked yet.' : Object.values(achievements).map((a) => a.label).join(', ')}</p>
    `;
    this.statisticsMenu.classList.remove('hidden');
  }

  hideStatistics() {
    this.statisticsMenu.classList.add('hidden');
  }

  showGameModes() {
    this.gameModesMenu.classList.remove('hidden');
  }

  hideGameModes() {
    this.gameModesMenu.classList.add('hidden');
  }

  showGameOver(payload) {
    this.gameOverTitle.textContent = payload.victory ? 'VICTORY' : 'GAME OVER';
    this.gameOverBody.textContent = `Score: ${payload.score} | Kills: ${payload.kills} | Wave: ${payload.wave}`;
    if (payload.mode === 'boss_rush') {
      this.gameOverBody.textContent += ` | Time: ${payload.timeSeconds.toFixed(1)}s`;
    }
    this.gameOverMenu.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverMenu.classList.add('hidden');
  }

  bindSettingsControls(saveManager, audioManager, graphicsSystem) {
    const s = saveManager.settings;
    this.masterVolumeInput.value = String(Math.round(s.masterVolume * 100));
    this.musicVolumeInput.value = String(Math.round(s.musicVolume * 100));
    this.sfxVolumeInput.value = String(Math.round(s.sfxVolume * 100));
    this.graphicsSelect.value = s.graphicsQuality;
    this.masterVolumeInput.oninput = () => {
      saveManager.updateSettings({ masterVolume: Number(this.masterVolumeInput.value) / 100 });
      audioManager.applyVolumes?.(saveManager.settings);
    };
    this.musicVolumeInput.oninput = () => {
      saveManager.updateSettings({ musicVolume: Number(this.musicVolumeInput.value) / 100 });
      audioManager.applyVolumes?.(saveManager.settings);
    };
    this.sfxVolumeInput.oninput = () => {
      saveManager.updateSettings({ sfxVolume: Number(this.sfxVolumeInput.value) / 100 });
      audioManager.applyVolumes?.(saveManager.settings);
    };
    this.graphicsSelect.onchange = () => {
      saveManager.updateSettings({ graphicsQuality: this.graphicsSelect.value });
      graphicsSystem.applyQuality(this.graphicsSelect.value);
    };
  }

  _createMainMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay';
    const panel = document.createElement('div');
    panel.className = 'menu-panel menu-panel-wide';
    panel.innerHTML = `<h1>ROBO ARENA</h1><p class="menu-subtitle">Alpha ${GAME_VERSION}</p>`;
    const buttons = [
      ['Play', () => this._callbacks.onPlay?.()],
      ['Game Modes', () => this._callbacks.onGameModes?.()],
      ['Statistics', () => this._callbacks.onStatistics?.()],
      ['Settings', () => this._callbacks.onSettings?.()],
      ['Controls', () => this._callbacks.onControls?.()],
      ['Quit', () => this._callbacks.onQuit?.()],
    ];
    for (const [label, handler] of buttons) {
      const btn = document.createElement('button');
      btn.className = label === 'Play' ? 'menu-button' : 'menu-button menu-button-secondary';
      btn.textContent = label;
      btn.addEventListener('click', handler);
      panel.appendChild(btn);
    }
    menu.appendChild(panel);
    return menu;
  }

  _createPauseMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay hidden';
    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.innerHTML = '<h2>PAUSED</h2>';
    for (const [label, key] of [['Resume', 'onResume'], ['Settings', 'onSettings'], ['Main Menu', 'onMainMenu']]) {
      const btn = document.createElement('button');
      btn.className = 'menu-button';
      btn.textContent = label;
      btn.addEventListener('click', () => this._callbacks[key]?.());
      panel.appendChild(btn);
    }
    menu.appendChild(panel);
    return menu;
  }

  _createSettingsMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay menu-sub hidden';
    const panel = document.createElement('div');
    panel.className = 'menu-panel menu-panel-wide';
    panel.innerHTML = '<h2>SETTINGS</h2>';
    this.masterVolumeInput = this._rangeRow(panel, 'Master Volume');
    this.musicVolumeInput = this._rangeRow(panel, 'Music Volume');
    this.sfxVolumeInput = this._rangeRow(panel, 'SFX Volume');
    const gRow = document.createElement('label');
    gRow.className = 'settings-row';
    gRow.textContent = 'Graphics Quality';
    this.graphicsSelect = document.createElement('select');
    this.graphicsSelect.className = 'settings-select';
    for (const q of ['low', 'medium', 'high']) {
      const opt = document.createElement('option');
      opt.value = q;
      opt.textContent = q.charAt(0).toUpperCase() + q.slice(1);
      this.graphicsSelect.appendChild(opt);
    }
    gRow.appendChild(this.graphicsSelect);
    panel.appendChild(gRow);
    const back = document.createElement('button');
    back.className = 'menu-button menu-button-secondary';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.hideSettings());
    panel.appendChild(back);
    menu.appendChild(panel);
    return menu;
  }

  _rangeRow(parent, label) {
    const row = document.createElement('label');
    row.className = 'settings-row';
    row.textContent = label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    row.appendChild(input);
    parent.appendChild(row);
    return input;
  }

  _createControlsMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay menu-sub hidden';
    const panel = document.createElement('div');
    panel.className = 'menu-panel menu-panel-wide';
    panel.innerHTML = `
      <h2>CONTROLS</h2>
      <div class="controls-list">
        <div><span>WASD</span><span>Move</span></div>
        <div><span>A / D</span><span>Rotate</span></div>
        <div><span>SPACE</span><span>Shoot</span></div>
        <div><span>SHIFT</span><span>Dash</span></div>
        <div><span>1 – 3</span><span>Weapons</span></div>
        <div><span>ESC</span><span>Pause</span></div>
      </div>`;
    const back = document.createElement('button');
    back.className = 'menu-button menu-button-secondary';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.hideControls());
    panel.appendChild(back);
    menu.appendChild(panel);
    return menu;
  }

  _createStatisticsMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay menu-sub hidden';
    const panel = document.createElement('div');
    panel.className = 'menu-panel menu-panel-wide menu-scroll';
    panel.innerHTML = '<h2>STATISTICS</h2>';
    this.statisticsBody = document.createElement('div');
    this.statisticsBody.className = 'statistics-body';
    panel.appendChild(this.statisticsBody);
    const back = document.createElement('button');
    back.className = 'menu-button menu-button-secondary';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.hideStatistics());
    panel.appendChild(back);
    menu.appendChild(panel);
    return menu;
  }

  _createGameModesMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay menu-sub hidden';
    const panel = document.createElement('div');
    panel.className = 'menu-panel menu-panel-wide';
    panel.innerHTML = '<h2>GAME MODES</h2><p class="menu-subtitle">Select a mode then press Play</p>';
    const survival = document.createElement('button');
    survival.className = 'menu-button';
    survival.textContent = 'Survival — Wave-based';
    survival.addEventListener('click', () => this._callbacks.onSelectMode?.(GAME_MODES.SURVIVAL));
    const rush = document.createElement('button');
    rush.className = 'menu-button menu-button-secondary';
    rush.textContent = 'Boss Rush — 4 bosses';
    rush.addEventListener('click', () => this._callbacks.onSelectMode?.(GAME_MODES.BOSS_RUSH));
    panel.append(survival, rush);
    const back = document.createElement('button');
    back.className = 'menu-button menu-button-secondary';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.hideGameModes());
    panel.appendChild(back);
    menu.appendChild(panel);
    return menu;
  }

  _createGameOverMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay hidden';
    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    this.gameOverTitle = document.createElement('h2');
    this.gameOverBody = document.createElement('p');
    this.gameOverBody.className = 'menu-subtitle';
    panel.append(this.gameOverTitle, this.gameOverBody);
    const restart = document.createElement('button');
    restart.className = 'menu-button';
    restart.textContent = 'Restart';
    restart.addEventListener('click', () => this._callbacks.onRestart?.());
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-button menu-button-secondary';
    menuBtn.textContent = 'Main Menu';
    menuBtn.addEventListener('click', () => this._callbacks.onMainMenu?.());
    panel.append(restart, menuBtn);
    menu.appendChild(panel);
    return menu;
  }
}
