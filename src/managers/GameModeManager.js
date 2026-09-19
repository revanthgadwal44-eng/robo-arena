import { GAME_MODES } from '../constants.js';

export class GameModeManager {
  constructor() {
    this.mode = GAME_MODES.SURVIVAL;
  }

  setMode(mode) {
    if (mode !== GAME_MODES.SURVIVAL && mode !== GAME_MODES.BOSS_RUSH) {
      return false;
    }
    this.mode = mode;
    return true;
  }

  isSurvival() {
    return this.mode === GAME_MODES.SURVIVAL;
  }

  isBossRush() {
    return this.mode === GAME_MODES.BOSS_RUSH;
  }
}
