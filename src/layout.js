export function getGameLayout(viewportWidth, viewportHeight) {
  const portrait = viewportWidth / viewportHeight < 0.85;
  return portrait
    ? { width: 500, height: Math.round(500 * viewportHeight / viewportWidth), portrait: true }
    : { width: 1280, height: 720, portrait: false };
}
