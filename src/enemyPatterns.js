const radians = degrees => degrees * Math.PI / 180;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function steerToward(position, velocity, target, deltaMs, maxSpeed) {
  const dt = clamp(deltaMs / 1000, 0.001, 0.05);
  const response = 1 - Math.exp(-9 * dt);
  const axis = (error, current) => {
    if (Math.abs(error) < 0.4) return 0;
    const desired = clamp(error * 4, -maxSpeed, maxSpeed);
    const next = current + (desired - current) * response;
    return Math.sign(next) === Math.sign(error) && Math.abs(next * dt) >= Math.abs(error)
      ? error / dt : next;
  };
  return {
    x: axis(target.x - position.x, velocity.x),
    y: axis(target.y - position.y, velocity.y)
  };
}

export function enemyTarget(def, ageMs, originX, worldWidth, hudHeight = 62, seed = 0) {
  const t = ageMs / 1000;
  const lane = {
    drift: 205, zigzag: 230, bob: 165, formation: 250, dash: 220,
    patrol: 175, strafe: 140, lunge: 190, weave: 225, figureEight: 225
  }[def.movement];
  const safeY = Math.max(hudHeight + def.width / 2 + 12, lane);
  const arrival = (safeY + def.width / 2 + 10) / def.speed;
  const phase = Math.max(0, t - arrival);
  let x = originX;
  let y = Math.min(safeY, -def.width / 2 - 10 + t * def.speed);
  if (phase > 0) {
    switch (def.movement) {
      case 'drift': x += Math.sin(phase * 0.75 + seed) * 90; break;
      case 'zigzag': x += Math.sin(phase * Math.PI * 2 / 2.2 + seed) * 110; break;
      case 'bob': x += Math.sin(phase * 0.9 + seed) * 35; y += Math.sin(phase * 2) * 9; break;
      case 'formation': x += Math.sin(phase * 0.55) * Math.min(210, worldWidth * 0.22); break;
      case 'dash': {
        const stage = Math.floor(phase / 1.3);
        x += stage === 0 ? 0 : stage === 1 ? 140 : stage === 2 ? -130 : 60;
        break;
      }
      case 'patrol': x += Math.sin(phase * 0.7 + seed) * 65; break;
      case 'strafe': x += Math.sin(phase * 1.15 + seed) * 140; break;
      case 'lunge': {
        x += Math.sin(phase * 0.55) * 75;
        const cycle = phase % 7;
        if (cycle > 4 && cycle < 6.8) y += Math.sin((cycle - 4) / 2.8 * Math.PI) * 230;
        break;
      }
      case 'weave': x += Math.sin(phase * Math.PI * 2 / 2.5 + seed) * 170; y += Math.sin(phase * 1.1) * 25; break;
      case 'figureEight': {
        const laneStep = Math.floor(phase / 8);
        const laneBlend = clamp((phase % 8) / 0.6, 0, 1);
        const laneOffset = step => [0, -90, 90, 0][((step % 4) + 4) % 4];
        const shift = laneOffset(laneStep - 1) * (1 - laneBlend) + laneOffset(laneStep) * laneBlend;
        x += Math.sin(phase * 1.1 + seed) * 230 + shift;
        y += Math.sin(phase * 2.2 + seed) * 75;
        break;
      }
    }
  }
  if (ageMs > def.lifetime) y -= (ageMs - def.lifetime) / 1000 * def.speed;
  const margin = def.width / 2 + 8;
  return { x: clamp(x, margin, worldWidth - margin), y };
}

export function shotEvents(def, eventIndex) {
  const shot = (angle = 0, x = 0, delay = 0, aimed = false) => ({
    angle: radians(angle), x, delay, aimed, damage: def.bulletDamage, speed: def.bulletSpeed
  });
  switch (def.gun) {
    case 'straight': return [shot()];
    case 'parallel': return [shot(0, -18), shot(0, 18)];
    case 'fan3': return [-18, 0, 18].map(angle => shot(angle, 0, 0, true));
    case 'needle': return eventIndex % 3 === 2 ? [shot(0, -12), shot(0, 12)] : [shot()];
    case 'aimed': return [shot(0, 0, 0, true)];
    case 'heavyPair': return [shot(0, -32), shot(0, 32)];
    case 'rail': return [shot(0, 0, 0, true)];
    case 'barrage': return [0, 220, 440].flatMap(delay => [-15, 0, 15].map(angle => shot(angle, 0, delay, true)));
    case 'fan5': return [-24, -12, 0, 12, 24].map(angle => shot(angle, 0, 0, true));
    case 'alternating': return eventIndex % 2 === 0
      ? [-30, -15, 0, 15, 30].map(angle => shot(angle, 0, 0, true))
      : [0, 300, 600].map(delay => shot(0, 0, delay, true));
    default: throw new RangeError(`Unknown enemy gun: ${def.gun}`);
  }
}

export function projectileVelocity(shot, muzzle, player) {
  const direction = shot.aimed
    ? Math.atan2(player.y - muzzle.y, player.x - muzzle.x) - Math.PI / 2
    : 0;
  const angle = direction + shot.angle;
  return { x: -Math.sin(angle) * shot.speed, y: Math.cos(angle) * shot.speed };
}
