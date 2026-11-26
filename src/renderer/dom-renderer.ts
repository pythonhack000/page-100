/**
 * DOM renderer for the teletext grid.
 *
 * This is the ONLY file in src/renderer/ that is permitted to touch the DOM.
 * All other renderer modules are pure functions with no side effects.
 *
 * Public API:
 *   mountGrid(container)         — build the 24×40 span structure once
 *   renderPage(mounted, page)    — update all 960 cells + plain-text element
 *   updateClock(mounted, now)    — touch only the 8 clock spans in row 0
 */

import { colourToCSS } from './colours.ts';
import type { TeletextPage, Cell } from './types.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_ROWS = 24;
const GRID_COLS = 40;

/** Column index of the first clock character in row 0. */
const CLOCK_COL_START = 32;
/** Number of clock characters (HH:MM:SS = 8 chars). */
const CLOCK_COL_COUNT = 8;

// ---------------------------------------------------------------------------
// Internal representation of a mounted cell
// ---------------------------------------------------------------------------

/**
 * Holds the DOM references for a single grid cell.
 * Text cells use `span` only; mosaic cells additionally use `sixSpans`.
 */
interface MountedCell {
  /** The outer <span class="tt-cell …">. */
  readonly span: HTMLSpanElement;
  /**
   * The six inner block <span> elements inside a mosaic cell,
   * in bit-index order (bit 0 → index 0, … bit 5 → index 5).
   * `null` for text cells; populated once in `mountGrid` and never replaced.
   */
  readonly sixSpans: readonly HTMLSpanElement[] | null;
}

// ---------------------------------------------------------------------------
// MountedGrid
// ---------------------------------------------------------------------------

/**
 * Opaque handle returned by `mountGrid`.
 * Holds references into the live DOM so `renderPage` and `updateClock` can
 * update individual spans without querying the DOM again.
 *
 * `cells` is mutable so that `renderPage` can write back an updated
 * `MountedCell` when six-spans are lazily created for a mosaic cell.
 */
export interface MountedGrid {
  /**
   * Flat cell array, 960 elements.
   * Index formula: row * GRID_COLS + col.
   * Mutable so the lazy mosaic six-span construction can be persisted.
   */
  cells: MountedCell[];
  /** The <div class="tt-screen"> element. */
  readonly screen: HTMLElement;
  /** The <div class="tt-plaintext"> element. */
  readonly plaintext: HTMLElement;
}

// ---------------------------------------------------------------------------
// mountGrid
// ---------------------------------------------------------------------------

/**
 * Creates the full 24-row × 40-column span structure inside `container` and
 * returns a `MountedGrid` with references to every span.
 *
 * Call once per page load.  `container` must be an element already in the
 * document (or will be inserted before the next paint).
 *
 * DOM shape produced:
 *
 * ```html
 * <div class="tt-screen" role="img" aria-hidden="true">
 *   <div class="tt-row" data-row="0">
 *     <span class="tt-cell" data-col="0" style="color:…;background-color:…">P</span>
 *     …
 *     <span class="tt-cell tt-mosaic" data-col="5" style="--tt-fg:…;--tt-bg:…">
 *       <span class="tt-six"></span>  × 6
 *     </span>
 *   </div>
 *   …  (24 rows total)
 * </div>
 * <div class="tt-plaintext" aria-live="polite" aria-label="Page content"></div>
 * ```
 *
 * Every cell is initialised as a text cell (space, White on Black).
 * `renderPage` will reclassify cells as mosaic when it first encounters a
 * `MosaicCell` at that position, but mounting always produces a consistent
 * starting structure.
 *
 * Because `noUncheckedIndexedAccess` is enabled, all array reads from
 * `MountedCell[]` and `HTMLSpanElement[]` assert non-nullity via the
 * null-coalescing pattern rather than the non-null assertion operator.
 */
export function mountGrid(container: HTMLElement): MountedGrid {
  // ---- tt-screen ----------------------------------------------------------
  const screen = document.createElement('div');
  screen.className = 'tt-screen';
  screen.setAttribute('role', 'img');
  screen.setAttribute('aria-hidden', 'true');

  const cells: MountedCell[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'tt-row';
    rowDiv.dataset['row'] = String(row);

    for (let col = 0; col < GRID_COLS; col++) {
      const span = document.createElement('span');
      span.className = 'tt-cell';
      span.dataset['col'] = String(col);

      // Default: space, White on Black.
      span.textContent = ' ';
      span.style.color = colourToCSS('White');
      span.style.backgroundColor = colourToCSS('Black');

      rowDiv.appendChild(span);

      // All cells start as text cells; sixSpans will be built on demand in
      // renderPage when a mosaic cell is first seen.
      cells.push({ span, sixSpans: null });
    }

    screen.appendChild(rowDiv);
  }

  // ---- tt-plaintext -------------------------------------------------------
  const plaintext = document.createElement('div');
  plaintext.className = 'tt-plaintext';
  plaintext.setAttribute('aria-live', 'polite');
  plaintext.setAttribute('aria-label', 'Page content');

  container.appendChild(screen);
  container.appendChild(plaintext);

  return { cells, screen, plaintext };
}

// ---------------------------------------------------------------------------
// Internal: apply a single cell to the DOM
// ---------------------------------------------------------------------------

/**
 * Updates the DOM span(s) for one cell.
 *
 * For text cells:
 *   - `span.textContent`      ← char
 *   - `span.style.color`      ← var(--tt-fg)
 *   - `span.style.backgroundColor` ← var(--tt-bg)
 *   - class list: remove `tt-mosaic`, add/remove `tt-dh-top`/`tt-dh-bottom`
 *
 * For mosaic cells:
 *   - Ensure six inner spans exist (create them once if absent).
 *   - Set `--tt-fg` and `--tt-bg` on the outer span.
 *   - Toggle `tt-six--on` / `tt-six--off` on each inner span.
 *   - class list: add `tt-mosaic`, add/remove double-height classes.
 *
 * Returns the (possibly updated) `MountedCell`; callers must write it back
 * into the cells array when sixSpans are freshly created.
 */
function applyCell(mounted: MountedCell, cell: Cell): MountedCell {
  const { span } = mounted;
  const fgCSS = colourToCSS(cell.fg);
  const bgCSS = colourToCSS(cell.bg);
  const { attrs } = cell;

  // Double-height classes (independent of cell kind).
  if (attrs.doubleHeight) {
    span.classList.add('tt-dh-top');
    span.classList.remove('tt-dh-bottom');
  } else if (attrs.doubleHeightBottom) {
    span.classList.add('tt-dh-bottom');
    span.classList.remove('tt-dh-top');
  } else {
    span.classList.remove('tt-dh-top', 'tt-dh-bottom');
  }

  if (cell.kind === 'mosaic') {
    span.classList.add('tt-mosaic');
    // Clear text-cell inline styles that are irrelevant for mosaic cells.
    span.style.color = '';
    span.style.backgroundColor = '';
    // Set the CSS custom properties consumed by .tt-six / .tt-six--on.
    span.style.setProperty('--tt-fg', fgCSS);
    span.style.setProperty('--tt-bg', bgCSS);
    span.textContent = '';

    // Build six inner spans on first mosaic encounter for this cell.
    let { sixSpans } = mounted;
    if (sixSpans === null) {
      const built: HTMLSpanElement[] = [];
      for (let bit = 0; bit < 6; bit++) {
        const s = document.createElement('span');
        s.className = 'tt-six';
        span.appendChild(s);
        built.push(s);
      }
      sixSpans = built;
      // Return the updated MountedCell so the caller can persist it.
      mounted = { span, sixSpans };
    }

    // Toggle on/off classes according to sixel bits.
    const { sixels } = cell;
    for (let bit = 0; bit < 6; bit++) {
      const s = sixSpans[bit];
      if (s === undefined) continue;
      if ((sixels >> bit) & 1) {
        s.classList.add('tt-six--on');
        s.classList.remove('tt-six--off');
      } else {
        s.classList.remove('tt-six--on');
        s.classList.add('tt-six--off');
      }
    }
  } else {
    // Text cell.
    span.classList.remove('tt-mosaic');
    // Remove mosaic custom properties if they were set before.
    span.style.removeProperty('--tt-fg');
    span.style.removeProperty('--tt-bg');
    span.textContent = cell.char;
    span.style.color = fgCSS;
    span.style.backgroundColor = bgCSS;
  }

  return mounted;
}

// ---------------------------------------------------------------------------
// renderPage
// ---------------------------------------------------------------------------

/**
 * Updates every cell in the grid to match `page.grid`, then sets the
 * plain-text element's content to `page.plainText` joined with newlines.
 *
 * This performs a full re-render; call it only on page navigation, not on
 * every clock tick.
 */
export function renderPage(mounted: MountedGrid, page: TeletextPage): void {
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const mc = mounted.cells[i];
    if (mc === undefined) continue;
    const cell = page.grid[i];
    if (cell === undefined) continue;
    mounted.cells[i] = applyCell(mc, cell);
  }

  // Update the plain-text accessibility element.
  mounted.plaintext.textContent = page.plainText.join('\n');
}

// ---------------------------------------------------------------------------
// updateClock
// ---------------------------------------------------------------------------

/**
 * Formats `now` as `HH:MM:SS` (local time) and writes the 8 characters into
 * columns 32–39 of row 0.  Only those 8 spans are touched; the rest of the
 * grid is not read or written.
 */
export function updateClock(mounted: MountedGrid, now: Date): void {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const clockStr = `${hh}:${mm}:${ss}`;

  for (let i = 0; i < CLOCK_COL_COUNT; i++) {
    const col = CLOCK_COL_START + i;
    const idx = 0 * GRID_COLS + col; // row 0
    const mc = mounted.cells[idx];
    if (mc === undefined) continue;
    const ch = clockStr[i];
    if (ch === undefined) continue;
    mc.span.textContent = ch;
    // Clock cells are always White on Black; no colour update needed.
  }
}
