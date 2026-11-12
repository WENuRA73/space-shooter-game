import { ENEMY_DEFINITIONS, ENEMY_BY_ID, enemyHp, enemyCadence } from './enemyDefinitions.js';
import { enemyTarget, shotEvents, projectileVelocity, steerToward } from './enemyPatterns.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Reusable Phaser system for the ten documented standard enemies.
export class EnemyFleet {
  static preload(scene) {
    for (const def of ENEMY_DEFINITIONS) {
      scene.load.image(`fleet-${def.id}`, `/assets/enemies/${def.sprite}`);
    }
  }

  constructor(scene, { width, height, hudHeight, player, onDamage, onScore, onDrop }) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.hudHeight = hudHeight;
    this.player = player;
    this.onDamage = onDamage;
    this.onScore = onScore;
    this.onDrop = onDrop;
    this.serial = 0;
    this.enemies = scene.physics.add.group({ defaultKey: 'fleet-fighter', maxSize: 40 });
    this.bullets = scene.physics.add.group({ defaultKey: 'fleet-shot-fighter', maxSize: 220 });
    this.makeBulletTextures();
    scene.physics.add.overlap(player, this.enemies, (_player, enemy) => {
      if (!enemy.active) return;
      const damage = enemy.def.contactDamage;
      this.despawn(enemy);
      this.onDamage(damage);
    });
    scene.physics.add.overlap(player, this.bullets, (_player, bullet) => {
      if (!bullet.active) return;
      const damage = bullet.damage;
      bullet.disableBody(true, true);
      this.onDamage(damage);
    });
  }

  makeBulletTextures() {
    for (const def of ENEMY_DEFINITIONS) {
      const key = `fleet-shot-${def.id}`;
      if (this.scene.textures.exists(key)) continue;
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(def.color, 0.2).fillEllipse(12, 17, 22, 30);
      graphics.fillStyle(def.color).fillRoundedRect(8, 4, 8, 24, 4);
      graphics.fillStyle(0xffffff, 0.9).fillRoundedRect(10, 8, 4, 15, 2);
      graphics.generateTexture(key, 24, 34);
      graphics.destroy();
    }
  }

  spawn(id, x, now, wave = 1, formationOffset = 0) {
    const def = ENEMY_BY_ID[id];
    if (!def) throw new RangeError(`Unknown fleet enemy: ${id}`);
    const maxActive = id === 'crusher' || id === 'specter' ? 1 : id === 'tank' ? 2 : 8;
    if (this.enemies.getChildren().filter(enemy => enemy.active && enemy.def?.id === id).length >= maxActive) return null;
    const margin = def.width / 2 + 8;
    const spawnX = clamp(x + formationOffset, margin, this.width - margin);
    const spawnY = -def.width / 2 - 10;
    const enemy = this.enemies.get(spawnX, spawnY, `fleet-${id}`);
    if (!enemy) return null;
    enemy.setTexture(`fleet-${id}`).enableBody(true, spawnX, spawnY, true, true);
    enemy.setDisplaySize(def.width, def.width * enemy.height / enemy.width);
    enemy.setRotation(Math.PI).setDepth(6).setAlpha(1).setVisible(true).clearTint();
    enemy.body.setSize(enemy.width * 0.72, enemy.height * 0.72, true);
    enemy.def = def;
    enemy.spawnId = ++this.serial;
    enemy.originX = spawnX;
    enemy.spawnedAt = now;
    enemy.wave = wave;
    enemy.hp = enemyHp(def, wave);
    enemy.maxHp = enemy.hp;
    enemy.nextFireAt = now + def.firstShot;
    enemy.chargingUntil = 0;
    enemy.fireEvents = 0;
    enemy.seed = (this.serial % 5) * 0.5;
    enemy.lastDodgeAt = -3000;
    enemy.lungeWarnedCycle = -1;
    enemy.warningLine = null;
    enemy.halo?.destroy();
    enemy.halo = this.scene.add.ellipse(spawnX, spawnY, def.width * 1.15, def.width * 1.08,
      def.color, 0.1).setStrokeStyle(1, def.color, 0.34).setDepth(5);
    return enemy;
  }

  update(now, delta) {
    for (const enemy of [...this.enemies.getChildren()]) {
      if (!enemy.active) continue;
      const def = enemy.def;
      const age = now - enemy.spawnedAt;
      const target = enemyTarget(def, age, enemy.originX, this.width, this.hudHeight, enemy.seed);
      if (def.id === 'scout' && now - enemy.lastDodgeAt >= 3000 && this.scene.lasers) {
        const threat = this.scene.lasers.getChildren().find(laser => laser.active
          && Math.abs(laser.x - enemy.x) < 65 && laser.y > enemy.y && laser.y - enemy.y < 100);
        if (threat) {
          enemy.originX = clamp(enemy.originX + (laserSide(threat, enemy) * 125), def.width, this.width - def.width);
          enemy.lastDodgeAt = now;
        }
      }
      if (def.id === 'crusher') {
        const arrival = (190 + def.width / 2 + 10) / def.speed * 1000;
        const phase = Math.max(0, (age - arrival) / 1000);
        const cycle = phase % 7;
        const cycleIndex = Math.floor(phase / 7);
        if (phase > 0 && cycle >= 3.4 && cycle < 4 && enemy.lungeWarnedCycle !== cycleIndex) {
          enemy.lungeWarnedCycle = cycleIndex;
          this.warn(enemy, 600, false);
        }
        if (cycle >= 4 && cycle < 6.8 && this.enemies.getChildren().some(other => other !== enemy && other.active
          && ['crusher', 'specter', 'tank'].includes(other.def?.id)
          && Math.abs(other.x - enemy.x) < 130 && Math.abs(other.y - enemy.y) < 160)) {
          target.y = 190;
        }
      }
      const maxVelocity = def.speed * (def.movement === 'lunge' ? 3.2 : 1.8);
      const velocity = steerToward(enemy, enemy.body.velocity, target, delta, maxVelocity);
      enemy.setVelocity(velocity.x, velocity.y);
      enemy.halo?.setPosition(enemy.x, enemy.y);
      if (def.id === 'ranger' && enemy.chargingUntil) enemy.setVelocityX(0);
      if (enemy.warningLine) {
        enemy.warningLine.clear().lineStyle(2, def.color, 0.65)
          .lineBetween(enemy.x, enemy.y + enemy.displayHeight * 0.35, this.player.x, this.player.y);
      }
      if (def.id === 'phantom') enemy.setAlpha(age >= 6000 && age % 6000 < 800 ? 0.4 : 1);
      if (age > def.lifetime + 2400 || enemy.y < -def.width && age > 3000) {
        this.despawn(enemy);
        continue;
      }
      if (enemy.y < this.hudHeight + def.width / 2) continue;
      if (enemy.chargingUntil && now >= enemy.chargingUntil) {
        enemy.clearTint();
        enemy.warningLine?.destroy();
        enemy.warningLine = null;
        enemy.chargingUntil = 0;
        this.fire(enemy);
        enemy.nextFireAt = now + enemyCadence(def, enemy.wave);
      } else if (!enemy.chargingUntil && now >= enemy.nextFireAt) {
        if (def.warning) {
          enemy.chargingUntil = now + def.warning;
          this.warn(enemy, def.warning, def.id === 'ranger');
        } else {
          this.fire(enemy);
          enemy.nextFireAt = now + enemyCadence(def, enemy.wave);
        }
      }
    }
    for (const bullet of this.bullets.getChildren()) {
      if (bullet.active && (bullet.y > this.height + 40 || bullet.y < -40 || bullet.x < -40 || bullet.x > this.width + 40)) {
        bullet.disableBody(true, true);
      }
    }
  }

  warn(enemy, duration, line) {
    enemy.setTint(enemy.def.color);
    if (line) {
      enemy.warningLine?.destroy();
      enemy.warningLine = this.scene.add.graphics().setDepth(4);
      enemy.warningLine.lineStyle(2, enemy.def.color, 0.7);
      enemy.warningLine.lineBetween(enemy.x, enemy.y + enemy.displayHeight * 0.35,
        this.player.x, this.player.y);
    }
    this.scene.time.delayedCall(duration, () => {
      if (enemy.active && !enemy.chargingUntil) enemy.clearTint();
    });
  }

  fire(enemy) {
    const spawnId = enemy.spawnId;
    for (const shot of shotEvents(enemy.def, enemy.fireEvents++)) {
      if (shot.delay) {
        this.scene.time.delayedCall(shot.delay, () => {
          if (enemy.active && enemy.spawnId === spawnId && this.scene.mode === 'playing') this.launch(enemy, shot);
        });
      } else this.launch(enemy, shot);
    }
  }

  launch(enemy, shot) {
    const x = enemy.x + shot.x;
    const y = enemy.y + enemy.displayHeight * 0.35;
    const key = `fleet-shot-${enemy.def.id}`;
    const bullet = this.bullets.get(x, y, key);
    if (!bullet) return;
    bullet.setTexture(key).enableBody(true, x, y, true, true);
    const large = enemy.def.id === 'bomber' || enemy.def.id === 'tank';
    bullet.setScale(large ? 1.3 : 0.8).setDepth(5);
    bullet.body.setSize(bullet.width * 0.65, bullet.height * 0.7, true);
    bullet.damage = shot.damage;
    const velocity = projectileVelocity(shot, { x, y }, this.player);
    bullet.setVelocity(velocity.x, velocity.y);
  }

  hit(enemy, damage) {
    if (!enemy.active) return false;
    enemy.hp -= damage;
    enemy.setAlpha(0.65);
    const spawnId = enemy.spawnId;
    this.scene.time.delayedCall(70, () => {
      if (enemy.active && enemy.spawnId === spawnId && !enemy.chargingUntil) enemy.setAlpha(1);
    });
    if (enemy.hp > 0) return false;
    const { x, y, def } = enemy;
    this.despawn(enemy);
    this.onScore(def.score);
    this.onDrop?.(x, y);
    for (let i = 0; i < 9; i++) {
      const spark = this.scene.add.circle(x, y, 3, def.color).setDepth(20);
      const angle = i * Math.PI * 2 / 9;
      this.scene.tweens.add({ targets: spark, x: x + Math.cos(angle) * 35,
        y: y + Math.sin(angle) * 35, alpha: 0, duration: 360, onComplete: () => spark.destroy() });
    }
    return true;
  }

  despawn(enemy) {
    enemy.warningLine?.destroy();
    enemy.warningLine = null;
    enemy.halo?.destroy();
    enemy.halo = null;
    enemy.setVelocity(0, 0);
    enemy.destroy();
  }
}

function laserSide(laser, enemy) { return laser.x <= enemy.x ? 1 : -1; }
