import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnemyFireProfile } from '../src/enemyFire.js';

test('each enemy has its own projectile and volley', () => {
  const kinds = ['scout', 'striker', 'tank', 'boss'];
  const profiles = kinds.map(kind => getEnemyFireProfile(kind, 5));
  assert.deepEqual(profiles.map(profile => profile.angles.length), [1, 2, 3, 2]);
  assert.equal(new Set(profiles.map(profile => profile.texture)).size, 4);
  assert.deepEqual(profiles.map(profile => profile.aimed), [true, true, false, false]);
  assert.ok(profiles[2].speed < profiles[1].speed);
});

test('fire rate increases within a safe limit as waves progress', () => {
  for (const kind of ['scout', 'striker', 'tank']) {
    const early = getEnemyFireProfile(kind, 2);
    const late = getEnemyFireProfile(kind, 50);
    assert.ok(late.cadence > 0 && late.cadence <= early.cadence);
    assert.ok(late.speed >= early.speed && late.speed < 400);
  }
});
