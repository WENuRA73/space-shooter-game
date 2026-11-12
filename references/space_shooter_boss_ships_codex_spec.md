# SPACE SHOOTER — 10 BOSS SHIPS
## Codex implementation specification · Version 1.0 · Phaser 3 / JavaScript / Vite

**Status:** Proposed game-design values, not tested balance. **Canvas:** 1280 × 720 landscape. **View:** top-down; boss nose points toward bottom of screen when attacking (rotate top-facing source art 180° only if required). **Scope:** Single-player, desktop-first.

## 1. Integration rules
- Use the 10 provided boss reference designs, mapped by the user's confirmed image numbering. The names below are proposed gameplay identifiers; do not assume they match labels on the image. If image order/identity is ambiguous, ask before mapping.
- Export each ship as a separate transparent PNG with intact wings and no neighboring ship parts, labels, or checkerboard. Keep source artwork unchanged and scale proportionally. Never fake a successful extraction.
- Suggested sprite keys/files: `boss_01_iron_warden.png` through `boss_10_celestial_annihilator.png`, placed in `public/assets/bosses/`.
- Bosses appear in their own arena encounter; stop normal enemy spawns on entry. Spawn boss at x=640, y=-180, tween to x=640, y=130. The visible boss sprite must remain within the arena and not obscure the HUD.
- Player projectile damage, invulnerability, upgrades, and difficulty settings must be inspected before balancing. **All bullet damage numbers below refer to damage per projectile hit, not damage per attack.** Damage values are not cumulative unless explicitly stated.
- Boss collision contact damage is subject to player invulnerability frames (default proposed 900 ms); never apply every physics frame.
- Boss attacks must telegraph dangerous lanes 0.5–1.2 s in advance. Avoid unavoidable bullet walls; leave a traversable gap at least 80 px wide for the current player hitbox.
- Boss HP is per encounter, not multiplied by phase. Phase thresholds use remaining HP percentages. Change phase only once at each threshold.
- Boss attack timers must stop immediately on defeat, pause, scene exit, or restart. Pool/recycle projectiles and destroy particles/tweens/listeners.
- Enemy bullets use world bounds and max lifetime. Explosions should use reusable particle/tween effects; never render the complete reference sheet as a sprite.

## 2. Shared mechanics
- Boss hitbox: use a tuned arcade body smaller than decorative wing tips (typically 65–80% of visible bounds). Separately handle contact collisions.
- Entry: 1.8 seconds invulnerable; show boss name and HP bar. Then enable attacks.
- Arena: x=70..1210, y=95..300 for boss movement, unless attack specifically describes a dive. Player remains able to dodge in the lower playfield.
- HP bar: top center, boss name, phase indicators. Damage flash 80 ms; major phase transition 0.8–1.2 s with attack cooldown.
- Defeat: disable weapons/collision, award score once, play scale-appropriate destruction, transition to victory after effects complete.
- Spawn progression: Boss 01 after level 5; bosses 02–10 at the end of every subsequent 5 levels (10, 15, ... 50). This is a proposed campaign cadence.
- Player target tracking: snapshot player position at telegraph end for aimed volleys; do not continuously steer unavoidable projectiles.
- Default boss projectiles travel 180–340 px/s, despawn offscreen or after 7 s. Implement pool caps (recommended 120 simultaneous enemy bullets, configurable).
- Difficulty testing: baseline player HP 100, normal movement 300 px/s, reasonable DPS ~180–250. Retune boss HP after observing time-to-kill and player upgrades.

## 3. Boss specifications

### B01 — IRON WARDEN · armored sentinel
- **HP:** 1,500 | **Speed:** 65 px/s | **Contact:** 20 | **Reward:** 2,000 points
- **Primary weapon:** Twin autocannons; 10 damage per bullet; 2 parallel shots every 1.5 s; projectile speed 230 px/s.
- **Secondary:** 3-way spread, 8 damage per bullet, 18° spacing, every 5 s.
- **Movement:** Slow horizontal patrol from x=340 to 940, smooth reversal; y=125.
- **Phase 1 (100–51%):** twin shots + patrol.
- **Phase 2 (≤50%):** patrol speed 85; alternate twin shots and 3-way spread; no simultaneous undodgeable overlap.
- **Special/telegraph:** Cannons glow red for 0.6 s before spread.
- **Destruction:** medium orange explosion + two engine debris chunks.

### B02 — CRIMSON VIPER · agile hunter
- **HP:** 2,200 | **Speed:** 125 px/s | **Contact:** 24 | **Reward:** 3,000
- **Primary:** 3-shot aimed fan; 11 damage per bullet; 14° spacing; every 1.9 s; speed 275.
- **Secondary:** dart volley of 5 straight shots, 8 damage each, every 6 s.
- **Movement:** Sine-wave strafe (amplitude 230 px, period 4.5 s) around x=640, y=135.
- **Phase 1 (100–61%):** aimed fan.
- **Phase 2 (≤60%):** faster strafe, adds dart volley.
- **Special:** brief marked dash along upper arena, warning trail 0.7 s before dash; no instant contact with player.
- **Destruction:** crimson plasma burst and wing sparks.

### B03 — THUNDER REAPER · electric artillery
- **HP:** 3,000 | **Speed:** 90 px/s | **Contact:** 28 | **Reward:** 4,200
- **Primary:** paired electric bolts; 13 damage each; every 1.7 s; speed 270.
- **Secondary:** 5-lane lightning grid; 15 damage per bolt; every 7 s; clearly indicate safe lane before firing.
- **Movement:** Step between three fixed upper positions (x=300,640,980) with 0.5 s transition and 1.4 s dwell.
- **Phase 1 (100–66%):** paired bolts.
- **Phase 2 (≤65%):** adds grid; phase transition with electric surge visual only.
- **Phase 3 (≤30%):** alternating paired bolts and grid; do not stack both simultaneously.
- **Special:** warning beams show lane boundaries 1 s before grid.
- **Destruction:** blue-white energy detonation + arcs.

### B04 — VOID HUNTER · stealth ambusher
- **HP:** 4,000 | **Speed:** 145 px/s | **Contact:** 30 | **Reward:** 5,800
- **Primary:** 4-shot crescent spread; 12 damage each; every 2.1 s; speed 290.
- **Secondary:** aimed dark pulse, 22 damage, one projectile every 5.5 s, slow visible charge.
- **Movement:** Teleport between 4 pre-approved upper positions; 0.8 s fade-out/in; cannot deal contact damage during teleport.
- **Phase 1 (100–61%):** crescent spread and reposition.
- **Phase 2 (≤60%):** dark pulse + reposition every 5 s.
- **Phase 3 (≤25%):** one decoy hologram; decoy fires harmless visual shots, clearly marked.
- **Special:** afterimages; true ship always has visible core glow.
- **Destruction:** purple implosion then outward particles.

### B05 — INFERNO TITAN · flame siege
- **HP:** 5,500 | **Speed:** 55 px/s | **Contact:** 35 | **Reward:** 7,500
- **Primary:** 5-shot fire cone; 14 damage each; every 2.5 s; speed 230.
- **Secondary:** 3 slow fire orbs; 18 damage each; every 6 s; orb radius and collision must be visible.
- **Movement:** Heavy horizontal oscillation x=350..930, y=125; pause to charge.
- **Phase 1 (100–71%):** fire cone.
- **Phase 2 (≤70%):** fire orbs; cone intervals slightly shorter.
- **Phase 3 (≤30%):** alternates cone and orbs with 0.9 s safe gap.
- **Special:** visible furnace vent opens before orb launch.
- **Destruction:** large fiery multi-burst + smoke.

### B06 — FROST LEVIATHAN · cryogenic fortress
- **HP:** 7,000 | **Speed:** 70 px/s | **Contact:** 38 | **Reward:** 9,500
- **Primary:** 3 ice lances; 16 damage each; every 2.0 s; speed 260.
- **Secondary:** 6 slow ice shards, 11 damage each; every 6.5 s; leave center gap.
- **Movement:** Slow figure-eight restricted to upper arena (x radius 190, y radius 45).
- **Phase 1 (100–66%):** ice lances.
- **Phase 2 (≤65%):** ice shard fan; lances continue only between shard volleys.
- **Phase 3 (≤25%):** two lances aimed at player last known x, with explicit targeting marks.
- **Special:** ice hit applies 15% movement slow for 0.7 s, non-stacking, with visual indicator; avoid permanent crowd control.
- **Destruction:** icy crystal fragments and blue shockwave.

### B07 — PLASMA OVERLORD · energy commander
- **HP:** 9,000 | **Speed:** 110 px/s | **Contact:** 42 | **Reward:** 12,000
- **Primary:** 4 plasma bolts, 17 damage each, every 2.1 s, speed 300.
- **Secondary:** sweeping laser beam, 25 damage per distinct hit, 0.9 s active, every 8 s; warning line 1.2 s; obey player i-frames.
- **Movement:** Sweep x=260..1020; stop for beam charge at x=640.
- **Phase 1 (100–71%):** plasma bolts.
- **Phase 2 (≤70%):** adds beam, but suppress bolts while beam is active.
- **Phase 3 (≤30%):** quicker sweep and 5-bolt fan, still one major attack at a time.
- **Special:** shield appears for 1 s during phase transition only, not indefinite invulnerability.
- **Destruction:** bright cyan-purple reactor overload.

### B08 — SHADOW DEVOURER · dimensional predator
- **HP:** 12,000 | **Speed:** 140 px/s | **Contact:** 45 | **Reward:** 15,500
- **Primary:** rotating 7-bullet arc, 18 damage each, every 2.4 s, speed 270.
- **Secondary:** 3 targeted void mines, 24 damage each, every 7 s; mines have 1.2 s arm time and expire after 4 s.
- **Movement:** Irregular but deterministic waypoint patrol across upper arena; never teleport into player.
- **Phase 1 (100–71%):** arcs.
- **Phase 2 (≤70%):** adds mines; cap 3 mines active.
- **Phase 3 (≤30%):** 2 sequential arcs separated by 1 s; mines disabled during double arc.
- **Special:** 0.6 s visual phase shift during waypoint changes, but collision and visibility stay fair.
- **Destruction:** violet vortex collapse with debris.

### B09 — OMEGA DESTROYER · super-heavy warship
- **HP:** 16,000 | **Speed:** 60 px/s | **Contact:** 50 | **Reward:** 20,000
- **Primary:** 6 heavy shells, 20 damage each, every 2.8 s, speed 240.
- **Secondary:** 3-lane missile salvo, 30 damage per missile, every 8 s; missiles show warning markers and limited steering for 1 s.
- **Movement:** Heavy lateral patrol with brief stationary artillery stance; no dives.
- **Phase 1 (100–76%):** shells.
- **Phase 2 (≤75%):** missiles alternate with shells.
- **Phase 3 (≤40%):** armor vents glow, patrol speed 80, missiles + shell sequence separated by 1 s.
- **Phase 4 (≤15%):** one desperation 8-shell burst with large gaps, then 2.5 s vulnerability window.
- **Special:** destructible side turrets optional only after core mechanics are stable; do not multiply boss HP unexpectedly.
- **Destruction:** staged turret blasts, reactor flash, heavy smoke and fragments.

### B10 — CELESTIAL ANNIHILATOR · final boss
- **HP:** 22,000 | **Speed:** 125 px/s | **Contact:** 60 | **Reward:** 35,000
- **Primary:** 9-shot radial sector aimed toward lower screen, 20 damage each, every 3 s, speed 300; maintain safe lanes.
- **Secondary:** twin charged beams, 35 damage per distinct hit, every 10 s, warning 1.3 s; no continuous frame damage.
- **Tertiary:** 4 orbiting energy orbs released in sequence, 24 damage each, every 9 s; only one special sequence at a time.
- **Movement:** Wide figure-eight in upper arena, x=250..1030, y=105..230.
- **Phase 1 (100–76%):** sector fan and figure-eight.
- **Phase 2 (≤75%):** adds orbs, with 1.2 s gap after sector fan.
- **Phase 3 (≤50%):** charged twin beams; disable sector fan during beam.
- **Phase 4 (≤25%):** alternate all three patterns; always 1 s recovery after a special and preserve dodge corridors.
- **Special:** phase transitions change core glow and music intensity; short invulnerability only during transition animation (max 1 s).
- **Destruction:** 3 staged core failures, massive shockwave, debris, 2 s fade; trigger campaign victory exactly once.

## 4. Configuration schema (example)
```js
export const bossConfigs = {
  ironWarden: {
    id: 'boss_01', name: 'Iron Warden', spriteKey: 'boss_01_iron_warden',
    maxHp: 1500, speed: 65, contactDamage: 20, score: 2000,
    phaseThresholds: [0.5],
    attacks: [
      { id: 'twinAutocannon', intervalMs: 1500, bulletDamage: 10, projectileSpeed: 230, count: 2 },
      { id: 'spread3', intervalMs: 5000, bulletDamage: 8, projectileSpeed: 230, count: 3 }
    ]
  }
};
```
Keep each boss config in data; write attack implementations as reusable strategies, not ten copies of scene code.

## 5. Suggested code structure
```text
src/
  bosses/
    BossBase.js
    BossManager.js
    bossConfigs.js
    attacks/
      aimedFan.js
      straightVolley.js
      spreadArc.js
      warningBeam.js
      mineField.js
      radialSector.js
    movement/
      patrol.js
      sineStrafe.js
      waypoints.js
      figureEight.js
    effects/
      bossExplosion.js
  scenes/
    BossGalleryScene.js
public/assets/bosses/
```

## 6. Implementation and acceptance tests
1. Audit existing scene, player stats, input, collisions, bullets, and assets; do not overwrite working functionality.
2. Prepare/validate 10 transparent boss PNGs; generate a development-only gallery with names, dimensions, orientation and hitboxes. Confirm correct image-to-boss mapping before combat implementation.
3. Implement `BossBase`, shared HP bar, entry/exit, damage handling, phase transitions, attack scheduler, cleanup and single reward payout.
4. Implement B01 fully and verify spawn, health reduction, telegraph, shots, phase transition, death, reward, pause/restart.
5. Implement B02–B10 using reusable movement and attack strategies; test individually and in progression.
6. Verify no unbounded projectile or timer growth after 10 repeated boss fights; no collisions after boss death; no attacks during pause.
7. Test at 1280×720 and scaled browser windows, 60 FPS target on intended hardware; inspect projectile counts and particle lifetimes.
8. Report changed files, test results, and any design ambiguities. Do not claim visual extraction succeeded unless the actual sprites were inspected.

## 7. Codex instruction
> Read this entire spec and inspect the existing Space Shooter project before editing. First implement a boss gallery and B01 Iron Warden as a playable vertical slice. Use the boss image(s) supplied by the user only after confirming which numbered design maps to each boss. Preserve player controls, existing enemies, shooting, and effects. Keep architecture modular and data-driven. Run available checks and report what remains unverified. Do not implement all ten at once before the first boss has been play-tested.
