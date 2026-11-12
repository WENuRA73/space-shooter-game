// Boss waves remain reserved for the existing ten-boss progression.
const opening = {
  1: ['fighter', 'fighter', 'fighter'],
  2: ['fighter', 'fighter', 'fighter', 'interceptor', 'interceptor'],
  3: ['fighter', 'fighter', 'bomber'],
  4: ['interceptor', 'interceptor', 'drone', 'drone', 'drone', 'drone'],
  6: ['tank', 'fighter', 'fighter', 'scout', 'scout'],
  7: ['ranger', 'ranger', 'drone', 'drone'],
  8: ['crusher', 'interceptor', 'interceptor'],
  9: ['phantom', 'phantom', 'tank'],
  11: ['specter', 'scout', 'scout', 'fighter', 'fighter']
};

export function getEnemyWave(wave) {
  if (wave % 5 === 0) return [];
  if (opening[wave]) return [...opening[wave]];
  const cycle = Math.floor((wave - 12) / 4);
  const variants = [
    ['fighter', 'interceptor', 'drone', 'scout', 'bomber'],
    ['tank', 'ranger', 'scout', 'drone', 'fighter'],
    ['crusher', 'phantom', 'interceptor', 'fighter'],
    ['specter', 'ranger', 'bomber', 'scout', 'drone']
  ];
  const roster = [...variants[(wave - 12) % variants.length]];
  if (cycle > 1) roster.push('fighter', 'interceptor');
  if (cycle > 4) roster.push('scout');
  return roster;
}
