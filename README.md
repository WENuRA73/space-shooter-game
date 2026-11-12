# Space Shooter

A Phaser arcade game for desktop and mobile with 50 campaign waves, enemy ships and bullets, ten unique bosses, score and best score, upgradeable hull and weapons, and random loot.

## Run

Install Node.js, then in this folder run:

```sh
npm install
npm run dev
```

Open the local address shown by Vite. To create a production build, run `npm run build`.
Run `npm test` to check boss progression, attacks, and player upgrades.

## Bosses and loot

Every fifth wave has a boss. Waves 5 through 50 introduce ten different bosses using the numbered transparent PNGs in `public/assets/bosses/`. Boss 10 ends the campaign with a victory screen. The source ZIP uses different names for artwork 02–09; the user confirmed mapping those designs to the specification by number.

`src/bossConfigs.js` stores each boss's HP, damage, movement, phases, and attack values. `src/BossSystem.js` handles entry, movement, telegraphs, pooled projectiles, hitboxes, phase transitions, explosions, score, and cleanup. The supplied `references/space_shooter_boss_ships_codex_spec.md` is the combat specification.

On the development server, `/boss-gallery.html` previews all ten designs, source filenames, image dimensions, and player-facing orientation. Each Play link jumps to that boss wave. The Phase test link enables a development-only K key that deals 26% of the boss's maximum HP per press for testing transitions and defeat. Normal gameplay never enables it.

The player starts with two shots. Defeated enemies can drop random loot. Repair restores one hull point, Shield protects the ship briefly, and Rapid Fire temporarily reduces the firing delay. Spread increases the number of shots up to five. Plasma and Rail change the player weapon; Rail shots can pierce multiple enemies. The Heart pickup increases maximum hull from three up to six and restores one point.

## Enemy attacks

| Enemy | Attack |
| --- | --- |
| Scout | One pink shot aimed at the player |
| Striker | Two fast amber darts that split around the player |
| Tank | Three slow purple orbs in a downward spread |
| Boss | Distinct volleys and special attacks for each boss; see the boss gallery and specification |

## Controls

| Action | Key |
| --- | --- |
| Move | WASD or arrow keys |
| Fire | Hold Space |
| Pause or resume | P |
| Restart after game over or victory | R or Space |
| Toggle background music | M or the music button |

On touch screens, drag anywhere in the play area to move and fire. The game uses a portrait layout on phones and a landscape layout on wider screens. A health bar follows the player ship.

The three MP3s in `songs/` play in sequence and repeat. Music begins when Start Game is pressed and pauses with the game.

The best score is saved in the browser's local storage. The game can still be played if browser storage is unavailable.

## Ten-ship enemy fleet

`src/enemyDefinitions.js` records the ten reference enemies and their HP, speed, damage, fire interval, score, and unlock wave. `src/enemyPatterns.js` defines distinct movement targets and shot patterns. `src/EnemyFleet.js` provides a pooled Phaser fleet system with contact and projectile callbacks, damage, scoring, and cleanup. The main game now uses the supplied PNGs for standard enemies. Player hull is displayed in HP so the documented enemy damage values apply directly; a former one-hull hit equals 20 HP.

On the development server, open `/enemy-gallery.html` to inspect each current cutout and its documented stats. The gallery's Try link starts a preview wave with the selected enemy. The preview selector is disabled in production. Boss encounters remain on every fifth wave, so Scout first appears on wave 6 and Specter on wave 11. The supplied source cutouts retain a few fragments from neighboring poster cells; they are loaded unchanged to preserve the ship designs.
