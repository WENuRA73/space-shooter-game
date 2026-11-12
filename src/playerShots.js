// Each unlocked hull owns one projectile type. Damage and cadence still come
// from shipProgression so the documented player balance remains authoritative.
export const PLAYER_SHOTS = Object.freeze([
  { ship: 1, key: 'playerShot01', file: 'player_shot_01.svg', name: 'BEAM' },
  { ship: 2, key: 'playerShot02', file: 'player_shot_02.svg', name: 'ION' },
  { ship: 3, key: 'playerShot03', file: 'player_shot_03.svg', name: 'ARROW' },
  { ship: 4, key: 'playerShot04', file: 'player_shot_04.svg', name: 'LANCE' },
  { ship: 5, key: 'playerShot05', file: 'player_shot_05.svg', name: 'TALON' },
  { ship: 6, key: 'playerShot06', file: 'player_shot_06.svg', name: 'PULSE' },
  { ship: 7, key: 'playerShot07', file: 'player_shot_07.svg', name: 'SPEAR' },
  { ship: 8, key: 'playerShot08', file: 'player_shot_08.svg', name: 'GHOST' },
  { ship: 9, key: 'playerShot09', file: 'player_shot_09.svg', name: 'NOVA' },
  { ship: 10, key: 'playerShot10', file: 'player_shot_10.svg', name: 'APEX' },
]);

export const PLAYER_SHOT_SPEED = 750;
export const PLAYER_SHOT_INTERVAL = 160;

export function shotForShip(id) {
  const shot = PLAYER_SHOTS[id - 1];
  if (!shot || shot.ship !== id) throw new RangeError('Unknown player ship projectile');
  return shot;
}
