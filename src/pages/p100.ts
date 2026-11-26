/**
 * src/pages/p100.ts
 *
 * Index page — page 100.
 *
 * Layout (rows 1–22):
 *   Row 1    Double-height top half  — "PAGE 100" centred in Cyan on Black
 *   Row 2    Double-height bottom half (produced by applyDoubleHeight; spec consumed)
 *   Row 3    Mosaic banner: 40 fully-filled sixel cells, alternating Cyan / Yellow fg
 *   Row 4    Blank separator
 *   Row 5    White header label: "  CONTENTS"
 *   Row 6    Blank separator
 *   Row 7    Red    "  101  News headlines"
 *   Row 8    Green  "  400  Weather"
 *   Row 9    Yellow "  500  Exchange rates"
 *   Row 10   Magenta"  666  ???"
 *   Row 11   Cyan   "  888  About"
 *   Rows 12–22  Blank
 *
 * Fastext bar (row 23):
 *   Red    → 101  "News  "
 *   Green  → 400  "Wthr  "
 *   Yellow → 500  "Rates "
 *   Cyan   → 888  "About "
 *
 * No trademarks, no third-party names.
 */

import { composePage } from '../renderer/layout.ts';
import type { PageModule } from '../nav/router.ts';
import type { RowSpec, TeletextPage, FastextDescriptor, TeletextColour } from '../renderer/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a full-width text RowSpec with every character set to the same fg/bg. */
function textRow(text: string, fg: TeletextColour, bg: TeletextColour): RowSpec {
  const cells: RowSpec['cells'] = [];
  for (let i = 0; i < 40; i++) {
    const char = text[i] ?? ' ';
    cells.push({ kind: 'text', char, fg, bg });
  }
  return { cells };
}

/** Builds a blank row (40 spaces, White on Black — the grid default). */
function blankRow(): RowSpec {
  return { cells: [] };
}

/** Builds a mosaic row: 40 cells alternating between two colours, all sixels = 63. */
function mosaicBannerRow(colourA: TeletextColour, colourB: TeletextColour): RowSpec {
  const cells: RowSpec['cells'] = [];
  for (let i = 0; i < 40; i++) {
    const fg: TeletextColour = i % 2 === 0 ? colourA : colourB;
    cells.push({ kind: 'mosaic', sixels: 63, fg, bg: 'Black' });
  }
  return { cells };
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

/** Centre `text` in a 40-character field, padded with spaces. */
function centre(text: string): string {
  const total = 40;
  const pad = Math.max(0, Math.floor((total - text.length) / 2));
  return text.padStart(text.length + pad, ' ').padEnd(total, ' ');
}

const TITLE = centre('PAGE 100');

const contentRows: RowSpec[] = [
  // Row 1 (top half) + Row 2 (bottom half auto-generated)
  {
    cells: Array.from({ length: 40 }, (_, i) => ({
      kind: 'text' as const,
      char: TITLE[i] ?? ' ',
      fg: 'Cyan' as TeletextColour,
      bg: 'Black' as TeletextColour,
    })),
    doubleHeight: true,
  },

  // Row 3 — mosaic banner
  mosaicBannerRow('Cyan', 'Yellow'),

  // Row 4 — blank
  blankRow(),

  // Row 5 — section header label
  textRow('  CONTENTS', 'White', 'Black'),

  // Row 6 — blank
  blankRow(),

  // Row 7 — News
  textRow('  101  News headlines', 'Red', 'Black'),

  // Row 8 — Weather
  textRow('  400  Weather', 'Green', 'Black'),

  // Row 9 — Exchange rates
  textRow('  500  Exchange rates', 'Yellow', 'Black'),

  // Row 10 — Haunted page
  textRow('  666  ???', 'Magenta', 'Black'),

  // Row 11 — About
  textRow('  888  About', 'Cyan', 'Black'),

  // Rows 12–22 — blank (11 rows)
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
  blankRow(),
];

// ---------------------------------------------------------------------------
// Fastext descriptor
// ---------------------------------------------------------------------------

const fastext: FastextDescriptor = {
  red:    { page: 101, label: 'News  ' },
  green:  { page: 400, label: 'Wthr  ' },
  yellow: { page: 500, label: 'Rates ' },
  cyan:   { page: 888, label: 'About ' },
};

// ---------------------------------------------------------------------------
// PageModule
// ---------------------------------------------------------------------------

/** Loads the index page. The `_subpage` parameter is ignored (only one subpage). */
function load(_subpage: number): TeletextPage {
  return composePage(
    { pageNumber: 100, serviceName: 'PAGE 100' },
    contentRows,
    fastext,
  );
}

export const p100: PageModule = {
  pageNumber: 100,
  subpageCount: 1,
  load,
};
