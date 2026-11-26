/**
 * Tests for src/renderer/double-height.ts
 *
 * Covers tasks 14–17 from .kiro/specs/teletext-renderer/tasks.md (US-03):
 *
 *   14. applyDoubleHeight sets doubleHeight: true on every cell in the source row.
 *   15. applyDoubleHeight fills row+1 with the same char/fg/bg as the source row,
 *       with doubleHeightBottom: true.
 *   16. applyDoubleHeight throws StructureError when row+1 already contains
 *       non-default content.
 *   17. applyDoubleHeight does not modify row+2 or any other row.
 *
 * Arrange-Act-Assert, pure functions only, no DOM access.
 */

import { describe, it, expect } from 'vitest';
import { applyDoubleHeight } from '../../src/renderer/double-height.ts';
import { createGrid, readCell, writeCell, GRID_COLS } from '../../src/renderer/grid.ts';
import { StructureError } from '../../src/renderer/types.ts';
import type { Grid, TextCell, MosaicCell } from '../../src/renderer/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a text cell to the grid with an explicit char and optional colours. */
function writeText(
  grid: Grid,
  row: number,
  col: number,
  char: string,
  fg: TextCell['fg'] = 'White',
  bg: TextCell['bg'] = 'Black',
): Grid {
  return writeCell(grid, row, col, { kind: 'text', char, fg, bg } as Partial<TextCell>);
}

/** Write a mosaic cell to the grid. */
function writeMosaic(
  grid: Grid,
  row: number,
  col: number,
  sixels: number,
  fg: MosaicCell['fg'] = 'Cyan',
  bg: MosaicCell['bg'] = 'Black',
): Grid {
  return writeCell(grid, row, col, { kind: 'mosaic', sixels, fg, bg } as Partial<MosaicCell>);
}

// ---------------------------------------------------------------------------
// Task 14 — source row gets doubleHeight: true on every cell
// ---------------------------------------------------------------------------

describe('Task 14 — applyDoubleHeight marks source row cells as doubleHeight', () => {
  it('sets doubleHeight: true on all 40 cells of the source row', () => {
    // Arrange
    let grid = createGrid();
    // Write some content to row 5 so we can verify the attribute was added.
    for (let col = 0; col < GRID_COLS; col++) {
      grid = writeText(grid, 5, col, String.fromCodePoint(65 + (col % 26)));
    }

    // Act
    const result = applyDoubleHeight(grid, 5);

    // Assert
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = readCell(result, 5, col);
      expect(cell.attrs.doubleHeight, `col ${col} doubleHeight`).toBe(true);
    }
  });

  it('sets doubleHeight: true even on default (space) cells', () => {
    // Arrange
    const grid = createGrid(); // all cells are default

    // Act
    const result = applyDoubleHeight(grid, 1);

    // Assert
    for (let col = 0; col < GRID_COLS; col++) {
      expect(readCell(result, 1, col).attrs.doubleHeight).toBe(true);
    }
  });

  it('preserves the existing char, fg, and bg on source row cells', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 3, 0, 'H', 'Yellow', 'Blue');
    grid = writeText(grid, 3, 1, 'i', 'Green', 'Black');

    // Act
    const result = applyDoubleHeight(grid, 3);

    // Assert
    const cell0 = readCell(result, 3, 0) as TextCell;
    expect(cell0.kind).toBe('text');
    expect(cell0.char).toBe('H');
    expect(cell0.fg).toBe('Yellow');
    expect(cell0.bg).toBe('Blue');
    expect(cell0.attrs.doubleHeight).toBe(true);

    const cell1 = readCell(result, 3, 1) as TextCell;
    expect(cell1.char).toBe('i');
    expect(cell1.fg).toBe('Green');
  });
});

// ---------------------------------------------------------------------------
// Task 15 — row+1 filled with mirror cells carrying doubleHeightBottom: true
// ---------------------------------------------------------------------------

describe('Task 15 — applyDoubleHeight fills row+1 with mirror cells', () => {
  it('gives every cell in row+1 doubleHeightBottom: true', () => {
    // Arrange
    const grid = createGrid();

    // Act
    const result = applyDoubleHeight(grid, 2);

    // Assert
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = readCell(result, 3, col);
      expect(cell.attrs.doubleHeightBottom, `col ${col}`).toBe(true);
    }
  });

  it('copies char from source row into row+1 for text cells', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 10, 7, 'Z');

    // Act
    const result = applyDoubleHeight(grid, 10);

    // Assert — column 7 of row 11 should mirror row 10 col 7
    const bottom = readCell(result, 11, 7) as TextCell;
    expect(bottom.kind).toBe('text');
    expect(bottom.char).toBe('Z');
  });

  it('copies fg and bg from source row into row+1', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 6, 0, 'X', 'Magenta', 'Green');

    // Act
    const result = applyDoubleHeight(grid, 6);

    // Assert
    const bottom = readCell(result, 7, 0);
    expect(bottom.fg).toBe('Magenta');
    expect(bottom.bg).toBe('Green');
  });

  it('sets doubleHeightBottom: true and doubleHeight: false on row+1 cells', () => {
    // Arrange
    const grid = createGrid();

    // Act
    const result = applyDoubleHeight(grid, 4);

    // Assert — bottom half must NOT have doubleHeight set
    const cell = readCell(result, 5, 0);
    expect(cell.attrs.doubleHeight).toBe(false);
    expect(cell.attrs.doubleHeightBottom).toBe(true);
  });

  it('copies sixels, fg, and bg for mosaic cells into row+1', () => {
    // Arrange
    let grid = createGrid();
    // Mosaic with sixels=42 (0b101010), cyan on black
    grid = writeMosaic(grid, 8, 5, 42, 'Cyan', 'Black');

    // Act
    const result = applyDoubleHeight(grid, 8);

    // Assert
    const bottom = readCell(result, 9, 5) as MosaicCell;
    expect(bottom.kind).toBe('mosaic');
    expect(bottom.sixels).toBe(42);
    expect(bottom.fg).toBe('Cyan');
    expect(bottom.bg).toBe('Black');
    expect(bottom.attrs.doubleHeightBottom).toBe(true);
  });

  it('fills all 40 columns of row+1 even when source row has mixed content', () => {
    // Arrange
    let grid = createGrid();
    for (let col = 0; col < GRID_COLS; col += 2) {
      grid = writeText(grid, 12, col, 'A', 'Red', 'Black');
    }

    // Act
    const result = applyDoubleHeight(grid, 12);

    // Assert — every column of row 13 must have doubleHeightBottom
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = readCell(result, 13, col);
      expect(cell.attrs.doubleHeightBottom, `col ${col}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 16 — StructureError when row+1 has non-default content
// ---------------------------------------------------------------------------

describe('Task 16 — applyDoubleHeight throws StructureError on non-default row+1', () => {
  it('throws StructureError when row+1 has a non-space char', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 2, 0, 'X'); // row 2 is the bottom half

    // Act & Assert
    expect(() => applyDoubleHeight(grid, 1)).toThrow(StructureError);
  });

  it('throws StructureError when row+1 has a non-default fg', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 6, 10, ' ', 'Red', 'Black'); // fg differs from default White

    // Act & Assert
    expect(() => applyDoubleHeight(grid, 5)).toThrow(StructureError);
  });

  it('throws StructureError when row+1 has a non-default bg', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 15, 20, ' ', 'White', 'Blue'); // bg differs from default Black

    // Act & Assert
    expect(() => applyDoubleHeight(grid, 14)).toThrow(StructureError);
  });

  it('throws StructureError when row+1 contains a mosaic cell', () => {
    // Arrange
    let grid = createGrid();
    grid = writeMosaic(grid, 20, 0, 1); // any mosaic is non-default

    // Act & Assert
    expect(() => applyDoubleHeight(grid, 19)).toThrow(StructureError);
  });

  it('throws an error whose name is "StructureError"', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 2, 0, 'Y');

    // Act
    let caught: unknown;
    try {
      applyDoubleHeight(grid, 1);
    } catch (err) {
      caught = err;
    }

    // Assert
    expect(caught).toBeInstanceOf(StructureError);
    expect((caught as StructureError).name).toBe('StructureError');
  });

  it('does not throw when row+1 is entirely default', () => {
    // Arrange
    const grid = createGrid();

    // Act & Assert — should not throw
    expect(() => applyDoubleHeight(grid, 5)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 17 — no other rows are modified
// ---------------------------------------------------------------------------

describe('Task 17 — applyDoubleHeight leaves all rows except row and row+1 unchanged', () => {
  it('does not modify row+2 or beyond', () => {
    // Arrange
    let grid = createGrid();
    // Write distinctive content to row+2 so a mutation would be detectable.
    grid = writeText(grid, 7, 0, 'Q', 'Cyan', 'Black');

    // Act
    const result = applyDoubleHeight(grid, 5);

    // Assert — row 7 (row+2 relative to row 5) must be unchanged
    const cell = readCell(result, 7, 0) as TextCell;
    expect(cell.char).toBe('Q');
    expect(cell.fg).toBe('Cyan');
    expect(cell.attrs.doubleHeight).toBe(false);
    expect(cell.attrs.doubleHeightBottom).toBe(false);
  });

  it('does not modify the row before the source row', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 4, 15, 'P', 'Green', 'Black');

    // Act
    const result = applyDoubleHeight(grid, 5);

    // Assert — row 4 must be untouched
    const cell = readCell(result, 4, 15) as TextCell;
    expect(cell.char).toBe('P');
    expect(cell.fg).toBe('Green');
    expect(cell.attrs.doubleHeight).toBe(false);
  });

  it('leaves every row outside the [row, row+1] range identical to the input', () => {
    // Arrange — populate rows 0 and 22 with distinctive content
    let grid = createGrid();
    grid = writeText(grid, 0, 0, 'A', 'Yellow', 'Black');
    grid = writeText(grid, 22, 39, 'Z', 'Red', 'Black');

    // Act
    const result = applyDoubleHeight(grid, 10);

    // Assert row 0 and row 22 are unchanged
    const top = readCell(result, 0, 0) as TextCell;
    expect(top.char).toBe('A');
    expect(top.fg).toBe('Yellow');
    expect(top.attrs.doubleHeight).toBe(false);

    const bottom = readCell(result, 22, 39) as TextCell;
    expect(bottom.char).toBe('Z');
    expect(bottom.fg).toBe('Red');
  });
});

// ---------------------------------------------------------------------------
// Immutability — the input grid is never mutated
// ---------------------------------------------------------------------------

describe('Immutability', () => {
  it('returns a new grid object without mutating the input', () => {
    // Arrange
    let grid = createGrid();
    grid = writeText(grid, 3, 0, 'M');
    const originalCell = readCell(grid, 3, 0);

    // Act
    const result = applyDoubleHeight(grid, 3);

    // Assert — the original grid's cell must still not have doubleHeight
    expect(readCell(grid, 3, 0).attrs.doubleHeight).toBe(false);
    expect(result).not.toBe(grid);
    // The cell reference we captured before must also be unmodified
    expect(originalCell.attrs.doubleHeight).toBe(false);
  });
});
