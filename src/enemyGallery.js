import { ENEMY_DEFINITIONS } from './enemyDefinitions.js';

if (!import.meta.env.DEV) {
  document.body.textContent = 'The enemy gallery is available only on the development server.';
} else {
  const select = document.querySelector('#ship');
  const image = document.querySelector('#art');
  const details = document.querySelector('#details');
  const tryLink = document.querySelector('#try');
  ENEMY_DEFINITIONS.forEach((def, index) => {
    const option = document.createElement('option');
    option.value = def.id;
    option.textContent = `${String(index + 1).padStart(2, '0')} ${def.name}`;
    select.append(option);
  });
  const show = () => {
    const def = ENEMY_DEFINITIONS.find(item => item.id === select.value);
    image.src = `/assets/enemies/${def.sprite}`;
    image.alt = `${def.name} current sprite cutout`;
    tryLink.href = `/?enemy=${encodeURIComponent(def.id)}`;
    details.replaceChildren();
    for (const [label, value] of Object.entries({
      'Health': def.hp, 'Speed': `${def.speed} px/s`, 'Contact damage': def.contactDamage,
      'Gun': def.gun, 'Bullet damage': def.bulletDamage,
      'Fire interval': `${def.fireInterval} ms`, 'Movement': def.movement, 'Score': def.score
    })) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = String(value);
      details.append(dt, dd);
    }
  };
  select.addEventListener('change', show);
  show();
}
