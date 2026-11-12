import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnemyWave } from '../src/enemyWaves.js';
import { ENEMY_DEFINITIONS } from '../src/enemyDefinitions.js';

test('all ten standard enemies are introduced while boss waves stay reserved', () => {
  const ids = new Set();
  for (let wave = 1; wave <= 11; wave++) {
    const roster = getEnemyWave(wave);
    if (wave % 5 === 0) assert.deepEqual(roster, []);
    for (const id of roster) ids.add(id);
  }
  assert.deepEqual([...ids].sort(), ENEMY_DEFINITIONS.map(def => def.id).sort());
  assert(getEnemyWave(11).includes('specter'));
});

test('later rosters keep heavy ship counts bounded', () => {
  for (let wave = 12; wave <= 50; wave++) {
    const roster = getEnemyWave(wave);
    assert(roster.length <= 8);
    assert(roster.filter(id => id === 'crusher' || id === 'specter').length <= 1);
  }
});
