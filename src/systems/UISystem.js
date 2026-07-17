/**
 * HUD overlay — health, kills, current wave, and enemies remaining.
 */
export class UISystem {
  constructor() {
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.top = '10px';
    this.element.style.left = '10px';
    this.element.style.color = 'white';
    this.element.style.fontSize = '24px';
    document.body.appendChild(this.element);
  }

  /**
   * @param {number} health
   * @param {number} kills
   * @param {number} wave
   * @param {number} enemiesRemaining
   */
  update(health, kills, wave, enemiesRemaining) {
    this.element.innerHTML = `
Health : ${Math.floor(health)}
<br>
Kills : ${kills}
<br>
Wave : ${wave}
<br>
Enemies Remaining : ${enemiesRemaining}
`;
  }
}
