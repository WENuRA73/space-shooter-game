# SPACE SHOOTER — 10 ENEMY SHIPS
## Codex Implementation Specification v1.0

**Project:** Desktop 2D top-down HTML5 Space Shooter (Phaser 3 + Vite + JavaScript)
**Game world:** 1280 × 720 logical pixels, 60 FPS target, `delta`-based motion.
**Direction:** All enemy ships are viewed directly from above, nose pointing toward the **bottom of the screen** (toward the player). If artwork noses point upward, rotate the resulting sprite 180° **only if necessary**; keep bullet origins and hitboxes aligned. Player ship generally faces up and fires upward.
**Source artwork:** The supplied reference image shows 10 ships in 2 rows of 5, numbered left to right. Use the corresponding ship for each entry below. The poster is a visual reference, **not** an already-separated transparent sprite sheet. Extract each ship carefully, remove background, labels, and projectile streaks, and obtain approval of clean transparent sprites before use. Never crop an entire poster cell as a gameplay sprite.

## Shared gameplay rules
- All numeric speeds are **pixels/second**. Fire intervals are **milliseconds**. Angles are in **degrees**. Damage is HP lost per hit, before any shields or mitigation.
- Spawn enemies above the screen at `y = -shipHalfHeight - 10` and clamp horizontal positions so the full ship stays within the playfield. Movement is time-based, independent of frame rate.
- **Attack area:** enemy ships operate within the upper 65% of the field, except explicitly designated dives. Enemies must not overlap the top HUD. Their shots travel toward the player and may continue downward.
- **Collision damage** occurs once per player/enemy contact; despawn or bounce enemy and give the player a brief invulnerability window to prevent damage every frame.
- **Shooting:** Use pooled Phaser Arcade Physics projectiles. For aimed shots, calculate a normalized vector from muzzle to the player's position at the instant of firing; do not home unless explicitly specified. Offscreen bullets and enemies are recycled.
- **Shot count** refers to projectiles per firing event. Fire interval is the time between events, not between bullets within a burst.
- **Enemy size** is suggested visual width in game pixels; maintain aspect ratio. Tune Arcade Physics hitboxes to about 65–80% of visible hull, excluding thruster flames.
- **No instant unavoidable attacks:** show a 0.35–0.65 s muzzle/charge warning for high-damage volleys, dives, or spreads. Limit simultaneous enemy projectiles and spawn density.
- **Difficulty scaling:** Values below are baseline. Later waves may increase HP by up to 25% and fire frequency by up to 15%; do not compound without a cap. Bosses use separate balance.
- **Score** awarded once upon destruction; no reward for an enemy escaping. On destruction play short explosion animation, optional drop, sound, and recycle objects.

## Enemy 01 — FIGHTER
- **Reference:** top row, column 1; white/red compact fighter, red core.
- **Role / tier:** entry-level standard enemy; Very Easy.
- **HP:** 40 | **Speed:** 95 | **Hull width:** 62 px | **Contact damage:** 12 | **Score:** 100.
- **Gun:** single red pulse cannon | **Damage:** 8 per bullet | **Fire interval:** 1800 ms | **Projectile speed:** 260.
- **Fire style:** one straight shot vertically downward from central nose. First shot after 1.0 s.
- **Movement:** enter vertically, descend to y=160–240, then slow horizontal drift ±90 px around spawn x; retreat/despawn after 12 s.
- **Behavior:** no dodge, no special ability. Early waves spawn 1–3, staggered 0.8 s.

## Enemy 02 — INTERCEPTOR
- **Reference:** top row, column 2; violet angular craft with elongated side prongs.
- **Role / tier:** agile flanker; Easy.
- **HP:** 55 | **Speed:** 175 | **Hull width:** 66 px | **Contact damage:** 14 | **Score:** 150.
- **Gun:** twin violet pulse emitters | **Damage:** 10 each | **Fire interval:** 1650 ms | **Projectile speed:** 320.
- **Fire style:** two parallel bullets, launched simultaneously from wing hardpoints, vertically downward.
- **Movement:** diagonal entry from either upper side, zigzag horizontally with amplitude 110 px and period 2.2 s, holding y=150–310; exit upward after 11 s.
- **Behavior:** reverse horizontal direction near margins; no teleporting.

## Enemy 03 — BOMBER
- **Reference:** top row, column 3; broad armored blue-gray hull, blue engine glow.
- **Role / tier:** slow area denial; Easy–Medium.
- **HP:** 110 | **Speed:** 70 | **Hull width:** 88 px | **Contact damage:** 22 | **Score:** 240.
- **Gun:** blue plasma bomb launcher | **Damage:** 18 per bomb | **Fire interval:** 2600 ms | **Projectile speed:** 185.
- **Fire style:** 3-shot fan aimed around the player's position at fire time, angles -18°, 0°, +18° relative to aimed vector. Each bomb is larger and slower than pulse shots.
- **Movement:** straight entry to y=125–200; hover with gentle ±35 px bobbing; exit after 14 s.
- **Behavior:** show 0.5 s charge glow before each spread. Bombs do not explode into extra bullets in v1.

## Enemy 04 — DRONE
- **Reference:** top row, column 4; red-and-black winged drone with circular red core.
- **Role / tier:** swarm unit; Medium.
- **HP:** 45 | **Speed:** 150 | **Hull width:** 54 px | **Contact damage:** 10 | **Score:** 130.
- **Gun:** rapid red needle gun | **Damage:** 9 per bullet | **Fire interval:** 1000 ms | **Projectile speed:** 350.
- **Fire style:** one downward bullet per event; every third event fires two parallel bullets instead.
- **Movement:** spawn in groups of 3–5; fly in staggered V formation, sweep from left to right across y=160–350, then depart.
- **Behavior:** formation spacing >= 80 px; if leader dies, remaining drones continue their own path.

## Enemy 05 — SCOUT
- **Reference:** top row, column 5; slim dark hull with neon green wing details.
- **Role / tier:** evasive harasser; Medium.
- **HP:** 35 | **Speed:** 230 | **Hull width:** 52 px | **Contact damage:** 12 | **Score:** 180.
- **Gun:** green precision laser | **Damage:** 12 | **Fire interval:** 2000 ms | **Projectile speed:** 400.
- **Fire style:** one aimed bullet toward player's sampled position (not homing); brief green targeting flash 0.35 s before shot.
- **Movement:** enter rapidly, make two sharp lateral dashes (each 100–160 px), pause for 0.4 s to fire, then leave toward top.
- **Behavior:** dodge one nearby player projectile at most once every 3 s; keep within playfield.

## Enemy 06 — TANK
- **Reference:** bottom row, column 1; thick dark-gray/orange armored ship, heavy side pods.
- **Role / tier:** durable frontliner; Hard.
- **HP:** 250 | **Speed:** 55 | **Hull width:** 105 px | **Contact damage:** 32 | **Score:** 420.
- **Gun:** twin orange heavy cannons | **Damage:** 14 each | **Fire interval:** 1700 ms | **Projectile speed:** 230.
- **Fire style:** simultaneous pair of large, straight downward shots from side pods.
- **Movement:** slow descent to y=120–220, then horizontal patrol 50–70 px; stays 16 s before retreat.
- **Behavior:** armor visual hit flash; no actual damage reduction in v1. Limit to one Tank active in early hard waves.

## Enemy 07 — RANGER
- **Reference:** bottom row, column 2; gold narrow central body with long hooked side wings.
- **Role / tier:** long-range sniper; Hard.
- **HP:** 130 | **Speed:** 115 | **Hull width:** 78 px | **Contact damage:** 18 | **Score:** 330.
- **Gun:** gold charged rail shot | **Damage:** 16 | **Fire interval:** 2400 ms | **Projectile speed:** 510.
- **Fire style:** single narrow aimed shot; charge indicator and thin warning line for 0.6 s; lock direction when warning ends, then fire (no tracking afterward).
- **Movement:** keep distance at y=90–165, strafe left/right in 140 px lanes, pause during charging.
- **Behavior:** accurate but clearly telegraphed; no hitscan weapon.

## Enemy 08 — CRUSHER
- **Reference:** bottom row, column 3; heavy red central hull with side engine/cannon modules.
- **Role / tier:** high-pressure assault ship; Very Hard.
- **HP:** 300 | **Speed:** 85 | **Hull width:** 108 px | **Contact damage:** 36 | **Score:** 520.
- **Gun:** red triple-barrage cannons | **Damage:** 22 each | **Fire interval:** 2800 ms | **Projectile speed:** 270.
- **Fire style:** three volleys, each 3 bullets in a -15°/0°/+15° fan, separated by 220 ms (9 bullets per event). 0.6 s red charge warning.
- **Movement:** advance to y=190, move slowly side to side, then perform a telegraphed downward lunge to y=420 and return to y=190; lunge cooldown 7 s.
- **Behavior:** maximum one active in standard waves; prevent lunges while overlapping another large enemy.

## Enemy 09 — PHANTOM
- **Reference:** bottom row, column 4; curved violet blade-like wings and bright purple core.
- **Role / tier:** elusive trickster; Very Hard.
- **HP:** 160 | **Speed:** 195 | **Hull width:** 82 px | **Contact damage:** 20 | **Score:** 450.
- **Gun:** violet phase pulse | **Damage:** 18 | **Fire interval:** 1900 ms | **Projectile speed:** 345.
- **Fire style:** 5-projectile shallow fan (-24°, -12°, 0°, +12°, +24°) aimed around player at firing time.
- **Movement:** sinusoidal lateral weave amplitude 170 px, period 2.5 s, within y=130–290.
- **Behavior:** once every 6 s, fades to 40% opacity for 0.8 s but remains hittable; this is visual camouflage, not invulnerability.

## Enemy 10 — SPECTER
- **Reference:** bottom row, column 5; sharp blue crystalline hull with cyan energy core.
- **Role / tier:** elite non-boss enemy; Extreme.
- **HP:** 220 | **Speed:** 180 | **Hull width:** 94 px | **Contact damage:** 28 | **Score:** 650.
- **Gun:** cyan energy array | **Damage:** 24 per bullet | **Fire interval:** 3000 ms | **Projectile speed:** 380.
- **Fire style:** alternating patterns: (A) 5-shot fan (-30°,-15°,0°,15°,30°); (B) 3 aimed shots fired 300 ms apart, each independently sampling player position. 0.55 s charge warning before pattern A.
- **Movement:** smooth figure-eight sweep around x center (amplitude 230 px), y=130–330; every 8 s reposition to a new safe lane over 0.6 s (visible motion, no instant teleport).
- **Behavior:** maximum one active in standard waves; does not spawn simultaneously with Crusher until late waves.

## Recommended wave unlocks (initial)
| Wave | New enemy introduced | Example composition |
|---|---|---|
| 1 | Fighter | 3 Fighters |
| 2 | Interceptor | 3 Fighters + 2 Interceptors |
| 3 | Bomber | 2 Fighters + 1 Bomber |
| 4 | Drone | 2 Interceptors + 4 Drones |
| 5 | Scout | 2 Scouts + 2 Fighters + 1 Bomber |
| 6 | Tank | 1 Tank + 3 Fighters |
| 7 | Ranger | 2 Rangers + 2 Drones |
| 8 | Crusher | 1 Crusher + 2 Interceptors |
| 9 | Phantom | 2 Phantoms + 1 Tank |
| 10 | Specter | 1 Specter + 2 Scouts + 2 Fighters |

**Wave rules:** Spawn in small staggered groups; avoid simultaneous unavoidable patterns. Wave 10 is an elite encounter, **not** a boss. The 10 separately designed boss ships should be implemented as a distinct system.

## Suggested code architecture
- `src/data/enemyDefinitions.js`: data-only definitions for the 10 ships; include ids, sprite keys, stats, attack config, movement config, reward and unlock wave.
- `src/entities/Enemy.js`: generic enemy entity, HP/damage/death handling, collision shape, state machine.
- `src/systems/EnemyManager.js`: timed spawning, caps, wave composition, object recycling.
- `src/systems/EnemyMovement.js`: pure/isolated movement patterns (`drift`, `zigzag`, `formation`, `dash`, `patrol`, `strafe`, `lunge`, `weave`, `figureEight`).
- `src/systems/EnemyWeaponSystem.js`: `straight`, `parallel`, `aimed`, `fan`, `burst`, `alternating`; pooled projectiles and warning indicators.
- `src/systems/WaveManager.js`: wave unlocks and transitions.
- `public/assets/images/enemies/enemy-01.png` ... `enemy-10.png`: clean transparent individual top-down sprites.

## Implementation acceptance criteria
1. Existing player controls, starfield, laser shooting, and 1280×720 desktop layout remain functional.
2. Each enemy has the correct visual identity and unique, recognizable movement/attack behavior.
3. All 10 enemies can be spawned individually via a development/debug selector before integrating waves.
4. Damage, cooldown, movement speed, score, and projectile counts match the definitions at baseline difficulty.
5. Bullets/enemies clean up offscreen, collision events do not double-count, and no uncontrolled memory growth occurs.
6. HUD displays player HP, score, and wave; death effects and score are triggered once.
7. No gameplay-critical feature relies on background/labels from the concept poster; final sprites are transparent and aligned.
8. Verify in browser at desktop aspect ratio; log and fix runtime errors before proceeding.

## Paste this instruction into Codex along with the concept image and this file
> Inspect my existing Phaser 3/Vite Space Shooter project first. Preserve all currently working features and the desktop 1280×720 layout. Use the attached image as a visual reference for 10 top-down enemy ship types, numbered 1–10 in reading order. Implement the attached Enemy Ship Development Specification incrementally using data-driven definitions, modular movement and firing systems, pooled projectiles, wave spawning, health, collisions, and score. First show a brief file-change plan. Implement and test enemies 01–02 before continuing to 03–10. Do not overwrite unrelated files or assume the poster is a ready-to-use sprite sheet. If clean individual transparent sprites cannot be extracted reliably, ask me for approved sprites. Report changed files, how to run, and what was tested.
