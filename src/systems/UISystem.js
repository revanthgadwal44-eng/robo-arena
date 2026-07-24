const GAME_VERSION = 'Robo Arena Alpha v0.2';

export class UISystem {
  constructor() {
    this._onPlay = null;
    this._onRestart = null;
    this._onResume = null;
    this._onMainMenu = null;
    this._onSettings = null;
    this._damageFlashIntensity = 0;

    this.root = document.createElement('div');
    this.root.className = 'ui-root';
    document.body.appendChild(this.root);

    this.hud = this._createHud();
    this.crosshair = this._createCrosshair();
    this.damageFlash = this._createDamageFlash();
    this.waveAnnouncement = this._createWaveAnnouncement();
    this.mainMenu = this._createMainMenu();
    this.pauseMenu = this._createPauseMenu();

    this.root.append(
      this.hud,
      this.crosshair,
      this.damageFlash,
      this.waveAnnouncement,
      this.mainMenu,
      this.pauseMenu
    );
  }

  _createHud() {
    const hud = document.createElement('div');
    hud.className = 'hud';

    const title = document.createElement('div');
    title.className = 'hud-title';
    title.textContent = 'ROBO ARENA';

    const healthLabel = document.createElement('div');
    healthLabel.className = 'hud-label';
    healthLabel.textContent = 'Health';

    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    this.healthBarFill = document.createElement('div');
    this.healthBarFill.className = 'health-bar-fill';
    healthBar.appendChild(this.healthBarFill);

    this.healthText = document.createElement('div');
    this.healthText.className = 'hud-value-large';

    const stats = document.createElement('div');
    stats.className = 'hud-stats';
    this.waveText = this._createStat(stats, 'Wave');
    this.enemiesText = this._createStat(stats, 'Enemies');
    this.killsText = this._createStat(stats, 'Kills');
    this.fpsText = this._createStat(stats, 'FPS');

    this.powerUpsText = document.createElement('div');
    this.powerUpsText.className = 'powerup-text';

    hud.append(title, healthLabel, healthBar, this.healthText, stats, this.powerUpsText);
    return hud;
  }

  _createStat(parent, label) {
    const row = document.createElement('div');
    row.className = 'hud-row';
    const labelElement = document.createElement('span');
    labelElement.className = 'hud-stat-label';
    labelElement.textContent = label;
    const valueElement = document.createElement('span');
    valueElement.className = 'hud-stat-value';
    row.append(labelElement, valueElement);
    parent.appendChild(row);
    return valueElement;
  }

  _createCrosshair() {
    const crosshair = document.createElement('div');
    crosshair.className = 'crosshair';
    return crosshair;
  }

  _createDamageFlash() {
    const flash = document.createElement('div');
    flash.className = 'damage-flash';
    return flash;
  }

  _createWaveAnnouncement() {
    const announcement = document.createElement('div');
    announcement.className = 'wave-announcement';
    return announcement;
  }

  _createMainMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.innerHTML = `
      <h1>ROBO ARENA</h1>
      <p class="menu-subtitle">Alpha v0.2</p>
    `;

    const playButton = document.createElement('button');
    playButton.className = 'menu-button';
    playButton.textContent = 'Play';
    playButton.addEventListener('click', () => {
      this._onPlay?.();
    });

    const settingsButton = document.createElement('button');
    settingsButton.className = 'menu-button menu-button-secondary';
    settingsButton.textContent = 'Settings';
    settingsButton.addEventListener('click', () => {
      this._onSettings?.();
      this.showNotification('Settings: Use WASD to move, Space to shoot, Shift to dash.');
    });

    const version = document.createElement('p');
    version.className = 'version-text';
    version.textContent = GAME_VERSION;

    panel.append(playButton, settingsButton, version);
    menu.appendChild(panel);
    return menu;
  }

  _createPauseMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu-overlay hidden';

    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.innerHTML = '<h2>Paused</h2>';

    const resumeButton = document.createElement('button');
    resumeButton.className = 'menu-button';
    resumeButton.textContent = 'Resume';
    resumeButton.addEventListener('click', () => this._onResume?.());

    const restartButton = document.createElement('button');
    restartButton.className = 'menu-button';
    restartButton.textContent = 'Restart';
    restartButton.addEventListener('click', () => this._onRestart?.());

    const mainMenuButton = document.createElement('button');
    mainMenuButton.className = 'menu-button menu-button-secondary';
    mainMenuButton.textContent = 'Main Menu';
    mainMenuButton.addEventListener('click', () => this._onMainMenu?.());

    panel.append(resumeButton, restartButton, mainMenuButton);
    menu.appendChild(panel);
    return menu;
  }

  setCallbacks(callbacks) {
    this._onPlay = callbacks.onPlay ?? null;
    this._onRestart = callbacks.onRestart ?? null;
    this._onResume = callbacks.onResume ?? null;
    this._onMainMenu = callbacks.onMainMenu ?? null;
    this._onSettings = callbacks.onSettings ?? null;
  }

  setMainMenuVisible(visible) {
    this.mainMenu.classList.toggle('hidden', !visible);
  }

  setPauseMenuVisible(visible) {
    this.pauseMenu.classList.toggle('hidden', !visible);
  }

  setInGameHudVisible(visible) {
    this.hud.classList.toggle('hidden', !visible);
    this.crosshair.classList.toggle('hidden', !visible);
  }

  flashDamage(intensity = 1) {
    this._damageFlashIntensity = Math.min(1, this._damageFlashIntensity + intensity);
  }

  showWaveAnnouncement(wave) {
    this.waveAnnouncement.textContent = `WAVE ${wave}`;
    this.waveAnnouncement.classList.remove('wave-announce-active');
    // Force restart animation.
    void this.waveAnnouncement.offsetWidth;
    this.waveAnnouncement.classList.add('wave-announce-active');
  }

  showNotification(text) {
    this.waveAnnouncement.textContent = text;
    this.waveAnnouncement.classList.remove('wave-announce-active');
    void this.waveAnnouncement.offsetWidth;
    this.waveAnnouncement.classList.add('wave-announce-active');
  }

  updateDamageEffects(delta) {
    if (this._damageFlashIntensity > 0) {
      this._damageFlashIntensity = Math.max(0, this._damageFlashIntensity - delta * 2.2);
    }
    this.damageFlash.style.opacity = (this._damageFlashIntensity * 0.45).toFixed(3);
  }

  /**
   * @param {number} health
   * @param {number} maxHealth
   * @param {number} kills
   * @param {number} wave
   * @param {number} enemiesRemaining
   * @param {number} fps
   * @param {{name: string, remaining: number}[]} activePowerUps
   */
  update(health, maxHealth, kills, wave, enemiesRemaining, fps, activePowerUps) {
    const normalizedHealth = Math.max(0, Math.min(1, maxHealth > 0 ? health / maxHealth : 0));
    this.healthBarFill.style.width = `${(normalizedHealth * 100).toFixed(1)}%`;
    this.healthText.textContent = `${Math.max(0, Math.floor(health))} / ${Math.floor(maxHealth)}`;
    this.waveText.textContent = `${wave}`;
    this.enemiesText.textContent = `${enemiesRemaining}`;
    this.killsText.textContent = `${kills}`;
    this.fpsText.textContent = `${Math.round(fps)}`;

    this.powerUpsText.textContent = activePowerUps.length === 0
      ? 'Power-ups: None'
      : `Power-ups: ${activePowerUps
        .map((powerUp) => `${powerUp.name} (${powerUp.remaining.toFixed(1)}s)`)
        .join(', ')}`;
  }
}
