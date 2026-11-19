// Sound, all synthesized with WebAudio — no audio files, no network. Engine
// hum, sirens, gunshots, UI pings, and three procedural radio stations.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.station = 0;
    this.stations = [
      { name: 'RADIO VELA 88.4', tracks: ['Sunset Drive', 'Palmera Nights', 'Golden Hour'] },
      { name: 'NEON FM 101.1', tracks: ['Midnight Mile', 'Chrome Hearts', 'Tiburon Blues'] },
      { name: 'BAY TALK 540 AM', tracks: ['The Ledger Report', 'Traffic & Tide', 'Mama Luz Hour'] },
    ];
    this.trackIndex = 0;
    this.radioTimer = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.nextNote = 0;
    this.noteTimer = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startRadio();
    this.startEngine();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
  stationName() { return this.stations[this.station].name; }
  trackName() { return this.stations[this.station].tracks[this.trackIndex]; }
  nextStation() {
    this.station = (this.station + 1) % this.stations.length;
    this.trackIndex = 0;
    this.click();
  }

  blip(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  click() { this.blip(880, 0.07, 'square', 0.08); }
  missionPing() { this.blip(660, 0.12, 'sine', 0.16); setTimeout(() => this.blip(990, 0.18, 'sine', 0.16), 130); }
  stepDone() { this.blip(523, 0.1, 'sine', 0.16); setTimeout(() => this.blip(784, 0.22, 'sine', 0.16), 110); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.2), i * 130));
  }
  reload() { this.blip(300, 0.08, 'square', 0.1); setTimeout(() => this.blip(420, 0.08, 'square', 0.1), 350); }

  noiseBurst(dur, vol, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start();
  }
  gunshot() { this.noiseBurst(0.14, 0.5, 2400); this.blip(120, 0.1, 'square', 0.25); }
  distantShot() { this.noiseBurst(0.1, 0.1, 900); }
  enemyShot() { this.noiseBurst(0.08, 0.12, 1100); }
  crash() { this.noiseBurst(0.3, 0.4, 500); }

  startEngine() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420;
    this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: two-tone, only audible while wanted.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  updateEngine(speedKmh, wanted, dt) {
    if (!this.ctx) return;
    const target = speedKmh > 1 ? 0.028 + Math.min(0.06, speedKmh / 2400) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(48 + speedKmh * 1.15, this.ctx.currentTime, 0.08);
    const sirenTarget = wanted > 0 ? 0.028 : 0;
    this.sirenGain.gain.setTargetAtTime(sirenTarget, this.ctx.currentTime, 0.3);
    if (wanted > 0) {
      this.sirenOsc.frequency.setTargetAtTime(660 + (Math.sin(this.ctx.currentTime * 4) > 0 ? 220 : 0), this.ctx.currentTime, 0.05);
    }
    void dt;
  }

  // Procedural radio: a slow chord pad + a bass line, switching track names
  // every 40 seconds. Deliberately mellow — it is a sunset, after all.
  startRadio() {
    if (!this.ctx || this.noteTimer) return;
    const chords = [
      [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7], [146.8, 220.0, 293.7],
    ];
    let ci = 0;
    const playChord = () => {
      if (this.muted) return;
      const chord = chords[ci % chords.length];
      ci += 1;
      for (const f of chord) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle'; o.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 0.6);
        g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 3.4);
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + 3.6);
      }
      // Bass note on the root.
      const b = this.ctx.createOscillator();
      b.type = 'sine'; b.frequency.value = chord[0] / 2;
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.07, this.ctx.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.2);
      b.connect(bg); bg.connect(this.master);
      b.start(); b.stop(this.ctx.currentTime + 3.4);
    };
    playChord();
    this.noteTimer = setInterval(() => {
      playChord();
      if (Math.random() < 0.12) this.trackIndex = (this.trackIndex + 1) % 3;
    }, 3200);
  }
}
