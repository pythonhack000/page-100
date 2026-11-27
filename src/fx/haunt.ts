/**
 * src/fx/haunt.ts
 *
 * How the set behaves while page 666 is on screen. The page content is
 * built by Kiro; this module only makes the television misbehave:
 * - the room turns blood red (CSS, via html[data-haunted]),
 * - the picture slips its vertical hold at random moments,
 * - a ghost of the previous page hangs in the glass and flashes up,
 * - first, once per visit, the scripted sequence in director.ts plays,
 * - and if you switch to another tab, the tab title calls after you.
 * All of it stops the moment you leave the page.
 */

import type { TuneDetail } from './crt.ts';
import { startDirector, stopDirector } from './director.ts';
import { showHijack, type HijackKind } from './hijack.ts';

const HAUNTED_PAGE = 666;
const SLIP_MIN_MS = 2600;
const SLIP_MAX_MS = 6400;
const SLIP_MS = 420;
const GHOST_FLASH_MS = 140;
const HIDDEN_TAB_TITLE = 'I CAN STILL SEE YOU';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let slipTimer: number | null = null;
let ghost: HTMLElement | null = null;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function glass(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.tv__glass');
}

function mountGhost(previous: HTMLElement | null): void {
  const host = glass();
  if (host === null || previous === null) return;
  const layer = document.createElement('div');
  layer.className = 'tt-host tv__ghost';
  layer.setAttribute('aria-hidden', 'true');
  layer.appendChild(previous.cloneNode(true));
  host.appendChild(layer);
  ghost = layer;
}

function unmountGhost(): void {
  ghost?.remove();
  ghost = null;
}

function slip(host: HTMLElement): void {
  host.classList.add('is-slipping');
  ghost?.classList.add('is-flashing');
  window.setTimeout(() => ghost?.classList.remove('is-flashing'), GHOST_FLASH_MS);
  window.setTimeout(() => host.classList.remove('is-slipping'), SLIP_MS);
  window.dispatchEvent(new CustomEvent('tv:slip'));
}

/** Every other slip is preceded by an intrusion: a face, then a message. */
function intrusionFor(count: number): HijackKind | null {
  if (count % 2 === 1) return null;
  return count % 4 === 0 ? 'message' : 'flash';
}

let slipCount = 0;

function scheduleSlip(): void {
  slipTimer = window.setTimeout(() => {
    const host = glass();
    slipCount += 1;
    const intrusion = intrusionFor(slipCount);
    if (host === null) {
      scheduleSlip();
      return;
    }
    if (intrusion === null) {
      slip(host);
      scheduleSlip();
      return;
    }
    void showHijack(host, intrusion).then(() => {
      if (document.documentElement.dataset['haunted'] !== 'true') return;
      slip(host);
      scheduleSlip();
    });
  }, randomBetween(SLIP_MIN_MS, SLIP_MAX_MS));
}

function enter(previous: HTMLElement | null): void {
  if (document.documentElement.dataset['haunted'] === 'true') return;
  document.documentElement.dataset['haunted'] = 'true';
  window.dispatchEvent(new CustomEvent('tv:haunt', { detail: true }));
  mountGhost(previous);
  slipCount = 0;
  if (reducedMotion.matches) return;
  const host = glass();
  // The scripted sequence plays once per visit; random haunting follows it.
  if (host === null) scheduleSlip();
  else startDirector(host, scheduleSlip);
}

function leave(): void {
  if (document.documentElement.dataset['haunted'] !== 'true') return;
  delete document.documentElement.dataset['haunted'];
  window.dispatchEvent(new CustomEvent('tv:haunt', { detail: false }));
  stopDirector();
  if (slipTimer !== null) window.clearTimeout(slipTimer);
  slipTimer = null;
  unmountGhost();
}

/** The picture that was on screen before the latest change: the ghost. */
let pictureBefore: HTMLElement | null = null;

window.addEventListener('tv:tune', (event) => {
  pictureBefore = (event as CustomEvent<TuneDetail>).detail.previous;
});

window.addEventListener('tv:settled', (event) => {
  const { page } = (event as CustomEvent<TuneDetail>).detail;
  if (page === HAUNTED_PAGE) enter(pictureBefore);
  else leave();
});

/** The title the page had before it started calling after the viewer. */
let calmTitle: string | null = null;

document.addEventListener('visibilitychange', () => {
  if (document.hidden && document.documentElement.dataset['haunted'] === 'true') {
    calmTitle = document.title;
    document.title = HIDDEN_TAB_TITLE;
    return;
  }
  if (!document.hidden && calmTitle !== null) {
    document.title = calmTitle;
    calmTitle = null;
  }
});
