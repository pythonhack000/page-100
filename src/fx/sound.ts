/**
 * src/fx/sound.ts
 *
 * Every sound is synthesised with the Web Audio API; no audio files ship.
 * - First touch: the degauss "thoom" and the faint line-output whine of a
 *   cathode-ray set warming up.
 * - Page change: a burst of analogue static.
 * - Remote: a dry plastic click per button.
 * - Page 666: a low mains hum that swells when the picture slips.
 * Browsers only allow audio after a user gesture, so nothing plays before
 * the first key or tap. The SOUND key on the remote mutes it; the choice is
 * remembered in localStorage when storage is available.
 */

const STORAGE_KEY = 'page100.sound';
const MASTER_GAIN = 0.6;
const STATIC_SECONDS = 0.18;
const HUM_GAIN = 0.07;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let hum: { stop: () => void; swell: () => void } | null = null;
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

function noiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Creates the audio graph on the first gesture. Returns false if audio is unavailable. */
function ensureContext(): boolean {
  if (ctx !== null) return true;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Ctor === undefined) return false;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = enabled ? MASTER_GAIN : 0;
  master.connect(ctx.destination);
  noise = noiseBuffer(ctx);
  return true;
}

function envelope(param: AudioParam, at: number, peak: number, attack: number, release: number): void {
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + release);
}

function degauss(): void {
  if (ctx === null || master === null) return;
  const now = ctx.currentTime;
  // The thoom: a low sine falling in pitch, with a little buzz on top.
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'sine';
  body.frequency.setValueAtTime(95, now);
  body.frequency.exponentialRampToValueAtTime(42, now + 0.9);
  envelope(bodyGain.gain, now, 0.55, 0.02, 1.1);
  body.connect(bodyGain).connect(master);
  body.start(now);
  body.stop(now + 1.2);

  const buzz = ctx.createOscillator();
  const buzzGain = ctx.createGain();
  buzz.type = 'sawtooth';
  buzz.frequency.setValueAtTime(100, now);
  envelope(buzzGain.gain, now, 0.06, 0.01, 0.7);
  buzz.connect(buzzGain).connect(master);
  buzz.start(now);
  buzz.stop(now + 0.8);

  // The line-output whine every CRT owner remembers, very quiet.
  const whine = ctx.createOscillator();
  const whineGain = ctx.createGain();
  whine.frequency.value = 15625;
  envelope(whineGain.gain, now + 0.1, 0.012, 0.3, 2.4);
  whine.connect(whineGain).connect(master);
  whine.start(now + 0.1);
  whine.stop(now + 3);
}

function staticBurst(): void {
  if (ctx === null || master === null || noise === null) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200;
  band.Q.value = 0.6;
  const gain = ctx.createGain();
  envelope(gain.gain, now, 0.32, 0.005, STATIC_SECONDS);
  source.connect(band).connect(gain).connect(master);
  source.start(now, Math.random() * 0.5);
  source.stop(now + STATIC_SECONDS + 0.05);
}

function click(): void {
  if (ctx === null || master === null || noise === null) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const high = ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 1800;
  const gain = ctx.createGain();
  envelope(gain.gain, now, 0.25, 0.001, 0.03);
  source.connect(high).connect(gain).connect(master);
  source.start(now);
  source.stop(now + 0.05);
}

function startHum(): void {
  if (ctx === null || master === null || hum !== null) return;
  const context = ctx;
  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, context.currentTime);
  out.gain.exponentialRampToValueAtTime(HUM_GAIN, context.currentTime + 1.5);
  out.connect(master);
  const tones = [50, 100, 150].map((frequency, index) => {
    const osc = context.createOscillator();
    osc.type = index === 0 ? 'sine' : 'triangle';
    osc.frequency.value = frequency;
    const g = context.createGain();
    g.gain.value = 1 / (index + 1);
    osc.connect(g).connect(out);
    osc.start();
    return osc;
  });
  hum = {
    stop: () => {
      const now = context.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      tones.forEach((osc) => osc.stop(now + 0.7));
    },
    swell: () => {
      const now = context.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(HUM_GAIN * 4, now);
      out.gain.exponentialRampToValueAtTime(HUM_GAIN, now + 0.5);
    },
  };
}

function stopHum(): void {
  hum?.stop();
  hum = null;
}

function setEnabled(on: boolean, button: HTMLButtonElement | null): void {
  enabled = on;
  writePreference(on);
  if (master !== null && ctx !== null) {
    master.gain.setTargetAtTime(on ? MASTER_GAIN : 0, ctx.currentTime, 0.05);
  }
  if (button !== null) {
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Sound on' : 'Sound off';
  }
}

function onFirstGesture(): void {
  if (!ensureContext()) return;
  void ctx?.resume();
  degauss();
  if (document.documentElement.dataset['haunted'] === 'true') startHum();
}

function start(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-sound]');
  setEnabled(enabled, toggle);
  toggle?.addEventListener('click', () => setEnabled(!enabled, toggle));

  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('keydown', onFirstGesture, { once: true });

  document.querySelector('.remote')?.addEventListener('pointerdown', (event) => {
    if ((event.target as Element).closest('button') !== null) click();
  });
  window.addEventListener('keydown', (event) => {
    if (/^[0-9]$/.test(event.key)) click();
  });

  window.addEventListener('tv:tune', staticBurst);
  window.addEventListener('tv:slip', () => {
    staticBurst();
    hum?.swell();
  });
  window.addEventListener('tv:haunt', (event) => {
    if ((event as CustomEvent<boolean>).detail) startHum();
    else stopHum();
  });
}

start();
