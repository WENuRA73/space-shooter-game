# Player ship progression verification

Every new campaign starts with ship 01, including when ships were previously
unlocked. The highest unlock achieved is saved in
`localStorage` under `spaceShooter.playerShips.v1`; the Best Score key is separate.
For a fresh test in development mode, open `?resetShips=1` once. This removes
only the progression key; then return to the normal game URL.

## In-game checklist

1. Start a fresh game. Confirm ship 01 art faces up, has no rectangular background,
   fires the existing two laser shots at the existing 160 ms pace, and starts at
   60/60 hull with the same movement speed and collision feel.
2. Defeat boss 01 in wave 5. Confirm one ship-change notice, ship 02 art immediately
   replaces ship 01, and two parallel guns fire. Take damage before the kill and
   confirm the new hull keeps the same percentage (within rounding).
3. Defeat bosses 02–09 in order. Confirm the next numbered ship appears once,
   each ship fires its own projectile design, every ship starts with exactly
   two shots, and the hull/speed/fire interval rise by the
   documented ratios. Check sprites on both dark space and bright explosion
   effects for clipping or leftover image backgrounds.
4. Collect spread, rapid, shield, repair, and heart pickups before and after a
   swap. Confirm there are no plasma or rail pickup drops. Spread raises the
   projectile count above two, but every ship change resets the count to two.
   Check the protection effects and hull cap still work.
5. Shoot a standard enemy and a boss. Each projectile must disappear on its
   first contact, including a hit during a boss's invulnerable phase; it must
   never travel through to another ship.
6. Reload after any unlock and start a new run. Confirm ship 01 is equipped.
   Defeat bosses 01 and 02 again; ships 02 and 03 must equip at waves 5 and 10,
   even when both were unlocked earlier. The highest unlocked ship remains
   recorded, and an out-of-order boss cannot skip the run sequence.
7. Defeat boss 10. Confirm the victory screen appears once, ship 10 stays
   equipped, and there is no ship 11 request. Restart to confirm persistence.
8. Check a phone portrait viewport and 1280×720 desktop. The ship remains
   proportional and inside the playfield, with the HUD readable.

In development mode, `?boss=1&bossTest=1` starts at the first boss wave and
enables `K` to deal test damage after the boss arrives. Use `?boss=N&bossTest=1`
for later boss combat previews; those out-of-order test kills do not equip a
later ship. This shortcut is disabled in production builds.

## Balance note

The pack describes one forward gun on ship 01, while this project already
starts with two 1-damage projectiles. Ship 01 retains that exact existing volley
and its 160 ms laser interval. All later ships also start with two projectiles;
their angle pair is derived from the pack's pattern. Their HP/speed/interval
multipliers and all-hit DPS multipliers remain measured against the original
two-projectile baseline. Spread pickups add outer shots until the next ship change.
Standard enemy loot chance is now 52.8%. Spread is 32/66 of drops, so a
defeated enemy has a 25.6% spread chance (twice the original 12.8%).
The per-enemy chances for repair, shield, rapid, and heart stay unchanged.
