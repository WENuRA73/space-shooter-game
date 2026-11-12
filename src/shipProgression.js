// Pure progression logic. Phaser scenes supply the current game's base stats.
export const STORAGE_KEY = 'spaceShooter.playerShips.v1';

export const SHIPS = Object.freeze([
  { id: 1, name: 'Cadet',      hp: 1.00, speed: 1.00, dps: 1.00, interval: 1.00, guns: 1, angles: [0],                         upgrade: 'Starter gun' },
  { id: 2, name: 'Swift',      hp: 1.08, speed: 1.03, dps: 1.10, interval: 0.98, guns: 2, angles: [0, 0],                      upgrade: 'Paired guns' },
  { id: 3, name: 'Arrow',      hp: 1.15, speed: 1.06, dps: 1.20, interval: 0.96, guns: 3, angles: [-7, 0, 7],                 upgrade: 'Narrow fan' },
  { id: 4, name: 'Bulwark',    hp: 1.25, speed: 1.05, dps: 1.30, interval: 0.95, guns: 3, angles: [0, 0, 0],                  upgrade: 'Focused armor strike' },
  { id: 5, name: 'Talon',      hp: 1.34, speed: 1.09, dps: 1.40, interval: 0.93, guns: 4, angles: [-4, 0, 0, 4],              upgrade: 'Four-gun cluster' },
  { id: 6, name: 'Vanguard',   hp: 1.43, speed: 1.12, dps: 1.50, interval: 0.91, guns: 5, angles: [-8, -3, 0, 3, 8],          upgrade: 'Five-shot coverage' },
  { id: 7, name: 'Lancer',     hp: 1.51, speed: 1.14, dps: 1.60, interval: 0.90, guns: 5, angles: [-3, 0, 0, 0, 3],           upgrade: 'Focused five-shot burst' },
  { id: 8, name: 'Ghost',      hp: 1.59, speed: 1.16, dps: 1.70, interval: 0.88, guns: 6, angles: [-8, -4, 0, 0, 4, 8],       upgrade: 'Six-shot sweep' },
  { id: 9, name: 'Sovereign',  hp: 1.66, speed: 1.18, dps: 1.80, interval: 0.86, guns: 7, angles: [-9, -5, -2, 0, 2, 5, 9],   upgrade: 'Seven-shot control' },
  { id: 10,name: 'Apex',       hp: 1.72, speed: 1.20, dps: 1.90, interval: 0.85, guns: 8, angles: [-9, -6, -3, 0, 0, 3, 6, 9],upgrade: 'Maximum eight-shot array' },
]);

export function assetKey(id) {
  if (!Number.isInteger(id) || id < 1 || id > 10) throw new RangeError('Ship id must be 1..10');
  return `playerShip${String(id).padStart(2, '0')}`;
}

export function initialProgress() {
  return { version: 1, maxUnlocked: 1, equipped: 1, victory: false };
}

export function normalizeProgress(value) {
  const n = Number(value?.maxUnlocked);
  const maxUnlocked = Number.isInteger(n) ? Math.min(10, Math.max(1, n)) : 1;
  return {
    version: 1,
    maxUnlocked,
    equipped: maxUnlocked,
    victory: maxUnlocked === 10 && value?.victory === true,
  };
}

export function loadProgress(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : initialProgress();
  } catch {
    return initialProgress();
  }
}

export function saveProgress(progress, storage) {
  const clean = normalizeProgress(progress);
  try {
    (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false; // Continue the current run if browser storage is unavailable.
  }
}

// The active ship belongs to this run; maxUnlocked is the persistent record.
// A fresh run starts at ship 01, even when earlier ships were unlocked before.
// Boss N can replace only the current ship N, so an out-of-order boss cannot skip.
export function defeatBoss(progress, bossId, activeShipId) {
  const current = normalizeProgress(progress);
  const shipId = activeShipId ?? current.equipped;
  if (!Number.isInteger(bossId) || bossId < 1 || bossId > 10) {
    return { progress: current, changed: false, reason: 'invalid-boss' };
  }
  if (activeShipId === undefined && current.victory) {
    return { progress: current, changed: false, reason: 'already-victorious' };
  }
  if (bossId !== shipId) {
    return { progress: current, changed: false, reason: 'duplicate-or-out-of-order' };
  }
  if (bossId === 10) {
    return { progress: { ...current, victory: true }, changed: true,
      reason: 'final-victory', shipId: 10, newlyUnlocked: false };
  }
  const next = bossId + 1;
  const newlyUnlocked = next > current.maxUnlocked;
  const maxUnlocked = Math.max(current.maxUnlocked, next);
  return {
    progress: { version: 1, maxUnlocked, equipped: maxUnlocked, victory: current.victory },
    changed: true,
    reason: newlyUnlocked ? 'ship-unlocked' : 'ship-equipped',
    shipId: next,
    newlyUnlocked,
  };
}

// Base values must be read from the existing Ship 01 implementation. Bullet damage
// is per projectile; if every bullet hits, aggregate DPS scales by profile.dps.
export function resolveShipStats(id, base) {
  const profile = SHIPS[id - 1];
  if (!profile) throw new RangeError('Unknown ship');
  for (const key of ['maxHp', 'moveSpeed', 'bulletDamage', 'fireIntervalMs', 'baseVolleyCount']) {
    if (!(Number.isFinite(base[key]) && base[key] > 0)) throw new TypeError(`Invalid base ${key}`);
  }
  // Every hull starts with the existing two-shot volley. Spread loot is the
  // only way to add projectiles within a run.
  const gunCount = base.baseVolleyCount;
  const edgeAngle = Math.max(...profile.angles.map(Math.abs));
  return {
    maxHp: Math.round(base.maxHp * profile.hp),
    moveSpeed: base.moveSpeed * profile.speed,
    fireIntervalMs: Math.round(base.fireIntervalMs * profile.interval),
    gunCount,
    anglesDeg: gunCount === 2 && edgeAngle ? [-edgeAngle, edgeAngle] : Array(gunCount).fill(0),
    bulletDamage: base.bulletDamage * base.baseVolleyCount * profile.dps * profile.interval / gunCount,
    targetDpsMultiplier: profile.dps,
  };
}

export function preserveHealthRatio(currentHp, oldMaxHp, newMaxHp) {
  if (currentHp <= 0) return 0;
  return Math.min(newMaxHp, Math.max(1, Math.round(currentHp / oldMaxHp * newMaxHp)));
}

export function volleyPattern(stats, bonusShots = 0) {
  const angles = [...stats.anglesDeg];
  // Spread pickups append symmetric outer barrels, retaining each hull's
  // built-in angles and the existing pickup's benefit.
  if (bonusShots % 2) angles.push(0);
  for (let i = 0; i < Math.floor(bonusShots / 2); i++) {
    const angle = 12 + i * 4;
    angles.push(-angle, angle);
  }
  return angles.sort((left, right) => left - right);
}
