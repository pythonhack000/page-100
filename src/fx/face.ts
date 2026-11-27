/**
 * src/fx/face.ts
 *
 * Puts the face from face-art.ts on the glass. Its pupils follow the
 * viewer's pointer, and its grin can be stretched one stage at a time.
 */

import { FACE_COLUMNS, FACE_FRAMES, FACE_ROWS, MOUTH_ROWS, SOCKETS } from './face-art.ts';

/** How far a pupil may travel inside its socket, in blocks. */
const PUPIL_REACH = 1.6;
const LAST_GRIN = FACE_FRAMES.length - 1;

function paint(cell: HTMLElement, pixel: string | undefined): void {
  cell.className = pixel === '#' ? 'is-lit' : pixel === 'o' ? 'is-dim' : '';
}

/** The face as a grid of blocks, drawn at grin stage `stage`. */
export function buildFaceGrid(stage = 0): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'tv__face-grid';
  grid.style.gridTemplateColumns = `repeat(${FACE_COLUMNS}, 1fr)`;
  const frame = FACE_FRAMES[Math.min(stage, LAST_GRIN)] ?? [];
  for (const row of frame) {
    for (const pixel of row) {
      const cell = document.createElement('span');
      paint(cell, pixel);
      grid.appendChild(cell);
    }
  }
  return grid;
}

/** Redraws only the mouth rows of `grid` at grin stage `stage`. */
function drawGrin(grid: HTMLElement, stage: number): void {
  const frame = FACE_FRAMES[Math.min(stage, LAST_GRIN)] ?? [];
  for (const row of MOUTH_ROWS) {
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
  /** The jump: the face rushes the glass, grinning as wide as it can. */
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
  const follow = (event: PointerEvent): void => {
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
      drawGrin(grid, stage);
    },
    lunge() {
      stage = LAST_GRIN;
      drawGrin(grid, stage);
      layer.classList.add('is-lunging');
    },
    remove() {
      window.removeEventListener('pointermove', follow);
      layer.remove();
    },
  };
}
