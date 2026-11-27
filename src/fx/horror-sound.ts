/**
 * src/fx/horror-sound.ts
 *
 * Sounds for the scripted page-666 sequence (see director.ts), driven by
 * the cue bus. Like sound.ts, everything is synthesised and kept in the
 * band laptop speakers can play.
 *
 * - mutate-tick: a dry tick for every letter that changes.
 * - dead-air: room tone and a test tone that slowly dies and bends flat.
 * - presence: a heartbeat that speeds up, and a breathy whisper.
 * - flash: a crack of snow under each subliminal line.
 * - stare: dead silence, then a breath drawn in just before...
 * - scream: an impact, a distorted roar and a shriek inside a blast of snow.
 * - release, or leaving the page: everything stops.
 */

import { STARE_MS, onCue } from './cues.ts';
import { envelope, getBus, noiseSource, snow, type Bus } from './sound.ts';

const TICK_GAIN = 0.14;
const ROOM_GAIN = 0.07;
const TEST_TONE_GAIN = 0.12;
const TEST_TONE_SECONDS = 5.5;
const HEART_GAIN = 0.55;
const HEART_START_SECONDS = 1.05;
const HEART_END_SECONDS = 0.68;
const HEARTBEATS = 30;
const WHISPER_GAIN = 0.05;
const SCREAM_SECONDS = 1.1;
const INHALE_SECONDS = 0.55;
const FADE_SECONDS = 0.4;

/** A sustained layer that can be faded out and stopped later. */
interface Layer {
  stop(): void;
}

let layers: Layer[] = [];

function sustain(b: Bus, sources: AudioScheduledSourceNode[], out: GainNode): Layer {
  return {
    stop() {
      const t = b.ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + FADE_SECONDS);
      sources.forEach((source) => {
        try {
          source.stop(t + FADE_SECONDS + 0.05);
        } catch {
          // Already stopped on its own schedule; nothing to do.
        }
      });
    },
  };
}

function stopAll(): void {
  layers.forEach((layer) => layer.stop());
  layers = [];
}

function tick(b: Bus): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const source = noiseSource(b);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2400;
  band.Q.value = 3;
  const gain = ctx.createGain();
  envelope(gain.gain, now, TICK_GAIN, 0.001, 0.02);
  source.connect(band).connect(gain).connect(b.input);
  source.start(now);
  source.stop(now + 0.04);
}

/** The sound of a dead channel in a quiet room, and a tone giving up. */
function deadAir(b: Bus): void {
  const { ctx } = b;
  const now = ctx.currentTime;

  const room = noiseSource(b);
  const roomBand = ctx.createBiquadFilter();
  roomBand.type = 'bandpass';
  roomBand.frequency.value = 320;
  roomBand.Q.value = 0.6;
  const roomOut = ctx.createGain();
  roomOut.gain.setValueAtTime(0.0001, now);
  roomOut.gain.exponentialRampToValueAtTime(ROOM_GAIN, now + 1.5);
  room.connect(roomBand).connect(roomOut).connect(b.input);
  room.start(now);
  layers.push(sustain(b, [room], roomOut));

  const tone = ctx.createOscillator();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(1000, now);
  tone.frequency.exponentialRampToValueAtTime(600, now + TEST_TONE_SECONDS);
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5;
  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.setValueAtTime(0, now);
  vibratoDepth.gain.linearRampToValueAtTime(18, now + TEST_TONE_SECONDS);
  vibrato.connect(vibratoDepth).connect(tone.frequency);
  const toneOut = ctx.createGain();
  toneOut.gain.setValueAtTime(TEST_TONE_GAIN, now);
  toneOut.gain.setValueAtTime(TEST_TONE_GAIN, now + TEST_TONE_SECONDS * 0.6);
  toneOut.gain.exponentialRampToValueAtTime(0.0001, now + TEST_TONE_SECONDS);
  tone.connect(toneOut).connect(b.input);
  tone.start(now);
  vibrato.start(now);
  tone.stop(now + TEST_TONE_SECONDS + 0.1);
  vibrato.stop(now + TEST_TONE_SECONDS + 0.1);
  layers.push(sustain(b, [tone, vibrato], toneOut));
}

/** One "lub-dub": a pitched thump with a click on top so laptops play it. */
function beat(b: Bus, out: GainNode, at: number, level: number): AudioScheduledSourceNode[] {
  const { ctx } = b;
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(150, at);
  body.frequency.exponentialRampToValueAtTime(85, at + 0.12);
  const bodyGain = ctx.createGain();
  envelope(bodyGain.gain, at, level, 0.006, 0.16);
  const click = ctx.createOscillator();
  click.type = 'triangle';
  click.frequency.value = 300;
  const clickGain = ctx.createGain();
  envelope(clickGain.gain, at, level * 0.35, 0.002, 0.05);
  body.connect(bodyGain).connect(out);
  click.connect(clickGain).connect(out);
  body.start(at);
  click.start(at);
  body.stop(at + 0.25);
  click.stop(at + 0.1);
  return [body, click];
}

function heartbeat(b: Bus): void {
  const { ctx } = b;
  const out = ctx.createGain();
  out.gain.value = HEART_GAIN;
  out.connect(b.input);
  const sources: AudioScheduledSourceNode[] = [];
  let at = ctx.currentTime + 0.2;
  for (let i = 0; i < HEARTBEATS; i++) {
    const progress = i / (HEARTBEATS - 1);
    const level = 0.4 + 0.6 * progress;
    sources.push(...beat(b, out, at, level));
    sources.push(...beat(b, out, at + 0.26, level * 0.7));
    at += HEART_START_SECONDS + (HEART_END_SECONDS - HEART_START_SECONDS) * progress;
  }
  layers.push(sustain(b, sources, out));
}

/** Breath shaped into vowels, swelling and fading at uneven rates. */
function whisper(b: Bus): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(WHISPER_GAIN, now);
  out.connect(b.input);
  const air = noiseSource(b);
  [700, 1200, 2600].forEach((frequency, index) => {
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = frequency;
    formant.Q.value = 7;
    const level = ctx.createGain();
    level.gain.value = 1.6 / (index + 1);
    air.connect(formant).connect(level).connect(out);
  });
  const swells = [0.31, 0.73, 1.9].map((rate) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const depth = ctx.createGain();
    depth.gain.value = WHISPER_GAIN * 0.3;
    lfo.connect(depth).connect(out.gain);
    return lfo;
  });
  air.start(now);
  swells.forEach((lfo) => lfo.start(now));
  layers.push(sustain(b, [air, ...swells], out));
}

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

/** A sharp breath in, timed to end the instant the face screams. */
function inhale(b: Bus): void {
  const { ctx } = b;
  const start = ctx.currentTime + STARE_MS / 1000 - INHALE_SECONDS;
  const air = noiseSource(b);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 2.5;
  band.frequency.setValueAtTime(500, start);
  band.frequency.exponentialRampToValueAtTime(2600, start + INHALE_SECONDS);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.5, start + INHALE_SECONDS);
  gain.gain.setValueAtTime(0.0001, start + INHALE_SECONDS + 0.01);
  air.connect(band).connect(gain).connect(b.input);
  air.start(start);
  air.stop(start + INHALE_SECONDS + 0.05);
}

/** The hit under the scream: a pitched-down slam laptops can still play. */
function impact(b: Bus): void {
  const { ctx } = b;
  const now = ctx.currentTime;
  const body = ctx.createOscillator();
  body.type = 'square';
  body.frequency.setValueAtTime(220, now);
  body.frequency.exponentialRampToValueAtTime(55, now + 0.5);
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 900;
  const gain = ctx.createGain();
  envelope(gain.gain, now, 1, 0.003, 0.6);
  body.connect(soften).connect(gain).connect(b.input);
  body.start(now);
  body.stop(now + 0.7);
}

/** A thin, piercing layer an octave and a bit above the roar. */
function shriek(b: Bus, out: AudioNode): AudioScheduledSourceNode[] {
  const { ctx } = b;
  const now = ctx.currentTime;
  return [1, 1.021].map((ratio) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1300 * ratio, now);
    osc.frequency.exponentialRampToValueAtTime(1900 * ratio, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(1500 * ratio, now + SCREAM_SECONDS);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2400;
    band.Q.value = 3;
    const level = ctx.createGain();
    level.gain.value = 0.35;
    osc.connect(band).connect(level).connect(out);
    osc.start(now);
    osc.stop(now + SCREAM_SECONDS + 0.1);
    return osc;
  });
}

function scream(b: Bus): void {
  stopAll();
  const { ctx } = b;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  envelope(out.gain, now, 0.9, 0.01, SCREAM_SECONDS);
  const crush = ctx.createWaveShaper();
  crush.curve = distortionCurve(40);
  crush.connect(out).connect(b.input);

  const voices = [1, 1.013, 0.497].map((ratio) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 * ratio, now);
    osc.frequency.exponentialRampToValueAtTime(900 * ratio, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(700 * ratio, now + SCREAM_SECONDS);
    return osc;
  });
  [800, 1150, 2900].forEach((frequency) => {
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = frequency;
    formant.Q.value = 4;
    voices.forEach((osc) => osc.connect(formant));
    formant.connect(crush);
  });
  voices.forEach((osc) => {
    osc.start(now);
    osc.stop(now + SCREAM_SECONDS + 0.1);
  });
  snow(b, SCREAM_SECONDS, 0.9);
  shriek(b, crush);
  impact(b);
}

onCue((name) => {
  const b = getBus();
  if (b === null) return;
  if (name === 'mutate-tick') tick(b);
  if (name === 'dead-air') deadAir(b);
  if (name === 'presence') {
    heartbeat(b);
    whisper(b);
  }
  if (name === 'flash') snow(b, 0.14, 0.55);
  if (name === 'stare') {
    stopAll();
    inhale(b);
  }
  if (name === 'scream') scream(b);
  if (name === 'release') stopAll();
});

window.addEventListener('tv:haunt', (event) => {
  if (!(event as CustomEvent<boolean>).detail) stopAll();
});
