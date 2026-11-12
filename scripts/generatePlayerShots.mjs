import { mkdir, writeFile } from 'node:fs/promises';

// Vector projectiles are separate from loot art. All point up and fit 32 x 64.
const designs = [
  ['#21eaff', 'M16 1 25 20 23 50 16 63 9 50 7 20Z',
    '<path d="M16 5 20 21 19 51 16 59 13 51 12 21Z" fill="url(#core)"/>'],
  ['#4c9dff', 'M16 2 28 19 26 48 16 62 6 48 4 19Z',
    '<path d="M9 19 13 12v40l-4-7V19Zm14 0-4-7v40l4-7V19Z" fill="url(#core)"/><path d="M16 13v43" stroke="#fff" stroke-width="2"/>'],
  ['#58ffbf', 'M16 1 31 34 22 29 16 62 10 29 1 34Z',
    '<path d="M16 6 25 30 19 26 16 54 13 26 7 30Z" fill="url(#core)"/>'],
  ['#ffb456', 'M16 1 23 19 23 48 16 63 9 48 9 19Z',
    '<path d="M16 4 19 19v37l-3 5-3-5V19Z" fill="url(#core)"/><path d="M5 27h6m10 0h6M5 44h6m10 0h6" stroke="#fff0c7" stroke-width="2"/>'],
  ['#ff697e', 'M16 1 31 25 24 48 16 62 8 48 1 25Z',
    '<path d="M16 6 22 27 16 54 10 27Z" fill="url(#core)"/><path d="M4 25 11 32 8 45M28 25l-7 7 3 13" stroke="#fff" stroke-width="2"/>'],
  ['#b884ff', 'M16 2 25 16 29 36 16 62 3 36 7 16Z',
    '<circle cx="16" cy="30" r="10" fill="url(#core)"/><path d="M16 5v12M16 43v14M2 31h6m16 0h6" stroke="#f8e8ff" stroke-width="2"/>'],
  ['#f7e769', 'M16 1 23 27 20 50 16 63 12 50 9 27Z',
    '<path d="M16 4 19 29v25l-3 7-3-7V29Z" fill="url(#core)"/><path d="M3 35h10m6 0h10M6 45h7m6 0h7" stroke="#fffbd8" stroke-width="2"/>'],
  ['#9baeff', 'M16 1 29 25 21 49 16 63 11 49 3 25Z',
    '<path d="M16 8 23 27 16 55 9 27Z" fill="url(#core)" opacity=".8"/><path d="M3 25 16 40 29 25" stroke="#f8faff" stroke-width="2" opacity=".8"/>'],
  ['#ff77d7', 'M16 1 21 19 31 24 24 37 26 53 16 63 6 53 8 37 1 24 11 19Z',
    '<path d="M16 6 19 24 25 28 19 38 16 57 13 38 7 28 13 24Z" fill="url(#core)"/>'],
  ['#ffe6a0', 'M16 1 27 17 31 35 23 48 16 63 9 48 1 35 5 17Z',
    '<path d="M16 5 22 20 24 44 16 59 8 44 10 20Z" fill="url(#core)"/><path d="M4 31 16 42 28 31M8 17l8 8 8-8" stroke="#fff" stroke-width="2"/>'],
];

const directory = new URL('../public/assets/player-shots/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const [index, [color, silhouette, detail]] of designs.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="64" viewBox="0 0 32 64" fill="none">
  <defs><linearGradient id="core" x1="16" y1="2" x2="16" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset=".42" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".55"/></linearGradient></defs>
  <path d="${silhouette}" fill="${color}" opacity=".35" stroke="${color}" stroke-width="1.5"/>
  ${detail}
</svg>\n`;
  await writeFile(new URL(`player_shot_${String(index + 1).padStart(2, '0')}.svg`, directory), svg);
}
