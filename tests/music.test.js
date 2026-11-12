import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicPlayer } from '../src/music.js';

function fakeAudio() {
  return {
    src: '', playCalls: 0, pauseCalls: 0, handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    play() { this.playCalls++; return Promise.resolve(); },
    pause() { this.pauseCalls++; }
  };
}

test('background tracks advance and loop', () => {
  const audio = fakeAudio();
  const music = new MusicPlayer([{ url: 'one.mp3' }, { url: 'two.mp3' }], () => audio);
  music.play();
  audio.handlers.ended();
  assert.equal(audio.src, 'two.mp3');
  audio.handlers.ended();
  assert.equal(audio.src, 'one.mp3');
  assert.equal(audio.playCalls, 3);
});

test('pause and mute prevent automatic playback', () => {
  const audio = fakeAudio();
  const music = new MusicPlayer([{ url: 'one.mp3' }, { url: 'two.mp3' }], () => audio);
  music.play();
  music.pause();
  audio.handlers.ended();
  assert.equal(audio.playCalls, 1);
  music.play();
  music.toggle();
  audio.handlers.ended();
  assert.equal(audio.playCalls, 2);
});
