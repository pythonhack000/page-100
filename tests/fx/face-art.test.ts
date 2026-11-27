import { describe, expect, it } from 'vitest';
import { FACE_COLUMNS, FACE_FRAMES, FACE_ROWS, MOUTH_ROWS, SCREAM_FRAME, SOCKETS, isSocketCell } from '../../src/fx/face-art.ts';

function darkCells(frame: readonly string[], rows: readonly number[]): number {
  return rows.reduce((sum, row) => sum + [...(frame[row] ?? '')].filter((pixel) => pixel === '.').length, 0);
}

/** Longest run of dark blocks down the middle of the face, below the nose. */
function mouthHeight(frame: readonly string[]): number {
  let best = 0;
  let run = 0;
  for (let row = MOUTH_ROWS[0] ?? 0; row < FACE_ROWS; row++) {
    const pixel = frame[row]?.[FACE_COLUMNS / 2 - 1];
    run = pixel === '.' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

describe('face art', () => {
  it('draws every frame on the same grid', () => {
    for (const frame of FACE_FRAMES) {
      expect(frame).toHaveLength(FACE_ROWS);
      for (const row of frame) expect(row).toHaveLength(FACE_COLUMNS);
    }
  });

  it('only changes the mouth between frames', () => {
    const [first, ...rest] = FACE_FRAMES;
    for (const frame of rest) {
      frame.forEach((row, index) => {
        if (!MOUTH_ROWS.includes(index)) expect(row).toBe(first?.[index]);
      });
    }
  });

  it('widens the grin with every frame', () => {
    const counts = FACE_FRAMES.map((frame) => darkCells(frame, MOUTH_ROWS));
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1] ?? 0);
  });

  it('centres each pupil on a dark socket cell', () => {
    const frame = FACE_FRAMES[0] ?? [];
    for (const socket of SOCKETS) {
      const pixel = frame[Math.floor(socket.y)]?.[Math.floor(socket.x)];
      expect(pixel).toBe('.');
    }
  });
});

describe('eye sockets', () => {
  it('marks only dark cells, and a good handful per eye, as socket', () => {
    const frame = FACE_FRAMES[0] ?? [];
    const perEye = SOCKETS.map(() => 0);
    frame.forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (!isSocketCell(x, y)) return;
        expect(pixel).toBe('.');
        const eye = x < FACE_COLUMNS / 2 ? 0 : 1;
        perEye[eye] = (perEye[eye] ?? 0) + 1;
      });
    });
    for (const count of perEye) expect(count).toBeGreaterThanOrEqual(15);
  });

  it('never marks the dark background outside the head', () => {
    expect(isSocketCell(0, 0)).toBe(false);
    expect(isSocketCell(FACE_COLUMNS - 1, FACE_ROWS - 1)).toBe(false);
  });
});

describe('scream frame', () => {
  it('keeps the eyes and the grid, and opens the mouth far taller than any grin', () => {
    const calm = FACE_FRAMES[0] ?? [];
    expect(SCREAM_FRAME).toHaveLength(FACE_ROWS);
    SCREAM_FRAME.forEach((row, index) => {
      expect(row).toHaveLength(FACE_COLUMNS);
      if (index < (MOUTH_ROWS[0] ?? 0)) expect(row).toBe(calm[index]);
    });
    const widest = FACE_FRAMES[FACE_FRAMES.length - 1] ?? [];
    expect(mouthHeight(SCREAM_FRAME)).toBeGreaterThan(mouthHeight(widest) + 2);
  });
});
