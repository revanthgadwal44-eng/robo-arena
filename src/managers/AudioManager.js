export class AudioManager {
  constructor() {
    this._context = null;
    this._masterGain = null;
    this._musicGain = null;
    this._sfxGain = null;
    this._musicIntervalId = null;
    this._bossMusicIntervalId = null;
    this._menuMusicIntervalId = null;
    this._activeMusic = null;
    this._volumes = { masterVolume: 0.24, musicVolume: 0.4, sfxVolume: 1 };
  }

  applyVolumes(settings) {
    this._volumes = { ...this._volumes, ...settings };
    if (this._masterGain) {
      this._masterGain.gain.value = this._volumes.masterVolume;
    }
    if (this._musicGain) {
      this._musicGain.gain.value = this._volumes.musicVolume;
    }
    if (this._sfxGain) {
      this._sfxGain.gain.value = this._volumes.sfxVolume;
    }
  }

  _ensureContext() {
    if (this._context) {
      return;
    }
    const ContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!ContextCtor) {
      return;
    }
    this._context = new ContextCtor();
    this._masterGain = this._context.createGain();
    this._masterGain.gain.value = this._volumes.masterVolume;
    this._masterGain.connect(this._context.destination);
    this._musicGain = this._context.createGain();
    this._musicGain.gain.value = this._volumes.musicVolume;
    this._musicGain.connect(this._masterGain);
    this._sfxGain = this._context.createGain();
    this._sfxGain.gain.value = this._volumes.sfxVolume;
    this._sfxGain.connect(this._masterGain);
  }

  resume() {
    this._ensureContext();
    if (this._context?.state === 'suspended') {
      this._context.resume();
    }
  }

  _playTone({ frequency, duration, type = 'sine', volume = 0.15, sweepTo = null }, gainNode = this._sfxGain) {
    this._ensureContext();
    if (!this._context || !gainNode) {
      return;
    }
    const now = this._context.currentTime;
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (sweepTo !== null) {
      osc.frequency.linearRampToValueAtTime(sweepTo, now + duration);
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * this._volumes.sfxVolume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(gainNode);
    osc.start(now);
    osc.stop(now + duration);
  }

  _startMusicLoop(intervalMs, notes, intervalIdKey, gainNode = this._musicGain) {
    this._stopMusicLoop(intervalIdKey);
    let step = 0;
    this[intervalIdKey] = window.setInterval(() => {
      if (!this._context || this._context.state !== 'running') {
        return;
      }
      const baseFrequency = notes[step % notes.length];
      this._playTone({ frequency: baseFrequency, duration: 0.42, type: 'sine', volume: 0.04 }, gainNode);
      this._playTone({ frequency: baseFrequency * 0.5, duration: 0.42, type: 'triangle', volume: 0.03 }, gainNode);
      step += 1;
    }, intervalMs);
    this._activeMusic = intervalIdKey;
  }

  _stopMusicLoop(intervalIdKey) {
    if (this[intervalIdKey] !== null) {
      window.clearInterval(this[intervalIdKey]);
      this[intervalIdKey] = null;
    }
  }

  stopAllMusic() {
    this._stopMusicLoop('_musicIntervalId');
    this._stopMusicLoop('_bossMusicIntervalId');
    this._stopMusicLoop('_menuMusicIntervalId');
    this._activeMusic = null;
  }

  startBackgroundMusic() {
    this.startMenuMusic();
  }

  startMenuMusic() {
    this.stopAllMusic();
    this._startMusicLoop(520, [130.81, 164.81, 196.0, 164.81], '_menuMusicIntervalId');
  }

  startGameplayMusic() {
    if (this._activeMusic === '_musicIntervalId') {
      return;
    }
    this.stopAllMusic();
    this._startMusicLoop(420, [146.83, 174.61, 220.0, 174.61, 261.63, 220.0], '_musicIntervalId');
  }

  startBossMusic() {
    if (this._activeMusic === '_bossMusicIntervalId') {
      return;
    }
    this._stopMusicLoop('_musicIntervalId');
    this._startMusicLoop(360, [98.0, 123.47, 146.83, 110.0], '_bossMusicIntervalId');
  }

  stopBossMusic() {
    this._stopMusicLoop('_bossMusicIntervalId');
    if (this._activeMusic === '_bossMusicIntervalId') {
      this._activeMusic = null;
    }
  }

  stopGameplayMusic() {
    this._stopMusicLoop('_musicIntervalId');
  }

  playShoot() {
    this._playTone({ frequency: 420, sweepTo: 220, duration: 0.06, type: 'square', volume: 0.08 });
  }

  playWeaponShoot(soundId) {
    switch (soundId) {
      case 'assault_rifle':
        this._playTone({ frequency: 520, sweepTo: 380, duration: 0.04, type: 'square', volume: 0.07 });
        break;
      case 'shotgun':
        this._playTone({ frequency: 95, sweepTo: 42, duration: 0.14, type: 'sawtooth', volume: 0.11 });
        break;
      default:
        this.playShoot();
    }
  }

  playDash() {
    this._playTone({ frequency: 280, sweepTo: 520, duration: 0.09, type: 'triangle', volume: 0.07 });
  }

  playPlayerDamage() {
    this.playHit();
  }

  playHit() {
    this._playTone({ frequency: 180, duration: 0.08, type: 'triangle', volume: 0.1 });
  }

  playExplosion() {
    this._playTone({ frequency: 110, sweepTo: 42, duration: 0.24, type: 'sawtooth', volume: 0.12 });
  }

  playPickup() {
    this._playTone({ frequency: 620, sweepTo: 860, duration: 0.14, type: 'triangle', volume: 0.09 });
  }

  playWaveComplete() {
    this._playTone({ frequency: 300, duration: 0.1, type: 'sine', volume: 0.1 });
    this._playTone({ frequency: 450, duration: 0.12, type: 'sine', volume: 0.1 });
    this._playTone({ frequency: 620, duration: 0.14, type: 'sine', volume: 0.1 });
  }

  playWaveStart() {
    this._playTone({ frequency: 240, sweepTo: 360, duration: 0.16, type: 'square', volume: 0.08 });
  }

  playGameOver() {
    this.stopAllMusic();
    this._playTone({ frequency: 220, sweepTo: 55, duration: 0.55, type: 'sawtooth', volume: 0.12 });
  }

  playEnemyShoot() {
    this._playTone({ frequency: 300, sweepTo: 180, duration: 0.05, type: 'square', volume: 0.05 });
  }

  playEnemyDeath() {
    this._playTone({ frequency: 160, sweepTo: 70, duration: 0.14, type: 'sawtooth', volume: 0.07 });
  }

  playBossHit() {
    this._playTone({ frequency: 140, duration: 0.06, type: 'square', volume: 0.09 });
  }

  playBossPhaseTransition(phase = 2) {
    const base = phase >= 3 ? 95 : 140;
    this._playTone({ frequency: base, sweepTo: base * 0.45, duration: 0.32, type: 'sawtooth', volume: 0.13 });
  }

  playBossAreaSlam() {
    this._playTone({ frequency: 72, sweepTo: 38, duration: 0.28, type: 'sawtooth', volume: 0.14 });
  }

  playBossDeath() {
    this.playExplosion();
  }
}
