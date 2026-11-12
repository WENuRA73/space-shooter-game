import { bossForWave } from './bossConfigs.js';

const profiles = {
  scout: {
    texture: 'scoutShot', angles: [0], aimed: true,
    baseSpeed: 230, baseCadence: 2700, minCadence: 1900
  },
  striker: {
    texture: 'strikerShot', angles: [-0.18, 0.18], aimed: true,
    baseSpeed: 305, baseCadence: 2150, minCadence: 1500
  },
  tank: {
    texture: 'tankShot', angles: [-0.38, 0, 0.38], aimed: false,
    baseSpeed: 190, baseCadence: 3200, minCadence: 2300
  }
};

export function getEnemyFireProfile(kind, wave) {
  if (kind === 'boss') {
    const boss = bossForWave(wave);
    if (!boss) throw new RangeError(`Wave ${wave} is not a boss wave`);
    const primary = boss.attacks[0];
    return {
      texture: 'bossShot1',
      angles: Array.from({ length: primary.count }, (_, index) =>
        (index - (primary.count - 1) / 2) * (primary.id === 'twin' ? 0 : 0.25)),
      aimed: primary.id !== 'twin', speed: primary.projectileSpeed,
      cadence: primary.intervalMs
    };
  }
  const profile = profiles[kind];
  if (!profile) throw new RangeError(`Unknown enemy kind: ${kind}`);
  const level = Math.max(1, Math.floor(wave));
  return {
    texture: profile.texture,
    angles: profile.angles,
    aimed: profile.aimed,
    speed: profile.baseSpeed + Math.min(level, 12) * 5,
    cadence: Math.max(profile.minCadence, profile.baseCadence - level * 30)
  };
}
