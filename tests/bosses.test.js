import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BOSS_CONFIGS, bossForWave, phaseForHp, fitBossSprite } from '../src/bossConfigs.js';

test('all ten numbered PNG designs map to the documented boss names and waves', () => {
  const names = [
    'Iron Warden', 'Crimson Viper', 'Thunder Reaper', 'Void Hunter',
    'Inferno Titan', 'Frost Leviathan', 'Plasma Overlord',
    'Shadow Devourer', 'Omega Destroyer', 'Celestial Annihilator'
  ];
  assert.deepEqual(BOSS_CONFIGS.map(boss => boss.name), names);
  assert.equal(new Set(BOSS_CONFIGS.map(boss => boss.image)).size, 10);
  for (const boss of BOSS_CONFIGS) {
    assert.equal(bossForWave(boss.id * 5), boss);
    assert.ok(existsSync(new URL(`../public/assets/bosses/${boss.image}`, import.meta.url)));
    assert.ok(boss.maxHp > 0 && boss.score > 0 && boss.contactDamage > 0);
  }
  assert.equal(bossForWave(55), null);
  assert.equal(bossForWave(6), null);
});

test('Iron Warden uses the documented HP, weapons, phase and reward', () => {
  const boss = BOSS_CONFIGS[0];
  assert.equal(boss.maxHp, 1500);
  assert.equal(boss.speed, 65);
  assert.equal(boss.contactDamage, 20);
  assert.equal(boss.score, 2000);
  assert.deepEqual(boss.attacks.map(({ id, intervalMs, damage, projectileSpeed, count }) =>
    [id, intervalMs, damage, projectileSpeed, count]), [
    ['twin', 1500, 10, 230, 2], ['fan', 5000, 8, 230, 3]
  ]);
  assert.equal(phaseForHp(boss, 1500), 1);
  assert.equal(phaseForHp(boss, 751), 1);
  assert.equal(phaseForHp(boss, 750), 2);
  assert.equal(phaseForHp(boss, 0), 2);
});

test('all later bosses have distinct movement and attack configurations', () => {
  assert.ok(new Set(BOSS_CONFIGS.map(boss => boss.movement)).size >= 7);
  for (const boss of BOSS_CONFIGS.slice(1)) {
    assert.ok(boss.attacks.length >= 2);
    assert.ok(boss.phaseThresholds.every((value, index, all) =>
      value > 0 && value < 1 && (index === 0 || value < all[index - 1])));
    assert.equal(phaseForHp(boss, 0), boss.phaseThresholds.length + 1);
  }
  assert.equal(BOSS_CONFIGS[9].attacks.length, 3);
});

test('boss art scales proportionally within the desktop arena', () => {
  const { width, height } = fitBossSprite(1237, 1271);
  assert.ok(width <= 310 && height <= 230);
  assert.ok(Math.abs(width / height - 1237 / 1271) < 0.0001);
});
