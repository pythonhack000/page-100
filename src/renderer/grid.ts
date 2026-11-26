/**
 * 40×24 teletext grid model.
 * Pure functions — no DOM access, no side effects.
 *
 * Covers tasks 6–13 from .kiro/specs/teletext-renderer/tasks.md (US-01, US-02).
 */

import { validateColour } from './colours.ts';
import type { Cell, CellAttributes, Grid, TextCell, TeletextColour } from './types.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of columns in the grid. */
export const GRID_COLS = 40;

/** Number of rows in the grid. */
export const GRID_ROWS = 24;

/** Total cell count: 40 × 24 = 960. */
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const DEFAULT_ATTRS: CellAttributes = {
  doubleHeight: false,
  doubleHeightBottom: false,
  mosaic: false,
  concealed: false,
};

const DEFAULT_CELL: TextCell = {
  kind: 'text',
  char: ' ',
  fg: 'White',
  bg: 'Black',
  attrs: DEFAULT_ATTRS,
};

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

/**
 * Returns the flat index for `(row, col)` and throws `RangeError` if either
 * coordinate is out of bounds.
 */
function indexFor(row: number, col: number): number {
  if (row < 0 || row > GRID_ROWS - 1 || col < 0 || col > GRID_COLS - 1) {
    throw new RangeError(
      `Grid coordinate out of bounds: row=${row}, col=${col}. ` +
      `Valid range: row 0–${GRID_ROWS - 1}, col 0–${GRID_COLS - 1}.`,
    );
  }
  return row * GRID_COLS + col;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Allocates a new 960-cell grid.  Every cell is a default `TextCell`:
 * `char` U+0020, `fg` `'White'`, `bg` `'Black'`, all attributes `false`.
 *
 * Task 6, task 7 (US-01).
 */
export function createGrid(): Grid {
  // Object.freeze the shared default so callers cannot mutate it.
  const frozen = Object.freeze({ ...DEFAULT_CELL, attrs: Object.freeze({ ...DEFAULT_ATTRS }) });
  return Array.from({ length: GRID_SIZE }, () => frozen) as Grid;
}

/**
 * Returns the cell at `(row, col)`.
 * Throws `RangeError` for out-of-bounds coordinates.
 *
 * Tasks 9, 10, 11 (US-01).
 */
export function readCell(grid: Grid, row: number, col: number): Cell {
  const cell = grid[indexFor(row, col)];
  if (cell === undefined) {
    throw new RangeError(`No cell at (${row}, ${col})`);
  }
  return cell;
}

/**
 * Returns a new grid with `(row, col)` replaced by the existing cell merged
 * with `partial`.  The original grid is not mutated.
 *
 * - Throws `RangeError` for out-of-bounds coordinates.
 * - Throws `TypeError` when `partial.fg` or `partial.bg` is set to an invalid
 *   colour value.
 *
 * Tasks 8, 11, 12, 13 (US-01, US-02).
 */
export function writeCell(
  grid: Grid,
  row: number,
  col: number,
  partial: Partial<Cell>,
): Grid {
  const idx = indexFor(row, col); // throws RangeError if out of bounds

  // Validate colours before touching the grid.
  if ('fg' in partial && partial.fg !== undefined) {
    validateColour(partial.fg as unknown); // throws TypeError if invalid
  }
  if ('bg' in partial && partial.bg !== undefined) {
    validateColour(partial.bg as unknown); // throws TypeError if invalid
  }

  const existing = grid[idx];
  if (existing === undefined) {
    throw new RangeError(`No cell at (${row}, ${col})`);
  }

  // `kind` from `partial` wins if present; otherwise keep the existing kind.
  // Colours and attrs merge shallowly over the existing cell.
  const fg = partial.fg ?? existing.fg;
  const bg = partial.bg ?? existing.bg;
  const attrs = { ...existing.attrs, ...(partial.attrs ?? {}) };
  const kind = partial.kind ?? existing.kind;

  const updated: Cell =
    kind === 'mosaic'
      ? {
          kind: 'mosaic',
          sixels: pickSixels(partial, existing),
          fg,
          bg,
          attrs,
        }
      : {
          kind: 'text',
          char: pickChar(partial, existing),
          fg,
          bg,
          attrs,
        };

  // Return a shallow copy of the grid with the one slot replaced.
  const next = grid.slice() as Grid;
  next[idx] = updated;
  return next;
}

function pickSixels(partial: Partial<Cell>, existing: Cell): number {
  if ('sixels' in partial && partial.sixels !== undefined) return partial.sixels;
  return existing.kind === 'mosaic' ? existing.sixels : 0;
}

function pickChar(partial: Partial<Cell>, existing: Cell): string {
  if ('char' in partial && partial.char !== undefined) return partial.char;
  return existing.kind === 'text' ? existing.char : ' ';
}
