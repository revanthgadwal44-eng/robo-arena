/**
 * Combat feedback — floating damage numbers, hit-stop, boss hit cues.
 * DOM pool with lifetimes; no per-frame DOM creation during steady state.
 */
export class CombatFeedbackSystem {
  constructor(uiRoot) {
    this._layer = document.createElement('div');
    this._layer.className = 'combat-feedback-layer';
    uiRoot.appendChild(this._layer);
    this._pool = [];
    this._active = [];
    this._hitStopRemaining = 0;
    this._project = null;
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'damage-number hidden';
      this._layer.appendChild(el);
      this._pool.push({ el, life: 0, maxLife: 0.65, vx: 0, vy: 0, x: 0, y: 0 });
    }
  }

  setProjector(projectFn) {
    this._project = projectFn;
  }

  requestHitStop(duration = 0.035) {
    this._hitStopRemaining = Math.max(this._hitStopRemaining, duration);
  }

  consumeHitStopScale() {
    if (this._hitStopRemaining <= 0) {
      return 1;
    }
    return 0.08;
  }

  spawnDamageNumber(worldPosition, amount, options = {}) {
    if (!this._project || amount <= 0) {
      return;
    }
    const screen = this._project(worldPosition);
    if (!screen) {
      return;
    }
    const entry = this._pool.find((item) => item.life <= 0);
    if (!entry) {
      return;
    }
    entry.life = entry.maxLife;
    entry.x = screen.x;
    entry.y = screen.y;
    entry.vx = (Math.random() - 0.5) * 28;
    entry.vy = -42 - Math.random() * 18;
    entry.el.textContent = `${Math.round(amount)}`;
    entry.el.className = `damage-number ${options.boss ? 'damage-number-boss' : ''}`.trim();
    entry.el.classList.remove('hidden');
    entry.el.style.transform = `translate(${entry.x}px, ${entry.y}px)`;
    this._active.push(entry);
  }

  onEnemyHit(enemyPosition, damage) {
    this.spawnDamageNumber(enemyPosition, damage ?? 0);
    this.requestHitStop(0.022);
  }

  onBossHit(bossPosition, damage) {
    this.spawnDamageNumber(bossPosition, damage ?? 0, { boss: true });
    this.requestHitStop(0.03);
  }

  update(delta) {
    if (this._hitStopRemaining > 0) {
      this._hitStopRemaining = Math.max(0, this._hitStopRemaining - delta);
    }
    for (let i = this._active.length - 1; i >= 0; i--) {
      const entry = this._active[i];
      entry.life -= delta;
      entry.x += entry.vx * delta;
      entry.y += entry.vy * delta;
      entry.vy += 18 * delta;
      const alpha = Math.max(0, entry.life / entry.maxLife);
      entry.el.style.opacity = alpha.toFixed(3);
      entry.el.style.transform = `translate(${entry.x}px, ${entry.y}px)`;
      if (entry.life <= 0) {
        entry.el.classList.add('hidden');
        this._active.splice(i, 1);
      }
    }
  }
}
