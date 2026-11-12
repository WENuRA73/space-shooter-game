import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SPACE_LAYERS, SPACE_TEXTURE_HEIGHT, backgroundTileScale,
  backgroundOffsets } from '../src/spaceBackground.js';

test('the three supplied layers are separate 1024 x 4096 RGBA textures', async () => {
  assert.deepEqual(SPACE_LAYERS.map(layer => layer.pixelsPerSecond), [12, 22, 45]);
  for (const layer of SPACE_LAYERS) {
    const bytes = await readFile(new URL(`../public/assets/backgrounds/${layer.file}`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), 1024);
    assert.equal(bytes.readUInt32BE(20), 4096);
    assert.equal(bytes[25], 6); // PNG RGBA, including transparent overlay pixels.
  }
});

test('depth speeds differ, horizontal motion is subtle, and offsets repeat', () => {
  assert.deepEqual(backgroundOffsets(1000, 640, 1280).map(p => p.y), [-12, -22, -45]);
  backgroundOffsets(1000, 840, 1280).forEach((point, index) => {
    assert.ok(Math.abs(point.x - [-3, -7, -14][index]) < 0.000001);
  });
  for (const layer of SPACE_LAYERS) {
    const index = SPACE_LAYERS.indexOf(layer);
    const elapsed = SPACE_TEXTURE_HEIGHT / layer.pixelsPerSecond * 1000;
    const y = backgroundOffsets(elapsed, 640, 1280)[index].y;
    assert.ok(Math.min(Math.abs(y), Math.abs(y + SPACE_TEXTURE_HEIGHT)) < 0.001);
  }
  assert.deepEqual(backgroundOffsets(1000, 640, 1280), backgroundOffsets(1000, 640, 1280));
  assert.equal(backgroundTileScale(1280), 1.25);
  assert.equal(backgroundTileScale(500), 500 / 1024);
});
