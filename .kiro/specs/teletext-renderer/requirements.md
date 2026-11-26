# Requirements: Teletext Renderer

Feature scope: `src/renderer/` — grid, colours, double-height, mosaic, layout, and the plain-text accessibility output. No DOM, no navigation, no data fetching.

---

## 1. 40×24 Grid

**US-01** — As a page author, I need a fixed 40-column × 24-row cell model so every page has a predictable layout canvas.

- WHEN a grid is initialised, THE SYSTEM SHALL create exactly 960 cells (40 columns × 24 rows), each holding a character, a foreground colour, a background colour, and a set of attributes (double-height, mosaic, concealed), with defaults of U+0020, White foreground, Black background, and all attributes false.
- WHEN a cell is written at a row index outside 0–23 or a column index outside 0–39, THE SYSTEM SHALL throw a range error and leave the grid unchanged.
- WHEN a cell is read, THE SYSTEM SHALL return the last-written character, foreground colour, background colour, and attributes for that position, or the defaults if the cell has never been written.

---

## 2. Colours

**US-02** — As a page author, I need exactly the eight teletext colours so rendered output matches the classic palette.

- WHEN a foreground or background colour is applied to a cell, THE SYSTEM SHALL accept only Black (`#000000`), Red (`#FF0000`), Green (`#00FF00`), Yellow (`#FFFF00`), Blue (`#0000FF`), Magenta (`#FF00FF`), Cyan (`#00FFFF`), or White (`#FFFFFF`).
- WHEN a colour outside that set is supplied, THE SYSTEM SHALL throw a type error and leave the cell unchanged.
- WHEN a cell has no explicit foreground colour set, THE SYSTEM SHALL treat it as White; when it has no explicit background colour set, THE SYSTEM SHALL treat it as Black.
- WHEN a cell has the concealed attribute set, THE SYSTEM SHALL render it by setting the foreground colour equal to the background colour, hiding the content visually.
- WHEN colour values are exposed for styling, THE SYSTEM SHALL map each colour to its corresponding CSS custom property (`--tt-black` … `--tt-white`) as defined in `colours.ts`.

---

## 3. Double-Height Rows

**US-03** — As a page author, I need double-height text so headlines stand out at twice the normal character height.

- WHEN a row is marked double-height, THE SYSTEM SHALL split it into two contiguous grid rows: a top-half row and a bottom-half row, each 40 cells wide.
- WHEN `double-height.ts` processes a double-height row, THE SYSTEM SHALL produce the top-half cells on the source row index and the bottom-half cells on the immediately following row index.
- IF a normal-height row is placed between the top-half and bottom-half rows of a double-height pair, THE SYSTEM SHALL throw a structure error.
- WHEN double-height content is authored, THE SYSTEM SHALL require the content to be written once; the split into top and bottom halves is performed by `double-height.ts` without duplicating the source data in the page module.

---

## 4. Mosaic Block Graphics

**US-04** — As a page author, I need 2×3 sixel mosaic cells so I can draw block graphics within the character grid.

- WHEN a cell is defined, THE SYSTEM SHALL give it a `kind` of either `'text'` or `'mosaic'`; a text cell stores a character, a mosaic cell stores a `sixels` integer.
- WHEN a mosaic cell is created, THE SYSTEM SHALL validate that `sixels` is an integer in the range 0–63; if it is not, THE SYSTEM SHALL throw a type error.
- WHEN a mosaic cell's sixels value is interpreted, THE SYSTEM SHALL apply the bit layout: bit 0 → top-left, bit 1 → top-right, bit 2 → middle-left, bit 3 → middle-right, bit 4 → bottom-left, bit 5 → bottom-right, where 1 means filled (foreground colour) and 0 means empty (background colour).
- WHEN a mosaic cell is rendered in the DOM, THE SYSTEM SHALL output a `<span>` containing a 2×3 CSS grid of six block elements, each filled with the cell's foreground colour (for a filled sixel) or background colour (for an empty sixel).
- THE SYSTEM SHALL NOT use Unicode block characters (U+1FB00–U+1FB3B or similar) to represent mosaic cells, and SHALL NOT require a web font for mosaic rendering.
- THE SYSTEM SHALL NOT expose `encodeMosaic` or `decodeMosaic` functions; mosaic cells are constructed directly with a `sixels` value.

---

## 5. Header Row (Row 0)

**US-05** — As a viewer, I need a standard header row so I can see the page number, service name, and current time at a glance.

- WHEN a page is rendered, THE SYSTEM SHALL reserve row 0 entirely for the header; no page content may occupy row 0.
- WHEN the header is composed, THE SYSTEM SHALL place the page number left-aligned in columns 0–3 as `Pnnn` (e.g. `P100`).
- WHEN the header is composed, THE SYSTEM SHALL fill columns 4–7 with a single space pad.
- WHEN the header is composed, THE SYSTEM SHALL place the service name left-aligned in columns 8–31, padded with spaces to exactly 24 characters.
- WHEN the header is composed, THE SYSTEM SHALL place a clock in columns 32–39 in the format `HH:MM:SS`.
- WHILE the page is displayed, THE SYSTEM SHALL update the clock digits in columns 32–39 every second without re-rendering the rest of row 0.
- WHEN the header is rendered, THE SYSTEM SHALL apply White foreground on Black background to every cell in row 0.

---

## 6. Fastext Bar (Row 23)

**US-06** — As a viewer, I need a Fastext bar so I can see the colour-coded page links available from the current page.

- WHEN a page is rendered, THE SYSTEM SHALL reserve row 23 entirely for the Fastext bar; no page content may occupy row 23.
- WHEN the Fastext bar is composed, THE SYSTEM SHALL lay out four fixed 10-column slots: columns 0–9 (Red), 10–19 (Green), 20–29 (Yellow), 30–39 (Cyan).
- WHEN a slot has a link, THE SYSTEM SHALL fill it with: one space, the three-digit page number, and a label padded with spaces to give exactly 10 characters total.
- WHEN a slot has no link, THE SYSTEM SHALL fill its 10 columns with spaces in Black.
- WHEN the Fastext bar is rendered, THE SYSTEM SHALL apply the slot's designated colour as foreground for every non-empty cell in that slot.

---

## 7. Page Layout Composition

**US-07** — As a page module, I need a `layout.ts` compositor so I can assemble a complete `TeletextPage` from structured data without manually managing row indices.

- WHEN `layout.ts` composes a page, THE SYSTEM SHALL accept a header descriptor, an array of content rows (rows 1–22), and a Fastext descriptor, then return a fully populated 40×24 grid.
- WHEN content rows are provided, THE SYSTEM SHALL map them to rows 1–22; any unspecified rows SHALL be filled with the default cell (space, White, no attributes).
- WHEN more than 22 content rows are supplied (rows 1–22 capacity), THE SYSTEM SHALL throw a structure error rather than silently truncate.

---

## 8. Plain-Text Accessibility Output

**US-08** — As a screen-reader user, I need every page to have a plain-text equivalent so I can access the content without relying on the grid rendering.

- WHEN a `TeletextPage` is rendered, THE SYSTEM SHALL produce a plain-text string alongside the grid: one line per row, characters concatenated left-to-right, with no colour or mosaic encoding.
- WHEN a row contains mosaic cells, THE SYSTEM SHALL omit those cells' characters from the plain-text output (replace with space) so the text reads naturally.
- WHEN a double-height row is present, THE SYSTEM SHALL include the content text once in the plain-text output, not twice (top half and bottom half produce a single line).
- WHEN the plain-text output is produced, THE SYSTEM SHALL trim trailing spaces from each line.
- WHEN the page is mounted in the DOM, THE SYSTEM SHALL expose the plain-text output in an element with `aria-live="polite"` that is visually hidden but accessible to assistive technology.
