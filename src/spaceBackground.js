export const SPACE_TEXTURE_WIDTH = 1024;
export const SPACE_TEXTURE_HEIGHT = 4096;

export const SPACE_LAYERS = Object.freeze([
  { key: 'spaceStars', file: 'space_background_stars.png', depth: -300,
    pixelsPerSecond: 12, horizontalFactor: 0.015, alpha: 1 },
  { key: 'spaceNebula', file: 'space_background_nebula.png', depth: -290,
    pixelsPerSecond: 22, horizontalFactor: 0.035, alpha: 0.42 },
  { key: 'spaceDust', file: 'space_background_dust.png', depth: -280,
    pixelsPerSecond: 45, horizontalFactor: 0.07, alpha: 0.58 },
]);

export function backgroundTileScale(width) {
  return width / SPACE_TEXTURE_WIDTH;
}

export function backgroundOffsets(elapsedMs, playerX, width) {
  const playerOffsetX = playerX - width / 2;
  return SPACE_LAYERS.map(layer => ({
    x: -playerOffsetX * layer.horizontalFactor,
    y: -((elapsedMs / 1000 * layer.pixelsPerSecond) % SPACE_TEXTURE_HEIGHT),
  }));
}
