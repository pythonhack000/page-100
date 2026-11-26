/**
 * Page layout composition for the teletext renderer.
 * Pure functions only — no DOM access, no side effects, no mutation of inputs.
 *
 * Covers tasks 26–43 from .kiro/specs/teletext-renderer/tasks.md
 * (US-05, US-06, US-07, US-08).
 */

import { createGrid, readCell, writeCell, GRID_COLS, GRID_ROWS } from './grid.ts';
import { applyDoubleHeight } from './double-height.ts';
import {
  StructureError,
  type Grid,
  type HeaderDescriptor,
  type FastextDescriptor,
  type RowSpec,
  type TeletextPage,
  type TeletextColour,
  type TextCell,
  type MosaicCell,
} from './types.ts';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Zero-pad a number to `width` digits. */
function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Format a Date as HH:MM:SS using local time. */
function formatTime(date: Date): string {
  const hh = pad(date.getHours(), 2);
  const mm = pad(date.getMinutes(), 2);
  const ss = pad(date.getSeconds(), 2);
  return `${hh}:${mm}:${ss}`;
}

/**
 * Write a string into a grid row starting at `colStart`, one character per
 * cell.  Returns the updated grid (immutable).
 */
function writeString(
  grid: Grid,
  row: number,
  colStart: number,
  text: string,
  fg: TeletextColour,
  bg: TeletextColour,
): Grid {
  let g = grid;
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? ' ';
    g = writeCell(g, row, colStart + i, {
      kind: 'text',
      char,
      fg,
      bg,
    } as Partial<TextCell>);
  }
  return g;
}

// ---------------------------------------------------------------------------
// composeHeader — task 26–30 (US-05)
// ---------------------------------------------------------------------------

/**
 * Writes the fixed header fields into row 0 of `grid`.
 *
 * Layout:
 * - Columns 0–3:   page number, format `Pnnn`
 * - Columns 4–7:   four spaces
 * - Columns 8–31:  service name, left-aligned, padded/truncated to 24 chars
 * - Columns 32–39: live clock, `HH:MM:SS`, seeded to the current local time
 *
 * All cells in row 0 get `fg: 'White'` and `bg: 'Black'`.
 *
 * Returns a new grid; `grid` is not mutated.
 */
export function composeHeader(grid: Grid, header: HeaderDescriptor): Grid {
  const { pageNumber, serviceName } = header;

  // Columns 0–3: Pnnn
  const pageStr = `P${pad(pageNumber, 3)}`;

  // Columns 4–7: four spaces
  const padStr = '    ';

  // Columns 8–31: service name padded/truncated to exactly 24 chars
  const nameField = serviceName.slice(0, 24).padEnd(24, ' ');

  // Columns 32–39: initial clock value
  const clockStr = formatTime(new Date());

  let g = grid;
  g = writeString(g, 0, 0, pageStr, 'White', 'Black');
  g = writeString(g, 0, 4, padStr, 'White', 'Black');
  g = writeString(g, 0, 8, nameField, 'White', 'Black');
  g = writeString(g, 0, 32, clockStr, 'White', 'Black');

  return g;
}

// ---------------------------------------------------------------------------
// updateClock — task 31 (US-05)
// ---------------------------------------------------------------------------

/**
 * Writes the current local time in `HH:MM:SS` format into columns 32–39 of
 * row 0.  All other cells are left unchanged.
 *
 * Returns a new grid; `grid` is not mutated.
 */
export function updateClock(grid: Grid, now: Date): Grid {
  return writeString(grid, 0, 32, formatTime(now), 'White', 'Black');
}

// ---------------------------------------------------------------------------
// composeFastext — tasks 32–34 (US-06)
// ---------------------------------------------------------------------------

/**
 * Fastext slot column offsets.
 * Each slot occupies 10 columns: space + 3-digit page + 6-char label = 10.
 */
const FASTEXT_SLOTS: Array<{ colStart: number; colour: TeletextColour }> = [
  { colStart: 0,  colour: 'Red' },
  { colStart: 10, colour: 'Green' },
  { colStart: 20, colour: 'Yellow' },
  { colStart: 30, colour: 'Cyan' },
];

/**
 * Fills row 23 with the four Fastext colour-link slots.
 *
 * Each occupied slot: `' ' + three-digit page + label` padded to 10 chars.
 * - The leading space and all label characters use the slot's designated colour.
 * - Empty slots are filled with 10 space characters, `fg: 'Black'`, `bg: 'Black'`.
 *
 * Returns a new grid; `grid` is not mutated.
 */
export function composeFastext(grid: Grid, fastext: FastextDescriptor): Grid {
  const links = [fastext.red, fastext.green, fastext.yellow, fastext.cyan];

  let g = grid;

  for (let i = 0; i < FASTEXT_SLOTS.length; i++) {
    const slot = FASTEXT_SLOTS[i];
    if (slot === undefined) continue;
    const { colStart, colour } = slot;
    const link = links[i];

    if (link === undefined) {
      // Empty slot: 10 spaces, fg Black, bg Black
      g = writeString(g, 23, colStart, ' '.repeat(10), 'Black', 'Black');
    } else {
      // Format: space + 3-digit page number + label padded to fill remaining 6 chars
      // Total = 1 + 3 + 6 = 10 chars
      const pageStr = pad(link.page, 3);
      const labelField = link.label.slice(0, 6).padEnd(6, ' ');
      const slotStr = ` ${pageStr}${labelField}`;
      g = writeString(g, 23, colStart, slotStr, colour, 'Black');
    }
  }

  return g;
}

// ---------------------------------------------------------------------------
// buildPlainText — tasks 40–43 (US-08)
// ---------------------------------------------------------------------------

/**
 * Produces 24 plain-text lines from `grid`, one per row.
 *
 * Rules:
 * - Mosaic cells are replaced with a space.
 * - Double-height bottom-half rows (all cells have `doubleHeightBottom: true`)
 *   produce an empty string `''`.
 * - Trailing spaces are trimmed from each line.
 *
 * Returns a new array; `grid` is not mutated.
 */
export function buildPlainText(grid: Grid): string[] {
  const lines: string[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    // Check whether this is a double-height bottom-half row.
    // A row is a bottom half when its first cell has doubleHeightBottom: true.
    const firstCell = readCell(grid, row, 0);
    if (firstCell.attrs.doubleHeightBottom) {
      lines.push('');
      continue;
    }

    // Build the raw line from cell characters.
    let line = '';
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = readCell(grid, row, col);
      if (cell.kind === 'mosaic') {
        line += ' ';
      } else {
        line += cell.char;
      }
    }

    // Trim trailing spaces.
    lines.push(line.trimEnd());
  }

  return lines;
}

// ---------------------------------------------------------------------------
// composePage — tasks 35–39 (US-07)
// ---------------------------------------------------------------------------

/**
 * Composes a complete `TeletextPage` from structured input.
 *
 * - Calls `composeHeader` to fill row 0.
 * - Maps `contentRows` (max 22 logical slots) onto rows 1–22.
 *   A `RowSpec` with `doubleHeight: true` calls `applyDoubleHeight` and
 *   consumes two grid rows (the bottom half counts as one slot).
 * - Fills remaining rows with default cells.
 * - Calls `composeFastext` to fill row 23.
 * - Calls `buildPlainText` to produce the `plainText` array.
 *
 * Throws `StructureError` when more than 22 logical content slots are supplied.
 *
 * Returns a new `TeletextPage`; no inputs are mutated.
 */
export function composePage(
  header: HeaderDescriptor,
  contentRows: RowSpec[],
  fastext: FastextDescriptor,
): TeletextPage {
  // Guard: max 22 content slots (rows 1–22).
  if (contentRows.length > 22) {
    throw new StructureError(
      `composePage: too many content rows. Maximum is 22, got ${contentRows.length}.`,
    );
  }

  let grid = createGrid();

  // Row 0: header.
  grid = composeHeader(grid, header);

  // Rows 1–22: content.
  // `gridRow` tracks the next available grid row; `specIdx` tracks which
  // RowSpec we are processing.  A double-height spec advances gridRow by 2.
  let gridRow = 1;

  for (let specIdx = 0; specIdx < contentRows.length; specIdx++) {
    if (gridRow > 22) {
      // Should not happen given the contentRows.length ≤ 22 guard above, but
      // double-height rows could push gridRow past 22 if the spec array is
      // badly formed.  Throw rather than silently dropping data.
      throw new StructureError(
        `composePage: content overflows into the fastext row. ` +
        `Reduce the number of rows or double-height entries.`,
      );
    }

    const spec = contentRows[specIdx];
    if (spec === undefined) continue;

    // Write each specified cell into the grid row.
    for (let col = 0; col < GRID_COLS; col++) {
      const cellSpec = spec.cells[col];
      if (cellSpec === undefined) {
        // No spec for this column — keep the default cell that createGrid produced.
        continue;
      }

      // Merge the partial spec onto the default cell.
      const existing = readCell(grid, gridRow, col);
      const kind = cellSpec.kind ?? existing.kind;

      if (kind === 'mosaic') {
        const mosSpec = cellSpec as Partial<MosaicCell>;
        grid = writeCell(grid, gridRow, col, {
          kind: 'mosaic',
          sixels: mosSpec.sixels ?? 0,
          fg: mosSpec.fg ?? existing.fg,
          bg: mosSpec.bg ?? existing.bg,
          attrs: { ...existing.attrs, ...(mosSpec.attrs ?? {}) },
        } as Partial<MosaicCell>);
      } else {
        const txtSpec = cellSpec as Partial<TextCell>;
        grid = writeCell(grid, gridRow, col, {
          kind: 'text',
          char: txtSpec.char ?? (existing.kind === 'text' ? existing.char : ' '),
          fg: txtSpec.fg ?? existing.fg,
          bg: txtSpec.bg ?? existing.bg,
          attrs: { ...existing.attrs, ...(txtSpec.attrs ?? {}) },
        } as Partial<TextCell>);
      }
    }

    // Apply double-height if requested.
    if (spec.doubleHeight === true) {
      grid = applyDoubleHeight(grid, gridRow);
      gridRow += 2; // top half + bottom half
    } else {
      gridRow += 1;
    }
  }

  // Row 23: fastext bar.
  grid = composeFastext(grid, fastext);

  // Build plain-text output.
  const plainText = buildPlainText(grid);

  return { grid, plainText };
}
