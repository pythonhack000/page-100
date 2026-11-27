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
 *   7. release: the page comes back and normal haunting resumes.
 *
 * It only reads and decorates the DOM the renderer produced. It never
 * changes navigation state: the trap swallows one input event, that's all.
 */

import { cue } from './cues.ts';
import { mountWatchingFace, type WatchingFace } from './face.ts';

const AT_MUTATE_MS = 3500;
const AT_CLOCK_MS = 6500;
const AT_DEAD_AIR_MS = 9500;
const AT_PRESENCE_MS = 14000;
const AT_AUTO_SCARE_MS = 33000;
const MUTATE_STEP_MS = 140;
const CLOCK_STEP_MS = 200;
const FACE_FADE_MS = 6000;
const FACE_OPACITY = 0.6;
const LUNGE_MS = 650;
const WARNING_MS = 1800;
const RELEASE_FADE_MS = 900;
const MUTATED_LINE = 'I AM WATCHING YOU';
const FIRST_CONTENT_ROW = 3;
const LAST_CONTENT_ROW = 21;
const CLOCK_FIRST_COL = 32;

let timers: number[] = [];
let clockTimer: number | null = null;
let counterTimer: number | null = null;
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

function presence(glass: HTMLElement): void {
  cue('presence');
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

function release(): void {
  cue('release');
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

function scare(glass: HTMLElement): void {
  if (!trapArmed) return;
  trapArmed = false;
  cue('scream');
  face?.fadeTo(1, 60);
  face?.lunge();
  later(LUNGE_MS, () => {
    warning(glass);
    later(WARNING_MS, release);
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
  face?.remove();
  dead?.remove();
  face = null;
  dead = null;
  finished = null;
}
