import Phaser from 'phaser';
import { bossForWave, fitBossSprite, phaseForHp, BOSS_CONFIGS } from './bossConfigs.js';
import { consumePlayerShot } from './playerShotImpact.js';

const clamp = Phaser.Math.Clamp;
const DEG = Math.PI / 180;

export class BossSystem {
  static preload(scene) {
    for (const boss of BOSS_CONFIGS) {
      scene.load.image(boss.texture, `/assets/bosses/${boss.image}`);
    }
  }

  constructor(scene, { player, lasers, width, height, hudHeight, onDamage, onDefeat, onPhase }) {
    Object.assign(this, { scene, player, lasers, width, height, hudHeight, onDamage, onDefeat, onPhase });
    this.bullets = scene.physics.add.group({ defaultKey: 'bossShot1', maxSize: 120 });
    this.ui = scene.add.graphics().setDepth(52);
    this.nameText = scene.add.text(width / 2, hudHeight + 35, '', {
      fontFamily: 'Arial', fontSize: '17px', color: '#fff5dc', fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(53).setVisible(false);
    this.warning = scene.add.graphics().setDepth(7);
    this.boss = null;
    this.deathCount = 0;
    this.activeBulletCount = 0;
    this.overlapPlayer = scene.physics.add.overlap(player, this.bullets, (_player, shot) => {
      if (!shot.active || !this.boss || this.boss.dead) return;
      shot.disableBody(true, true);
      this.onDamage(shot.damage, shot.slow ? 'slow' : null);
    });
    this.overlapContact = null;
    this.overlapLasers = null;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  spawn(wave, clock) {
    const config = bossForWave(wave);
    if (!config || this.boss) return false;
    const texture = this.scene.textures.get(config.texture).getSourceImage();
    const fitted = fitBossSprite(texture.width, texture.height,
      Math.min(310, this.width * 0.42), Math.min(230, this.height * 0.32));
    const sprite = this.scene.physics.add.sprite(this.width / 2, -180, config.texture)
      .setDisplaySize(fitted.width, fitted.height).setRotation(Math.PI).setDepth(6);
    sprite.body.setSize(texture.width * 0.72, texture.height * 0.7, true);
    sprite.setImmovable(true);
    // Boss AI owns the position. Arcade's postUpdate otherwise moves the same
    // sprite a second time after the AI has placed it, which causes jitter.
    sprite.body.moves = false;
    this.boss = {
      config, sprite, hp: config.maxHp, phase: 1, enteredAt: clock,
      invulnerableUntil: clock + 1800, transitionUntil: 0,
      nextPrimary: clock + 2500, nextSecondary: clock + 5200, nextTertiary: clock + 8500,
      warningUntil: 0, pendingAttack: null, attackCooldownUntil: 0,
      moveClock: 0, moveX: this.width / 2, waypoint: 0,
      dead: false, rewardPaid: false, warningX: null, warningY: null, safeLane: 2,
      dashAt: 0, dashUntil: 0, desperationFired: false, pendingOrbs: []
    };
    this.nameText.setText(`${config.name.toUpperCase()}   •   PHASE 1`).setVisible(false);
    this.overlapContact = this.scene.physics.add.overlap(this.player, sprite, () => {
      if (this.boss && !this.boss.dead && this.scene.clock >= this.boss.invulnerableUntil) {
        this.onDamage(config.contactDamage);
      }
    });
    this.overlapLasers = this.scene.physics.add.overlap(this.lasers, sprite, (first, second) => {
      this.hit(first === sprite ? second : first, this.scene.clock);
    });
    return true;
  }

  hit(laser, clock) {
    const boss = this.boss;
    if (!boss || boss.dead || !laser.active) return false;
    // Even an invulnerable boss absorbs a projectile rather than letting it pass.
    if (!consumePlayerShot(laser, `boss-${boss.config.id}`)) return false;
    if (clock < boss.invulnerableUntil) return false;
    // The boss specification assumes a much larger HP scale than regular enemies.
    boss.hp = Math.max(0, boss.hp - laser.damage * 16);
    boss.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    boss.flashUntil = clock + 80;
    if (boss.hp === 0) this.defeat(clock);
    else {
      const phase = phaseForHp(boss.config, boss.hp);
      if (phase > boss.phase) {
        boss.phase = phase;
        boss.transitionUntil = clock + 900;
        boss.invulnerableUntil = clock + 900;
        boss.pendingAttack = null;
        boss.warningUntil = 0;
        this.warning.clear();
        boss.attackCooldownUntil = boss.transitionUntil;
        boss.nextPrimary = boss.transitionUntil + 650;
        boss.nextSecondary = boss.transitionUntil + 2400;
        boss.nextTertiary = boss.transitionUntil + 4300;
        this.nameText.setText(`${boss.config.name.toUpperCase()}   •   PHASE ${phase}`);
        this.onPhase?.(boss.config, phase);
        if (boss.config.id === 4 && phase === 3) {
          boss.decoy = this.scene.add.image(this.width - boss.sprite.x, 250, boss.config.texture)
            .setDisplaySize(boss.sprite.displayWidth, boss.sprite.displayHeight)
            .setRotation(Math.PI).setAlpha(0.25).setDepth(5);
          boss.decoyMark = this.scene.add.text(boss.decoy.x, 355, 'DECOY', {
            fontFamily: 'Arial', fontSize: '17px', color: '#bfa0ff'
          }).setOrigin(0.5).setDepth(6);
        }
      }
    }
    return true;
  }

  update(clock, frameMs) {
    const boss = this.boss;
    this.updateBullets(clock);
    if (!boss || boss.dead) return;
    const { sprite, config } = boss;
    if (clock >= boss.flashUntil) sprite.clearTint();
    const entryT = clamp((clock - boss.enteredAt) / 1800, 0, 1);
    if (entryT < 1) {
      sprite.y = -180 + (240 + 180) * (1 - Math.pow(1 - entryT, 3));
      sprite.body.updateFromGameObject();
      return;
    }
    this.nameText.setVisible(true);
    if (clock < boss.transitionUntil) {
      sprite.setAlpha(0.7 + 0.3 * Math.sin(clock / 65) ** 2);
      this.drawBar(boss);
      return;
    }
    sprite.setAlpha(1);
    this.move(boss, clock, frameMs);
    if (boss.decoy) {
      boss.decoy.setX(this.width - sprite.x);
      boss.decoyMark.setX(boss.decoy.x);
    }
    this.releaseOrbs(boss, clock);
    if (boss.doubleArcAt && clock >= boss.doubleArcAt) {
      this.fire(boss, config.attacks[0], clock);
      boss.doubleArcAt = 0;
    }
    if (config.id === 9 && boss.phase === 4 && !boss.desperationFired) {
      boss.desperationFired = true;
      this.fire(boss, { id: 'fan', count: 8, damage: 20, projectileSpeed: 240 }, clock);
      boss.attackCooldownUntil = clock + 2500;
      boss.nextPrimary = boss.attackCooldownUntil + 400;
    }
    this.warning.clear();
    if (boss.pendingAttack && clock >= boss.warningUntil) {
      this.fire(boss, boss.pendingAttack, clock);
      boss.pendingAttack = null;
      boss.warningUntil = 0;
      boss.attackCooldownUntil = clock + 900;
      this.warning.clear();
    } else if (boss.pendingAttack) {
      this.drawWarning(boss);
    } else if (clock >= boss.attackCooldownUntil) {
      const secondary = config.attacks[1];
      const tertiary = config.attacks[2];
      const secondaryEnabled = boss.phase >= 2 && !(config.id === 10 && boss.phase < 3)
        && !(config.id === 8 && boss.phase >= 3);
      const special = boss.phase >= 2 && tertiary && clock >= boss.nextTertiary ? tertiary
        : secondaryEnabled && secondary && clock >= boss.nextSecondary ? secondary : null;
      if (special) {
        boss.pendingAttack = special;
        boss.warningX = this.player.x;
        boss.warningY = this.player.y;
        if (special.id === 'grid') boss.safeLane = clamp(Math.round((this.player.x - 300) / 170), 0, 4);
        boss.warningUntil = clock + this.telegraphMs(special.id);
        if (special === tertiary) boss.nextTertiary = clock + tertiary.intervalMs;
        else boss.nextSecondary = clock + secondary.intervalMs;
        this.drawWarning(boss);
      } else if (clock >= boss.nextPrimary) {
        if (config.id === 6 && boss.phase >= 3) {
          boss.pendingAttack = { ...config.attacks[0], id: 'lance', count: 2 };
          boss.warningX = this.player.x;
          boss.warningY = this.player.y;
          boss.warningUntil = clock + 600;
          this.drawWarning(boss);
        } else {
          this.fire(boss, config.attacks[0], clock);
          if (config.id === 8 && boss.phase >= 3) boss.doubleArcAt = clock + 1000;
        }
        const interval = config.id === 5 && boss.phase >= 2 ? 2200 : config.attacks[0].intervalMs;
        boss.nextPrimary = clock + interval;
        boss.attackCooldownUntil = clock + 300;
      }
    }
    if (config.id === 2 && boss.dashUntil > boss.moveClock) {
      this.warning.lineStyle(3, 0xff425f, 0.7);
      this.warning.lineBetween(170, sprite.y, this.width - 170, sprite.y);
    }
    this.drawBar(boss);
  }

  move(boss, clock, frameMs) {
    const { config, sprite } = boss;
    const dt = frameMs / 1000;
    boss.moveClock += dt;
    let x = this.width / 2;
    let y = 240;
    const speed = config.speed * (boss.phase > 1 && config.id === 1 ? 85 / 65 : 1);
    switch (config.movement) {
      case 'patrol':
      case 'wide': {
        const amp = config.movement === 'wide' ? 380 : 300;
        x += amp * Math.sin(boss.moveClock * speed / amp);
        break;
      }
      case 'sine':
        x += 230 * Math.sin(boss.moveClock * (boss.phase > 1 ? 1.3 : 1) * Math.PI * 2 / 4.5);
        y = 240;
        if (boss.phase > 1 && boss.moveClock > boss.dashAt + 8 && !boss.dashUntil) {
          boss.dashAt = boss.moveClock;
          boss.dashUntil = boss.moveClock + 0.7;
        }
        if (boss.dashUntil && boss.moveClock >= boss.dashUntil) {
          boss.moveClock += dt * 2.5;
          if (boss.moveClock > boss.dashUntil + 0.7) boss.dashUntil = 0;
        }
        if (boss.dashUntil > boss.moveClock) y = 270;
        break;
      case 'step': {
        const points = [300, 640, 980];
        const next = Math.floor(boss.moveClock / 1.9) % points.length;
        const previous = (next + points.length - 1) % points.length;
        const t = clamp((boss.moveClock % 1.9) / 0.5, 0, 1);
        x = Phaser.Math.Linear(points[previous], points[next], t * t * (3 - 2 * t));
        break;
      }
      case 'teleport': {
        const points = [320, 880, 520, 740];
        const slot = Math.floor(boss.moveClock / 5) % points.length;
        const fade = boss.moveClock % 5;
        if (fade < 0.8) {
          sprite.setAlpha(Math.max(0.2, Math.abs(fade - 0.4) / 0.4));
          sprite.body.enable = false;
        } else sprite.body.enable = true;
        // Change lanes only while almost invisible, midway through the fade.
        x = points[fade < 0.4 ? (slot + points.length - 1) % points.length : slot];
        break;
      }
      case 'figure8':
      case 'figure8wide': {
        const radius = config.movement === 'figure8wide' ? 390 : 190;
        x += radius * Math.sin(boss.moveClock * speed / radius);
        y += (config.movement === 'figure8wide' ? 60 : 45) * Math.sin(boss.moveClock * speed * 2 / radius);
        break;
      }
      case 'waypoint': {
        const points = [300, 950, 450, 800, 600];
        const target = points[Math.floor(boss.moveClock / 2.8) % points.length];
        x = Phaser.Math.Linear(sprite.x, target, 1 - Math.exp(-dt * 2));
        if (boss.moveClock % 2.8 < 0.6) sprite.setAlpha(0.65);
        break;
      }
    }
    sprite.setPosition(clamp(x, 70 + sprite.displayWidth / 2, this.width - 70 - sprite.displayWidth / 2),
      clamp(y, 240, 300));
    sprite.body.updateFromGameObject();
  }

  telegraphMs(kind) {
    return kind === 'beam' ? 1200 : kind === 'grid' ? 1000 : kind === 'missile' ? 900 : 600;
  }

  drawWarning(boss) {
    this.warning.clear();
    this.warning.lineStyle(3, boss.config.color, 0.75);
    const { sprite } = boss;
    if (boss.pendingAttack.id === 'fan' && boss.config.id === 1) {
      for (const side of [-1, 1]) {
        this.warning.fillStyle(0xff3030, 0.75).fillCircle(sprite.x + side * sprite.displayWidth * 0.24, sprite.y + 35, 10);
      }
    } else if (boss.pendingAttack.id === 'grid') {
      for (let lane = 0; lane < 5; lane++) {
        this.warning.lineStyle(4, lane === boss.safeLane ? 0x52ffb6 : 0x65caff, 0.65);
        this.warning.lineBetween(300 + lane * 170, sprite.y, 300 + lane * 170, this.height);
      }
    } else if (boss.pendingAttack.id === 'mine') {
      for (const offset of [-1, 0, 1]) {
        this.warning.lineStyle(2, boss.config.color, 0.7);
        this.warning.strokeCircle(clamp(boss.warningX + offset * 95, 75, this.width - 75),
          clamp(boss.warningY - 100 + offset * 55, 330, this.height - 100), 23);
      }
    } else {
      const targetX = clamp(boss.warningX, 90, this.width - 90);
      if (boss.pendingAttack.id === 'beam') {
        for (let i = 0; i < boss.pendingAttack.count; i++) {
          const bx = clamp(targetX + (i - (boss.pendingAttack.count - 1) / 2) * 210, 70, this.width - 70);
          this.warning.lineBetween(bx, this.hudHeight + 80, bx, this.height);
        }
      } else this.warning.lineBetween(sprite.x, sprite.y + 50, targetX, this.height - 65);
      if (boss.pendingAttack.id === 'orb') {
        this.warning.fillStyle(0xff7533, 0.75).fillCircle(sprite.x, sprite.y + 35, 17);
      }
    }
  }

  fire(boss, attack, clock, release = false) {
    const { sprite, config } = boss;
    if (attack.id === 'beam') {
      this.spawnBeam(boss, attack, clock);
      return;
    }
    if (attack.id === 'orb' && config.id === 10 && !release) {
      for (let i = 0; i < attack.count; i++) boss.pendingOrbs.push({ at: clock + i * 330, attack });
      return;
    }
    const n = attack.count;
    const target = new Phaser.Math.Vector2(this.player.x - sprite.x, this.player.y - sprite.y).normalize();
    const base = attack.id === 'lance'
      ? Math.atan2(boss.warningY - sprite.y, boss.warningX - sprite.x)
      : Math.atan2(target.y, target.x) + (attack.id === 'arc' ? boss.moveClock * 0.3 : 0);
    for (let i = 0; i < n; i++) {
      const offset = i - (n - 1) / 2;
      const parallel = attack.id === 'twin' || attack.id === 'dart';
      const spacing = config.id === 2 && attack.id === 'fan' ? 14
        : attack.id === 'sector' ? 11 : attack.id === 'shards' ? 15 : 18;
      const angle = parallel || attack.id === 'grid' ? Math.PI / 2
        : base + offset * (attack.id === 'lance' ? 8 : spacing) * DEG;
      const x = attack.id === 'grid' ? 300 + i * 170
        : sprite.x + (parallel ? offset * (attack.id === 'twin' ? 90 : 28) : 0);
      const size = attack.id === 'orb' || attack.id === 'mine' ? 26 : 16;
      if (attack.id === 'grid' && i === boss.safeLane) continue;
      const shot = this.bullets.get(x, sprite.y + sprite.displayHeight * 0.34);
      if (!shot) break;
      const y = attack.id === 'mine' ? clamp(boss.warningY - 100 + offset * 55, 330, this.height - 100)
        : sprite.y + sprite.displayHeight * 0.34;
      const shotX = attack.id === 'mine' ? clamp(boss.warningX + offset * 95, 75, this.width - 75) : x;
      shot.enableBody(true, shotX, y, true, true);
      shot.setDisplaySize(size, size).setDepth(5);
      shot.body.setCircle(shot.width * 0.35);
      shot.setTint(config.color).setTintMode(Phaser.TintModes.FILL);
      shot.damage = attack.damage;
      shot.slow = config.id === 6;
      shot.steerUntil = attack.id === 'missile' ? clock + 1000 : 0;
      shot.expiresAt = clock + (attack.id === 'mine' ? 4000 : 7000);
      shot.armedAt = attack.id === 'mine' ? clock + 1200 : clock;
      shot.setAlpha(attack.id === 'mine' ? 0.5 : 1);
      if (attack.id === 'mine') shot.setVelocity(0, 0);
      else shot.setVelocity(Math.cos(angle) * attack.projectileSpeed,
        Math.sin(angle) * attack.projectileSpeed);
    }
  }

  releaseOrbs(boss, clock) {
    for (const item of boss.pendingOrbs.filter(item => item.at <= clock)) {
      this.fire(boss, { ...item.attack, id: 'orb', count: 1 }, clock, true);
    }
    boss.pendingOrbs = boss.pendingOrbs.filter(item => item.at > clock);
  }

  spawnBeam(boss, attack, clock) {
    const x = clamp(boss.warningX ?? this.player.x, 90, this.width - 90);
    for (let i = 0; i < attack.count; i++) {
      const bx = clamp(x + (i - (attack.count - 1) / 2) * 210, 70, this.width - 70);
      const shot = this.bullets.get(bx, this.height / 2);
      if (!shot) break;
      shot.enableBody(true, bx, this.height / 2, true, true);
      shot.setDisplaySize(22, this.height).setDepth(5).setAlpha(0.55);
      shot.body.setSize(shot.width, shot.height, true);
      shot.setTint(boss.config.color).setTintMode(Phaser.TintModes.FILL);
      shot.setVelocity(0, 0);
      shot.damage = attack.damage;
      shot.slow = false;
      shot.steerUntil = 0;
      shot.armedAt = clock;
      shot.expiresAt = clock + 900;
    }
  }

  updateBullets(clock) {
    let count = 0;
    for (const shot of this.bullets.getChildren()) {
      if (!shot.active) continue;
      if (clock >= shot.expiresAt || shot.x < -40 || shot.x > this.width + 40 || shot.y > this.height + 40) {
        shot.disableBody(true, true);
      } else {
        count++;
        if (shot.armedAt > clock) shot.body.enable = false;
        else if (!shot.body.enable) shot.body.enable = true;
        if (shot.alpha < 1 && shot.armedAt <= clock) shot.setAlpha(1);
        if (shot.steerUntil > clock) {
          const speed = Math.hypot(shot.body.velocity.x, shot.body.velocity.y);
          const desiredX = this.player.x - shot.x;
          const desiredY = this.player.y - shot.y;
          const targetAngle = Math.atan2(desiredY, desiredX);
          const currentAngle = Math.atan2(shot.body.velocity.y, shot.body.velocity.x);
          const turn = clamp(Phaser.Math.Angle.Wrap(targetAngle - currentAngle), -0.035, 0.035);
          shot.setVelocity(Math.cos(currentAngle + turn) * speed, Math.sin(currentAngle + turn) * speed);
        }
      }
    }
    this.activeBulletCount = count;
  }

  drawBar(boss) {
    this.ui.clear();
    const width = Math.min(442, this.width - 170);
    const x = (this.width - width) / 2;
    const y = this.hudHeight + 10;
    this.ui.fillStyle(0x20304c).fillRoundedRect(x, y, width, 18, 7);
    this.ui.fillStyle(boss.config.color)
      .fillRoundedRect(x + 2, y + 2, (width - 4) * boss.hp / boss.config.maxHp, 14, 6);
  }

  defeat(clock) {
    const boss = this.boss;
    if (!boss || boss.dead) return;
    boss.dead = true;
    const { x, y } = boss.sprite;
    boss.sprite.destroy();
    boss.decoy?.destroy();
    boss.decoyMark?.destroy();
    this.overlapContact?.destroy();
    this.overlapContact = null;
    this.overlapLasers?.destroy();
    this.overlapLasers = null;
    for (const shot of this.bullets.getChildren()) if (shot.active) shot.disableBody(true, true);
    this.warning.clear();
    this.ui.clear();
    this.nameText.setVisible(false);
    const burstCount = boss.config.id === 1 ? 24 : boss.config.id >= 9 ? 48 : 34;
    this.scene.explode(x, y, burstCount, boss.config.color);
    this.scene.explode(x - 45, y + 10, 12, boss.config.id === 6 ? 0xb9f5ff : 0xffb767);
    this.scene.explode(x + 45, y + 10, 12, boss.config.id === 6 ? 0xb9f5ff : 0xffb767);
    if (boss.config.id >= 9) {
      this.scene.time.delayedCall(350, () => this.scene.explode(x - 60, y - 20, 25, boss.config.color));
      this.scene.time.delayedCall(700, () => this.scene.explode(x + 50, y + 25, 25, 0xffffff));
    }
    if (!boss.rewardPaid) {
      boss.rewardPaid = true;
      this.deathCount++;
      this.onDefeat(boss.config, x, y, clock);
    }
    this.boss = null;
  }

  destroy() {
    this.overlapPlayer?.destroy();
    this.overlapContact?.destroy();
    this.overlapLasers?.destroy();
    this.boss?.sprite?.destroy();
    this.boss?.decoy?.destroy();
    this.boss?.decoyMark?.destroy();
    this.bullets.destroy(true, true);
    this.ui.destroy();
    this.warning.destroy();
    this.nameText.destroy();
    this.boss = null;
  }
}
