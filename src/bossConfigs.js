// Numbered artwork is kept separate from gameplay names because the supplied ZIP
// uses different names for designs 02–09 than the combat specification.
const art = [
  '01_iron_warden.png', '02_ember_tyrant.png', '03_storm_harbinger.png',
  '04_venom_sovereign.png', '05_abyss_reaver.png', '06_glacier_colossus.png',
  '07_solar_dominion.png', '08_void_phantom.png', '09_nova_devourer.png',
  '10_celestial_annihilator.png'
];

const rows = [
  ['Iron Warden', 1500, 65, 20, 2000, 0xff9b3b, 'patrol', [0.5],
    [['twin', 1500, 10, 230, 2], ['fan', 5000, 8, 230, 3]]],
  ['Crimson Viper', 2200, 125, 24, 3000, 0xff425f, 'sine', [0.6],
    [['fan', 1900, 11, 275, 3], ['dart', 6000, 8, 300, 5]]],
  ['Thunder Reaper', 3000, 90, 28, 4200, 0x64caff, 'step', [0.65, 0.3],
    [['twin', 1700, 13, 270, 2], ['grid', 7000, 15, 270, 5]]],
  ['Void Hunter', 4000, 145, 30, 5800, 0xaf66ff, 'teleport', [0.6, 0.25],
    [['fan', 2100, 12, 290, 4], ['pulse', 5500, 22, 250, 1]]],
  ['Inferno Titan', 5500, 55, 35, 7500, 0xff7439, 'patrol', [0.7, 0.3],
    [['fan', 2500, 14, 230, 5], ['orb', 6000, 18, 165, 3]]],
  ['Frost Leviathan', 7000, 70, 38, 9500, 0x90e7ff, 'figure8', [0.65, 0.25],
    [['fan', 2000, 16, 260, 3], ['shards', 6500, 11, 180, 6]]],
  ['Plasma Overlord', 9000, 110, 42, 12000, 0xb77aff, 'wide', [0.7, 0.3],
    [['fan', 2100, 17, 300, 4], ['beam', 8000, 25, 0, 1]]],
  ['Shadow Devourer', 12000, 140, 45, 15500, 0x9a5cff, 'waypoint', [0.7, 0.3],
    [['arc', 2400, 18, 270, 7], ['mine', 7000, 24, 0, 3]]],
  ['Omega Destroyer', 16000, 60, 50, 20000, 0xff6478, 'patrol', [0.75, 0.4, 0.15],
    [['fan', 2800, 20, 240, 6], ['missile', 8000, 30, 220, 3]]],
  ['Celestial Annihilator', 22000, 125, 60, 35000, 0xffd872, 'figure8wide', [0.75, 0.5, 0.25],
    [['sector', 3000, 20, 300, 9], ['beam', 10000, 35, 0, 2], ['orb', 9000, 24, 190, 4]]]
];

export const BOSS_CONFIGS = rows.map((row, index) => {
  const [name, maxHp, speed, contactDamage, score, color, movement, phaseThresholds, attacks] = row;
  return Object.freeze({
    id: index + 1, name, texture: `bossShip${index + 1}`, image: art[index],
    maxHp, speed, contactDamage, score, color, movement, phaseThresholds,
    attacks: attacks.map(([id, intervalMs, damage, projectileSpeed, count]) =>
      Object.freeze({ id, intervalMs, damage, projectileSpeed, count }))
  });
});

export const bossForWave = wave =>
  Number.isInteger(wave) && wave >= 5 && wave <= 50 && wave % 5 === 0
    ? BOSS_CONFIGS[wave / 5 - 1] : null;

export function phaseForHp(config, hp) {
  const ratio = Math.max(0, hp) / config.maxHp;
  return config.phaseThresholds.filter(threshold => ratio <= threshold).length + 1;
}

export function fitBossSprite(sourceWidth, sourceHeight, maxWidth = 310, maxHeight = 230) {
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return { width: sourceWidth * scale, height: sourceHeight * scale };
}
