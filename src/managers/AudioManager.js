export class AudioManager {
  constructor() {
    this._context = null;
    this._masterGain = null;
    this._musicGain = null;
    this._musicIntervalId = null;
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
    this._masterGain.gain.value = 0.24;
    this._masterGain.connect(this._context.destination);

    this._musicGain = this._context.createGain();
    this._musicGain.gain.value = 0.4;
    this._musicGain.connect(this._masterGain);
  }

  resume() {
    this._ensureContext();
    if (!this._context) {
      return;
    }
    if (this._context.state === 'suspended') {
      this._context.resume();
    }
  }

  _playTone({ frequency, duration, type = 'sine', volume = 0.15, sweepTo = null }, gainNode = this._masterGain) {
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
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(gainNode);
    osc.start(now);
    osc.stop(now + duration);
  }

  playShoot() {
    this._playTone({ frequency: 420, sweepTo: 220, duration: 0.06, type: 'square', volume: 0.08 });
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

  startBackgroundMusic() {
    this._ensureContext();
    if (!this._context || !this._musicGain || this._musicIntervalId !== null) {
      return;
    }

    const notes = [146.83, 174.61, 220.0, 174.61, 261.63, 220.0];
    let step = 0;
    this._musicIntervalId = window.setInterval(() => {
      if (!this._context || this._context.state !== 'running') {
        return;
      }
      const baseFrequency = notes[step % notes.length];
      this._playTone({
        frequency: baseFrequency,
        duration: 0.42,
        type: 'sine',
        volume: 0.04,
      }, this._musicGain);
      this._playTone({
        frequency: baseFrequency * 0.5,
        duration: 0.42,
        type: 'triangle',
        volume: 0.03,
      }, this._musicGain);
      step += 1;
    }, 420);
  }
}
