// Values follow references/space_shooter_enemy_ships_codex_spec.md.
// Ship sprites remain opt-in until clean transparent assets are supplied.
export const ENEMY_DEFINITIONS = Object.freeze([
  { id: 'fighter', name: 'Fighter', sprite: 'enemy_01_fighter.png', unlock: 1, hp: 40, speed: 95, width: 62, contactDamage: 12, score: 100, gun: 'straight', bulletDamage: 8, fireInterval: 1800, bulletSpeed: 260, firstShot: 1000, movement: 'drift', lifetime: 12000, color: 0xff5268 },
  { id: 'interceptor', name: 'Interceptor', sprite: 'enemy_02_interceptor.png', unlock: 2, hp: 55, speed: 175, width: 66, contactDamage: 14, score: 150, gun: 'parallel', bulletDamage: 10, fireInterval: 1650, bulletSpeed: 320, firstShot: 1100, movement: 'zigzag', lifetime: 11000, color: 0xaf6bff },
  { id: 'bomber', name: 'Bomber', sprite: 'enemy_03_bomber.png', unlock: 3, hp: 110, speed: 70, width: 88, contactDamage: 22, score: 240, gun: 'fan3', bulletDamage: 18, fireInterval: 2600, bulletSpeed: 185, warning: 500, firstShot: 1700, movement: 'bob', lifetime: 14000, color: 0x53b8ff },
  { id: 'drone', name: 'Drone', sprite: 'enemy_04_drone.png', unlock: 4, hp: 45, speed: 150, width: 54, contactDamage: 10, score: 130, gun: 'needle', bulletDamage: 9, fireInterval: 1000, bulletSpeed: 350, firstShot: 900, movement: 'formation', lifetime: 10000, color: 0xff5268 },
  { id: 'scout', name: 'Scout', sprite: 'enemy_05_scout.png', unlock: 5, hp: 35, speed: 230, width: 52, contactDamage: 12, score: 180, gun: 'aimed', bulletDamage: 12, fireInterval: 2000, bulletSpeed: 400, warning: 350, firstShot: 1400, movement: 'dash', lifetime: 10500, color: 0x66ff85 },
  { id: 'tank', name: 'Tank', sprite: 'enemy_06_tank.png', unlock: 6, hp: 250, speed: 55, width: 105, contactDamage: 32, score: 420, gun: 'heavyPair', bulletDamage: 14, fireInterval: 1700, bulletSpeed: 230, firstShot: 1500, movement: 'patrol', lifetime: 16000, color: 0xffa74d },
  { id: 'ranger', name: 'Ranger', sprite: 'enemy_07_ranger.png', unlock: 7, hp: 130, speed: 115, width: 78, contactDamage: 18, score: 330, gun: 'rail', bulletDamage: 16, fireInterval: 2400, bulletSpeed: 510, warning: 600, firstShot: 1800, movement: 'strafe', lifetime: 14000, color: 0xffcb4e },
  { id: 'crusher', name: 'Crusher', sprite: 'enemy_08_crusher.png', unlock: 8, hp: 300, speed: 85, width: 108, contactDamage: 36, score: 520, gun: 'barrage', bulletDamage: 22, fireInterval: 2800, bulletSpeed: 270, warning: 600, firstShot: 1900, movement: 'lunge', lifetime: 16000, color: 0xff3e4a },
  { id: 'phantom', name: 'Phantom', sprite: 'enemy_09_phantom.png', unlock: 9, hp: 160, speed: 195, width: 82, contactDamage: 20, score: 450, gun: 'fan5', bulletDamage: 18, fireInterval: 1900, bulletSpeed: 345, firstShot: 1300, movement: 'weave', lifetime: 12500, color: 0xb265ff },
  { id: 'specter', name: 'Specter', sprite: 'enemy_10_specter.png', unlock: 10, hp: 220, speed: 180, width: 94, contactDamage: 28, score: 650, gun: 'alternating', bulletDamage: 24, fireInterval: 3000, bulletSpeed: 380, warning: 550, firstShot: 1700, movement: 'figureEight', lifetime: 16000, color: 0x52ddff }
]);

export const ENEMY_BY_ID = Object.freeze(Object.fromEntries(ENEMY_DEFINITIONS.map(def => [def.id, def])));

export function enemyHp(def, wave) {
  return Math.round(def.hp * (1 + Math.min(0.25, Math.max(0, wave - def.unlock) * 0.015)));
}

export function enemyCadence(def, wave) {
  return Math.round(def.fireInterval * (1 - Math.min(0.15, Math.max(0, wave - def.unlock) * 0.01)));
}

export function eligibleEnemies(wave) {
  return ENEMY_DEFINITIONS.filter(def => def.unlock <= wave);
}
