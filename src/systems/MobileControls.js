export class MobileControls {
  constructor(inputSystem) {
    this.input = inputSystem;
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls hidden';
    this._moveActive = false;
    this._moveVector = { x: 0, y: 0 };
    this._build();
    document.body.appendChild(this.root);
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
    if (!visible) {
      this._moveActive = false;
      this._moveVector.x = 0;
      this._moveVector.y = 0;
    }
  }

  /** @returns {{x:number,y:number}} normalized -1..1 stick vector */
  getMoveVector() {
    return this._moveVector;
  }

  isShootPressed() {
    return this._shootPressed;
  }

  consumeDash() {
    if (!this._dashQueued) {
      return false;
    }
    this._dashQueued = false;
    return true;
  }

  _build() {
    const stick = document.createElement('div');
    stick.className = 'mobile-stick';
    this.stickKnob = document.createElement('div');
    this.stickKnob.className = 'mobile-stick-knob';
    stick.appendChild(this.stickKnob);
    this.root.appendChild(stick);

    const actions = document.createElement('div');
    actions.className = 'mobile-actions';
    this._shootPressed = false;
    this._dashQueued = false;

    const shoot = document.createElement('button');
    shoot.className = 'mobile-btn';
    shoot.textContent = 'SHOOT';
    shoot.addEventListener('touchstart', (e) => { e.preventDefault(); this._shootPressed = true; });
    shoot.addEventListener('touchend', () => { this._shootPressed = false; });

    const dash = document.createElement('button');
    dash.className = 'mobile-btn';
    dash.textContent = 'DASH';
    dash.addEventListener('touchstart', (e) => { e.preventDefault(); this._dashQueued = true; });

    const w1 = document.createElement('button');
    w1.className = 'mobile-btn mobile-btn-small';
    w1.textContent = '1';
    w1.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.onWeaponSwitch?.('pistol'); });
    const w2 = document.createElement('button');
    w2.className = 'mobile-btn mobile-btn-small';
    w2.textContent = '2';
    w2.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.onWeaponSwitch?.('assault_rifle'); });
    const w3 = document.createElement('button');
    w3.className = 'mobile-btn mobile-btn-small';
    w3.textContent = '3';
    w3.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.onWeaponSwitch?.('shotgun'); });

    actions.append(shoot, dash, w1, w2, w3);
    this.root.appendChild(actions);

    const center = { x: 0, y: 0 };
    const updateStick = (clientX, clientY) => {
      const rect = stick.getBoundingClientRect();
      center.x = rect.left + rect.width / 2;
      center.y = rect.top + rect.height / 2;
      let dx = clientX - center.x;
      let dy = clientY - center.y;
      const max = 42;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      this._moveVector.x = dx / max;
      this._moveVector.y = -dy / max;
    };

    stick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._moveActive = true;
      updateStick(e.touches[0].clientX, e.touches[0].clientY);
    });
    stick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this._moveActive) return;
      updateStick(e.touches[0].clientX, e.touches[0].clientY);
    });
    const endStick = () => {
      this._moveActive = false;
      this._moveVector.x = 0;
      this._moveVector.y = 0;
      this.stickKnob.style.transform = 'translate(0,0)';
    };
    stick.addEventListener('touchend', endStick);
    stick.addEventListener('touchcancel', endStick);
  }
}
