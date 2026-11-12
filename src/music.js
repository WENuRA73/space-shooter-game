export class MusicPlayer {
  constructor(tracks, createAudio = () => new Audio()) {
    this.tracks = tracks;
    this.index = 0;
    this.enabled = true;
    this.wantsPlayback = false;
    this.audio = createAudio();
    this.audio.volume = 0.32;
    this.audio.preload = 'auto';
    if (tracks.length) this.audio.src = tracks[0].url ?? tracks[0];
    this.audio.addEventListener('ended', () => this.next());
  }

  play() {
    this.wantsPlayback = true;
    if (!this.enabled || !this.tracks.length) return;
    const result = this.audio.play();
    if (result?.catch) result.catch(() => { /* A later user gesture can retry. */ });
  }

  pause() {
    this.wantsPlayback = false;
    this.audio.pause();
  }

  next() {
    if (!this.tracks.length) return;
    this.index = (this.index + 1) % this.tracks.length;
    this.audio.src = this.tracks[this.index].url ?? this.tracks[this.index];
    if (this.wantsPlayback && this.enabled) this.play();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && this.wantsPlayback) this.play();
    else this.audio.pause();
    return this.enabled;
  }
}
