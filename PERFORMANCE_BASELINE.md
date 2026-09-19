# Robo Arena — Performance Baseline (Day 16 Forensics)

**Date:** 2026-09-19
**Repository:** `C:\Users\revan\robo-arena`
**Git HEAD (committed):** `f186afd` — Day 15
**Working tree:** Uncommitted WIP (Days 16–25 features mixed in) — measurements below reflect **current local build** served via Vite dev (`http://localhost:5174/`).

---

## 1. Measurement environment

| Item | Value |
|------|--------|
| Tooling | Vite 8 dev server, Chrome (Cursor browser automation) |
| Viewport (CSS) | ~1920×1080 |
| `devicePixelRatio` | **2** |
| Canvas backing store | **2400×1350** (≈1.25× cap from `GraphicsSystem` medium preset) |
| Graphics preset (save default) | **medium** — antialias on, shadow map 1024², pixel ratio cap 1.25 |
| Animation loop | Single `requestAnimationFrame` in `src/main.js` |
| Build | `npm run build` — **PASS** (34 modules) |

---

## 2. Live FPS / frame-time (measured, not estimated)

### In-game HUD (during Survival play, wave 1, 3 initial enemies)

| Metric | Value |
|--------|--------|
| HUD **FPS** readout | **~20** |

### Independent rAF sampling (~180 frames, ~3s, game running)

| Metric | Value |
|--------|--------|
| Average frame interval | **43.3 ms** |
| Implied average FPS | **~23.1** |
| **p95** frame interval | **66.8 ms** (~15 FPS spikes) |
| Best interval observed | ~16.5 ms (~61 FPS) |
| Worst interval observed | ~83.4 ms (~12 FPS) |

**Interpretation:** Performance is **not** a stable 30 FPS — it oscillates with **heavy tails** (p95 ≈ 67 ms). This matches “stuttery ~30 FPS” reports; sustained gameplay in this session was closer to **20–23 FPS** on this setup.

> **Limitation:** Automation runs on the agent host GPU/CPU; your machine may differ. Numbers are still **valid baseline evidence** for this environment and build.

---

## 3. Rendering cost inventory (static analysis)

| Factor | Finding | Severity |
|--------|---------|----------|
| **Shadow mapping** | `renderer.shadowMap.enabled = true`, directional shadow **1024²** (medium), `PCFShadowMap` | **High** |
| **Shadow casters** | Arena decor (crates, pillars, props), obstacles, player, enemies, **player/enemy/boss bullets** (`castShadow = true`) | **High** |
| **Point lights** | Arena alone: ~**12** wall marker lights + **5** generator + **3** antenna + **2** pole ≈ **22** dynamic point lights | **Very high** |
| **Material model** | Widespread `MeshStandardMaterial` (PBR) on arena, obstacles, entities | **Medium–High** |
| **Fill rate** | 2400×1350 + MSAA (antialias) + tone mapping + transparent VFX | **High** |
| **Scene complexity** | Large static arena mesh count (floor tiles, stripes, 48 scratches, pillars, props) + **20–30** gameplay obstacles | **Medium** |
| **Bullets** | New `THREE.Mesh` per shot; **not pooled**; shadows enabled on player bullets | **Medium** (scales with combat) |
| **VFX pools** | BulletManager pools (flash/trail/spark/smoke/shockwave) — **good** | Low when idle |
| **Boss VFX** | Boss entity adds **32** pooled spark/smoke meshes in scene (separate from BulletManager pools) | **Medium** during boss |

---

## 4. CPU / logic cost inventory (static analysis)

| System | Finding | Severity |
|--------|---------|----------|
| **Enemy AI** | Per enemy per frame: obstacle **avoidance loop** over all obstacles (`O(enemies × obstacles)`); up to **4** collision try-steps with obstacle checks | **High** at 10–20 enemies |
| **Line of sight** | `hasLineOfSight` — segment vs **every** obstacle AABB; used on **enemy shoot** (not raycaster, but linear in obstacle count) | **Medium** |
| **`ENEMY_LOS_CHECK_INTERVAL_SECONDS`** | Defined in constants but **not applied** to throttle LOS in hot paths | Config drift |
| **Health bars** | Each enemy: `lookAt(camera)` every **2** frames — reasonable | Low–Medium |
| **DOM / UI** | `UISystem.update` runs every frame; score/combo use change guards; health/stats still touch DOM each frame | **Medium** |
| **Combat feedback** | Damage numbers use DOM pool — bounded | Low |
| **Audio** | Multiple `setInterval` music loops (menu/gameplay/boss) — low CPU but worth monitoring | Low |
| **Allocations** | Hot paths: `playerPosition.clone()` on enemy shoot; `getCenter(new THREE.Vector3())` in obstacle spacing checks; `_getSizeForType` returns **new Vector3** in ObstacleManager | **GC spike risk** under load |

---

## 5. Primary bottleneck hypothesis (ranked)

1. **GPU: shadow pass + standard materials + high internal resolution**
   Many shadow-casting meshes (including **bullets**) + 1024 shadow map + ~2.3M+ shaded pixels/frame (before overdraw).

2. **GPU: excessive dynamic point lights in `Arena.js`**
   Each `PointLight` adds per-fragment cost with `MeshStandardMaterial`. This is a likely major contributor vs. a lean directional + ambient setup.

3. **CPU: enemy obstacle avoidance × obstacle count × enemy count**
   Scales badly in heavy waves (10–20 enemies).

4. **GC / allocation churn**
   Unpooled bullets + periodic `Vector3`/`clone()` in combat/spawn paths → frame-time **spikes** (consistent with p95 ≫ average).

5. **Not observed:** duplicate `requestAnimationFrame` loops; Three.js `Raycaster` in enemy AI (LOS uses analytic segment-AABB tests).

---

## 6. Scenarios for Day 29 re-test (checklist)

| Scenario | Baseline (this doc) | Target (project goal) |
|----------|---------------------|------------------------|
| Empty arena / menu | Not measured separately | 120+ FPS where hardware allows |
| Normal gameplay (wave 1) | **~20–23 FPS** measured | 100–120 FPS |
| 10 enemies | Not isolated this session | 80–100 FPS |
| 20 enemies | Not isolated | 80+ FPS |
| Boss + VFX | Not isolated | 80+ FPS |
| Restart loop memory | Not measured | No FPS decay |

---

## 7. Day 16 actions taken

- **No gameplay/rendering code changes** (forensics only).
- Created this baseline document with **measured** HUD FPS and rAF intervals.
- Verified **`npm run build`** succeeds on current tree.

---

## 8. Recommended focus for Day 17 (Rendering Optimization)

Prioritize **evidence-based** wins:

1. Reduce or remove **non-gameplay** point lights (arena decor) or bake into emissive-only meshes.
2. Tighten **shadow casters** (disable shadows on bullets, small debris, distant decor).
3. Confirm **pixel ratio** policy at startup (avoid uncapped DPR before `GraphicsSystem.applyQuality`).
4. Consider **single directional + hemisphere** for gameplay; reserve extra lights for boss phase only.

---

## 9. Known issues affecting measurement validity

- Working tree contains **uncommitted** multi-day WIP (not pure Day 15 `f186afd`).
- Browser automation may add overhead; treat absolute FPS as **environment-specific**, but **bottleneck classes** remain valid.

---

*Next step: Day 17 — implement rendering optimizations against this baseline and re-measure the same scenarios.*
