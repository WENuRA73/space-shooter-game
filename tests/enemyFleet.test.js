import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFINITIONS, ENEMY_BY_ID, enemyHp, enemyCadence, eligibleEnemies } from '../src/enemyDefinitions.js';
import { enemyTarget, shotEvents, projectileVelocity, steerToward } from '../src/enemyPatterns.js';
import { EnemyFleet } from '../src/EnemyFleet.js';

test('all ten enemies have distinct sprites, movement, and documented baseline stats', () => {
  assert.equal(ENEMY_DEFINITIONS.length, 10);
  assert.equal(new Set(ENEMY_DEFINITIONS.map(e => e.sprite)).size, 10);
  assert.equal(new Set(ENEMY_DEFINITIONS.map(e => e.movement)).size, 10);
  assert.deepEqual(ENEMY_DEFINITIONS.map(e => e.hp), [40,55,110,45,35,250,130,300,160,220]);
  assert.deepEqual(ENEMY_DEFINITIONS.map(e => e.score), [100,150,240,130,180,420,330,520,450,650]);
  assert.deepEqual(ENEMY_DEFINITIONS.map(e => e.contactDamage), [12,14,22,10,12,32,18,36,20,28]);
  assert.deepEqual(ENEMY_DEFINITIONS.map(e => e.bulletDamage), [8,10,18,9,12,14,16,22,18,24]);
});

test('shot pattern counts, delays and damage match the specification', () => {
  assert.deepEqual(ENEMY_DEFINITIONS.map(e => shotEvents(e, 0).length), [1,2,3,1,1,2,1,9,5,5]);
  assert.equal(shotEvents(ENEMY_BY_ID.drone, 2).length, 2);
  assert.equal(shotEvents(ENEMY_BY_ID.specter, 1).length, 3);
  assert.deepEqual([...new Set(shotEvents(ENEMY_BY_ID.crusher, 0).map(s => s.delay))], [0,220,440]);
  for (const def of ENEMY_DEFINITIONS) {
    assert(shotEvents(def, 0).every(s => s.damage === def.bulletDamage && s.speed === def.bulletSpeed));
  }
});

test('aimed bullets sample a direction while straight bullets remain vertical', () => {
  const aimed = shotEvents(ENEMY_BY_ID.scout, 0)[0];
  const straight = shotEvents(ENEMY_BY_ID.fighter, 0)[0];
  assert(projectileVelocity(aimed, {x:100,y:100}, {x:200,y:300}).x > 0);
  assert.equal(Math.abs(projectileVelocity(straight, {x:100,y:100}, {x:200,y:300}).x), 0);
});

test('movement stays on screen and patterns produce distinct positions', () => {
  const positions = ENEMY_DEFINITIONS.map(def => enemyTarget(def, 6000, 640, 1280));
  assert(positions.every(({x}) => x > 0 && x < 1280));
  assert(new Set(positions.map(({x,y}) => `${Math.round(x)},${Math.round(y)}`)).size >= 8);
});

test('enemy steering eases toward a target without frame-to-frame reversals', () => {
  let position = { x: 0, y: 0 };
  let velocity = { x: 0, y: 0 };
  for (let i = 0; i < 180; i++) {
    velocity = steerToward(position, velocity, { x: 100, y: 50 }, 16, 80);
    assert(velocity.x >= 0 && velocity.y >= 0);
    position = { x: position.x + velocity.x * 0.016, y: position.y + velocity.y * 0.016 };
  }
  assert(Math.abs(position.x - 100) < 2);
  assert(Math.abs(position.y - 50) < 2);
});

test('Crusher dive and Specter lane shift move smoothly through their attack area', () => {
  const crusher = ENEMY_BY_ID.crusher;
  const arrivalMs = (190 + crusher.width / 2 + 10) / crusher.speed * 1000;
  const cruise = enemyTarget(crusher, arrivalMs + 3000, 640, 1280);
  const dive = enemyTarget(crusher, arrivalMs + 5400, 640, 1280);
  assert(dive.y > cruise.y + 150);
  const specter = ENEMY_BY_ID.specter;
  const specterArrival = (225 + specter.width / 2 + 10) / specter.speed * 1000;
  const before = enemyTarget(specter, specterArrival + 7990, 640, 1280);
  const after = enemyTarget(specter, specterArrival + 8010, 640, 1280);
  assert(Math.abs(after.x - before.x) < 30);
});

test('wave unlocks and later-wave scaling stay capped', () => {
  assert.deepEqual(eligibleEnemies(1).map(e => e.id), ['fighter']);
  assert.equal(eligibleEnemies(10).length, 10);
  const def = ENEMY_BY_ID.specter;
  assert.equal(enemyHp(def, 10), 220);
  assert(enemyHp(def, 1000) <= Math.round(def.hp * 1.25));
  assert(enemyCadence(def, 1000) >= Math.round(def.fireInterval * 0.85));
});

test('projectile and contact collisions deliver their documented damage', () => {
  const overlaps = [];
  const group = () => ({ getChildren: () => [] });
  const scene = {
    physics: { add: { group, overlap: (a, b, callback) => overlaps.push(callback) } },
    textures: { exists: () => true }
  };
  const damage = [];
  new EnemyFleet(scene, { width: 1280, height: 720, hudHeight: 62, player: {},
    onDamage: value => damage.push(value), onScore: () => {} });
  const enemy = { active: true, def: ENEMY_BY_ID.tank, setVelocity() {}, destroy() { this.active = false; } };
  overlaps[0](null, enemy);
  const bullet = { active: true, damage: ENEMY_BY_ID.specter.bulletDamage,
    disableBody() { this.active = false; } };
  overlaps[1](null, bullet);
  assert.deepEqual(damage, [32, 24]);
});

test('a defeated enemy awards score only once and escaping gives no reward', () => {
  let points = 0;
  const fleet = Object.create(EnemyFleet.prototype);
  fleet.scene = {
    time: { delayedCall() {} },
    add: { circle: () => ({ setDepth() { return this; }, destroy() {} }) },
    tweens: { add() {} }
  };
  fleet.onScore = value => { points += value; };
  fleet.onDrop = () => {};
  const enemy = { active: true, x: 100, y: 200, def: ENEMY_BY_ID.fighter,
    hp: 10, spawnId: 1, setAlpha() {}, setVelocity() {}, destroy() { this.active = false; } };
  assert.equal(fleet.hit(enemy, 10), true);
  assert.equal(fleet.hit(enemy, 10), false);
  assert.equal(points, 100);
  const escapee = { active: true, setVelocity() {}, destroy() { this.active = false; } };
  fleet.despawn(escapee);
  assert.equal(points, 100);
});
