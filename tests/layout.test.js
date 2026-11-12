import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameLayout } from '../src/layout.js';

test('phone portrait and desktop use readable game dimensions', () => {
  assert.deepEqual(getGameLayout(390, 844), { width: 500, height: 1082, portrait: true });
  assert.deepEqual(getGameLayout(1440, 900), { width: 1280, height: 720, portrait: false });
  assert.deepEqual(getGameLayout(844, 390), { width: 1280, height: 720, portrait: false });
});
