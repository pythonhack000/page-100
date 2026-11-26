/**
 * Tests for src/renderer/grid.ts
 *
 * Covers tasks 6–13 from .kiro/specs/teletext-renderer/tasks.md (US-01, US-02).
 *
 * Arrange-Act-Assert, pure functions only, no DOM access.
 */

import { describe, it, expect } from 'vitest';
import { createGrid, readCell, writeCell, GRID_COLS, GRID_ROWS, GRID_SIZE } from '../../src/renderer/grid.ts';
import type { Cell, MosaicCell, TextCell } from '../../src/renderer/types.ts';

// ---------------------------------------------------------------------------
// Task 6 — createGrid returns exactly 960 cells
// ---------------------------------------------------------------------------

describe('createGrid', () => {
  it('returns an array of exactly 960 cells', () => {
    // Arrange / Act
    const grid = createGrid();

    // Assert
    expect(grid).toHaveLength(GRID_SIZE);
    expect(grid).toHaveLength(960);
  });

  // Task 7 — every cell has the correct defaults
  it('every cell has char U+0020, fg White, bg Black, all attrs false', () => {
    // Arrange / Act
    const grid = createGrid();

    // Assert — check all 960 cells
    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i] as TextCell;
      expect(cell.kind, `cell ${i} kind`).toBe('text');
      expect(cell.char, `cell ${i} char`).toBe(' ');
      expect(cell.fg, `cell ${i} fg`).toBe('White');
      expect(cell.bg, `cell ${i} bg`).toBe('Black');
      expect(cell.attrs.doubleHeight, `cell ${i} doubleHeight`).toBe(false);
      expect(cell.attrs.doubleHeightBottom, `cell ${i} doubleHeightBottom`).toBe(false);
      expect(cell.attrs.mosaic, `cell ${i} mosaic`).toBe(false);
      expect(cell.attrs.concealed, `cell ${i} concealed`).toBe(false);
    }
  });

  // Sanity-check the exported dimension constants used throughout
  it('GRID_COLS is 40, GRID_ROWS is 24, GRID_SIZE is 960', () => {
    expect(GRID_COLS).toBe(40);
    expect(GRID_ROWS).toBe(24);
    expect(GRID_SIZE).toBe(960);
  });
});

// ---------------------------------------------------------------------------
// Task 8 — writeCell is immutable
// ---------------------------------------------------------------------------

describe('writeCell — immutability', () => {
  it('returns a new grid instance, not the original', () => {
    // Arrange
    const original = createGrid();

    // Act
    const updated = writeCell(original, 5, 10, { fg: 'Red' });

    // Assert
    expect(updated).not.toBe(original);
  });

  it('the original grid cell is unchanged after writeCell', () => {
    // Arrange
    const original = createGrid();
    const before = (original[5 * GRID_COLS + 10] as TextCell).fg;

    // Act
    writeCell(original, 5, 10, { fg: 'Red' });

    // Assert — original grid still has the old value
    const after = (original[5 * GRID_COLS + 10] as TextCell).fg;
    expect(after).toBe(before);
    expect(after).toBe('White');
  });

  it('the updated grid reflects the written value', () => {
    // Arrange
    const original = createGrid();

    // Act
    const updated = writeCell(original, 5, 10, { fg: 'Red' });

    // Assert
    const cell = updated[5 * GRID_COLS + 10] as TextCell;
    expect(cell.fg).toBe('Red');
  });

  it('only the target cell changes; all other cells remain at defaults', () => {
    // Arrange
    const original = createGrid();

    // Act
    const updated = writeCell(original, 0, 0, { char: 'P' });

    // Assert — every cell except (0,0) is unchanged
    for (let i = 1; i < GRID_SIZE; i++) {
      expect(updated[i]).toBe(original[i]);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 9 — readCell returns the last written value
// ---------------------------------------------------------------------------

describe('readCell — round-trip', () => {
  it('returns the value last written to a cell', () => {
    // Arrange
    const grid = createGrid();
    const grid2 = writeCell(grid, 3, 7, { char: 'X', fg: 'Cyan' });

    // Act
    const cell = readCell(grid2, 3, 7) as TextCell;

    // Assert
    expect(cell.char).toBe('X');
    expect(cell.fg).toBe('Cyan');
  });

  it('a second writeCell to the same position overwrites the first', () => {
    // Arrange
    const g1 = writeCell(createGrid(), 1, 1, { char: 'A' });
    const g2 = writeCell(g1, 1, 1, { char: 'B' });

    // Act
    const cell = readCell(g2, 1, 1) as TextCell;

    // Assert
    expect(cell.char).toBe('B');
  });

  it('a write to one position does not affect a neighbouring position', () => {
    // Arrange
    const g = writeCell(createGrid(), 0, 0, { char: 'Z' });

    // Act
    const neighbour = readCell(g, 0, 1) as TextCell;

    // Assert
    expect(neighbour.char).toBe(' ');
  });
});

// ---------------------------------------------------------------------------
// Task 10 — readCell returns defaults for an unwritten cell
// ---------------------------------------------------------------------------

describe('readCell — default values', () => {
  it('returns kind text for an unwritten cell', () => {
    const cell = readCell(createGrid(), 12, 20);
    expect(cell.kind).toBe('text');
  });

  it('returns char space for an unwritten cell', () => {
    const cell = readCell(createGrid(), 12, 20) as TextCell;
    expect(cell.char).toBe(' ');
  });

  it('returns fg White for an unwritten cell', () => {
    const cell = readCell(createGrid(), 12, 20);
    expect(cell.fg).toBe('White');
  });

  it('returns bg Black for an unwritten cell', () => {
    const cell = readCell(createGrid(), 12, 20);
    expect(cell.bg).toBe('Black');
  });

  it('returns all attrs false for an unwritten cell', () => {
    const cell = readCell(createGrid(), 12, 20);
    expect(cell.attrs.doubleHeight).toBe(false);
    expect(cell.attrs.doubleHeightBottom).toBe(false);
    expect(cell.attrs.mosaic).toBe(false);
    expect(cell.attrs.concealed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 11 — RangeError for out-of-bounds coordinates
// ---------------------------------------------------------------------------

describe('RangeError on out-of-bounds access', () => {
  const grid = createGrid();

  // readCell — invalid row
  it('readCell throws RangeError for row < 0', () => {
    expect(() => readCell(grid, -1, 0)).toThrow(RangeError);
  });

  it('readCell throws RangeError for row > 23', () => {
    expect(() => readCell(grid, 24, 0)).toThrow(RangeError);
  });

  // readCell — invalid col
  it('readCell throws RangeError for col < 0', () => {
    expect(() => readCell(grid, 0, -1)).toThrow(RangeError);
  });

  it('readCell throws RangeError for col > 39', () => {
    expect(() => readCell(grid, 0, 40)).toThrow(RangeError);
  });

  // writeCell — invalid row
  it('writeCell throws RangeError for row < 0', () => {
    expect(() => writeCell(grid, -1, 0, { char: 'A' })).toThrow(RangeError);
  });

  it('writeCell throws RangeError for row > 23', () => {
    expect(() => writeCell(grid, 24, 0, { char: 'A' })).toThrow(RangeError);
  });

  // writeCell — invalid col
  it('writeCell throws RangeError for col < 0', () => {
    expect(() => writeCell(grid, 0, -1, { char: 'A' })).toThrow(RangeError);
  });

  it('writeCell throws RangeError for col > 39', () => {
    expect(() => writeCell(grid, 0, 40, { char: 'A' })).toThrow(RangeError);
  });

  // Boundary — last valid cell must NOT throw
  it('readCell does not throw for the last valid cell (row 23, col 39)', () => {
    expect(() => readCell(grid, 23, 39)).not.toThrow();
  });

  it('writeCell does not throw for the last valid cell (row 23, col 39)', () => {
    expect(() => writeCell(grid, 23, 39, { char: 'Z' })).not.toThrow();
  });

  // Boundary — first valid cell must NOT throw
  it('readCell does not throw for the first valid cell (row 0, col 0)', () => {
    expect(() => readCell(grid, 0, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 12 — writeCell throws TypeError for invalid fg
// ---------------------------------------------------------------------------

describe('writeCell — fg colour validation', () => {
  const grid = createGrid();

  it('throws TypeError when fg is not a valid TeletextColour', () => {
    // @ts-expect-error — deliberately passing an invalid value
    expect(() => writeCell(grid, 0, 0, { fg: 'Purple' })).toThrow(TypeError);
  });

  it('throws TypeError when fg is an empty string', () => {
    // @ts-expect-error — deliberately passing an invalid value
    expect(() => writeCell(grid, 0, 0, { fg: '' })).toThrow(TypeError);
  });

  it('throws TypeError when fg is a number', () => {
    // @ts-expect-error — deliberately passing an invalid value
    expect(() => writeCell(grid, 0, 0, { fg: 42 })).toThrow(TypeError);
  });

  it('does not throw for every valid fg colour', () => {
    const valid = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'] as const;
    for (const colour of valid) {
      expect(() => writeCell(grid, 0, 0, { fg: colour })).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Task 13 — writeCell throws TypeError for invalid bg
// ---------------------------------------------------------------------------

describe('writeCell — bg colour validation', () => {
  const grid = createGrid();

  it('throws TypeError when bg is not a valid TeletextColour', () => {
    // @ts-expect-error — deliberately passing an invalid value
    expect(() => writeCell(grid, 0, 0, { bg: 'Orange' })).toThrow(TypeError);
  });

  it('throws TypeError when bg is an empty string', () => {
    // @ts-expect-error — deliberately passing an invalid value
    expect(() => writeCell(grid, 0, 0, { bg: '' })).toThrow(TypeError);
  });

  it('throws TypeError when bg is null', () => {
    // @ts-expect-error — deliberately passing an invalid value
    expect(() => writeCell(grid, 0, 0, { bg: null })).toThrow(TypeError);
  });

  it('does not throw for every valid bg colour', () => {
    const valid = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'] as const;
    for (const colour of valid) {
      expect(() => writeCell(grid, 0, 0, { bg: colour })).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Additional integration: writeCell preserves unspecified fields
// ---------------------------------------------------------------------------

describe('writeCell — partial update merging', () => {
  it('a partial update to fg leaves char and bg unchanged', () => {
    // Arrange
    const g1 = writeCell(createGrid(), 2, 5, { char: 'Q', fg: 'Green', bg: 'Blue' });

    // Act
    const g2 = writeCell(g1, 2, 5, { fg: 'Yellow' });
    const cell = readCell(g2, 2, 5) as TextCell;

    // Assert
    expect(cell.char).toBe('Q');
    expect(cell.fg).toBe('Yellow');
    expect(cell.bg).toBe('Blue');
  });

  it('a partial update to attrs merges with existing attrs', () => {
    // Arrange
    const g1 = writeCell(createGrid(), 4, 0, { attrs: { doubleHeight: true, doubleHeightBottom: false, mosaic: false, concealed: false } });

    // Act
    const g2 = writeCell(g1, 4, 0, { attrs: { doubleHeight: true, doubleHeightBottom: false, mosaic: false, concealed: true } });
    const cell = readCell(g2, 4, 0);

    // Assert
    expect(cell.attrs.doubleHeight).toBe(true);
    expect(cell.attrs.concealed).toBe(true);
  });

  it('writing a MosaicCell kind stores sixels correctly', () => {
    // Arrange
    const grid = createGrid();
    const partial: Partial<MosaicCell> = { kind: 'mosaic', sixels: 42, fg: 'Cyan', bg: 'Black' };

    // Act
    const updated = writeCell(grid, 10, 20, partial);
    const cell = readCell(updated, 10, 20) as MosaicCell;

    // Assert
    expect(cell.kind).toBe('mosaic');
    expect(cell.sixels).toBe(42);
    expect(cell.fg).toBe('Cyan');
  });
});
