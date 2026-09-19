import { GAME_VERSION } from '../constants.js';
import { MenuSystem } from './MenuSystem.js';

export class UISystem {
  constructor() {
    this._onPlay = null;
    this._onRestart = null;
    this._onResume = null;
    this._onMainMenu = null;
    this._onSettings = null;
    this._damageFlashIntensity = 0;
    this._displayedBossHealth = 0;
    this._displayedBossPhase = 0;

    this.root = document.createElement('div');
    this.root.className = 'ui-root';
    document.body.appendChild(this.root);

    this.hud = this._createHud();
    this.bossHud = this._createBossHud();
    this.crosshair = this._createCrosshair();
    this.damageFlash = this._createDamageFlash();
    this.waveAnnouncement = this._createWaveAnnouncement();
    this.menus = new MenuSystem(this.root);
    this.mainMenu = this.menus.mainMenu;
    this.pauseMenu = this.menus.pauseMenu;

    this.root.append(
      this.hud,
      this.bossHud,
      this.crosshair,
      this.damageFlash,
      this.waveAnnouncement
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
    this.scoreText = this._createStat(stats, 'Score');
    this.comboText = this._createStat(stats, 'Combo');
    this._displayedScore = -1;
    this._displayedCombo = -1;

    this.powerUpsText = document.createElement('div');
    this.powerUpsText.className = 'powerup-text';

    this.weaponPanel = document.createElement('div');
    this.weaponPanel.className = 'weapon-panel';
    this.weaponNameText = document.createElement('div');
    this.weaponNameText.className = 'weapon-name';
    this.weaponListText = document.createElement('div');
    this.weaponListText.className = 'weapon-list';
    this.weaponListText.textContent = '1 Pistol\n2 Assault Rifle\n3 Shotgun';
    this.weaponPanel.append(this.weaponNameText, this.weaponListText);
    this._displayedWeaponId = null;

    hud.append(title, healthLabel, healthBar, this.healthText, stats, this.powerUpsText, this.weaponPanel);
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

  _createBossHud() {
    const hud = document.createElement('div');
    hud.className = 'boss-hud hidden';

    this.bossPhaseLabel = document.createElement('div');
    this.bossPhaseLabel.className = 'boss-hud-label';
    this.bossPhaseLabel.textContent = 'BOSS — PHASE I';

    const healthBar = document.createElement('div');
    healthBar.className = 'boss-health-bar';
    this.bossHealthBarFill = document.createElement('div');
    this.bossHealthBarFill.className = 'boss-health-bar-fill';
    healthBar.appendChild(this.bossHealthBarFill);

    this.bossHealthText = document.createElement('div');
    this.bossHealthText.className = 'boss-hud-value';

    hud.append(this.bossPhaseLabel, healthBar, this.bossHealthText);
    return hud;
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

  setCallbacks(callbacks) {
    this._onPlay = callbacks.onPlay ?? null;
    this._onRestart = callbacks.onRestart ?? null;
    this._onResume = callbacks.onResume ?? null;
    this._onMainMenu = callbacks.onMainMenu ?? null;
    this._onSettings = callbacks.onSettings ?? null;
    this.menus.setCallbacks({
      onPlay: () => this._onPlay?.(),
      onResume: () => this._onResume?.(),
      onRestart: () => this._onRestart?.(),
      onMainMenu: () => this._onMainMenu?.(),
      onSettings: () => this._onSettings?.(),
      onControls: () => this.menus.showControls(),
      onStatistics: () => callbacks.onStatistics?.(),
      onGameModes: () => this.menus.showGameModes(),
      onSelectMode: (mode) => callbacks.onSelectMode?.(mode),
      onQuit: () => callbacks.onQuit?.(),
    });
  }

  bindSettings(saveManager, audioManager, graphicsSystem) {
    this.menus.bindSettingsControls(saveManager, audioManager, graphicsSystem);
  }

  showStatistics(stats, achievements) {
    this.menus.showStatistics(stats, achievements);
  }

  showGameOver(payload) {
    this.menus.showGameOver(payload);
  }

  hideGameOver() {
    this.menus.hideGameOver();
  }

  setMainMenuVisible(visible) {
    if (visible) {
      this.menus.showMainMenu();
    } else {
      this.mainMenu.classList.add('hidden');
    }
  }

  setPauseMenuVisible(visible) {
    if (visible) {
      this.menus.showPauseMenu();
    } else {
      this.menus.hidePauseMenu();
    }
  }

  setInGameHudVisible(visible) {
    this.hud.classList.toggle('hidden', !visible);
    this.crosshair.classList.toggle('hidden', !visible);
    if (!visible) {
      this.bossHud.classList.add('hidden');
    }
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

  /** Called when the boss enters a new combat phase. */
  showBossPhaseChange(phase, label) {
    this._displayedBossPhase = phase;
    this.bossPhaseLabel.textContent = `BOSS — ${label}`;
    this.bossHud.classList.remove('boss-hud-phase-2', 'boss-hud-phase-3', 'boss-hud-transition');
    if (phase >= 3) {
      this.bossHud.classList.add('boss-hud-phase-3');
    } else if (phase >= 2) {
      this.bossHud.classList.add('boss-hud-phase-2');
    }
    this.bossHud.classList.add('boss-hud-transition');
    this.showNotification(label);
  }

  /**
   * Updates weapon HUD only when the active weapon changes.
   * @param {{ id: string, name: string }} weapon
   */
  updateWeapon(weapon) {
    if (!weapon || weapon.id === this._displayedWeaponId) {
      return;
    }
    this._displayedWeaponId = weapon.id;
    this.weaponNameText.textContent = `WEAPON: ${weapon.name.toUpperCase()}`;
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
   * @param {{health: number, maxHealth: number, phase?: number, transitioning?: boolean} | null} bossHealthState
   */
  update(health, maxHealth, kills, wave, enemiesRemaining, fps, activePowerUps, bossHealthState = null, score = 0, combo = 0) {
    const normalizedHealth = Math.max(0, Math.min(1, maxHealth > 0 ? health / maxHealth : 0));
    this.healthBarFill.style.width = `${(normalizedHealth * 100).toFixed(1)}%`;
    this.healthText.textContent = `${Math.max(0, Math.floor(health))} / ${Math.floor(maxHealth)}`;
    this.waveText.textContent = `${wave}`;
    this.enemiesText.textContent = `${enemiesRemaining}`;
    this.killsText.textContent = `${kills}`;
    this.fpsText.textContent = `${Math.round(fps)}`;
    if (score !== this._displayedScore) {
      this._displayedScore = score;
      this.scoreText.textContent = `${score}`;
    }
    if (combo !== this._displayedCombo) {
      this._displayedCombo = combo;
      this.comboText.textContent = combo > 0 ? `x${combo}` : '—';
    }

    this.powerUpsText.textContent = activePowerUps.length === 0
      ? 'Power-ups: None'
      : `Power-ups: ${activePowerUps
        .map((powerUp) => `${powerUp.name} (${powerUp.remaining.toFixed(1)}s)`)
        .join(', ')}`;

    if (!bossHealthState) {
      this.bossHud.classList.add('hidden');
      this._displayedBossHealth = 0;
      this._displayedBossPhase = 0;
      return;
    }

    const bossPhase = bossHealthState.phase ?? 1;
    if (bossPhase !== this._displayedBossPhase && !bossHealthState.transitioning) {
      this._displayedBossPhase = bossPhase;
      const phaseLabels = { 1: 'PHASE I', 2: 'PHASE II', 3: 'PHASE III — ENRAGED' };
      this.bossPhaseLabel.textContent = `BOSS — ${phaseLabels[bossPhase] ?? 'PHASE I'}`;
      this.bossHud.classList.toggle('boss-hud-phase-2', bossPhase === 2);
      this.bossHud.classList.toggle('boss-hud-phase-3', bossPhase === 3);
    }
    if (!bossHealthState.transitioning) {
      this.bossHud.classList.remove('boss-hud-transition');
    }

    const bossHealth = Math.max(0, bossHealthState.health);
    const bossMaxHealth = Math.max(1, bossHealthState.maxHealth);
    if (this._displayedBossHealth === 0 || this.bossHud.classList.contains('hidden')) {
      this._displayedBossHealth = bossHealth;
    } else {
      this._displayedBossHealth += (bossHealth - this._displayedBossHealth) * 0.18;
    }
    const displayedRatio = Math.min(1, Math.max(0, this._displayedBossHealth / bossMaxHealth));
    this.bossHealthBarFill.style.width = `${(displayedRatio * 100).toFixed(1)}%`;
    this.bossHealthText.textContent = `HP ${Math.floor(this._displayedBossHealth)} / ${Math.floor(bossMaxHealth)}`;
    this.bossHud.classList.remove('hidden');
  }
}
