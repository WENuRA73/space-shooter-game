import test from 'node:test';
import assert from 'node:assert/strict';
import { SHIPS, STORAGE_KEY, assetKey, initialProgress, normalizeProgress,
  loadProgress, saveProgress, defeatBoss, resolveShipStats, preserveHealthRatio,
  volleyPattern } from '../src/shipProgression.js';

test('ten unique sequential ships and matching firing angles', () => {
  assert.equal(SHIPS.length, 10);
  assert.equal(new Set(SHIPS.map(s => s.name)).size, 10);
  SHIPS.forEach((s, i) => {
    assert.equal(s.id, i + 1);
    assert.equal(s.guns, s.angles.length);
    assert.equal(assetKey(s.id), `playerShip${String(i + 1).padStart(2, '0')}`);
  });
});

test('boss 01 through 09 unlock and equip exactly the next ship', () => {
  let p = initialProgress();
  let activeShipId = 1;
  for (let boss = 1; boss <= 9; boss++) {
    const result = defeatBoss(p, boss, activeShipId);
    assert.equal(result.changed, true);
    assert.equal(result.reason, 'ship-unlocked');
    assert.equal(result.progress.maxUnlocked, boss + 1);
    assert.equal(result.progress.equipped, boss + 1);
    assert.equal(result.shipId, boss + 1);
    p = result.progress;
    activeShipId = result.shipId;
  }
  assert.equal(defeatBoss(p, 10, activeShipId).progress.victory, true);
  assert.equal(defeatBoss(p, 10, activeShipId).progress.maxUnlocked, 10);
  assert.equal(defeatBoss(defeatBoss(p, 10).progress, 10).changed, false);
});

test('duplicate and out-of-order boss events cannot skip an unlock', () => {
  const first = defeatBoss(initialProgress(), 1, 1);
  assert.equal(defeatBoss(first.progress, 1, first.shipId).changed, false);
  assert.equal(defeatBoss(first.progress, 4, first.shipId).changed, false);
  assert.equal(defeatBoss(initialProgress(), 10, 1).changed, false);
});

test('saved unlocks do not suppress ship swaps on a new run', () => {
  let progress = { version: 1, maxUnlocked: 3, equipped: 3, victory: false };
  let activeShipId = 1;
  for (let boss = 1; boss <= 3; boss++) {
    const result = defeatBoss(progress, boss, activeShipId);
    assert.equal(result.changed, true);
    assert.equal(result.shipId, boss + 1);
    assert.equal(result.reason, boss < 3 ? 'ship-equipped' : 'ship-unlocked');
    progress = result.progress;
    activeShipId = result.shipId;
  }
  assert.equal(progress.maxUnlocked, 4);
  const wonBefore = { version: 1, maxUnlocked: 10, equipped: 10, victory: true };
  assert.equal(defeatBoss(wonBefore, 1, 1).shipId, 2);
  assert.equal(defeatBoss(wonBefore, 10, 1).changed, false);
  assert.equal(defeatBoss(wonBefore, 10, 10).reason, 'final-victory');
});

test('storage reload, corruption, and blocked storage', () => {
  const values = new Map();
  const store = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  const p = defeatBoss(initialProgress(), 1).progress;
  assert.equal(saveProgress(p, store), true);
  assert.deepEqual(loadProgress(store), p);
  values.set(STORAGE_KEY, '{broken');
  assert.deepEqual(loadProgress(store), initialProgress());
  assert.equal(saveProgress(p, { setItem: () => { throw Error('disabled'); } }), false);
  assert.deepEqual(loadProgress({ getItem: () => { throw Error('disabled'); } }), initialProgress());
  assert.equal(normalizeProgress({ maxUnlocked: 999 }).maxUnlocked, 10);
});

test('base ship matches existing balance and target DPS stays proportional', () => {
  // Actual desktop values from main.js before progression: 60 HP, 350 speed,
  // two laser projectiles of 1 damage every 160 ms.
  const base = { maxHp: 60, moveSpeed: 350, bulletDamage: 1,
    fireIntervalMs: 160, baseVolleyCount: 2 };
  const starter = resolveShipStats(1, base);
  assert.equal(starter.maxHp, base.maxHp);
  assert.equal(starter.moveSpeed, base.moveSpeed);
  assert.equal(starter.bulletDamage, base.bulletDamage);
  assert.equal(starter.fireIntervalMs, base.fireIntervalMs);
  assert.equal(starter.gunCount, 2);
  assert.deepEqual(starter.anglesDeg, [0, 0]);
  for (const ship of SHIPS) {
    const s = resolveShipStats(ship.id, base);
    const actual = s.bulletDamage * s.gunCount * (base.fireIntervalMs / s.fireIntervalMs)
      / (base.bulletDamage * base.baseVolleyCount);
    assert.ok(Math.abs(actual - ship.dps) < 0.01, `ship ${ship.id} DPS ratio`);
    assert.equal(s.gunCount, 2);
  }
});

test('all hull swaps preserve living HP fraction and do not revive a dead player', () => {
  assert.equal(preserveHealthRatio(30, 60, 65), 33);
  assert.equal(preserveHealthRatio(0, 60, 65), 0);
  assert.equal(preserveHealthRatio(1, 100, 60), 1);
  assert.equal(preserveHealthRatio(90, 60, 65), 65);
});

test('every ship starts with two shots and spread pickups alone add projectiles', () => {
  const base = { maxHp: 60, moveSpeed: 350, bulletDamage: 1,
    fireIntervalMs: 160, baseVolleyCount: 2 };
  for (const ship of SHIPS) assert.equal(volleyPattern(resolveShipStats(ship.id, base)).length, 2);
  assert.deepEqual(volleyPattern(resolveShipStats(3, base)), [-7, 7]);
  assert.deepEqual(volleyPattern(resolveShipStats(10, base)), [-9, 9]);
  assert.deepEqual(volleyPattern(resolveShipStats(2, base), 1), [0, 0, 0]);
  assert.deepEqual(volleyPattern(resolveShipStats(2, base), 2), [-12, 0, 0, 12]);
  assert.deepEqual(volleyPattern(resolveShipStats(2, base), 3), [-12, 0, 0, 0, 12]);
});
