/**
 * src/fx/haunt.ts
 *
 * How the set behaves while page 666 is on screen. The page content is
 * built by Kiro; this module only makes the television misbehave:
 * - the room turns blood red (CSS, via html[data-haunted]),
 * - the picture slips its vertical hold at random moments,
 * - a ghost of the previous page hangs in the glass and flashes up.
 * All of it stops the moment you leave the page.
 */

import type { TuneDetail } from './crt.ts';

const HAUNTED_PAGE = 666;
const SLIP_MIN_MS = 2600;
const SLIP_MAX_MS = 6400;
const SLIP_MS = 420;
const GHOST_FLASH_MS = 140;

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

function scheduleSlip(): void {
  slipTimer = window.setTimeout(() => {
    const host = glass();
    if (host !== null) {
      host.classList.add('is-slipping');
      ghost?.classList.add('is-flashing');
      window.setTimeout(() => ghost?.classList.remove('is-flashing'), GHOST_FLASH_MS);
      window.setTimeout(() => host.classList.remove('is-slipping'), SLIP_MS);
      window.dispatchEvent(new CustomEvent('tv:slip'));
    }
    scheduleSlip();
  }, randomBetween(SLIP_MIN_MS, SLIP_MAX_MS));
}

function enter(previous: HTMLElement | null): void {
  if (document.documentElement.dataset['haunted'] === 'true') return;
  document.documentElement.dataset['haunted'] = 'true';
  window.dispatchEvent(new CustomEvent('tv:haunt', { detail: true }));
  mountGhost(previous);
  if (!reducedMotion.matches) scheduleSlip();
}

function leave(): void {
  if (document.documentElement.dataset['haunted'] !== 'true') return;
  delete document.documentElement.dataset['haunted'];
  window.dispatchEvent(new CustomEvent('tv:haunt', { detail: false }));
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
