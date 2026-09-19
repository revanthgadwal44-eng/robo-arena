# Robo Arena Alpha v0.3.0

A modular Three.js arena shooter built with Vite and JavaScript. Fight waves of enemies, switch weapons, collect pickups, and battle a multi-phase boss.

## Features

- Tank-style player movement, dash, and third-person camera
- Weapons: Pistol, Assault Rifle, Shotgun
- Enemy types: Normal, Fast, Tank (AI, obstacle avoidance, line of sight)
- Multi-phase boss battle with area attacks and phase transitions
- Pickups, waves, combat VFX, damage numbers, score/combo
- Game modes: **Survival** and **Boss Rush**
- Statistics, achievements, and local save (settings + progression)
- Audio: menu/gameplay/boss music and expanded SFX hooks
- Responsive HUD/menus and basic mobile touch controls

## Controls

| Input | Action |
|-------|--------|
| WASD | Move |
| A / D | Rotate |
| Space | Shoot |
| Shift | Dash |
| 1 – 3 | Switch weapon |
| Esc | Pause |

Touch (mobile): virtual stick, Shoot, Dash, weapon buttons.

## Game Modes

- **Survival** — Classic wave progression with boss every 5 waves.
- **Boss Rush** — Defeat 4 escalating bosses back-to-back; best time/score tracked separately.

## Tech Stack

- Vite
- JavaScript (ES modules)
- Three.js
- HTML/CSS
- localStorage (save/settings)

## Architecture

```
src/
├── main.js              # Bootstrap, wiring, render loop
├── constants.js         # Shared configuration
├── entities/            # Player, Enemy, Boss, Bullet
├── managers/            # Gameplay coordinators (waves, weapons, audio, save, run state)
├── systems/             # Input, UI, camera, combat feedback, graphics, mobile controls
└── world/               # Arena, obstacles, collision
```

### Major modules

| Module | Responsibility |
|--------|----------------|
| `GameRunManager` | Score, combo, game over, playing update orchestration |
| `WeaponManager` | Weapon switching and fire requests to `BulletManager` |
| `BulletManager` | Bullets, collisions, pooled VFX |
| `EnemyManager` | Spawning, AI, shooting |
| `BossManager` | Boss phases, attacks, area slam |
| `WaveManager` / `BossRushManager` | Mode-specific progression |
| `SaveManager` | Settings, statistics, achievements |
| `UISystem` + `MenuSystem` | HUD and menus |
| `AudioManager` | Music layers and SFX |
| `CombatFeedbackSystem` | Damage numbers and hit-stop |
| `GraphicsSystem` | Quality presets (pixel ratio, shadows) |

## Install

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

## Build

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Known Limitations

- Procedural Web Audio tones (no bundled asset files yet)
- Mobile support is basic; desktop is the primary target
- No multiplayer or backend
- FPS varies by hardware; use Graphics Quality in Settings

## Future Roadmap

- Real audio assets and mixing polish
- Additional bosses and Boss Rush variants
- Multiplayer arena modes
- Cloud saves and leaderboards
