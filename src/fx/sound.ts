/**
 * src/fx/sound.ts
 *
 * Every sound is synthesised with the Web Audio API; no audio files ship.
 * Laptop and phone speakers reproduce almost nothing below ~150 Hz, so every
 * sound carries its weight in the 150 Hz - 4 kHz band, and everything runs
 * through a small saturated room reverb so it sounds physical, not plastic.
 *
 * - First touch: the degauss "bwoong" of a cathode-ray set coming on.
 * - Page change: a burst of TV snow, band-limited like a set's own speaker.
 * - Remote: a dull relay "chunk" per button.
 * - Page 666: a detuned drone that breathes, a dissonant broadcast tone when
 *   the picture slips, and a hard cut to silence during a hijack frame.
 *   The scripted sequence's own sounds live in horror-sound.ts.
 * Browsers only allow audio after a user gesture, so nothing plays before
 * the first key or tap. The Sound key on the remote mutes it; the choice is
 * remembered in localStorage when storage is available.
 */

import { onCue } from './cues.ts';

const STORAGE_KEY = 'page100.sound';
const MASTER_GAIN = 0.8;
const REVERB_SECONDS = 2.4;
const REVERB_SEND = 0.35;
const DRONE_GAIN = 0.16;
const HIJACK_FLASH_SECONDS = 0.14;
const HIJACK_MESSAGE_SECONDS = 1.7;

export interface Bus {
  readonly ctx: AudioContext;
  /** Dry input: saturation, then the speakers and the reverb send. */
  readonly input: GainNode;
  readonly master: GainNode;
  readonly noise: AudioBuffer;
}

let bus: Bus | null = null;
let drone: { stop: () => void; swell: () => void; choke: (seconds: number) => void } | null = null;
let enabled = readPreference();

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function writePreference(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked (private mode): the choice lasts for this visit only.
  }
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A decaying stereo noise tail: a cheap, convincing small room. */
function roomImpulse(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.ceil(ctx.sampleRate * REVERB_SECONDS);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
    }
  }
  return impulse;
}

/** Soft tube-like saturation curve. */
function saturationCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function createBus(): Bus | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Ctor === undefined) return null;
  const ctx = new Ctor();

  const master = ctx.createGain();
  master.gain.value = enabled ? MASTER_GAIN : 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 8;
  master.connect(limiter).connect(ctx.destination);

  const input = ctx.createGain();
  const drive = ctx.createWaveShaper();
  drive.curve = saturationCurve(2.2);
  drive.oversample = '2x';
  input.connect(drive);
  drive.connect(master);

  const send = ctx.createGain();
  send.gain.value = REVERB_SEND;
  const reverb = ctx.createConvolver();
  reverb.buffer = roomImpulse(ctx);
  drive.connect(send).connect(reverb).connect(master);

  return { ctx, input, master, noise: noiseBuffer(ctx, 2) };
}

export function envelope(param: AudioParam, at: number, peak: number, attack: number, release: number): void {
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + release);
}

export function noiseSource(b: Bus, offset = Math.random()): AudioBufferSourceNode {
  const source = b.ctx.createBufferSource();
  source.buffer = b.noise;
  source.loop = true;
  source.loopStart = offset;
  return source;
}

/**
 * The degauss coil: mains buzz rich in harmonics, ringing through the metal
 * shadow mask, dying away over a second with a wobble.
 */
function degauss(b: Bus): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  envelope(out.gain, now, 0.9, 0.015, 1.3);
  out.connect(b.input);

  const buzz = ctx.createOscillator();
  buzz.type = 'sawtooth';
  buzz.frequency.setValueAtTime(100, now);
  buzz.frequency.exponentialRampToValueAtTime(96, now + 1.3);
  const wobble = ctx.createOscillator();
  wobble.frequency.value = 7;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = 3;
  wobble.connect(wobbleDepth).connect(buzz.frequency);

  // Metallic body: resonances in the band small speakers can play.
  [220, 470, 790, 1320].forEach((frequency, index) => {
    const ring = ctx.createBiquadFilter();
    ring.type = 'bandpass';
    ring.frequency.value = frequency;
    ring.Q.value = 9;
    const level = ctx.createGain();
    level.gain.value = 1.4 / (index + 1);
    buzz.connect(ring).connect(level).connect(out);
  });

  // The thump of the coil kicking in.
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(180, now);
  thump.frequency.exponentialRampToValueAtTime(70, now + 0.25);
  const thumpGain = ctx.createGain();
  envelope(thumpGain.gain, now, 0.8, 0.005, 0.3);
  thump.connect(thumpGain).connect(b.input);

  buzz.start(now);
  wobble.start(now);
  thump.start(now);
  buzz.stop(now + 1.5);
  wobble.stop(now + 1.5);
  thump.stop(now + 0.4);
}

/** TV snow through a small speaker: band-limited, crackly, loud. */
export function snow(b: Bus, seconds: number, peak: number): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const source = noiseSource(b);
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = 180;
  const high = ctx.createBiquadFilter();
  high.type = 'lowpass';
  high.frequency.value = 5200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.setValueAtTime(peak, now + seconds * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  source.connect(low).connect(high).connect(gain).connect(b.input);
  source.start(now);
  source.stop(now + seconds + 0.05);
}

/** A relay inside the set: a dull "chunk", not a tick. */
function chunk(b: Bus): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.setValueAtTime(320, now);
  body.frequency.exponentialRampToValueAtTime(120, now + 0.06);
  const bodyGain = ctx.createGain();
  envelope(bodyGain.gain, now, 0.5, 0.002, 0.08);
  body.connect(bodyGain).connect(b.input);
  body.start(now);
  body.stop(now + 0.12);

  const source = noiseSource(b);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1400;
  band.Q.value = 1.2;
  const clickGain = ctx.createGain();
  envelope(clickGain.gain, now, 0.25, 0.001, 0.025);
  source.connect(band).connect(clickGain).connect(b.input);
  source.start(now);
  source.stop(now + 0.05);
}

/** Two tones a semitone and a bit apart: the sound of something wrong on air. */
function wrongTone(b: Bus, seconds: number): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  envelope(out.gain, now, 0.22, 0.02, seconds);
  out.connect(b.input);
  [812, 861].forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = frequency;
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 2400;
    osc.connect(soften).connect(out);
    osc.start(now);
    osc.stop(now + seconds + 0.1);
  });
}

/**
 * The 666 drone: detuned saws an octave above where speakers give up, a
 * filter that opens and closes like breathing, and a whisper of noise.
 */
function startDrone(b: Bus): void {
  if (drone !== null) return;
  const { ctx } = b;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(DRONE_GAIN, now + 2.5);
  out.connect(b.input);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  filter.Q.value = 6;
  filter.connect(out);

  const breath = ctx.createOscillator();
  breath.frequency.value = 0.17;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 420;
  breath.connect(breathDepth).connect(filter.frequency);

  const voices = [110, 110.9, 164.3, 220.6, 233.1].map((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    osc.connect(filter);
    return osc;
  });

  const air = noiseSource(b);
  const airBand = ctx.createBiquadFilter();
  airBand.type = 'bandpass';
  airBand.frequency.value = 900;
  airBand.Q.value = 0.8;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.25;
  air.connect(airBand).connect(airGain).connect(filter);

  [...voices, breath, air].forEach((node) => node.start(now));

  const stopAll = (at: number): void => {
    [...voices, breath, air].forEach((node) => node.stop(at));
  };

  drone = {
    stop: () => {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      stopAll(t + 0.9);
    },
    swell: () => {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(DRONE_GAIN * 3.5, t);
      out.gain.exponentialRampToValueAtTime(DRONE_GAIN, t + 1.2);
      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(2600, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 1.2);
    },
    choke: (seconds: number) => {
      // Dead air while the hijack frame is on screen.
      const t = ctx.currentTime;
      b.master.gain.cancelScheduledValues(t);
      b.master.gain.setValueAtTime(0.0001, t);
      b.master.gain.setValueAtTime(enabled ? MASTER_GAIN : 0, t + seconds);
    },
  };
}

function stopDrone(): void {
  drone?.stop();
  drone = null;
}

function setEnabled(on: boolean, button: HTMLButtonElement | null): void {
  enabled = on;
  writePreference(on);
  if (bus !== null) {
    bus.master.gain.setTargetAtTime(on ? MASTER_GAIN : 0, bus.ctx.currentTime, 0.05);
  }
  if (button !== null) {
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Sound on' : 'Sound off';
  }
}

function onFirstGesture(): void {
  if (bus === null) bus = createBus();
  if (bus === null) return;
  void bus.ctx.resume();
  degauss(bus);
  if (document.documentElement.dataset['haunted'] === 'true') startDrone(bus);
}

/** The shared audio graph, or null before the first gesture. */
export function getBus(): Bus | null {
  return bus;
}

function withBus(play: (b: Bus) => void): () => void {
  return () => {
    if (bus !== null) play(bus);
  };
}

function start(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-sound]');
  setEnabled(enabled, toggle);
  toggle?.addEventListener('click', () => setEnabled(!enabled, toggle));

  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('keydown', onFirstGesture, { once: true });

  document.querySelector('.remote')?.addEventListener('pointerdown', (event) => {
    if ((event.target as Element).closest('button') !== null) withBus(chunk)();
  });
  window.addEventListener('keydown', (event) => {
    if (/^[0-9]$/.test(event.key)) withBus(chunk)();
  });

  window.addEventListener('tv:tune', withBus((b) => snow(b, 0.22, 0.5)));
  window.addEventListener(
    'tv:slip',
    withBus((b) => {
      snow(b, 0.45, 0.7);
      wrongTone(b, 0.9);
      drone?.swell();
    }),
  );
  window.addEventListener('tv:hijack', (event) => {
    const kind = (event as CustomEvent<string>).detail;
    drone?.choke(kind === 'message' ? HIJACK_MESSAGE_SECONDS : HIJACK_FLASH_SECONDS);
  });
  window.addEventListener('tv:haunt', (event) => {
    if ((event as CustomEvent<boolean>).detail) withBus(startDrone)();
    else stopDrone();
  });
  // The scripted sequence owns the silence: the hum dies with the picture.
  onCue((name) => {
    if (name === 'dead-air') stopDrone();
    if (name === 'release' && document.documentElement.dataset['haunted'] === 'true') withBus(startDrone)();
  });
}

start();
