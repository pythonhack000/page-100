/**
 * src/fx/director.ts
 *
 * The page-666 sequence. Horror comes from restraint and escalation, not
 * from constant glitches, so this is a script rather than a random loop:
 *
 *   1. calm: nothing happens; the viewer reads the page.
 *   2. a line of the page rewrites itself, letter by letter, while read.
 *   3. the clock in the header starts running backwards.
 *   4. dead air: the picture dies, a counter says how long you have watched.
 *   5. a face comes through the dark, and its eyes follow your pointer.
 *   6. the trap: the first attempt to change channel is refused; the face
 *      lunges. If the viewer sits still, it lunges on its own.
 *   7. release: the page comes back and normal haunting resumes...
 *   8. ...until, a few seconds later, it shows itself once more.
 *
 * While it watches, it blinks, turns its head after the pointer, grins
 * wider at every drop-out and multiplies in the dark; the pointer is gone.
 *
 * It only reads and decorates the DOM the renderer produced. It never
 * changes navigation state: the trap swallows one input event, that's all.
 */

import { STARE_MS, cue } from './cues.ts';
import { buildFaceGrid, mountWatchingFace, type WatchingFace } from './face.ts';

const AT_MUTATE_MS = 3500;
const AT_CLOCK_MS = 6500;
const AT_DEAD_AIR_MS = 9500;
const AT_PRESENCE_MS = 11500;
const AT_AUTO_SCARE_MS = 27000;
const FLASH_EVERY_MS = 2300;
const FLASH_MS = 160;
const FLASHES = [
  'TURN AROUND',
  'IT IS IN THE ROOM',
  'DO NOT LOOK AWAY',
  'IT CAN SEE YOU',
  'STAY',
  'LOOK BEHIND YOU',
];
const MUTATE_STEP_MS = 140;
const CLOCK_STEP_MS = 200;
const FACE_FADE_MS = 2500;
const FACE_OPACITY = 0.9;
const LUNGE_MS = 1000;
const WARNING_MS = 1800;
const RELEASE_FADE_MS = 900;
const SWARM_FROM_FLASH = 2;
const SWARM_MAX = 12;
const AFTERIMAGE_DELAY_MS = 3200;
const AFTERIMAGE_MS = 220;
const AFTERIMAGE_TEXT = 'IT IS STILL HERE  ';
const AFTERIMAGE_REPEAT = 60;
const MUTATED_LINE = 'I AM WATCHING YOU';
const FIRST_CONTENT_ROW = 3;
const LAST_CONTENT_ROW = 21;
const CLOCK_FIRST_COL = 32;

let timers: number[] = [];
let clockTimer: number | null = null;
let counterTimer: number | null = null;
let flashTimer: number | null = null;
let afterimage: HTMLElement | null = null;
let swarm: HTMLElement[] = [];
let dead: HTMLElement | null = null;
let face: WatchingFace | null = null;
let trapArmed = false;
let finished: (() => void) | null = null;

function later(ms: number, run: () => void): void {
  timers.push(window.setTimeout(run, ms));
}

function rowCells(row: number): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`#screen [data-row="${row}"] .tt-cell`));
}

function rowText(cells: HTMLElement[]): string {
  return cells.map((cell) => (cell.classList.contains('tt-mosaic') ? ' ' : cell.textContent ?? ' ')).join('');
}

/** The line to corrupt: one that mentions watching, else the last line of text. */
function pickLine(): { cells: HTMLElement[]; start: number } | null {
  let fallback: { cells: HTMLElement[]; start: number } | null = null;
  for (let row = FIRST_CONTENT_ROW; row <= LAST_CONTENT_ROW; row++) {
    const cells = rowCells(row);
    const text = rowText(cells);
    const start = text.search(/\S/);
    if (start < 0) continue;
    if (/WATCH/i.test(text)) return { cells, start };
    fallback = { cells, start };
  }
  return fallback;
}

function mutateLine(): void {
  const line = pickLine();
  if (line === null) return;
  const { cells, start } = line;
  for (let i = 0; i < cells.length - start; i++) {
    const cell = cells[start + i];
    if (cell === undefined || cell.classList.contains('tt-mosaic')) continue;
    const target = MUTATED_LINE[i] ?? ' ';
    later(i * MUTATE_STEP_MS, () => {
      if ((cell.textContent ?? ' ') === target) return;
      cell.dataset['fx'] = 'mutated';
      cell.textContent = target;
      cell.style.color = 'var(--tt-red)';
      cue('mutate-tick');
    });
  }
}

/** The header clock runs backwards, fighting the real one every second. */
function runClockBackwards(): void {
  let seconds = (() => {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  })();
  clockTimer = window.setInterval(() => {
    seconds = (seconds - 1 + 86400) % 86400;
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    const text = `${hh}:${mm}:${ss}`;
    const cells = rowCells(0);
    for (let i = 0; i < text.length; i++) {
      const cell = cells[CLOCK_FIRST_COL + i];
      if (cell !== undefined) cell.textContent = text[i] ?? ' ';
    }
  }, CLOCK_STEP_MS);
}

function formatWatched(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function deadAir(glass: HTMLElement, enteredAt: number): void {
  cue('dead-air');
  const layer = document.createElement('div');
  layer.className = 'tv__dead';
  layer.setAttribute('aria-hidden', 'true');
  const line = document.createElement('p');
  line.className = 'tv__dead-line';
  layer.appendChild(line);
  glass.appendChild(layer);
  dead = layer;
  const tick = (): void => {
    line.textContent = `YOU HAVE BEEN WATCHING FOR ${formatWatched(Date.now() - enteredAt)}`;
  };
  tick();
  counterTimer = window.setInterval(tick, 250);
  requestAnimationFrame(() => layer.classList.add('is-on'));
}

/** Subliminal lines: a few frames of text in the dark, then gone. */
function startFlashes(glass: HTMLElement): void {
  let index = 0;
  flashTimer = window.setInterval(() => {
    const line = document.createElement('p');
    line.className = 'tv__flash';
    line.setAttribute('aria-hidden', 'true');
    line.textContent = FLASHES[index % FLASHES.length] ?? '';
    line.style.top = `${15 + Math.random() * 65}%`;
    line.style.left = `${10 + Math.random() * 40}%`;
    glass.appendChild(line);
    cue('flash');
    face?.widen();
    if (index >= SWARM_FROM_FLASH) multiply(glass, 2 ** (index - SWARM_FROM_FLASH + 1));
    index += 1;
    window.setTimeout(() => line.remove(), FLASH_MS);
  }, FLASH_EVERY_MS);
}

/** Small copies of the face surface in the dark around it. */
function multiply(glass: HTMLElement, count: number): void {
  const wanted = Math.min(count, SWARM_MAX) - swarm.length;
  for (let i = 0; i < wanted; i++) {
    const mini = buildFaceGrid(Number.MAX_SAFE_INTEGER);
    mini.classList.add('tv__mini-face');
    mini.setAttribute('aria-hidden', 'true');
    const nearEdge = Math.random() < 0.5;
    mini.style.left = `${nearEdge ? 3 + Math.random() * 14 : 70 + Math.random() * 18}%`;
    mini.style.top = `${5 + Math.random() * 70}%`;
    mini.style.width = `${7 + Math.random() * 7}%`;
    mini.style.animationDelay = `${-Math.random() * 3}s`;
    glass.appendChild(mini);
    swarm = [...swarm, mini];
  }
}

function clearSwarm(): void {
  swarm.forEach((mini) => mini.remove());
  swarm = [];
}

function stopFlashes(): void {
  if (flashTimer !== null) window.clearInterval(flashTimer);
  flashTimer = null;
}

function presence(glass: HTMLElement): void {
  cue('presence');
  document.documentElement.classList.add('is-watched');
  startFlashes(glass);
  face = mountWatchingFace(glass);
  face.element.style.opacity = '0';
  requestAnimationFrame(() => face?.fadeTo(FACE_OPACITY, FACE_FADE_MS));
  trapArmed = true;
}

function warning(glass: HTMLElement): void {
  const layer = document.createElement('div');
  layer.className = 'tv__hijack tv__hijack--message';
  layer.setAttribute('aria-hidden', 'true');
  const line = document.createElement('p');
  line.className = 'tv__hijack-line';
  line.textContent = 'DO NOT CHANGE THE CHANNEL.';
  layer.appendChild(line);
  glass.appendChild(layer);
  later(WARNING_MS, () => layer.remove());
}

/** The false ending: one more glimpse after the viewer has relaxed. */
function showAfterimage(glass: HTMLElement): void {
  const layer = document.createElement('div');
  layer.className = 'tv__after';
  layer.setAttribute('aria-hidden', 'true');
  const text = document.createElement('p');
  text.className = 'tv__after-text';
  text.textContent = AFTERIMAGE_TEXT.repeat(AFTERIMAGE_REPEAT);
  const corner = buildFaceGrid(Number.MAX_SAFE_INTEGER);
  corner.classList.add('tv__after-face');
  layer.append(text, corner);
  glass.appendChild(layer);
  afterimage = layer;
  cue('flash');
  later(AFTERIMAGE_MS, () => {
    layer.remove();
    afterimage = null;
  });
}

function release(glass: HTMLElement): void {
  cue('release');
  document.documentElement.classList.remove('is-watched');
  later(AFTERIMAGE_DELAY_MS, () => showAfterimage(glass));
  if (counterTimer !== null) window.clearInterval(counterTimer);
  counterTimer = null;
  const fading = [dead, face?.element ?? null];
  fading.forEach((el) => {
    if (el === null) return;
    el.style.transition = `opacity ${RELEASE_FADE_MS}ms ease`;
    el.style.opacity = '0';
  });
  const oldFace = face;
  const oldDead = dead;
  later(RELEASE_FADE_MS, () => {
    oldFace?.remove();
    oldDead?.remove();
  });
  face = null;
  dead = null;
  const done = finished;
  finished = null;
  done?.();
}

/** The whole set shakes and strobes while it screams. */
function setScreaming(glass: HTMLElement, on: boolean): void {
  glass.classList.toggle('is-screaming', on);
  document.querySelector('.tv__set')?.classList.toggle('is-screaming', on);
}

function scare(glass: HTMLElement): void {
  if (!trapArmed) return;
  trapArmed = false;
  stopFlashes();
  clearSwarm();
  cue('stare');
  face?.fadeTo(1, STARE_MS / 3);
  face?.stare();
  later(STARE_MS, () => {
    cue('scream');
    face?.lunge();
    setScreaming(glass, true);
    later(LUNGE_MS, () => {
      setScreaming(glass, false);
      warning(glass);
      later(WARNING_MS, () => release(glass));
    });
  });
}

/** Swallows the first attempt to leave while the face is watching. */
function trap(event: Event): void {
  if (!trapArmed) return;
  const glass = document.querySelector<HTMLElement>('.tv__glass');
  if (glass === null) return;
  if (event instanceof KeyboardEvent) {
    if (!/^[0-9]$/.test(event.key) && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  } else {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-key], [data-nav], [data-fastext]') == null) return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  scare(glass);
}

window.addEventListener('keydown', trap, { capture: true });
window.addEventListener('click', trap, { capture: true });

export function startDirector(glass: HTMLElement, onDone: () => void): void {
  stopDirector();
  finished = onDone;
  const enteredAt = Date.now();
  later(AT_MUTATE_MS, mutateLine);
  later(AT_CLOCK_MS, runClockBackwards);
  later(AT_DEAD_AIR_MS, () => deadAir(glass, enteredAt));
  later(AT_PRESENCE_MS, () => presence(glass));
  later(AT_AUTO_SCARE_MS, () => scare(glass));
}

export function stopDirector(): void {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
  if (clockTimer !== null) window.clearInterval(clockTimer);
  if (counterTimer !== null) window.clearInterval(counterTimer);
  clockTimer = null;
  counterTimer = null;
  trapArmed = false;
  stopFlashes();
  clearSwarm();
  const glass = document.querySelector<HTMLElement>('.tv__glass');
  if (glass !== null) setScreaming(glass, false);
  document.documentElement.classList.remove('is-watched');
  afterimage?.remove();
  afterimage = null;
  face?.remove();
  dead?.remove();
  face = null;
  dead = null;
  finished = null;
}
