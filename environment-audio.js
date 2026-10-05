// Original, locally bundled environment recordings. The weapon bank is unchanged.
export const ENVIRONMENT_SOUNDS = Object.freeze([
  'concrete-1', 'concrete-2', 'metal-1', 'metal-2', 'dirt-1', 'dirt-2',
  'gravel-1', 'gravel-2', 'door-open', 'door-close', 'metal-impact',
  'crate-impact', 'equipment-impact', 'wind', 'rain', 'machinery'
]);
const root = new URL('./assets/environment-audio/', import.meta.url);
export class EnvironmentAudio {
  constructor(carrier, fetchFile = url => fetch(url)) {
    this.carrier = carrier; this.fetchFile = fetchFile; this.buffers = new Map();
    this.voices = new Set(); this.loops = new Map(); this.cursor = new Map(); this.failed = [];
  }
  preload() {
    this.downloads ??= Promise.allSettled(ENVIRONMENT_SOUNDS.map(async name => {
      const response = await this.fetchFile(new URL(name + '.wav', root));
      if (!response.ok) throw Error(name + ': HTTP ' + response.status);
      return [name, await response.arrayBuffer()];
    })).then(results => {
      this.failed = results.filter(r => r.status === 'rejected').map(r => String(r.reason));
      return results.filter(r => r.status === 'fulfilled').map(r => r.value);
    });
    return this.downloads;
  }
  async unlock() {
    await this.carrier.unlock();
    this.ready ??= this.preload().then(recordings => Promise.allSettled(recordings.map(async ([name, data]) => {
      this.buffers.set(name, await this.carrier.context.decodeAudioData(data.slice(0)));
    })));
    return this.ready;
  }
  stop(voice) {
    if (!voice || !this.voices.has(voice)) return;
    this.voices.delete(voice); try { voice.source.stop(); } catch {}
    voice.source.disconnect(); voice.gain.disconnect(); voice.pan.disconnect();
    if (this.loops.get(voice.name) === voice) this.loops.delete(voice.name);
  }
  stopAll() { for (const voice of [...this.voices]) this.stop(voice); }
  play(name, { gain = .25, pan = 0, distance = 0, loop = false } = {}) {
    const ctx = this.carrier.context, buffer = this.buffers.get(name);
    if (!buffer || !ctx || ctx.state !== 'running' || this.carrier.volume === 0) return null;
    if (loop && this.loops.has(name)) return this.loops.get(name);
    if (this.voices.size >= 8) {
      const oldest = [...this.voices].find(v => !v.loop);
      if (!oldest) return null; this.stop(oldest);
    }
    const source = ctx.createBufferSource(), level = ctx.createGain(), panner = ctx.createStereoPanner();
    source.buffer = buffer; source.loop = loop; level.gain.value = gain / (1 + Math.max(0, distance) * .15);
    panner.pan.value = Math.max(-1, Math.min(1, Number.isFinite(pan) ? pan : 0));
    source.connect(level); level.connect(panner); panner.connect(this.carrier.master);
    const voice = { name, source, gain: level, pan: panner, loop }; this.voices.add(voice);
    source.onended = () => this.stop(voice); source.start();
    if (loop) this.loops.set(name, voice); return voice;
  }
  footstep(surface, options = {}) {
    const key = ['concrete', 'metal', 'dirt', 'gravel'].includes(surface) ? surface : 'concrete';
    const cursor = this.cursor.get(key) || 0; this.cursor.set(key, cursor + 1);
    return this.play(key + '-' + (1 + cursor % 2), options);
  }
  sync(map, active) {
    if (!active || this.carrier.volume === 0) { this.stopAll(); return; }
    const wanted = map === 'ironwood' ? ['wind', 'rain'] : map === 'zero' || map === 'bastion' ? ['machinery'] : ['wind'];
    for (const [name, voice] of this.loops) if (!wanted.includes(name)) this.stop(voice);
    for (const name of wanted) this.play(name, { loop: true, gain: name === 'wind' ? .12 : .08 });
  }
}
