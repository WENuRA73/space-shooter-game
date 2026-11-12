// One player projectile can make one contact. The pooled body is disabled
// immediately so it cannot continue through another enemy or boss.
export function consumePlayerShot(shot, targetId) {
  if (!shot.active || shot.hitIds.has(targetId)) return false;
  shot.hitIds.add(targetId);
  shot.disableBody(true, true);
  return true;
}
