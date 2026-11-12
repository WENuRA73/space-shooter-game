export const START_HEALTH = 3;
export const MAX_HEALTH = 6;
export const MAX_SHOTS = 5;
// 52.8% drop chance x 32/66 spread weight = 25.6% per defeated enemy.
// That is twice the original 40% x 32% = 12.8% spread chance.
// Each other item's per-enemy chance stays the same.
export const ENEMY_LOOT_DROP_PERCENT = 52.8;

const lootTable = [
  ['repair', 11], ['shield', 8], ['rapid', 8],
  ['spread', 32], ['heart', 7]
];
const lootWeightTotal = 66;

export function chooseLoot(roll) {
  let total = 0;
  for (const [kind, weight] of lootTable) {
    total += weight;
    if (roll * lootWeightTotal < total) return kind;
  }
  return lootTable.at(-1)[0];
}

export function getShotOffsets(count) {
  const safeCount = Math.max(1, Math.min(MAX_SHOTS, Math.floor(count)));
  return Array.from({ length: safeCount }, (_, index) => index - (safeCount - 1) / 2);
}

export function applyPickupState(state, kind, clock) {
  const next = { ...state };
  switch (kind) {
    case 'repair':
      next.lives = Math.min(next.maxLives, next.lives + 1);
      break;
    case 'shield':
      next.shieldUntil = clock + 8000;
      break;
    case 'rapid':
      next.rapidUntil = clock + 8000;
      break;
    case 'spread':
      next.shotCount = Math.min(MAX_SHOTS, next.shotCount + 1);
      break;
    case 'heart':
      next.maxLives = Math.min(MAX_HEALTH, next.maxLives + 1);
      next.lives = Math.min(next.maxLives, next.lives + 1);
      break;
    default:
      throw new RangeError(`Unknown pickup: ${kind}`);
  }
  return next;
}
