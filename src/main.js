import Phaser from 'phaser';
import './style.css';
import { chooseLoot, applyPickupState, START_HEALTH, ENEMY_LOOT_DROP_PERCENT } from './upgrades.js';
import { PLAYER_SHOTS, PLAYER_SHOT_SPEED, PLAYER_SHOT_INTERVAL, shotForShip } from './playerShots.js';
import { consumePlayerShot } from './playerShotImpact.js';
import { getGameLayout } from './layout.js';
import { MusicPlayer } from './music.js';
import { EnemyFleet } from './EnemyFleet.js';
import { getEnemyWave } from './enemyWaves.js';
import { ENEMY_BY_ID } from './enemyDefinitions.js';
import { BossSystem } from './BossSystem.js';
import { bossForWave } from './bossConfigs.js';
import { SPACE_LAYERS, backgroundTileScale, backgroundOffsets } from './spaceBackground.js';
import { SHIPS, STORAGE_KEY, assetKey, loadProgress, saveProgress, defeatBoss,
  resolveShipStats, preserveHealthRatio, volleyPattern } from './shipProgression.js';
import skyward from '../songs/Skyward Lasers.mp3?url';
import skywardAlt from '../songs/Skyward Lasers (1).mp3?url';
import rapidProtocol from '../songs/Rapid Fire Protocol.mp3?url';

const { width: WIDTH, height: HEIGHT, portrait: PORTRAIT } = getGameLayout(window.innerWidth, window.innerHeight);
const music = new MusicPlayer([skyward, skywardAlt, rapidProtocol]);
const HUD_HEIGHT = PORTRAIT ? 112 : 62;
const BEST_KEY = 'space-shooter-best-score';

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    for (const layer of SPACE_LAYERS) {
      this.load.image(layer.key, `/assets/backgrounds/${layer.file}`);
    }
    for (let id = 1; id <= 10; id++) {
      this.load.image(assetKey(id), `/assets/player-ships/player_ship_${String(id).padStart(2, '0')}.png`);
    }
    EnemyFleet.preload(this);
    BossSystem.preload(this);
    this.load.svg('bossShot1', '/boss-shot-1.svg', { width: 44, height: 44 });
    this.load.svg('repair', '/repair.svg', { width: 72, height: 72 });
    this.load.svg('shield', '/shield.svg', { width: 72, height: 72 });
    this.load.svg('rapid', '/rapid.svg', { width: 72, height: 72 });
    this.load.svg('spread', '/spread.svg', { width: 72, height: 72 });
    this.load.svg('heart', '/heart.svg', { width: 72, height: 72 });
    for (const shot of PLAYER_SHOTS) {
      this.load.svg(shot.key, `/assets/player-shots/${shot.file}`, { width: 32, height: 64 });
    }
  }

  create() {
    this.clock = 0;
    this.mode = 'menu';
    this.score = 0;
    // Developer-only reset for isolated progression playtests.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('resetShips') === '1') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
    }
    this.shipProgress = loadProgress();
    this.runShipId = 1;
    this.basePlayerStats = {
      maxHp: START_HEALTH * 20, moveSpeed: PORTRAIT ? 410 : 350,
      bulletDamage: 1, fireIntervalMs: PLAYER_SHOT_INTERVAL,
      baseVolleyCount: 2
    };
    this.shipStats = resolveShipStats(this.runShipId, this.basePlayerStats);
    this.maxLives = START_HEALTH;
    this.lives = START_HEALTH;
    this.maxHullHp = this.shipStats.maxHp;
    this.hullHp = this.maxHullHp;
    this.shotCount = 2;
    this.wave = 0;
    this.remaining = 0;
    this.nextEnemyAt = 0;
    this.nextWaveAt = 0;
    this.nextShotAt = 0;
    this.campaignVictoryAt = 0;
    this.invulnerableUntil = 0;
    this.shieldUntil = 0;
    this.rapidUntil = 0;
    this.slowUntil = 0;
    this.bestScore = this.readBest();
    const previewId = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('enemy') : null;
    this.debugEnemy = previewId && ENEMY_BY_ID[previewId] ? previewId : null;
    const previewBoss = Number(new URLSearchParams(window.location.search).get('boss'));
    this.debugBoss = import.meta.env.DEV && Number.isInteger(previewBoss) && previewBoss >= 1 && previewBoss <= 10
      ? previewBoss : null;
    this.debugBossTest = Boolean(this.debugBoss && new URLSearchParams(window.location.search).get('bossTest') === '1');
    this.pointerActive = false;
    this.touchReadyAt = 0;

    this.createSpaceBackground();
    this.player = this.physics.add.sprite(WIDTH / 2, HEIGHT - 100, assetKey(this.runShipId));
    this.player.setCollideWorldBounds(true).setDepth(10);
    this.setPlayerArt(this.runShipId);
    this.engineGlow = this.add.ellipse(this.player.x, this.player.y + 45, 48, 82, 0x15cfff, 0.23).setDepth(8);
    this.playerHealthBar = this.add.graphics().setDepth(12);
    this.lasers = this.physics.add.group({ defaultKey: shotForShip(1).key, maxSize: 140 });
    this.pickups = this.physics.add.group({ defaultKey: 'repair', maxSize: 30 });
    this.fleet = new EnemyFleet(this, {
      width: WIDTH, height: HEIGHT, hudHeight: HUD_HEIGHT, player: this.player,
      onDamage: damage => this.damagePlayer(damage),
      onScore: points => {
        this.score += points;
        if (!this.debugBossTest && this.score > this.bestScore) {
          this.bestScore = this.score;
          this.saveBest();
        }
        this.updateHud();
      },
      onDrop: (x, y) => {
        if (Math.random() * 100 < ENEMY_LOOT_DROP_PERCENT) this.spawnPickup(x, y);
      }
    });
    this.bossSystem = new BossSystem(this, {
      player: this.player, lasers: this.lasers, width: WIDTH, height: HEIGHT, hudHeight: HUD_HEIGHT,
      onDamage: (damage, effect) => {
        const hit = this.damagePlayer(damage);
        if (hit && effect === 'slow') {
          this.slowUntil = Math.max(this.slowUntil, this.clock + 700);
          this.showNotice('ENGINE CHILLED');
        }
      },
      onPhase: (config, phase) => {
        if (config.id === 10) music.audio.volume = Math.min(0.44, 0.32 + phase * 0.03);
      },
      onDefeat: (config, x, y) => {
        this.score += config.score;
        if (!this.debugBossTest && this.score > this.bestScore) {
          this.bestScore = this.score;
          this.saveBest();
        }
        this.updateHud();
        for (const offset of [-50, 0, 50]) this.spawnPickup(x + offset, y);
        const result = defeatBoss(this.shipProgress, config.id, this.runShipId);
        if (result.changed) {
          this.shipProgress = result.progress;
          if (result.newlyUnlocked || result.reason === 'final-victory') saveProgress(this.shipProgress);
          if (result.shipId !== this.runShipId) {
            this.equipShip(result.shipId);
            const verb = result.newlyUnlocked ? 'UNLOCKED' : 'EQUIPPED';
            this.showNotice(`SHIP ${String(result.shipId).padStart(2, '0')} ${SHIPS[result.shipId - 1].name.toUpperCase()} ${verb}`);
            this.unlockNoticeUntil = this.clock + 2400;
          }
        }
        if (config.id === 10) music.audio.volume = 0.32;
        if (result.reason === 'final-victory') this.campaignVictoryAt = this.clock + 2000;
      }
    });
    this.physics.add.overlap(this.lasers, this.fleet.enemies, this.hitFleetEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup, undefined, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.mode === 'menu') this.startGame();
      else if (this.mode === 'gameover' || this.mode === 'victory') this.restartGame();
    });
    this.input.keyboard.on('keydown-R', () => {
      if (this.mode === 'gameover' || this.mode === 'victory') this.restartGame();
    });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-M', () => this.toggleMusic());
    if (this.debugBossTest) this.input.keyboard.on('keydown-K', () => {
      const boss = this.bossSystem.boss;
      if (this.mode !== 'playing' || !boss) return;
      const simulatedLaser = {
        active: true, damage: boss.config.maxHp / 16 * (boss.config.id === 9 ? 0.14 : 0.26),
        hitIds: new Set(),
        disableBody() { this.active = false; }
      };
      this.bossSystem.hit(simulatedLaser, this.clock);
    });
    this.input.on('pointerdown', pointer => {
      if (this.mode === 'playing' && this.clock >= this.touchReadyAt && pointer.y > HUD_HEIGHT + 30) {
        this.pointerActive = true;
        this.pointerTarget = { x: pointer.x, y: pointer.y };
      }
    });
    this.input.on('pointermove', pointer => {
      if (this.pointerActive && pointer.isDown) this.pointerTarget = { x: pointer.x, y: pointer.y };
    });
    this.input.on('pointerup', () => { this.pointerActive = false; });

    this.createHud();
    this.shieldRing = this.add.circle(0, 0, 52, 0x48d9ff, 0.07)
      .setStrokeStyle(3, 0x7deaff, 0.8).setDepth(9).setVisible(false);
    this.showOverlay('SPACE SHOOTER', [
      'Each boss changes your ship. A new run starts with Ship 01.',
      PORTRAIT ? 'Drag to move and fire. Tap music icon to mute.' : 'Move: WASD / Arrows or drag   Fire: Space / drag   Pause: P',
      'Collect loot to upgrade health, extra shots, and protection.',
      `HIGHEST UNLOCKED  SHIP ${String(this.shipProgress.maxUnlocked).padStart(2, '0')}`
    ], 'START GAME', () => this.startGame());
  }

  createSpaceBackground() {
    const width = this.scale.width;
    const height = this.scale.height;
    const tileScale = backgroundTileScale(width);
    this.spaceLayers = SPACE_LAYERS.map(layer => this.add.tileSprite(0, 0, width, height, layer.key)
      .setOrigin(0).setDepth(layer.depth).setScrollFactor(0)
      .setTileScale(tileScale).setAlpha(layer.alpha));
    this.scale.on('resize', this.resizeSpaceBackground, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.resizeSpaceBackground, this);
    });
  }

  resizeSpaceBackground(gameSize) {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    const tileScale = backgroundTileScale(width);
    for (const layer of this.spaceLayers) {
      layer.setSize(width, height).setTileScale(tileScale);
    }
  }

  updateSpaceBackground() {
    const offsets = backgroundOffsets(this.clock, this.player.x, this.scale.width);
    this.spaceLayers.forEach((layer, index) => {
      layer.tilePositionX = offsets[index].x;
      layer.tilePositionY = offsets[index].y;
    });
  }

  createHud() {
    this.add.rectangle(WIDTH / 2, HUD_HEIGHT / 2, WIDTH, HUD_HEIGHT, 0x101632, 0.9).setDepth(50);
    this.add.rectangle(WIDTH / 2, HUD_HEIGHT, WIDTH, 2, 0x00e5ff, 0.5).setDepth(50);
    const style = { fontFamily: 'Arial', fontSize: PORTRAIT ? '24px' : '21px', color: '#e8f8ff', fontStyle: 'bold' };
    this.scoreText = this.add.text(20, 15, '', style).setDepth(51);
    this.livesText = this.add.text(PORTRAIT ? 20 : 330, PORTRAIT ? 63 : 17, '', style).setDepth(51);
    this.waveText = this.add.text(PORTRAIT ? 300 : 570, 17, '', style).setDepth(51);
    this.bestText = this.add.text(PORTRAIT ? 300 : 930, PORTRAIT ? 63 : 17, '', style).setDepth(51);
    this.statusText = this.add.text(WIDTH / 2, HUD_HEIGHT + 20, '', {
      fontFamily: 'Arial', fontSize: '17px', color: '#9ceaff'
    }).setOrigin(0.5, 0).setDepth(51);
    this.upgradeText = this.add.text(20, HEIGHT - 38, '', {
      fontFamily: 'Arial', fontSize: PORTRAIT ? '20px' : '17px', color: '#bfe9fa', fontStyle: 'bold'
    }).setDepth(51);
    this.musicButton = this.add.text(WIDTH - 18, HUD_HEIGHT + 18, '', {
      fontFamily: 'Arial', fontSize: PORTRAIT ? '30px' : '24px', color: '#bfe9fa',
      backgroundColor: '#182c4b', padding: { x: 12, y: 7 }
    }).setOrigin(1, 0).setDepth(53).setInteractive({ useHandCursor: true });
    this.musicButton.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
      this.toggleMusic();
    });
    this.updateMusicButton();
    this.updateHud();
  }

  toggleMusic() {
    music.toggle();
    this.updateMusicButton();
  }

  updateMusicButton() {
    this.musicButton.setText(music.enabled ? '♫ ON' : '♫ OFF');
  }

  updateHud() {
    this.scoreText.setText(`SCORE  ${this.score}`);
    this.livesText.setText(`HULL  ${this.hullHp}/${this.maxHullHp}`);
    this.waveText.setText(`WAVE  ${this.wave || '-'}`);
    this.bestText.setText(`BEST  ${this.bestScore}`);
    const ship = SHIPS[this.runShipId - 1];
    const shot = shotForShip(ship.id);
    const guns = this.shipStats.gunCount + Math.max(0, this.shotCount - this.basePlayerStats.baseVolleyCount);
    this.upgradeText.setText(PORTRAIT
      ? `SHIP ${String(ship.id).padStart(2, '0')}  •  ${shot.name}  •  GUNS ${guns}`
      : `SHIP ${String(ship.id).padStart(2, '0')} ${ship.name.toUpperCase()}     ${shot.name} SHOT     GUNS ${guns}`);
  }

  setPlayerArt(id) {
    this.player.setTexture(assetKey(id)).setDisplaySize(84, 84);
    // Preserve the previous 51 x 64 on-screen collision body while using 512px art.
    this.player.body.setSize(310, 390, true);
  }

  equipShip(id) {
    const oldHp = this.hullHp;
    const oldMax = this.maxHullHp;
    this.runShipId = id;
    this.shipStats = resolveShipStats(id, this.basePlayerStats);
    this.shotCount = this.basePlayerStats.baseVolleyCount;
    this.nextShotAt = this.clock;
    this.setPlayerArt(id);
    this.maxHullHp = this.shipStats.maxHp + (this.maxLives - START_HEALTH) * 20;
    this.hullHp = preserveHealthRatio(oldHp, oldMax, this.maxHullHp);
    this.lives = Math.min(this.maxLives, Math.ceil(this.hullHp / this.maxHullHp * this.maxLives));
    this.updateHud();
  }

  showOverlay(title, lines, buttonLabel, action) {
    this.overlay?.destroy(true);
    const panel = this.add.container(0, 0).setDepth(100);
    const panelWidth = Math.min(780, WIDTH - 48);
    const panelHeight = PORTRAIT ? 500 : 370;
    const titleY = HEIGHT / 2 - (PORTRAIT ? 168 : 140);
    panel.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x030717, 0.82));
    panel.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, panelWidth, panelHeight, 0x121b3b, 0.96)
      .setStrokeStyle(3, 0x27d8f5, 0.75));
    panel.add(this.add.text(WIDTH / 2, titleY, title, {
      fontFamily: 'Arial', fontSize: PORTRAIT ? '48px' : '54px', fontStyle: 'bold', color: '#53ebff'
    }).setOrigin(0.5));
    lines.forEach((line, index) => panel.add(this.add.text(WIDTH / 2, titleY + 72 + index * (PORTRAIT ? 55 : 37), line, {
      fontFamily: 'Arial', fontSize: PORTRAIT ? '21px' : '19px', color: '#d5e7f6', align: 'center',
      wordWrap: { width: panelWidth - 60 }
    }).setOrigin(0.5)));
    const buttonY = HEIGHT / 2 + (PORTRAIT ? 172 : 108);
    const button = this.add.rectangle(WIDTH / 2, buttonY, 290, 68, 0x00b9d7)
      .setStrokeStyle(2, 0xffffff, 0.8).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setFillStyle(0x25def2));
    button.on('pointerout', () => button.setFillStyle(0x00b9d7));
    button.on('pointerdown', action);
    panel.add(button);
    panel.add(this.add.text(WIDTH / 2, buttonY, buttonLabel, {
      fontFamily: 'Arial', fontSize: '23px', fontStyle: 'bold', color: '#071329'
    }).setOrigin(0.5));
    this.overlay = panel;
  }

  showNotice(message) {
    this.statusText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.statusText);
    this.tweens.add({ targets: this.statusText, alpha: 0, delay: 1700, duration: 700 });
  }

  startGame() {
    if (this.mode !== 'menu') return;
    this.mode = 'playing';
    if (this.debugBoss) this.wave = this.debugBoss * 5 - 1;
    if (this.debugBossTest) this.shieldUntil = Number.POSITIVE_INFINITY;
    this.touchReadyAt = this.clock + 350;
    music.play();
    this.overlay.destroy(true);
    this.overlay = null;
    this.startWave();
  }

  startWave() {
    this.wave++;
    this.waveQueue = this.debugEnemy && this.wave === 1 ? [this.debugEnemy] : getEnemyWave(this.wave);
    this.remaining = bossForWave(this.wave) ? 1 : this.waveQueue.length;
    this.nextEnemyAt = this.clock + 900;
    this.nextWaveAt = 0;
    const boss = bossForWave(this.wave);
    this.showNotice(boss ? `BOSS APPROACHING  -  WAVE ${this.wave}` : `WAVE ${this.wave}`);
    this.updateHud();
  }

  spawnEnemy() {
    if (bossForWave(this.wave)) {
      if (this.bossSystem.spawn(this.wave, this.clock)) this.remaining--;
      return;
    }
    const id = this.waveQueue[0];
    if (!id) return;
    const droneIndex = id === 'drone' ? this.waveQueue.filter(kind => kind === 'drone').length : 0;
    const x = id === 'drone'
      ? WIDTH / 2 + (droneIndex - 2.5) * 85
      : Phaser.Math.Between(80, WIDTH - 80);
    const enemy = this.fleet.spawn(id, x, this.clock, this.wave);
    if (enemy) {
      this.waveQueue.shift();
      this.remaining--;
    }
  }

  fireLaser() {
    const shot = shotForShip(this.runShipId);
    let fired = false;
    const angles = volleyPattern(this.shipStats,
      Math.max(0, this.shotCount - this.basePlayerStats.baseVolleyCount));
    for (let index = 0; index < angles.length; index++) {
      const offset = index - (angles.length - 1) / 2;
      const radians = Phaser.Math.DegToRad(angles[index]);
      const laser = this.lasers.get(this.player.x, this.player.y, shot.key);
      if (!laser) continue;
      laser.setTexture(shot.key);
      laser.enableBody(true,
        this.player.x + offset * 18,
        this.player.y - this.player.displayHeight / 2 - 16,
        true, true);
      const velocityX = this.runShipId === 1 && index < 2
        ? offset * 40 : Math.sin(radians) * PLAYER_SHOT_SPEED;
      const velocityY = this.runShipId === 1 && index < 2
        ? -PLAYER_SHOT_SPEED : -Math.cos(radians) * PLAYER_SHOT_SPEED;
      laser.setScale(0.5).setDepth(5).setVelocity(velocityX, velocityY);
      laser.body.setSize(laser.width * 0.7, laser.height * 0.8, true);
      laser.damage = this.shipStats.bulletDamage;
      laser.hitIds = new Set();
      fired = true;
    }
    if (fired) {
      const intervalRatio = SHIPS[this.runShipId - 1].interval;
      this.nextShotAt = this.clock + Math.round((this.clock < this.rapidUntil ? 75 : PLAYER_SHOT_INTERVAL) * intervalRatio);
    }
  }

  hitFleetEnemy(laser, enemy) {
    if (!laser.active || !enemy.active || this.mode !== 'playing') return;
    if (!consumePlayerShot(laser, enemy.spawnId)) return;
    // The fleet specification uses a 40–300 HP scale.
    this.fleet.hit(enemy, laser.damage * 4);
  }

  explode(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(2, 5), color).setDepth(20);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(20, count > 10 ? 110 : 55);
      this.tweens.add({
        targets: spark, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance,
        alpha: 0, scale: 0.2, duration: Phaser.Math.Between(250, 540),
        onComplete: () => spark.destroy()
      });
    }
  }

  spawnPickup(x, y) {
    const kind = chooseLoot(Math.random());
    const pickup = this.pickups.get(x, y, kind);
    if (!pickup) return;
    pickup.setTexture(kind).enableBody(true, x, y, true, true);
    pickup.kind = kind;
    pickup.setScale(0.5).setDepth(7).setVelocityY(125);
  }

  collectPickup(_player, pickup) {
    if (!pickup.active || this.mode !== 'playing') return;
    const kind = pickup.kind;
    pickup.disableBody(true, true);
    Object.assign(this, applyPickupState({
      lives: this.lives, maxLives: this.maxLives, shotCount: this.shotCount,
      shieldUntil: this.shieldUntil, rapidUntil: this.rapidUntil
    }, kind, this.clock));
    this.maxHullHp = this.shipStats.maxHp + (this.maxLives - START_HEALTH) * 20;
    if (kind === 'repair' || kind === 'heart') {
      this.hullHp = Math.min(this.maxHullHp, this.hullHp + 20);
    }
    this.lives = Math.min(this.maxLives, Math.ceil(this.hullHp / this.maxHullHp * this.maxLives));
    const notice = {
      repair: 'SHIP REPAIRED', shield: 'SHIELD ACTIVE', rapid: 'RAPID FIRE ACTIVE',
      spread: `EXTRA SHOTS  ${this.shotCount - this.basePlayerStats.baseVolleyCount}`,
      heart: 'MAX HULL UPGRADED'
    };
    this.showNotice(notice[kind]);
    this.updateHud();
  }

  damagePlayer(amount = 20) {
    if (this.clock < this.shieldUntil || this.clock < this.invulnerableUntil || this.mode !== 'playing') return false;
    this.hullHp = Math.max(0, this.hullHp - amount);
    this.lives = Math.min(this.maxLives, Math.ceil(this.hullHp / this.maxHullHp * this.maxLives));
    this.invulnerableUntil = this.clock + 1400;
    this.cameras.main.shake(140, 0.006);
    this.updateHud();
    if (this.hullHp <= 0) this.endGame();
    else this.showNotice('SHIP HIT!');
    return true;
  }

  endGame() {
    this.mode = 'gameover';
    music.audio.volume = 0.32;
    this.pointerActive = false;
    music.pause();
    this.player.setVelocity(0);
    this.physics.world.pause();
    this.saveBest();
    this.showOverlay('GAME OVER', [
      `FINAL SCORE  ${this.score}`, `BEST SCORE  ${this.bestScore}`,
      `YOU REACHED WAVE ${this.wave}     Press R or Space to retry`
    ], 'PLAY AGAIN', () => this.restartGame());
  }

  restartGame() {
    this.physics.world.resume();
    this.scene.restart();
    music.play();
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.pointerActive = false;
      music.pause();
      this.physics.world.pause();
      this.showOverlay('PAUSED', ['Take a breath. Your run is ready when you are.', 'Press P to resume.'],
        'RESUME', () => this.togglePause());
    } else if (this.mode === 'paused') {
      this.overlay.destroy(true);
      this.overlay = null;
      this.physics.world.resume();
      this.mode = 'playing';
      music.play();
    }
  }

  readBest() {
    try { return Number(window.localStorage.getItem(BEST_KEY)) || 0; }
    catch { return 0; }
  }

  saveBest() {
    try { window.localStorage.setItem(BEST_KEY, String(this.bestScore)); }
    catch { /* Storage is optional. */ }
  }

  update(_time, delta) {
    if (this.mode !== 'playing') return;
    const frameMs = Math.min(delta, 50);
    const dt = frameMs / 1000;
    this.clock += frameMs;
    let dx = Number(this.cursors.right.isDown || this.wasd.D.isDown)
      - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    let dy = Number(this.cursors.down.isDown || this.wasd.S.isDown)
      - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    if (this.pointerActive && this.pointerTarget) {
      const targetX = Phaser.Math.Clamp(this.pointerTarget.x, 45, WIDTH - 45);
      const targetY = Phaser.Math.Clamp(this.pointerTarget.y - 35, HUD_HEIGHT + 100, HEIGHT - 55);
      dx = Math.abs(targetX - this.player.x) > 8 ? targetX - this.player.x : 0;
      dy = Math.abs(targetY - this.player.y) > 8 ? targetY - this.player.y : 0;
    }
    this.player.setVelocity(dx, dy);
    this.player.body.velocity.normalize().scale(this.shipStats.moveSpeed * (this.clock < this.slowUntil ? 0.85 : 1));
    this.updateSpaceBackground();
    this.player.setAlpha(this.clock < this.invulnerableUntil && Math.floor(this.clock / 100) % 2 ? 0.4 : 1);
    this.shieldRing.setPosition(this.player.x, this.player.y).setVisible(this.clock < this.shieldUntil);
    this.engineGlow.setPosition(this.player.x, this.player.y + 45)
      .setScale(0.85 + Math.sin(this.clock / 90) * 0.12, 1);
    this.drawPlayerHealth();

    if ((this.fireKey.isDown || this.pointerActive) && this.clock >= this.nextShotAt) this.fireLaser();
    for (const laser of this.lasers.getChildren()) {
      if (laser.active && laser.y + laser.displayHeight / 2 < 0) laser.disableBody(true, true);
    }
    this.fleet.update(this.clock, frameMs);
    this.bossSystem.update(this.clock, frameMs);
    if (this.campaignVictoryAt && this.clock >= this.campaignVictoryAt) {
      this.mode = 'victory';
      this.pointerActive = false;
      music.pause();
      this.player.setVelocity(0);
      this.physics.world.pause();
      this.showOverlay('VICTORY', [
        'THE CELESTIAL FLEET HAS FALLEN', `FINAL SCORE  ${this.score}`,
        'Press R or Space to play again'
      ], 'PLAY AGAIN', () => this.restartGame());
      return;
    }
    if (this.remaining > 0 && this.clock >= this.nextEnemyAt) {
      this.spawnEnemy();
      this.nextEnemyAt = this.clock + (bossForWave(this.wave) ? 900 : Math.max(330, 870 - this.wave * 40));
    }
    for (const pickup of this.pickups.getChildren()) {
      if (!pickup.active) continue;
      pickup.angle += 90 * dt;
      if (pickup.y > HEIGHT + 20) pickup.disableBody(true, true);
    }
    if (!this.campaignVictoryAt && this.remaining === 0 &&
      this.fleet.enemies.countActive() === 0 && !this.bossSystem.boss) {
      if (!this.nextWaveAt) {
        this.nextWaveAt = this.clock + 2200;
        if (this.clock >= (this.unlockNoticeUntil || 0)) this.showNotice('WAVE CLEARED');
      } else if (this.clock >= this.nextWaveAt) this.startWave();
    }
  }

  drawPlayerHealth() {
    const bar = this.playerHealthBar;
    const width = 94;
    const x = this.player.x - width / 2;
    const y = this.player.y - this.player.displayHeight / 2 - 24;
    const ratio = Math.max(0, this.hullHp / this.maxHullHp);
    bar.clear();
    bar.fillStyle(0x061529, 0.88).fillRoundedRect(x - 3, y - 3, width + 6, 16, 6);
    bar.lineStyle(1.5, 0x9ceaff, 0.9).strokeRoundedRect(x - 3, y - 3, width + 6, 16, 6);
    if (ratio > 0) {
      bar.fillStyle(ratio > 0.5 ? 0x48ef98 : ratio > 0.25 ? 0xffc85a : 0xff586b);
      bar.fillRoundedRect(x, y, width * ratio, 10, 4);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO, width: WIDTH, height: HEIGHT, parent: 'app',
  backgroundColor: '#080b1f',
  render: { antialias: true, pixelArt: false },
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene]
});
