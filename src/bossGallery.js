import { BOSS_CONFIGS } from './bossConfigs.js';

const gallery = document.querySelector('#gallery');
for (const boss of BOSS_CONFIGS) {
  const article = document.createElement('article');
  const art = document.createElement('div');
  art.className = 'art';
  const image = new Image();
  image.src = `/assets/bosses/${boss.image}`;
  image.alt = `Boss design ${String(boss.id).padStart(2, '0')}: ${boss.image}`;
  const status = document.createElement('small');
  status.textContent = 'Loading…';
  image.onload = () => { status.textContent = `${image.naturalWidth} × ${image.naturalHeight} • loaded`; };
  image.onerror = () => { status.textContent = 'Image failed to load'; status.className = 'failed'; };
  art.append(image);
  const meta = document.createElement('div');
  meta.className = 'meta';
  const title = document.createElement('h2');
  title.textContent = `${String(boss.id).padStart(2, '0')} — ${boss.name}`;
  const source = document.createElement('small');
  source.textContent = `Source: ${boss.image}`;
  meta.append(title, source, status);
  const link = document.createElement('a');
  link.href = `/?boss=${boss.id}`;
  link.textContent = 'Play this boss';
  meta.append(link);
  const phaseLink = document.createElement('a');
  phaseLink.href = `/?boss=${boss.id}&bossTest=1`;
  phaseLink.textContent = 'Phase test (K)';
  phaseLink.style.marginLeft = '14px';
  meta.append(phaseLink);
  article.append(art, meta);
  gallery.append(article);
}
