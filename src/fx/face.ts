/**
 * src/fx/face.ts
 *
 * The face behind page 666, drawn in teletext blocks. Its eye sockets are
 * empty except for two small pupils that follow the viewer's pointer.
 */

/** # is a lit block, . is dark. Eye sockets are left empty for the pupils. */
export const FACE = [
  '.......######.......',
  '.....##########.....',
  '....############....',
  '...##############...',
  '...###..####..###...',
  '..###....##....###..',
  '..###....##....###..',
  '..###....##....###..',
  '...###..####..###...',
  '...######..######...',
  '....####....####....',
  '....###......###....',
  '....###......###....',
  '.....###....###.....',
  '......########......',
  '........####........',
];

const COLUMNS = 20;
const ROWS = FACE.length;
/** Centre of each eye socket, in block units. */
const SOCKETS = [
  { x: 5.5, y: 6.5 },
  { x: 14.5, y: 6.5 },
] as const;
/** How far a pupil may travel inside its socket, in blocks. */
const PUPIL_REACH = 1.4;

export function buildFaceGrid(): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'tv__face-grid';
  for (const row of FACE) {
    for (const pixel of row) {
      const cell = document.createElement('span');
      if (pixel === '#') cell.className = 'is-lit';
      grid.appendChild(cell);
    }
  }
  return grid;
}

export interface WatchingFace {
  readonly element: HTMLElement;
  /** Fades the face to `opacity` over `ms`. */
  fadeTo(opacity: number, ms: number): void;
  /** The jump: the face rushes the glass. */
  lunge(): void;
  remove(): void;
}

export function mountWatchingFace(glass: HTMLElement): WatchingFace {
  const layer = document.createElement('div');
  layer.className = 'tv__face';
  layer.setAttribute('aria-hidden', 'true');
  const wrap = document.createElement('div');
  wrap.className = 'tv__face-wrap';
  wrap.appendChild(buildFaceGrid());
  const pupils = SOCKETS.map((socket) => {
    const pupil = document.createElement('span');
    pupil.className = 'tv__pupil';
    pupil.style.left = `${(socket.x / COLUMNS) * 100}%`;
    pupil.style.top = `${(socket.y / ROWS) * 100}%`;
    wrap.appendChild(pupil);
    return pupil;
  });
  layer.appendChild(wrap);
  glass.appendChild(layer);

  const follow = (event: PointerEvent): void => {
    const box = wrap.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const reachX = (box.width / COLUMNS) * PUPIL_REACH;
    const reachY = (box.height / ROWS) * PUPIL_REACH;
    const x = (dx / length) * reachX;
    const y = (dy / length) * reachY;
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
    lunge() {
      layer.classList.add('is-lunging');
    },
    remove() {
      window.removeEventListener('pointermove', follow);
      layer.remove();
    },
  };
}
