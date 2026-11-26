/**
 * Tests for src/renderer/layout.ts
 *
 * Covers tasks 26–43 from .kiro/specs/teletext-renderer/tasks.md
 * (US-05, US-06, US-07, US-08).
 *
 * Arrange-Act-Assert, pure functions only, no DOM access.
 */

import { describe, it, expect } from 'vitest';
import {
  composeHeader,
  updateClock,
  composeFastext,
  composePage,
  buildPlainText,
} from '../../src/renderer/layout.ts';
import { createGrid, readCell, writeCell } from '../../src/renderer/grid.ts';
import { applyDoubleHeight } from '../../src/renderer/double-height.ts';
import { StructureError } from '../../src/renderer/types.ts';
import type {
  Grid,
  TextCell,
  MosaicCell,
  HeaderDescriptor,
  FastextDescriptor,
  RowSpec,
} from '../../src/renderer/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Concatenate the char values of cells from colStart to colEnd (inclusive) in a given row. */
function rowChars(grid: Grid, row: number, colStart: number, colEnd: number): string {
  let s = '';
  for (let col = colStart; col <= colEnd; col++) {
    const cell = readCell(grid, row, col) as TextCell;
    s += cell.char;
  }
  return s;
}

/** Collect the fg colour of each cell from colStart to colEnd in a given row. */
function rowFg(grid: Grid, row: number, colStart: number, colEnd: number): string[] {
  const colours: string[] = [];
  for (let col = colStart; col <= colEnd; col++) {
    colours.push(readCell(grid, row, col).fg);
  }
  return colours;
}

/** Collect the bg colour of each cell from colStart to colEnd in a given row. */
function rowBg(grid: Grid, row: number, colStart: number, colEnd: number): string[] {
  const colours: string[] = [];
  for (let col = colStart; col <= colEnd; col++) {
    colours.push(readCell(grid, row, col).bg);
  }
  return colours;
}

// ---------------------------------------------------------------------------
// Task 26 — composeHeader writes Pnnn in columns 0–3 of row 0
// ---------------------------------------------------------------------------

describe('composeHeader — page number (task 26)', () => {
  it('writes P100 in columns 0–3 for page number 100', () => {
    // Arrange
    const grid = createGrid();
    const header: HeaderDescriptor = { pageNumber: 100, serviceName: 'TEST' };

    // Act
    const result = composeHeader(grid, header);

    // Assert
    expect(rowChars(result, 0, 0, 3)).toBe('P100');
  });

  it('writes P200 for page number 200', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 200, serviceName: '' });
    expect(rowChars(result, 0, 0, 3)).toBe('P200');
  });

  it('writes P899 for page number 899', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 899, serviceName: '' });
    expect(rowChars(result, 0, 0, 3)).toBe('P899');
  });

  it('writes P666 for page number 666', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 666, serviceName: '' });
    expect(rowChars(result, 0, 0, 3)).toBe('P666');
  });
});

// ---------------------------------------------------------------------------
// Task 27 — composeHeader writes four spaces in columns 4–7
// ---------------------------------------------------------------------------

describe('composeHeader — pad columns 4–7 (task 27)', () => {
  it('writes four spaces in columns 4–7', () => {
    // Arrange
    const grid = createGrid();

    // Act
    const result = composeHeader(grid, { pageNumber: 100, serviceName: 'SVC' });

    // Assert
    expect(rowChars(result, 0, 4, 7)).toBe('    ');
  });

  it('the pad is four spaces regardless of the page number', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 500, serviceName: 'FOO' });
    expect(rowChars(result, 0, 4, 7)).toBe('    ');
  });
});

// ---------------------------------------------------------------------------
// Task 28 — composeHeader places service name in columns 8–31, padded to 24 chars
// ---------------------------------------------------------------------------

describe('composeHeader — service name columns 8–31 (task 28)', () => {
  it('a short service name is left-aligned and padded with spaces to 24 characters', () => {
    // Arrange
    const grid = createGrid();
    const name = 'MY SERVICE';

    // Act
    const result = composeHeader(grid, { pageNumber: 100, serviceName: name });
    const field = rowChars(result, 0, 8, 31);

    // Assert
    expect(field).toHaveLength(24);
    expect(field.startsWith(name)).toBe(true);
    expect(field).toBe(name.padEnd(24, ' '));
  });

  it('a 24-character service name fills columns 8–31 exactly', () => {
    const grid = createGrid();
    const name = 'ABCDEFGHIJKLMNOPQRSTUVWX'; // exactly 24 chars
    const result = composeHeader(grid, { pageNumber: 100, serviceName: name });
    expect(rowChars(result, 0, 8, 31)).toBe(name);
  });

  it('a service name longer than 24 characters is truncated to 24', () => {
    const grid = createGrid();
    const name = 'A'.repeat(30);
    const result = composeHeader(grid, { pageNumber: 100, serviceName: name });
    const field = rowChars(result, 0, 8, 31);
    expect(field).toHaveLength(24);
    expect(field).toBe('A'.repeat(24));
  });

  it('an empty service name produces 24 spaces in columns 8–31', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 100, serviceName: '' });
    expect(rowChars(result, 0, 8, 31)).toBe(' '.repeat(24));
  });
});

// ---------------------------------------------------------------------------
// Task 29 — composeHeader writes the clock in HH:MM:SS format in columns 32–39
// ---------------------------------------------------------------------------

describe('composeHeader — clock columns 32–39 (task 29)', () => {
  it('writes a string matching HH:MM:SS format in columns 32–39', () => {
    // Arrange
    const grid = createGrid();

    // Act
    const result = composeHeader(grid, { pageNumber: 100, serviceName: '' });
    const clock = rowChars(result, 0, 32, 39);

    // Assert
    expect(clock).toHaveLength(8);
    expect(clock).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('the clock field is exactly 8 characters wide (cols 32–39 inclusive)', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 100, serviceName: '' });
    expect(rowChars(result, 0, 32, 39)).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// Task 30 — composeHeader applies fg White and bg Black to every cell in row 0
// ---------------------------------------------------------------------------

describe('composeHeader — row 0 colours (task 30)', () => {
  it('every cell in row 0 has fg White', () => {
    // Arrange
    const grid = createGrid();

    // Act
    const result = composeHeader(grid, { pageNumber: 100, serviceName: 'TEST SVC' });

    // Assert
    const fgs = rowFg(result, 0, 0, 39);
    expect(fgs.every(c => c === 'White')).toBe(true);
  });

  it('every cell in row 0 has bg Black', () => {
    const grid = createGrid();
    const result = composeHeader(grid, { pageNumber: 100, serviceName: 'TEST SVC' });
    const bgs = rowBg(result, 0, 0, 39);
    expect(bgs.every(c => c === 'Black')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 31 — updateClock changes only columns 32–39 of row 0
// ---------------------------------------------------------------------------

describe('updateClock — only columns 32–39 change (task 31)', () => {
  it('updates the 8 clock cells in columns 32–39 to a valid HH:MM:SS string', () => {
    // Arrange
    const base = composeHeader(createGrid(), { pageNumber: 100, serviceName: 'MY SERVICE' });

    // Act
    const updated = updateClock(base, new Date('2026-11-26T08:39:41.000Z'));
    const clock = rowChars(updated, 0, 32, 39);

    // Assert
    expect(clock).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('leaves every cell in columns 0–31 of row 0 unchanged', () => {
    // Arrange
    const base = composeHeader(createGrid(), { pageNumber: 100, serviceName: 'UNCHANGED SERVICE' });

    // Act
    const updated = updateClock(base, new Date());

    // Assert
    for (let col = 0; col <= 31; col++) {
      expect(readCell(updated, 0, col)).toEqual(readCell(base, 0, col));
    }
  });

  it('leaves all rows other than row 0 completely unchanged', () => {
    // Arrange
    const base = composeHeader(createGrid(), { pageNumber: 100, serviceName: '' });

    // Act
    const updated = updateClock(base, new Date());

    // Assert
    for (let row = 1; row <= 23; row++) {
      for (let col = 0; col <= 39; col++) {
        expect(readCell(updated, row, col)).toEqual(readCell(base, row, col));
      }
    }
  });

  it('two distinct times produce different clock strings', () => {
    // Arrange
    const base = composeHeader(createGrid(), { pageNumber: 100, serviceName: '' });
    const timeA = new Date('2026-01-01T12:00:00Z');
    const timeB = new Date('2026-01-01T13:30:45Z');

    // Act
    const clockA = rowChars(updateClock(base, timeA), 0, 32, 39);
    const clockB = rowChars(updateClock(base, timeB), 0, 32, 39);

    // Assert
    expect(clockA).not.toBe(clockB);
  });
});

// ---------------------------------------------------------------------------
// Task 32 — composeFastext slot content: space + 3-digit page + padded label
// ---------------------------------------------------------------------------

describe('composeFastext — slot content (task 32)', () => {
  it('the red slot starts with a space at column 0 of row 23', () => {
    // Arrange
    const grid = createGrid();

    // Act
    const result = composeFastext(grid, { red: { page: 101, label: 'NEWS' } });

    // Assert
    expect((readCell(result, 23, 0) as TextCell).char).toBe(' ');
  });

  it('the red slot has the three-digit page number in columns 1–3', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { red: { page: 101, label: 'NEWS' } });
    expect(rowChars(result, 23, 1, 3)).toBe('101');
  });

  it('the red slot occupies exactly 10 characters in columns 0–9', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { red: { page: 101, label: 'NEWS' } });
    expect(rowChars(result, 23, 0, 9)).toHaveLength(10);
  });

  it('the green slot has its page number in columns 11–13', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { green: { page: 400, label: 'WEATHER' } });
    expect(rowChars(result, 23, 11, 13)).toBe('400');
  });

  it('the yellow slot has its page number in columns 21–23', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { yellow: { page: 500, label: 'RATES' } });
    expect(rowChars(result, 23, 21, 23)).toBe('500');
  });

  it('the cyan slot has its page number in columns 31–33', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { cyan: { page: 666, label: 'GHOST' } });
    expect(rowChars(result, 23, 31, 33)).toBe('666');
  });

  it('a slot with a short label is padded to fill all 10 characters', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { red: { page: 100, label: 'IDX' } });
    expect(rowChars(result, 23, 0, 9)).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Task 33 — composeFastext applies the slot's colour as fg to non-space cells
// ---------------------------------------------------------------------------

describe('composeFastext — slot colours (task 33)', () => {
  it('the red slot page-number cells have fg Red', () => {
    // Arrange
    const grid = createGrid();
    const result = composeFastext(grid, { red: { page: 101, label: 'NEWS' } });

    // Assert — columns 1–3 (the page number) must be Red
    const fgs = rowFg(result, 23, 1, 3);
    expect(fgs.every(c => c === 'Red')).toBe(true);
  });

  it('the green slot page-number cells have fg Green', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { green: { page: 400, label: 'WX' } });
    const fgs = rowFg(result, 23, 11, 13);
    expect(fgs.every(c => c === 'Green')).toBe(true);
  });

  it('the yellow slot page-number cells have fg Yellow', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { yellow: { page: 500, label: 'FX' } });
    const fgs = rowFg(result, 23, 21, 23);
    expect(fgs.every(c => c === 'Yellow')).toBe(true);
  });

  it('the cyan slot page-number cells have fg Cyan', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { cyan: { page: 666, label: 'BOO' } });
    const fgs = rowFg(result, 23, 31, 33);
    expect(fgs.every(c => c === 'Cyan')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 34 — composeFastext fills empty slots with space cells fg Black bg Black
// ---------------------------------------------------------------------------

describe('composeFastext — empty slots (task 34)', () => {
  it('an absent red slot fills columns 0–9 with spaces', () => {
    // Arrange
    const grid = createGrid();
    const result = composeFastext(grid, {});

    // Assert
    expect(rowChars(result, 23, 0, 9)).toBe(' '.repeat(10));
  });

  it('an absent red slot uses fg Black for all cells in columns 0–9', () => {
    const grid = createGrid();
    const result = composeFastext(grid, {});
    expect(rowFg(result, 23, 0, 9).every(c => c === 'Black')).toBe(true);
  });

  it('an absent red slot uses bg Black for all cells in columns 0–9', () => {
    const grid = createGrid();
    const result = composeFastext(grid, {});
    expect(rowBg(result, 23, 0, 9).every(c => c === 'Black')).toBe(true);
  });

  it('an absent green slot fills columns 10–19 with fg Black bg Black spaces', () => {
    const grid = createGrid();
    const result = composeFastext(grid, { red: { page: 100, label: 'IDX' } });
    expect(rowChars(result, 23, 10, 19)).toBe(' '.repeat(10));
    expect(rowFg(result, 23, 10, 19).every(c => c === 'Black')).toBe(true);
    expect(rowBg(result, 23, 10, 19).every(c => c === 'Black')).toBe(true);
  });

  it('an absent yellow slot fills columns 20–29 with fg Black bg Black spaces', () => {
    const grid = createGrid();
    const result = composeFastext(grid, {});
    expect(rowChars(result, 23, 20, 29)).toBe(' '.repeat(10));
    expect(rowFg(result, 23, 20, 29).every(c => c === 'Black')).toBe(true);
  });

  it('an absent cyan slot fills columns 30–39 with fg Black bg Black spaces', () => {
    const grid = createGrid();
    const result = composeFastext(grid, {});
    expect(rowChars(result, 23, 30, 39)).toBe(' '.repeat(10));
    expect(rowFg(result, 23, 30, 39).every(c => c === 'Black')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 35 — composePage returns a TeletextPage whose grid has 960 cells
// ---------------------------------------------------------------------------

describe('composePage — grid size (task 35)', () => {
  it('returns a grid with exactly 960 cells', () => {
    // Arrange
    const header: HeaderDescriptor = { pageNumber: 100, serviceName: 'TEST' };

    // Act
    const page = composePage(header, [], {});

    // Assert
    expect(page.grid).toHaveLength(960);
  });

  it('the returned TeletextPage has both grid and plainText properties', () => {
    const page = composePage({ pageNumber: 100, serviceName: '' }, [], {});
    expect(page).toHaveProperty('grid');
    expect(page).toHaveProperty('plainText');
  });
});

// ---------------------------------------------------------------------------
// Task 36 — composePage maps contentRows[0] → row 1, contentRows[21] → row 22
// ---------------------------------------------------------------------------

describe('composePage — content row mapping (task 36)', () => {
  it('contentRows[0] appears on grid row 1', () => {
    // Arrange
    const contentRows: RowSpec[] = [
      { cells: [{ kind: 'text', char: 'Z', fg: 'Cyan' }] },
    ];

    // Act
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Assert
    const cell = readCell(page.grid, 1, 0) as TextCell;
    expect(cell.char).toBe('Z');
    expect(cell.fg).toBe('Cyan');
  });

  it('contentRows[21] appears on grid row 22', () => {
    // Arrange — 22 rows; mark only the last one
    const contentRows: RowSpec[] = Array.from({ length: 22 }, (_, i) => ({
      cells: i === 21
        ? [{ kind: 'text' as const, char: 'Q', fg: 'Yellow' as const }]
        : [],
    }));

    // Act
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Assert
    const cell = readCell(page.grid, 22, 0) as TextCell;
    expect(cell.char).toBe('Q');
    expect(cell.fg).toBe('Yellow');
  });

  it('contentRows[0] does not overwrite grid row 0 (the header)', () => {
    const contentRows: RowSpec[] = [{ cells: [{ kind: 'text', char: 'X' }] }];
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Col 0 of row 0 must be 'P' (from the header)
    expect((readCell(page.grid, 0, 0) as TextCell).char).toBe('P');
  });
});

// ---------------------------------------------------------------------------
// Task 37 — unspecified content rows are filled with default cells
// ---------------------------------------------------------------------------

describe('composePage — unspecified rows default (task 37)', () => {
  it('a content row with an empty cells array is filled with default cells', () => {
    // Arrange
    const page = composePage({ pageNumber: 100, serviceName: '' }, [{ cells: [] }], {});

    // Assert — row 1 is all defaults
    for (let col = 0; col < 40; col++) {
      const cell = readCell(page.grid, 1, col) as TextCell;
      expect(cell.char, `col ${col}`).toBe(' ');
      expect(cell.fg, `col ${col}`).toBe('White');
      expect(cell.bg, `col ${col}`).toBe('Black');
    }
  });

  it('rows not supplied at all are filled with default cells', () => {
    // Arrange — supply zero content rows
    const page = composePage({ pageNumber: 100, serviceName: '' }, [], {});

    for (let row = 1; row <= 22; row++) {
      for (let col = 0; col < 40; col++) {
        const cell = readCell(page.grid, row, col) as TextCell;
        expect(cell.char, `row ${row} col ${col}`).toBe(' ');
        expect(cell.fg, `row ${row} col ${col}`).toBe('White');
        expect(cell.bg, `row ${row} col ${col}`).toBe('Black');
      }
    }
  });

  it('cells past the end of a short row spec are padded with defaults', () => {
    // Arrange — first row has only one cell specified
    const contentRows: RowSpec[] = [{ cells: [{ kind: 'text', char: 'A' }] }];
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Assert — columns 1–39 of row 1 are default spaces
    for (let col = 1; col < 40; col++) {
      const cell = readCell(page.grid, 1, col) as TextCell;
      expect(cell.char, `col ${col}`).toBe(' ');
    }
  });
});

// ---------------------------------------------------------------------------
// Task 38 — composePage throws StructureError for more than 22 content rows
// ---------------------------------------------------------------------------

describe('composePage — overflow guard (task 38)', () => {
  it('throws StructureError when 23 content rows are supplied', () => {
    const tooMany: RowSpec[] = Array.from({ length: 23 }, () => ({ cells: [] }));
    expect(() => composePage({ pageNumber: 100, serviceName: '' }, tooMany, {}))
      .toThrow(StructureError);
  });

  it('throws StructureError when 100 content rows are supplied', () => {
    const tooMany: RowSpec[] = Array.from({ length: 100 }, () => ({ cells: [] }));
    expect(() => composePage({ pageNumber: 100, serviceName: '' }, tooMany, {}))
      .toThrow(StructureError);
  });

  it('does not throw for exactly 22 content rows', () => {
    const exactly22: RowSpec[] = Array.from({ length: 22 }, () => ({ cells: [] }));
    expect(() => composePage({ pageNumber: 100, serviceName: '' }, exactly22, {}))
      .not.toThrow();
  });

  it('does not throw for 0 content rows', () => {
    expect(() => composePage({ pageNumber: 100, serviceName: '' }, [], {}))
      .not.toThrow();
  });

  it('does not throw for 1 content row', () => {
    expect(() => composePage(
      { pageNumber: 100, serviceName: '' },
      [{ cells: [] }],
      {},
    )).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 39 — RowSpec with doubleHeight: true calls applyDoubleHeight and
//           consumes the next content slot
// ---------------------------------------------------------------------------

describe('composePage — doubleHeight RowSpec (task 39)', () => {
  it('a RowSpec with doubleHeight: true sets doubleHeight attr on the source row', () => {
    // Arrange
    const contentRows: RowSpec[] = [
      { cells: [{ kind: 'text', char: 'H', fg: 'Yellow' }], doubleHeight: true },
    ];

    // Act
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Assert — row 1 col 0 must have doubleHeight: true
    expect(readCell(page.grid, 1, 0).attrs.doubleHeight).toBe(true);
  });

  it('the bottom half (row + 1) has doubleHeightBottom: true', () => {
    const contentRows: RowSpec[] = [
      { cells: [{ kind: 'text', char: 'H' }], doubleHeight: true },
    ];
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    expect(readCell(page.grid, 2, 0).attrs.doubleHeightBottom).toBe(true);
  });

  it('the next RowSpec after a double-height row lands on row 3 (not row 2)', () => {
    // Arrange — double-height row + a normal second row
    const contentRows: RowSpec[] = [
      { cells: [{ kind: 'text', char: 'D' }], doubleHeight: true },
      { cells: [{ kind: 'text', char: 'N' }] },
    ];

    // Act
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Assert — the second RowSpec should be on row 3
    expect((readCell(page.grid, 3, 0) as TextCell).char).toBe('N');
  });

  it('1 double-height row plus 20 single rows stays within the 22-slot limit', () => {
    // 1 double-height (uses 2 slots) + 20 single = 22 slots; must not throw
    const contentRows: RowSpec[] = [
      { cells: [], doubleHeight: true },
      ...Array.from({ length: 20 }, () => ({ cells: [] })),
    ];
    expect(() => composePage({ pageNumber: 100, serviceName: '' }, contentRows, {}))
      .not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 40 — buildPlainText returns exactly 24 strings
// ---------------------------------------------------------------------------

describe('buildPlainText — 24 lines (task 40)', () => {
  it('returns an array of exactly 24 strings', () => {
    // Arrange / Act
    const lines = buildPlainText(createGrid());

    // Assert
    expect(lines).toHaveLength(24);
  });

  it('every element is a string', () => {
    const lines = buildPlainText(createGrid());
    expect(lines.every(l => typeof l === 'string')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 41 — mosaic cells replaced with space in plain-text output
// ---------------------------------------------------------------------------

describe('buildPlainText — mosaic cells → space (task 41)', () => {
  it('a MosaicCell at a given position is rendered as a space', () => {
    // Arrange — write a mosaic cell at row 5, col 0
    let grid = createGrid();
    const mosaicPartial: Partial<MosaicCell> = {
      kind: 'mosaic', sixels: 63, fg: 'Cyan', bg: 'Black',
    };
    grid = writeCell(grid, 5, 0, mosaicPartial);

    // Act
    const lines = buildPlainText(grid);

    // Assert
    expect(lines[5][0]).toBe(' ');
  });

  it('a row of all mosaic cells produces only spaces, which trim to an empty string', () => {
    // Arrange — fill row 10 with mosaic cells
    let grid = createGrid();
    for (let col = 0; col < 40; col++) {
      grid = writeCell(grid, 10, col, {
        kind: 'mosaic', sixels: 42, fg: 'White', bg: 'Black',
      } as Partial<MosaicCell>);
    }

    // Act
    const lines = buildPlainText(grid);

    // Assert — all spaces trimmed → empty string
    expect(lines[10]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Task 42 — double-height pair: top row produces content, bottom row is ''
// ---------------------------------------------------------------------------

describe('buildPlainText — double-height pairs (task 42)', () => {
  it('the top-half row produces its text content in the plain-text output', () => {
    // Arrange — write 'HELLO' into row 3, then apply double-height
    let grid = createGrid();
    for (let col = 0; col < 5; col++) {
      grid = writeCell(grid, 3, col, { char: 'HELLO'[col] });
    }
    grid = applyDoubleHeight(grid, 3);

    // Act
    const lines = buildPlainText(grid);

    // Assert — row 3 (top half) has the text
    expect(lines[3].startsWith('HELLO')).toBe(true);
  });

  it('the bottom-half row (row + 1) produces an empty string', () => {
    // Arrange
    let grid = createGrid();
    grid = writeCell(grid, 3, 0, { char: 'T' });
    grid = applyDoubleHeight(grid, 3);

    // Act
    const lines = buildPlainText(grid);

    // Assert — row 4 (bottom half) must be ''
    expect(lines[4]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Task 43 — trailing spaces are trimmed from each plain-text line
// ---------------------------------------------------------------------------

describe('buildPlainText — trailing spaces trimmed (task 43)', () => {
  it('a row with text only in columns 0–4 has no trailing spaces', () => {
    // Arrange
    let grid = createGrid();
    const word = 'HELLO';
    for (let col = 0; col < word.length; col++) {
      grid = writeCell(grid, 2, col, { char: word[col] });
    }

    // Act
    const lines = buildPlainText(grid);

    // Assert
    expect(lines[2]).toBe('HELLO');
    expect(lines[2].endsWith(' ')).toBe(false);
  });

  it('a row of all spaces produces an empty string', () => {
    // createGrid is all spaces — every untouched row should trim to ''
    const lines = buildPlainText(createGrid());
    expect(lines[5]).toBe('');
    expect(lines[15]).toBe('');
  });

  it('leading spaces are preserved; only trailing spaces are removed', () => {
    // Arrange — write 'AB' at columns 2–3; cols 0–1 and 4–39 remain spaces
    let grid = createGrid();
    grid = writeCell(grid, 7, 2, { char: 'A' });
    grid = writeCell(grid, 7, 3, { char: 'B' });

    // Act
    const lines = buildPlainText(grid);

    // Assert
    expect(lines[7]).toBe('  AB');
    expect(lines[7].endsWith(' ')).toBe(false);
  });

  it('composePage plainText lines have trailing spaces trimmed', () => {
    // Arrange
    const contentRows: RowSpec[] = [
      { cells: [{ kind: 'text', char: 'H' }, { kind: 'text', char: 'I' }] },
    ];

    // Act
    const page = composePage({ pageNumber: 100, serviceName: '' }, contentRows, {});

    // Assert — plainText[1] should be 'HI' with no trailing spaces
    expect(page.plainText[1]).toBe('HI');
  });
});

// ---------------------------------------------------------------------------
// Integration — composePage wires plainText through buildPlainText
// ---------------------------------------------------------------------------

describe('composePage — plainText integration', () => {
  it('plainText has exactly 24 entries', () => {
    const page = composePage({ pageNumber: 100, serviceName: 'MY SVC' }, [], {});
    expect(page.plainText).toHaveLength(24);
  });

  it('plainText[0] contains the header page number', () => {
    const page = composePage({ pageNumber: 400, serviceName: 'WEATHER' }, [], {});
    expect(page.plainText[0]).toContain('P400');
  });

  it('plainText[0] contains the service name', () => {
    const page = composePage({ pageNumber: 100, serviceName: 'HELLO SVC' }, [], {});
    expect(page.plainText[0]).toContain('HELLO SVC');
  });
});
