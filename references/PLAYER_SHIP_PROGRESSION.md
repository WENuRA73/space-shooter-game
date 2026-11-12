# Player ship progression for Phaser 3 Space Shooter

This pack contains ten original, non-branded military-inspired fighter aircraft. Each is an individual 512 × 512 RGBA PNG with a transparent background, top-down view, and nose pointing upward. The starter looks worn and simple; later aircraft gain more refined aerodynamic shapes and finish. These are player sprites, separate from the boss and enemy ship art.

## Deliverable layout

Copy the ten `player_ship_XX.png` files into `public/assets/player-ships/` (or the equivalent static asset directory). Keep `ship-progression.mjs` and its test in your source/test tree as needed. `sprite_manifest.json` records the exact files, asset keys, dimensions, and visible alpha bounds.

| Boss defeated | Ship unlocked and automatically equipped | Asset key / file | Aircraft design | Upgrade |
|---|---|---|---|---|
| Start | 01 Cadet | `playerShip01` / `player_ship_01.png` | worn straight-wing starter jet | one forward gun |
| 01 | 02 Swift | `playerShip02` / `player_ship_02.png` | light swept-wing interceptor | paired guns |
| 02 | 03 Arrow | `playerShip03` / `player_ship_03.png` | compact delta fighter | narrow three-shot fan |
| 03 | 04 Bulwark | `playerShip04` / `player_ship_04.png` | armored twin-engine strike jet | focused three-gun volley |
| 04 | 05 Talon | `playerShip05` / `player_ship_05.png` | naval-style multirole fighter | four-gun cluster |
| 05 | 06 Vanguard | `playerShip06` / `player_ship_06.png` | long-nose interceptor | five-shot coverage |
| 06 | 07 Lancer | `playerShip07` / `player_ship_07.png` | canard multirole fighter | focused five-shot burst |
| 07 | 08 Ghost | `playerShip08` / `player_ship_08.png` | angular stealth strike jet | six-shot sweep |
| 08 | 09 Sovereign | `playerShip09` / `player_ship_09.png` | refined air-superiority fighter | seven-shot control |
| 09 | 10 Apex | `playerShip10` / `player_ship_10.png` | advanced but plausible blended-wing jet | maximum eight-shot array |
| 10 | No new ship | Ship 10 remains equipped | final victory / maximum upgrade |

**Authoritative rule:** Ship 01 is available at the beginning. A confirmed kill of boss `N`, for `N = 1..9`, unlocks and immediately equips ship `N+1`. Boss 10 sets `victory = true`, shows the ending, and makes no ship 11. Repeated kill callbacks and bosses encountered out of order do not advance progression.

## Balance contract

The current game has not been supplied with this request, so its numeric HP, movement speed, bullet damage, fire interval, boss HP, and enemy balance cannot be measured here. Use the **current player ship values as the base**. Ship 01 resolves exactly to those values. Do not replace the game's boss or enemy stats, stage timing, bullet speed, collision damage, scoring, or difficulty curve as part of this integration. The ratios below are an explicit, moderate player progression to tune in the actual game after a playtest.

| Ship | Max HP × | Move speed × | All-hit DPS × | Fire interval × | Projectiles per volley | Firing angles in degrees relative to up |
|---:|---:|---:|---:|---:|---:|---|
| 01 | 1.00 | 1.00 | 1.00 | 1.00 | 1 | `0` |
| 02 | 1.08 | 1.03 | 1.10 | 0.98 | 2 | `0, 0` |
| 03 | 1.15 | 1.06 | 1.20 | 0.96 | 3 | `-7, 0, 7` |
| 04 | 1.25 | 1.05 | 1.30 | 0.95 | 3 | `0, 0, 0` |
| 05 | 1.34 | 1.09 | 1.40 | 0.93 | 4 | `-4, 0, 0, 4` |
| 06 | 1.43 | 1.12 | 1.50 | 0.91 | 5 | `-8, -3, 0, 3, 8` |
| 07 | 1.51 | 1.14 | 1.60 | 0.90 | 5 | `-3, 0, 0, 0, 3` |
| 08 | 1.59 | 1.16 | 1.70 | 0.88 | 6 | `-8, -4, 0, 0, 4, 8` |
| 09 | 1.66 | 1.18 | 1.80 | 0.86 | 7 | `-9, -5, -2, 0, 2, 5, 9` |
| 10 | 1.72 | 1.20 | 1.90 | 0.85 | 8 | `-9, -6, -3, 0, 0, 3, 6, 9` |

`ship-progression.mjs` is the executable source of these profiles. Its calculations are:

```text
maxHp = round(existingMaxHp × hpMultiplier)
moveSpeed = existingMoveSpeed × speedMultiplier
fireIntervalMs = round(existingFireIntervalMs × intervalMultiplier)
damagePerProjectile = existingBulletDamage × dpsMultiplier × intervalMultiplier ÷ gunCount
```

This keeps aggregate theoretical DPS at the listed ratio if every bullet lands. A spread volley will normally land fewer shots on a small target. Use the existing bullet travel speed and lifetime. All guns fire one projectile in the same volley; duplicate `0°` angles are separate parallel barrels, not duplicate bullets at the same position. Give each gun a separate horizontal muzzle offset across the front of the aircraft.

On ship replacement, preserve **current HP percentage**: `newHp = clamp(round(oldHp / oldMaxHp × newMaxHp), 1, newMaxHp)` for a living player. For a dead player, follow the existing respawn rules; do not revive solely because the boss death callback ran. Keep the existing invulnerability, shield, temporary buff, and upgrade systems unless they explicitly conflict with the new ship. Use the existing movement acceleration/drag behavior and change only its speed cap. The 512-pixel asset should be displayed at the game's current player visual size, initially about 72–96 pixels tall, without changing the collision body; tune hitbox from gameplay, not the transparent canvas.

## Phaser 3 integration

The following code is a reference adapter. Adapt class/member names to the current project. Load all images during preload and keep one player physics object alive during a swap so existing collision registrations, input handlers, and bullet ownership remain valid.

```js
import {
  SHIPS, assetKey, initialProgress, loadProgress, saveProgress,
  defeatBoss, resolveShipStats,
} from './ship-progression.mjs';

// Scene.preload()
for (let id = 1; id <= 10; id++) {
  this.load.image(assetKey(id), `assets/player-ships/player_ship_${String(id).padStart(2, '0')}.png`);
}

// Scene.create(): read BASE from the existing ship 01 configuration BEFORE changing it.
this.basePlayerStats = {
  maxHp: EXISTING_PLAYER_MAX_HP,
  moveSpeed: EXISTING_PLAYER_MOVE_SPEED,
  bulletDamage: EXISTING_PLAYER_BULLET_DAMAGE,
  fireIntervalMs: EXISTING_PLAYER_FIRE_INTERVAL_MS,
};
this.shipProgress = loadProgress();
const id = this.shipProgress.equipped;
this.shipStats = resolveShipStats(id, this.basePlayerStats);
this.player.setTexture(assetKey(id));
this.player.setDisplaySize(84, 84);
this.player.body.setSize(260, 360).setOffset(126, 76); // example only: tune to the current hitbox
this.playerMaxHp = this.shipStats.maxHp;
this.playerHp = this.playerMaxHp; // or restore the current run's HP under your save policy

// Call ONLY from the existing, confirmed, once-only boss-death path.
function onConfirmedBossDeath(scene, bossId) {
  const result = defeatBoss(scene.shipProgress, bossId);
  if (!result.changed) return;
  scene.shipProgress = result.progress;
  saveProgress(scene.shipProgress);

  if (result.reason === 'final-victory') {
    scene.showFinalVictory();
    return;
  }
  const oldMax = scene.playerMaxHp;
  const oldHp = scene.playerHp;
  const nextId = result.progress.equipped;
  scene.shipStats = resolveShipStats(nextId, scene.basePlayerStats);
  scene.player.setTexture(assetKey(nextId));
  scene.player.setDisplaySize(84, 84);
  scene.playerMaxHp = scene.shipStats.maxHp;
  if (oldHp > 0) {
    scene.playerHp = Phaser.Math.Clamp(
      Math.round((oldHp / oldMax) * scene.playerMaxHp), 1, scene.playerMaxHp);
  }
  scene.updatePlayerHud();
  scene.showUnlockToast(`Ship ${String(nextId).padStart(2, '0')} unlocked: ${SHIPS[nextId - 1].name}`);
}

// In the existing movement code, use scene.shipStats.moveSpeed as its speed cap.
// In the existing fire timer, use scene.shipStats.fireIntervalMs.
function firePlayerVolley(scene) {
  const s = scene.shipStats;
  const muzzleSpacing = 6; // displayed pixels; tune for your current player scale
  s.anglesDeg.forEach((degrees, index) => {
    const x = scene.player.x + (index - (s.gunCount - 1) / 2) * muzzleSpacing;
    const y = scene.player.y - scene.player.displayHeight * 0.28;
    const radians = Phaser.Math.DegToRad(degrees);
    const bullet = scene.playerBullets.get(x, y, 'playerBullet');
    if (!bullet) return;
    bullet.enableBody(true, x, y, true, true);
    bullet.setVelocity(Math.sin(radians) * EXISTING_BULLET_SPEED,
                       -Math.cos(radians) * EXISTING_BULLET_SPEED);
    bullet.damage = s.bulletDamage;
  });
}
```

Replace the example hitbox and bullet-pool names with the game's actual API. If the existing bullet pool limits active objects, increase its capacity for eight bullets per volley while keeping bullet lifetime and velocity unchanged. Add one boss death event guard at the boss entity level as well, before calling `onConfirmedBossDeath`, so score, loot, and stage transitions are also once-only. Run the unlock after the boss has truly reached zero HP, not when it spawns or merely leaves the screen.

### Persistence and continue behavior

The module stores `{ version: 1, maxUnlocked, equipped, victory }` under `spaceShooter.playerShips.v1` in `localStorage`. It clamps invalid ship numbers, always equips the highest unlocked ship, and tolerates missing, blocked, or corrupt storage by starting a fresh in-memory run. This is local single-player persistence, not cheat-resistant account storage. Save immediately on each boss victory. On reload or a new run, load the highest unlocked ship. A game's explicit New Game/reset control can clear this key if that behavior is intended; ordinary scene restarts should retain it.

### Implementation acceptance tests

Run the included pure logic tests with `node --test ship-progression.test.mjs`. Then verify these in the actual Phaser project:

1. Fresh storage starts with ship 01 and its **unchanged** original HP, speed, damage, and fire rate.
2. Kill bosses 01–09 in sequence; each changes the sprite and weapon pattern exactly once, and ship 10 appears only after boss 09.
3. Boss 10 triggers final victory once, leaves ship 10 equipped, and never requests an asset for ship 11.
4. Duplicate boss-death callbacks, a boss escaping, and out-of-order boss IDs cannot unlock a ship.
5. Reload after every unlock; the correct aircraft and stats return. Corrupt or blocked storage does not crash gameplay.
6. At every swap, the HP fraction remains consistent, bullets fire from the correct aircraft, movement retains existing controls, and the hitbox remains fair.
7. On a dark and light stage background, each sprite has no colored rectangular backdrop, adjacent-aircraft pixels, detached components, or clipping at its edges.
8. Play through normal enemies and bosses to confirm the moderate ratios still fit the game's existing difficulty. Tune the profile ratios if required; keep the boss-to-ship order and ship 01 baseline intact.

The ten supplied PNGs were individually generated, visually reviewed together, placed on equal transparent canvases, and checked for nonempty alpha bounds and clear edge margins. Their detailed paint work is intended for a smooth raster rendering style; avoid forcing nearest-neighbor pixel filtering unless the rest of the game uses it.
