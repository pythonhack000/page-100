# Design: Teletext Renderer

Feature scope: `src/renderer/` — data model, pure functions, DOM structure, scaling, accessibility.

---

## Data Model

### `TeletextColour`

A string union of the eight permitted values. No other colours are valid.

```ts
type TeletextColour =
  | 'Black' | 'Red'    | 'Green'  | 'Yellow'
  | 'Blue'  | 'Magenta'| 'Cyan'   | 'White';
```

`colours.ts` exports `COLOUR_HEX` (name → hex) and `COLOUR_CSS` (name → `--tt-*` custom property), plus the `TeletextColour` type. Validation is a simple `Object.hasOwn(COLOUR_HEX, candidate)` check; anything that fails throws a `TypeError`.

### `CellAttributes`

```ts
interface CellAttributes {
  doubleHeight: boolean; // top half of a double-height pair
  doubleHeightBottom: boolean; // bottom half; renderer skips text, copies top style
  mosaic: boolean;       // character is a mosaic block graphic
  concealed: boolean;    // cell is hidden until revealed
}
```

Default: all `false`.

### `Cell`

A cell is a discriminated union on `kind`.

```ts
interface TextCell {
  kind: 'text';
  char: string;          // single code point, default U+0020
  fg: TeletextColour;    // default 'White'
  bg: TeletextColour;    // default 'Black'
  attrs: CellAttributes;
}

interface MosaicCell {
  kind: 'mosaic';
  sixels: number;        // integer 0–63; validated by mosaic.ts
  fg: TeletextColour;    // default 'White'
  bg: TeletextColour;    // default 'Black'
  attrs: CellAttributes;
}

type Cell = TextCell | MosaicCell;
```

The default cell (produced by `createGrid`) is a `TextCell` with `char` U+0020, `fg` `'White'`, `bg` `'Black'`, and all attributes `false`.

### `Grid`

A flat `Cell[]` of exactly 960 elements. Index formula: `row * 40 + col`.

`grid.ts` exports:
- `createGrid(): Grid` — allocates 960 default cells.
- `readCell(grid, row, col): Cell` — throws `RangeError` if either index is out of bounds.
- `writeCell(grid, row, col, partial: Partial<Cell>): Grid` — returns a new grid (immutable update); throws `RangeError` on out-of-bounds. Colour validation runs here.

Immutability keeps renderers and tests free of shared-state bugs.

### `PageData`

```ts
interface HeaderDescriptor {
  pageNumber: number;    // 100–899
  serviceName: string;   // truncated/padded to 24 chars by layout.ts
}

interface FastextDescriptor {
  red?:    { page: number; label: string };
  green?:  { page: number; label: string };
  yellow?: { page: number; label: string };
  cyan?:   { page: number; label: string };
}

interface TeletextPage {
  grid: Grid;
  plainText: string[];   // 24 lines, one per row, mosaic cells replaced with space
}
```

Page modules return a `TeletextPage`. They do not manipulate the DOM.

---

## Pure Functions

### `colours.ts`
- `validateColour(c: unknown): TeletextColour` — throws `TypeError` if invalid.
- `colourToCSS(c: TeletextColour): string` — returns `var(--tt-*)`.

### `grid.ts`
- `createGrid(): Grid`
- `readCell(grid, row, col): Cell`
- `writeCell(grid, row, col, partial): Grid`

### `double-height.ts`
- `applyDoubleHeight(grid, row): Grid` — marks `row` cells as `doubleHeight: true` and fills `row + 1` with the same characters and colours but `doubleHeightBottom: true`. Throws a `StructureError` if `row + 1` already contains non-default content (meaning a normal row would be clobbered). The page module authors content once on `row`; this function produces both halves.

### `mosaic.ts`
- `validateSixels(sixels: unknown): number` — asserts that the value is an integer in 0–63; throws `TypeError` otherwise. Called by `writeCell` when writing a `MosaicCell`.

### `layout.ts`
- `composePage(header: HeaderDescriptor, contentRows: RowSpec[], fastext: FastextDescriptor): TeletextPage` — the single composition entry point.
  - Calls `composeHeader(grid, header)` to fill row 0.
  - Maps `contentRows` (max 22 items) to rows 1–22; throws `StructureError` if more than 22 are supplied.
  - Calls `composeFastext(grid, fastext)` to fill row 23.
  - Calls `buildPlainText(grid)` to produce the `plainText` array.
  - Returns `{ grid, plainText }`.

```ts
interface RowSpec {
  cells: Array<Partial<TextCell> | Partial<MosaicCell>>;  // up to 40 entries; shorter rows are right-padded
  doubleHeight?: boolean;        // if true, applyDoubleHeight is called; consumes next slot
}
```

### `layout.ts` (internal helpers)
- `composeHeader(grid, header): Grid` — writes `Pnnn`, pad, service name, and `HH:MM:SS` to row 0.
- `updateClock(grid, now: Date): Grid` — writes only columns 32–39 of row 0; called every second from `main.ts`.
- `composeFastext(grid, fastext): Grid` — fills row 23 slot by slot.
- `buildPlainText(grid): string[]` — 24 lines; mosaic cells → space, double-height bottom rows → empty string in output (top half already emits the content); each line trimmed of trailing spaces.

---

## DOM Structure

### Choice: `<div>` grid of `<span>` elements (not `<canvas>`)

**Rationale.** The requirements mandate a plain-text accessibility layer, keyboard navigation, and an `aria-live` region. A `<canvas>` surface is opaque to assistive technology and requires a parallel DOM tree to satisfy US-08 anyway. Using a character-span grid gives:

- Direct CSS control over colours via custom properties (`color: var(--tt-cyan)`).
- No manual font rasterisation; the browser handles Unicode mosaic codepoints natively.
- The accessibility plain-text layer is the same DOM, just toggled visible/hidden, rather than a separate render path.
- Simpler testing: snapshot the innerHTML, no pixel comparison.

The tradeoff is that 960 `<span>` elements per frame redraw are slower than canvas for animated effects (page 666 glitches). Page 666 can use a canvas overlay for the glitch layer without changing the core renderer.

### Structure

```html
<div class="tt-screen" role="img" aria-hidden="true">
  <!-- 24 rows -->
  <div class="tt-row" data-row="0">
    <!-- 40 cells (text cell example) -->
    <span class="tt-cell" data-col="0"
          style="color: var(--tt-white); background-color: var(--tt-black)">P</span>
    …
    <!-- mosaic cell example -->
    <span class="tt-cell tt-mosaic" data-col="5"
          style="--tt-fg: var(--tt-cyan); --tt-bg: var(--tt-black)">
      <span class="tt-six tt-six--on"></span>
      <span class="tt-six tt-six--off"></span>
      <span class="tt-six tt-six--on"></span>
      <span class="tt-six tt-six--off"></span>
      <span class="tt-six tt-six--on"></span>
      <span class="tt-six tt-six--on"></span>
    </span>
    …
  </div>
  …
</div>

<div class="tt-plaintext" aria-live="polite" aria-label="Page content">
  <!-- 24 lines of trimmed plain text, visually hidden -->
</div>
```

- `tt-screen` carries `aria-hidden="true"` because visual rendering is decorative; screen readers use `tt-plaintext`.
- `tt-plaintext` is visually hidden with `clip-path: inset(100%)` (not `display:none`, which would silence `aria-live`).
- Each `tt-cell` applies foreground and background via inline `style` using `var(--tt-*)` custom properties. Background defaults to `var(--tt-black)` per cell; coloured header bands and Fastext blocks are achieved by setting a non-Black `bg` on those cells.
- Double-height top cells get `class="tt-cell tt-dh-top"` and double-height bottom cells get `tt-dh-bottom`. CSS handles the visual scaling:

```css
.tt-dh-top  { transform: scaleY(2) translateY(25%); transform-origin: top; }
.tt-dh-bottom { visibility: hidden; height: 1em; } /* preserves row spacing */
```

- Mosaic cells (`kind: 'mosaic'`) are rendered as a `<span class="tt-cell tt-mosaic">` containing a 2×3 CSS grid of six `<span class="tt-six">` elements. The CSS grid is `display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr`. Each inner span is coloured `var(--tt-fg)` if its sixel bit is 1, or `var(--tt-bg)` if 0. The `--tt-fg` and `--tt-bg` custom properties are set inline on the `tt-mosaic` span. No Unicode block characters or web fonts are used.
- Concealed cells have their `fg` set equal to their `bg` by the pure-function layer before the DOM renderer is called, so the character is invisible but present in the DOM.

### DOM Renderer (`src/renderer/dom-renderer.ts`)

This is the only file in `src/renderer/` with DOM access.

```ts
function mountGrid(container: HTMLElement): MountedGrid
function renderPage(mounted: MountedGrid, page: TeletextPage): void
function updateClock(mounted: MountedGrid, now: Date): void
```

- `mountGrid` creates the 960-span structure once and returns references to each span.
- `renderPage` iterates all 960 cells and, for text cells, sets `textContent`, `style.color`, and `style.backgroundColor` on each span; for mosaic cells, sets `--tt-fg`/`--tt-bg` on the mosaic span and updates each of the six inner block spans to `var(--tt-fg)` or `var(--tt-bg)` according to the sixel bits. Full re-render on page change only.
- `updateClock` touches only the 8 spans in columns 32–39 of row 0.
- Plain-text div is updated in `renderPage` by joining `page.plainText` with newlines.

---

## Scaling

The teletext character cell is proportioned 12×20 CSS pixels at 1× (a classic 2:5 width-to-height ratio for PAL text). The screen is therefore 480×480 CSS pixels.

Scaling strategy: CSS `transform: scale()` on `tt-screen`, computed in `main.ts` on resize.

```ts
const scale = Math.min(
  window.innerWidth  / 480,
  window.innerHeight / 480
);
screen.style.transform = `scale(${scale})`;
screen.style.transformOrigin = 'top center';
```

`tt-screen` has `width: 480px; height: 480px` fixed; the scale transform avoids layout reflow. No media queries in the renderer; scaling is a single numeric value. Integer snapping (`Math.floor`) is applied on screens where non-integer scaling causes blurry text.

Font: `"Courier New", Courier, monospace` for text cells. No web font is loaded for mosaic rendering; mosaics are drawn entirely with CSS.

---

## Requirement Coverage

| Requirement | Satisfied by |
|---|---|
| US-01 — 40×24 grid, 960 cells, range errors | `grid.ts`: `createGrid`, `readCell`, `writeCell` |
| US-02 — eight colours, CSS custom properties, type error on invalid | `colours.ts`: `validateColour`, `colourToCSS`; enforced in `writeCell` |
| US-03 — double-height split, structure error on interleaved normal row | `double-height.ts`: `applyDoubleHeight` |
| US-04 — mosaic kind/sixels, 0–63 validation, 2×3 CSS grid DOM rendering, no Unicode font | `mosaic.ts`: `validateSixels`; `dom-renderer.ts`: mosaic span with six block children |
| US-05 — header layout, clock update without full row re-render | `layout.ts`: `composeHeader`, `updateClock`; `dom-renderer.ts`: `updateClock` |
| US-06 — fastext bar, four slots, slot colours, empty-slot fill | `layout.ts`: `composeFastext`; `fastext.ts` (nav layer) supplies the descriptor |
| US-07 — `composePage` assembles complete grid, structure error on overflow | `layout.ts`: `composePage` |
| US-08 — plain-text output, mosaic → space, double-height once, trimmed, `aria-live` | `layout.ts`: `buildPlainText`; `dom-renderer.ts`: plain-text div with `aria-live="polite"` |
