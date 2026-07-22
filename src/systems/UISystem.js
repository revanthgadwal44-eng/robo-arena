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
    this.element.style.fontSize = '18px';
    this.element.style.lineHeight = '1.4';
    this.element.style.fontFamily = 'Menlo, Monaco, Consolas, monospace';
    this.element.style.padding = '12px';
    this.element.style.background = 'rgba(0, 0, 0, 0.35)';
    this.element.style.borderRadius = '8px';
    this.element.style.pointerEvents = 'none';
    document.body.appendChild(this.element);

    this.crosshair = document.createElement('div');
    this.crosshair.style.position = 'absolute';
    this.crosshair.style.top = '50%';
    this.crosshair.style.left = '50%';
    this.crosshair.style.width = '20px';
    this.crosshair.style.height = '20px';
    this.crosshair.style.transform = 'translate(-50%, -50%)';
    this.crosshair.style.pointerEvents = 'none';
    this.crosshair.style.border = '2px solid rgba(255, 255, 255, 0.8)';
    this.crosshair.style.borderRadius = '50%';
    this.crosshair.style.boxSizing = 'border-box';
    document.body.appendChild(this.crosshair);
  }

  /**
   * @param {number} health
   * @param {number} kills
   * @param {number} wave
   * @param {number} enemiesRemaining
   * @param {number} fps
   * @param {{name: string, remaining: number}[]} activePowerUps
   */
  update(health, kills, wave, enemiesRemaining, fps, activePowerUps) {
    const powerUpsHtml = activePowerUps.length === 0
      ? 'Power-ups : None'
      : `Power-ups : ${activePowerUps
        .map((powerUp) => `${powerUp.name} (${powerUp.remaining.toFixed(1)}s)`)
        .join(', ')}`;

    this.element.innerHTML = `
Health : ${Math.max(0, Math.floor(health))}
<br>
Kills : ${kills}
<br>
Wave : ${wave}
<br>
Enemies Remaining : ${enemiesRemaining}
<br>
FPS : ${Math.round(fps)}
<br>
${powerUpsHtml}
`;
  }
}
