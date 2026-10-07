/* Second-act soundscape. Owns no AudioContext; pause/mute follow Soundtrack. */
(() => {
  'use strict';
  const base = document.currentScript?.src || location.href;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const random = (a, b) => a + Math.random() * (b - a);
  const files = { bell: 'bell.mp3', door: 'door.mp3' };

  class CitySoundscape {
    constructor(soundtrack) {
      this.soundtrack = soundtrack;
      this.active = false;
      this.epoch = 0;
      this.sources = new Set();
      this.buffers = {};
      this.pending = new Map();
      this.failed = [];
      this.files = Object.fromEntries(Object.entries(files).map(([name, file]) => [name,
        fetch(window.COPENHAGEN_ASSETS?.[file] || new URL(`assets/${file}`, base)).then(r => {
          if (!r.ok) throw new Error(`Audio unavailable: ${file}`);
          return r.arrayBuffer();
        }).catch(() => { this.failed.push(name); return null; })
      ]));
    }

    start() {
      if (this.active) return this.ready;
      const c = this.soundtrack.context;
      if (!c || !this.soundtrack.master) return Promise.resolve(false);
      this.context = c;
      this.active = true;
      this.fadedOut = false;
      this.epoch++;
      this.pending.clear();
      this.once = new Set();
      this.x = 450;
      this.age = 0;
      this.trainTimer = 23;
      this.leafTimer = 3.7;
      this.metalTimer = 11;
      this.ambience = c.createGain();
      this.ambience.gain.setValueAtTime(0, c.currentTime);
      this.ambience.gain.linearRampToValueAtTime(1, c.currentTime + 2);
      this.ambience.connect(this.soundtrack.master);
      // The supplied doorbell remains audible after the ambience fades to black.
      this.bellBus = c.createGain();
      this.bellBus.connect(this.soundtrack.master);
      if (!this.noise || this.noise.sampleRate !== c.sampleRate) {
        this.noise = c.createBuffer(1, Math.ceil(c.sampleRate * 4), c.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      this.wind = this._loop('lowpass', 680, .09, this.ambience);
      this.factory = this._loop('lowpass', 145, 0, this.ambience);
      const epoch = this.epoch;
      this.ready = Promise.all(Object.keys(files).map(async name => {
        if (this.buffers[name]) return;
        const data = await this.files[name];
        if (!data) return;
        try { this.buffers[name] = await c.decodeAudioData(data.slice(0)); }
        catch { if (!this.failed.includes(name)) this.failed.push(name); }
        const pending = this.pending.get(name);
        if (pending && this.active && epoch === this.epoch && c.currentTime <= pending.deadline) {
          this.pending.delete(name);
          this._event(name, pending.pan);
        }
      })).then(() => this.active && this.epoch === epoch);
      return this.ready;
    }

    _track(source, nodes = []) {
      this.sources.add(source);
      this.soundtrack.track(source, nodes);
      const cleanup = source.onended;
      source.onended = () => {
        this.sources.delete(source);
        cleanup?.call(source);
      };
      return source;
    }

    _loop(type, frequency, level, target) {
      const c = this.context, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
      source.buffer = this.noise;
      source.loop = true;
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = .6;
      gain.gain.value = level;
      source.connect(filter).connect(gain).connect(target);
      this._track(source, [filter, gain]);
      source.start(c.currentTime, random(0, 3));
      return gain;
    }

    _sample(buffer, options = {}) {
      if (!buffer || !this.active) return null;
      const c = this.context, source = c.createBufferSource(), gain = c.createGain(), panner = c.createStereoPanner();
      const { pan = 0, level = .1, delay = 0, offset = 0, duration = buffer.duration - offset,
        frequency = 6000, rate = 1, target = this.ambience, moving = false, attack = .015 } = options;
      const t = c.currentTime + delay, length = Math.min(duration, buffer.duration - offset) / rate;
      if (length <= 0) return null;
      source.buffer = buffer;
      source.playbackRate.value = rate;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + Math.min(attack, length / 3));
      gain.gain.setValueAtTime(level, t + Math.max(length * .6, length - .18));
      gain.gain.linearRampToValueAtTime(0, t + length);
      panner.pan.setValueAtTime(clamp(pan, -1, 1), t);
      if (moving) panner.pan.linearRampToValueAtTime(-clamp(pan || -.85, -1, 1), t + length);
      source.connect(filter).connect(gain).connect(panner).connect(target);
      this._track(source, [filter, gain, panner]);
      source.start(t, offset, length * rate);
      return source;
    }

    _tone(frequency, duration, level, pan = 0, delay = 0, type = 'sine') {
      if (!this.active) return;
      const c = this.context, t = c.currentTime + delay, source = c.createOscillator(), gain = c.createGain(), panner = c.createStereoPanner();
      source.type = type;
      source.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + .006);
      gain.gain.exponentialRampToValueAtTime(.00001, t + duration);
      panner.pan.value = clamp(pan, -1, 1);
      source.connect(gain).connect(panner).connect(this.ambience);
      this._track(source, [gain, panner]);
      source.start(t);
      source.stop(t + duration + .015);
    }

    _noise(duration, level, pan, frequency, delay = 0, moving = false) {
      return this._sample(this.noise, { duration, level, pan, frequency, delay, moving,
        offset: random(0, Math.max(0, 4 - duration)), attack: Math.min(.2, duration * .18) });
    }

    update(dt, { x = this.x, zone = '', events } = {}) {
      if (!this.active || this.fadedOut || this.context.state !== 'running') return;
      dt = clamp(Number(dt) || 0, 0, .2);
      x = Number.isFinite(x) ? x : this.x;
      this.age += dt;
      this.x = x;
      const t = this.context.currentTime;
      const garden = zone === 'garden' || (x > 6300 && x < 8000);
      const industrial = zone === 'industrial' || (x >= 4300 && x <= 6300);
      this.wind.gain.setTargetAtTime((garden ? .16 : .095) * (1 + .13 * Math.sin(this.age * .47)), t, 1);
      this.factory.gain.setTargetAtTime(industrial ? .055 : 0, t, 1.6);

      this.trainTimer -= dt;
      if (this.trainTimer <= 0 && x < 6600) {
        const buffer = this.soundtrack.buffers?.train;
        if (buffer) this._sample(buffer, { level: x < 2200 ? .045 : .028, pan: -.8,
          offset: Math.min(2, buffer.duration / 4), duration: Math.min(7, buffer.duration - 2), frequency: 650, attack: 1.3 });
        else { this._tone(155, 3.8, .014, -.75); this._tone(207, 3.4, .008, -.75); }
        this.trainTimer = random(29, 43);
      }
      this.leafTimer -= dt;
      if (this.leafTimer <= 0) {
        this._noise(random(.7, 1.7), garden ? .035 : .015, random(-.85, .85), 3200);
        this.leafTimer = random(garden ? 3.5 : 7, garden ? 7 : 13);
      }
      this.metalTimer -= dt;
      if (industrial && this.metalTimer <= 0) {
        this._tone(472, 1.2, .006, .7);
        this._tone(733, .5, .004, .7, .06);
        this.metalTimer = random(14, 23);
      }
      if (x > 2840 && x < 3600 && !this.once.has('clock')) this.trigger('clock', -.6);
      if (Array.isArray(events)) for (const e of events) this.trigger(typeof e === 'string' ? e : e.name, e.pan || 0);
      else if (events && typeof events === 'object') for (const [name, value] of Object.entries(events)) {
        if (value) this.trigger(name, typeof value === 'number' ? value : value.pan || 0);
      }
      for (const [name, pending] of this.pending) if (t > pending.deadline) this.pending.delete(name);
    }

    trigger(name, pan = 0) {
      if (!this.active || (this.fadedOut && name !== 'bell')) return false;
      if (['bell', 'door', 'clock'].includes(name)) {
        if (this.once.has(name)) return false;
        this.once.add(name);
      }
      if ((name === 'bell' || name === 'door') && !this.buffers[name]) {
        // Decode may finish just after a fast interaction, never replay an old event later.
        this.pending.set(name, { pan, deadline: this.context.currentTime + .6 });
        return false;
      }
      return this._event(name, pan);
    }

    _event(name, pan) {
      if (!this.active) return false;
      if (name === 'bell') {
        this._sample(this.buffers.bell, { offset: 1.5, duration: 2.3, level: 1.5,
          frequency: 14000, pan: 0, target: this.bellBus, attack: .004 });
      } else if (this.fadedOut) return false;
      else if (name === 'door') {
        // The user supplied an opening-door recording: use its short mechanical tail,
        // supplemented with a soft closing thud and a separate lock click.
        this._sample(this.buffers.door, { offset: 5.3, duration: 1.24, level: 2.6, frequency: 3700, pan });
        this._tone(82, .18, .055, pan, 1.22);
        this._noise(.055, .065, pan, 2600, 1.30);
        this._tone(1400, .045, .01, pan, 1.33);
      } else if (name === 'clock') {
        for (const delay of [0, 3.1]) for (const [frequency, level, length] of [[146.8, .025, 4.5], [293.6, .012, 3.2], [435, .008, 2.3], [627, .004, 1.7]]) {
          this._tone(frequency, length, level, pan, delay);
        }
      } else if (name === 'leaves') this._noise(1.2, .045, pan, 3600);
      else if (name === 'cafe') this._noise(.04, .025, pan, 1300);
      else return false;
      return true;
    }

    fadeOut(seconds = 1.5) {
      if (!this.active || this.fadedOut) return;
      this.fadedOut = true;
      this.pending.delete('door');
      const t = this.context.currentTime, gain = this.ambience.gain;
      const current = gain.value;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(current, t);
      gain.linearRampToValueAtTime(0, t + Math.max(.02, seconds));
    }

    stop() {
      this.active = false;
      this.epoch++;
      this.pending.clear();
      for (const source of this.sources) { try { source.stop(); } catch {} }
      this.sources.clear();
      for (const bus of [this.ambience, this.bellBus]) {
        if (bus) { bus.gain.cancelScheduledValues(this.context.currentTime); bus.disconnect(); }
      }
      this.wind = this.factory = null;
      this.ambience = this.bellBus = null;
    }
  }
  window.CitySoundscape = CitySoundscape;
})();
