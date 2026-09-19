const STORAGE_KEY = 'robo-arena-alpha-v1';

const DEFAULT_DATA = {
  settings: {
    masterVolume: 0.24,
    musicVolume: 0.4,
    sfxVolume: 1,
    graphicsQuality: 'medium',
  },
  statistics: {
    survival: {
      highestWave: 0,
      bestScore: 0,
      totalKills: 0,
      runsPlayed: 0,
    },
    bossRush: {
      bossesDefeated: 0,
      bestTimeSeconds: 0,
      bestScore: 0,
      runsPlayed: 0,
    },
  },
  achievements: {},
};

export class SaveManager {
  constructor() {
    this._data = this._load();
  }

  get settings() {
    return this._data.settings;
  }

  get statistics() {
    return this._data.statistics;
  }

  get achievements() {
    return this._data.achievements;
  }

  updateSettings(partial) {
    Object.assign(this._data.settings, partial);
    this._save();
  }

  recordRunEnd(mode, payload) {
    const stats = mode === 'boss_rush' ? this._data.statistics.bossRush : this._data.statistics.survival;
    stats.runsPlayed += 1;
    stats.bestScore = Math.max(stats.bestScore, payload.score ?? 0);
    if (mode === 'survival') {
      stats.highestWave = Math.max(stats.highestWave, payload.wave ?? 0);
      stats.totalKills += payload.kills ?? 0;
    } else {
      stats.bossesDefeated = Math.max(stats.bossesDefeated, payload.bossesDefeated ?? 0);
      if (payload.timeSeconds > 0) {
        stats.bestTimeSeconds = stats.bestTimeSeconds === 0
          ? payload.timeSeconds
          : Math.min(stats.bestTimeSeconds, payload.timeSeconds);
      }
    }
    this._checkAchievements(mode, payload);
    this._save();
  }

  unlockAchievement(id, label) {
    if (this._data.achievements[id]) {
      return false;
    }
    this._data.achievements[id] = { label, unlockedAt: Date.now() };
    this._save();
    return true;
  }

  _checkAchievements(mode, payload) {
    if ((payload.kills ?? 0) >= 10) {
      this.unlockAchievement('kills_10', 'First Blood — 10 kills');
    }
    if ((payload.wave ?? 0) >= 5) {
      this.unlockAchievement('wave_5', 'Survivor — Reach wave 5');
    }
    if (payload.bossDefeated) {
      this.unlockAchievement('boss_down', 'Boss Breaker');
    }
    if (mode === 'boss_rush' && (payload.bossesDefeated ?? 0) >= 4) {
      this.unlockAchievement('boss_rush_clear', 'Boss Rush Champion');
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
        statistics: {
          survival: { ...DEFAULT_DATA.statistics.survival, ...parsed.statistics?.survival },
          bossRush: { ...DEFAULT_DATA.statistics.bossRush, ...parsed.statistics?.bossRush },
        },
        achievements: parsed.achievements ?? {},
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
  }
}
