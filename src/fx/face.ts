/**
 * src/fx/face.ts
 *
 * Puts the face from face-art.ts on the glass. It blinks, its head and
 * pupils follow the viewer's pointer, and its grin can be stretched one
 * stage at a time.
 */

import { FACE_COLUMNS, FACE_FRAMES, FACE_ROWS, MOUTH_ROWS, SCREAM_FRAME, SOCKETS, isSocketCell } from './face-art.ts';

/** How far a pupil may travel inside its socket, in blocks. */
const PUPIL_REACH = 1.6;
const LAST_GRIN = FACE_FRAMES.length - 1;
const BLINK_MIN_MS = 2200;
const BLINK_MAX_MS = 5200;
const BLINK_MS = 170;
const DOUBLE_BLINK_CHANCE = 0.3;
/** How far the head turns towards the pointer at the edge of the window. */
const MAX_TILT_DEG = 9;
const MAX_TURN_PERCENT = 5;
const MAX_NOD_PERCENT = 3;

function paint(cell: HTMLElement, pixel: string | undefined, socket = false): void {
  cell.className = pixel === '#' ? 'is-lit' : pixel === 'o' ? 'is-dim' : socket ? 'is-socket' : '';
}

/** The face as a grid of blocks, drawn at grin stage `stage`. */
export function buildFaceGrid(stage = 0): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'tv__face-grid';
  grid.style.gridTemplateColumns = `repeat(${FACE_COLUMNS}, 1fr)`;
  const frame = FACE_FRAMES[Math.min(stage, LAST_GRIN)] ?? [];
  frame.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      const cell = document.createElement('span');
      paint(cell, pixel, isSocketCell(x, y));
      grid.appendChild(cell);
    });
  });
  return grid;
}

/** Redraws the lower face (mouth and jaw) of `grid` from `frame`. */
function drawLowerFace(grid: HTMLElement, frame: readonly string[]): void {
  for (let row = MOUTH_ROWS[0] ?? 0; row < FACE_ROWS; row++) {
    for (let col = 0; col < FACE_COLUMNS; col++) {
      const cell = grid.children[row * FACE_COLUMNS + col];
      if (cell instanceof HTMLElement) paint(cell, frame[row]?.[col]);
    }
  }
}

export interface WatchingFace {
  readonly element: HTMLElement;
  /** Fades the face to `opacity` over `ms`. */
  fadeTo(opacity: number, ms: number): void;
  /** Stretches the grin one stage wider; stops at the widest. */
  widen(): void;
  /** It stops following you, closes its mouth and looks straight at you. */
  stare(): void;
  /** The jump: the jaw drops and the face rushes the glass. */
  lunge(): void;
  remove(): void;
}

export function mountWatchingFace(glass: HTMLElement): WatchingFace {
  const layer = document.createElement('div');
  layer.className = 'tv__face';
  layer.setAttribute('aria-hidden', 'true');
  const wrap = document.createElement('div');
  wrap.className = 'tv__face-wrap';
  const grid = buildFaceGrid();
  wrap.appendChild(grid);
  const pupils = SOCKETS.map((socket) => {
    const pupil = document.createElement('span');
    pupil.className = 'tv__pupil';
    pupil.style.left = `${(socket.x / FACE_COLUMNS) * 100}%`;
    pupil.style.top = `${(socket.y / FACE_ROWS) * 100}%`;
    wrap.appendChild(pupil);
    return pupil;
  });
  layer.appendChild(wrap);
  glass.appendChild(layer);

  let stage = 0;
  let staring = false;
  let blinkTimer: number | null = null;
  const blink = (): void => {
    wrap.classList.add('is-blinking');
    window.setTimeout(() => wrap.classList.remove('is-blinking'), BLINK_MS);
  };
  const scheduleBlink = (): void => {
    blinkTimer = window.setTimeout(() => {
      blink();
      if (Math.random() < DOUBLE_BLINK_CHANCE) window.setTimeout(blink, BLINK_MS * 2);
      scheduleBlink();
    }, BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS));
  };
  scheduleBlink();

  const follow = (event: PointerEvent): void => {
    if (staring) return;
    const nx = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1));
    wrap.style.setProperty('--tilt', `${nx * MAX_TILT_DEG}deg`);
    wrap.style.setProperty('--turn', `${nx * MAX_TURN_PERCENT}%`);
    wrap.style.setProperty('--nod', `${ny * MAX_NOD_PERCENT}%`);
    const box = wrap.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const x = (dx / length) * (box.width / FACE_COLUMNS) * PUPIL_REACH;
    const y = (dy / length) * (box.height / FACE_ROWS) * PUPIL_REACH;
    pupils.forEach((pupil) => {
      pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });
  };
  window.addEventListener('pointermove', follow);

  return {
    element: layer,
    fadeTo(opacity, ms) {
      layer.style.transition = `opacity ${ms}ms ease-in`;
      layer.style.opacity = String(opacity);
    },
    widen() {
      if (stage >= LAST_GRIN) return;
      stage += 1;
      drawLowerFace(grid, FACE_FRAMES[stage] ?? []);
    },
    stare() {
      staring = true;
      if (blinkTimer !== null) window.clearTimeout(blinkTimer);
      wrap.classList.remove('is-blinking');
      ['--tilt', '--turn', '--nod'].forEach((name) => wrap.style.removeProperty(name));
      pupils.forEach((pupil) => pupil.style.removeProperty('transform'));
      drawLowerFace(grid, FACE_FRAMES[0] ?? []);
      layer.classList.add('is-staring');
    },
    lunge() {
      drawLowerFace(grid, SCREAM_FRAME);
      layer.classList.remove('is-staring');
      layer.classList.add('is-lunging');
    },
    remove() {
      if (blinkTimer !== null) window.clearTimeout(blinkTimer);
      window.removeEventListener('pointermove', follow);
      layer.remove();
    },
  };
}
