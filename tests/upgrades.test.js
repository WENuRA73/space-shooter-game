import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLoot, getShotOffsets, applyPickupState, MAX_SHOTS,
  ENEMY_LOOT_DROP_PERCENT } from '../src/upgrades.js';

test('spread drops twice as often per enemy; other loot rates stay fixed', () => {
  const counts = new Map();
  const samples = 66000;
  for (let index = 0; index < samples; index++) {
    const item = chooseLoot((index + 0.5) / samples);
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  assert.deepEqual(new Set(counts.keys()), new Set(['repair', 'shield', 'rapid', 'spread', 'heart']));
  const dropChance = ENEMY_LOOT_DROP_PERCENT / 100;
  const perEnemyChance = kind => dropChance * counts.get(kind) / samples;
  assert.ok(Math.abs(perEnemyChance('spread') - 2 * 0.40 * 0.32) < 0.00001);
  assert.ok(Math.abs(perEnemyChance('repair') - 0.40 * 0.22) < 0.00001);
  assert.ok(Math.abs(perEnemyChance('shield') - 0.40 * 0.16) < 0.00001);
  assert.ok(Math.abs(perEnemyChance('rapid') - 0.40 * 0.16) < 0.00001);
  assert.ok(Math.abs(perEnemyChance('heart') - 0.40 * 0.14) < 0.00001);
});

test('shot spread is centered and capped', () => {
  assert.deepEqual(getShotOffsets(1), [0]);
  assert.deepEqual(getShotOffsets(2), [-0.5, 0.5]);
  assert.deepEqual(getShotOffsets(5), [-2, -1, 0, 1, 2]);
  assert.equal(getShotOffsets(20).length, MAX_SHOTS);
});

test('heart and repair increase hull within the six-point limit', () => {
  let state = { lives: 2, maxLives: 3, shotCount: 2, shieldUntil: 0, rapidUntil: 0 };
  state = applyPickupState(state, 'heart', 100);
  assert.equal(state.maxLives, 4);
  assert.equal(state.lives, 3);
  state = applyPickupState(state, 'repair', 100);
  assert.equal(state.lives, 4);
  for (let index = 0; index < 10; index++) state = applyPickupState(state, 'heart', 100);
  assert.equal(state.maxLives, 6);
  assert.equal(state.lives, 6);
});

test('spread and timed protection upgrades apply without changing the ship shot', () => {
  let state = { lives: 3, maxLives: 3, shotCount: 2, shieldUntil: 0, rapidUntil: 0 };
  for (let index = 0; index < 10; index++) state = applyPickupState(state, 'spread', 100);
  assert.equal(state.shotCount, 5);
  assert.throws(() => applyPickupState(state, 'rail', 100), RangeError);
  state = applyPickupState(state, 'shield', 100);
  state = applyPickupState(state, 'rapid', 100);
  assert.equal(state.shieldUntil, 8100);
  assert.equal(state.rapidUntil, 8100);
});
