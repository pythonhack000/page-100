import { describe, expect, it } from 'vitest';
import { FACE_COLUMNS, FACE_FRAMES, FACE_ROWS, MOUTH_ROWS, SOCKETS } from '../../src/fx/face-art.ts';

function darkCells(frame: readonly string[], rows: readonly number[]): number {
  return rows.reduce((sum, row) => sum + [...(frame[row] ?? '')].filter((pixel) => pixel === '.').length, 0);
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
