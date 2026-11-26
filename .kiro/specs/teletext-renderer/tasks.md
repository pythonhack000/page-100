# Tasks: Teletext Renderer

Each task targets one file and one behaviour. Test file mirrors the source path under `tests/renderer/`.

---

## `colours.ts`

- [ ] **1.** Export `COLOUR_HEX` mapping all eight colour names to their hex strings. *(US-02)*
- [ ] **2.** Export `COLOUR_CSS` mapping all eight colour names to their `--tt-*` custom property strings. *(US-02)*
- [ ] **3.** `validateColour` returns the input unchanged when it is one of the eight valid names. *(US-02)*
- [ ] **4.** `validateColour` throws `TypeError` for any string not in the set (e.g. `'Purple'`, `''`). *(US-02)*
- [ ] **5.** `colourToCSS` returns `'var(--tt-white)'` for `'White'` and the equivalent for each other colour. *(US-02)*

---

## `grid.ts`

- [ ] **6.** `createGrid` returns an array of exactly 960 cells. *(US-01)*
- [ ] **7.** Every cell from `createGrid` has `char === ' '`, `fg === 'White'`, `bg === 'Black'`, and all attributes `false`. *(US-01)*
- [ ] **8.** `writeCell` returns a new grid with the updated cell; the original grid is unchanged (immutability). *(US-01)*
- [ ] **9.** `readCell` returns the value last written to that position. *(US-01)*
- [ ] **10.** `readCell` returns default values for a cell that has never been written. *(US-01)*
- [ ] **11.** `writeCell` and `readCell` throw `RangeError` for row < 0, row > 23, col < 0, or col > 39. *(US-01)*
- [ ] **12.** `writeCell` throws `TypeError` when the `fg` value is not a valid `TeletextColour`. *(US-02)*
- [ ] **13.** `writeCell` throws `TypeError` when the `bg` value is not a valid `TeletextColour`. *(US-02)*

---

## `double-height.ts`

- [ ] **14.** `applyDoubleHeight` sets `doubleHeight: true` on every cell in the source row. *(US-03)*
- [ ] **15.** `applyDoubleHeight` fills `row + 1` with the same `char`, `fg`, and `bg` as the source row, with `doubleHeightBottom: true`. *(US-03)*
- [ ] **16.** `applyDoubleHeight` throws `StructureError` when `row + 1` already contains non-default content. *(US-03)*
- [ ] **17.** `applyDoubleHeight` does not modify `row + 2` or any row other than `row` and `row + 1`. *(US-03)*

---

## `mosaic.ts`

- [ ] **18.** `validateSixels` returns the input unchanged when it is an integer in the range 0–63. *(US-04)*
- [ ] **19.** `validateSixels` throws `TypeError` for a non-integer number (e.g. `1.5`). *(US-04)*
- [ ] **20.** `validateSixels` throws `TypeError` for integers outside 0–63 (e.g. `-1`, `64`). *(US-04)*
- [ ] **21.** `validateSixels` throws `TypeError` for non-number inputs (e.g. `'5'`, `null`). *(US-04)*
- [ ] **22.** `mosaic.ts` does not export `encodeMosaic` or `decodeMosaic`. *(US-04)*

---

## `dom-renderer.ts` — mosaic cells

- [ ] **23.** A `MosaicCell` is rendered as a `<span class="tt-cell tt-mosaic">` containing exactly six child `<span class="tt-six">` elements arranged in a 2×3 CSS grid. *(US-04)*
- [ ] **24.** Each child span is coloured `var(--tt-fg)` when its corresponding sixel bit is 1, and `var(--tt-bg)` when it is 0, using `--tt-fg` and `--tt-bg` custom properties set inline on the parent mosaic span. *(US-04)*
- [ ] **25.** No Unicode block characters (U+1FB00–U+1FB3B or similar) appear in the DOM for mosaic cells, and no web font is loaded for mosaic rendering. *(US-04)*

---

## `layout.ts` — header

- [ ] **26.** `composeHeader` writes `P100` in columns 0–3 of row 0 for page number 100. *(US-05)*
- [ ] **27.** `composeHeader` writes four spaces in columns 4–7 of row 0. *(US-05)*
- [ ] **28.** `composeHeader` places the service name left-aligned in columns 8–31, padded to exactly 24 characters. *(US-05)*
- [ ] **29.** `composeHeader` writes the clock in `HH:MM:SS` format in columns 32–39 of row 0. *(US-05)*
- [ ] **30.** `composeHeader` applies `fg: 'White'` and `bg: 'Black'` to every cell in row 0. *(US-05)*
- [ ] **31.** `updateClock` changes only the 8 cells in columns 32–39 of row 0 and leaves all other cells unchanged. *(US-05)*

---

## `layout.ts` — fastext

- [ ] **32.** `composeFastext` fills a slot with one space, the three-digit page number, and a label padded to 10 characters total. *(US-06)*
- [ ] **33.** `composeFastext` applies the slot's designated colour (`Red`, `Green`, `Yellow`, `Cyan`) as `fg` to all non-space cells in that slot. *(US-06)*
- [ ] **34.** `composeFastext` fills an empty slot with 10 space cells with `fg: 'Black'` and `bg: 'Black'`. *(US-06)*

---

## `layout.ts` — composition

- [ ] **35.** `composePage` returns a `TeletextPage` whose grid has exactly 960 cells. *(US-07)*
- [ ] **36.** `composePage` maps `contentRows[0]` to row 1 and `contentRows[21]` to row 22. *(US-07)*
- [ ] **37.** Unspecified content rows are filled with default cells (space, White foreground, Black background, no attributes). *(US-07)*
- [ ] **38.** `composePage` throws `StructureError` when more than 22 content rows are supplied. *(US-07)*
- [ ] **39.** A `RowSpec` with `doubleHeight: true` causes `applyDoubleHeight` to be called, consuming the next content slot. *(US-03, US-07)*

---

## `layout.ts` — plain-text output

- [ ] **40.** `buildPlainText` returns exactly 24 strings, one per row. *(US-08)*
- [ ] **41.** Mosaic cells are replaced with a space in the plain-text output. *(US-08)*
- [ ] **42.** A double-height pair produces one line of content text (from the top-half row); the bottom-half row produces an empty string. *(US-08)*
- [ ] **43.** Each line in the plain-text output has trailing spaces trimmed. *(US-08)*
