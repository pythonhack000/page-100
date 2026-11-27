/**
 * src/fx/hijack.ts
 *
 * Broadcast intrusion frames for page 666, in the analogue-horror tradition:
 * for a moment the set shows something that is not on any page.
 * - "flash": a face made of teletext blocks, about four frames long.
 * - "message": dead air, then one line addressed to the viewer, using the
 *   viewer's own clock, held just long enough to read.
 * Single events only (never a strobe), and skipped under reduced motion.
 */

import { buildFaceGrid } from './face.ts';

export type HijackKind = 'flash' | 'message';

const FLASH_MS = 140;
const MESSAGE_MS = 1700;



function messages(): readonly string[] {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return [
    `IT IS ${hh}:${mm}. WHY ARE YOU STILL WATCHING?`,
    'THIS PAGE WAS NOT BROADCAST.',
    'I CAN SEE THE LIGHT FROM YOUR SCREEN.',
    'DO NOT CHANGE THE CHANNEL.',
  ];
}

let messageIndex = 0;

function buildFace(): HTMLElement {
  const grid = buildFaceGrid(Number.MAX_SAFE_INTEGER);
  grid.classList.add('tv__hijack-face');
  return grid;
}

function buildMessage(): HTMLElement {
  const lines = messages();
  const text = lines[messageIndex % lines.length] ?? '';
  messageIndex += 1;
  const line = document.createElement('p');
  line.className = 'tv__hijack-line';
  line.textContent = text;
  return line;
}

/** Shows one intrusion frame inside the glass. Resolves when it is gone. */
export function showHijack(glass: HTMLElement, kind: HijackKind): Promise<void> {
  const layer = document.createElement('div');
  layer.className = `tv__hijack tv__hijack--${kind}`;
  layer.setAttribute('aria-hidden', 'true');
  layer.appendChild(kind === 'flash' ? buildFace() : buildMessage());
  glass.appendChild(layer);
  window.dispatchEvent(new CustomEvent('tv:hijack', { detail: kind }));
  const duration = kind === 'flash' ? FLASH_MS : MESSAGE_MS;
  return new Promise((resolve) => {
    window.setTimeout(() => {
      layer.remove();
      resolve();
    }, duration);
  });
}
