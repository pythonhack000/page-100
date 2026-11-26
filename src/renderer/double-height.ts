/**
 * Double-height row support.
 * Pure functions — no DOM access, no side effects.
 *
 * Covers tasks 14–17 from .kiro/specs/teletext-renderer/tasks.md (US-03).
 *
 * A double-height row occupies two grid rows: a top half (the source row,
 * authored once) and a bottom half (`row + 1`, produced by this module).
 * The page author writes content onto `row`; calling `applyDoubleHeight`
 * sets the `doubleHeight` attribute on every cell in that row and fills
 * `row + 1` with mirror cells carrying `doubleHeightBottom: true`.
 */

import { readCell, writeCell, GRID_COLS } from './grid.ts';
import { StructureError } from './types.ts';
import type { Cell, Grid, TextCell, MosaicCell } from './types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns `true` when `cell` differs from the default (space / White / Black / no attrs). */
function isNonDefault(cell: Cell): boolean {
  if (cell.attrs.doubleHeight || cell.attrs.doubleHeightBottom || cell.attrs.mosaic || cell.attrs.concealed) {
    return true;
  }
  if (cell.fg !== 'White' || cell.bg !== 'Black') {
    return true;
  }
  if (cell.kind === 'text') {
    return cell.char !== ' ';
  }
  // MosaicCell — any mosaic in row+1 is non-default
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Marks every cell in `row` as `doubleHeight: true` and fills `row + 1`
 * with the same character, foreground, and background as the source row,
 * with `doubleHeightBottom: true`.
 *
 * Throws `StructureError` when `row + 1` already contains non-default
 * content (a normal row must not be clobbered).
 *
 * Does not touch any row other than `row` and `row + 1`.
 *
 * Tasks 14, 15, 16, 17 (US-03).
 */
export function applyDoubleHeight(grid: Grid, row: number): Grid {
  const bottomRow = row + 1;

  // Guard: row+1 must exist in the grid.
  // readCell will throw RangeError if bottomRow > 23, which is the right
  // behaviour (a double-height pair must fit within the 24-row grid).

  // Task 16 — check every cell in row+1 for non-default content.
  for (let col = 0; col < GRID_COLS; col++) {
    const cell = readCell(grid, bottomRow, col); // throws RangeError if out of bounds
    if (isNonDefault(cell)) {
      throw new StructureError(
        `applyDoubleHeight: row ${bottomRow} already contains non-default content ` +
        `at column ${col}. Cannot overwrite a normal row with the double-height bottom half.`,
      );
    }
  }

  let next = grid;

  // Task 14 — mark every cell in `row` as doubleHeight: true.
  for (let col = 0; col < GRID_COLS; col++) {
    next = writeCell(next, row, col, {
      attrs: {
        ...readCell(next, row, col).attrs,
        doubleHeight: true,
      },
    });
  }

  // Task 15 — fill row+1 with mirror cells carrying doubleHeightBottom: true.
  for (let col = 0; col < GRID_COLS; col++) {
    const src = readCell(next, row, col);

    let bottomCell: Cell;
    if (src.kind === 'mosaic') {
      const bottom: MosaicCell = {
        kind: 'mosaic',
        sixels: src.sixels,
        fg: src.fg,
        bg: src.bg,
        attrs: {
          doubleHeight: false,
          doubleHeightBottom: true,
          mosaic: src.attrs.mosaic,
          concealed: src.attrs.concealed,
        },
      };
      bottomCell = bottom;
    } else {
      const bottom: TextCell = {
        kind: 'text',
        char: src.char,
        fg: src.fg,
        bg: src.bg,
        attrs: {
          doubleHeight: false,
          doubleHeightBottom: true,
          mosaic: src.attrs.mosaic,
          concealed: src.attrs.concealed,
        },
      };
      bottomCell = bottom;
    }

    // Write the bottom cell directly by rebuilding the grid slice — but
    // writeCell only accepts Partial<Cell> which does not carry `kind` safely
    // for a full replacement, so we write field-by-field for text cells and
    // use a direct slice replacement for mosaic cells.
    //
    // For simplicity and correctness we build the new grid with a direct
    // immutable splice so we don't have to fight Partial<Cell> semantics.
    const idx = bottomRow * GRID_COLS + col;
    const copy = next.slice() as Grid;
    copy[idx] = bottomCell;
    next = copy;
  }

  return next;
}
