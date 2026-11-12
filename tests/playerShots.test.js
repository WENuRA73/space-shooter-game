import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PLAYER_SHOTS, shotForShip, PLAYER_SHOT_SPEED } from '../src/playerShots.js';
import { consumePlayerShot } from '../src/playerShotImpact.js';

test('ten ships load ten distinct, self-contained vector projectiles', async () => {
  assert.equal(PLAYER_SHOTS.length, 10);
  const hashes = new Set();
  for (let id = 1; id <= 10; id++) {
    const shot = shotForShip(id);
    const svg = await readFile(new URL(`../public/assets/player-shots/${shot.file}`, import.meta.url), 'utf8');
    assert.match(svg, /viewBox="0 0 32 64"/);
    assert.match(svg, /<path/);
    assert.doesNotMatch(svg, /<image|href=/);
    hashes.add(createHash('sha256').update(svg).digest('hex'));
  }
  assert.equal(hashes.size, 10);
  assert.equal(PLAYER_SHOT_SPEED, 750);
});

test('a projectile is consumed on first contact and cannot hit a second ship', () => {
  const shot = {
    active: true, hitIds: new Set(),
    disableBody() { this.active = false; this.disables = (this.disables || 0) + 1; }
  };
  assert.equal(consumePlayerShot(shot, 'enemy-a'), true);
  assert.equal(shot.active, false);
  assert.equal(shot.disables, 1);
  assert.equal(consumePlayerShot(shot, 'enemy-b'), false);
  assert.equal(shot.disables, 1);
});
