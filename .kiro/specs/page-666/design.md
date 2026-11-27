# Design: Page 666 and the dial display

## Contract with the effects layer (do not break)

`src/fx/crt.ts` reads the page number from row 0, columns 0–3, with `/^P(\d{3})$/`, after every page change. Page 666 is "on screen" exactly when those four cells read `P666`. Therefore:

- Page 666 must use the normal `composePage` header. No custom header row.
- The dial display writes only to columns 0–3 of row 0. `crt.ts` ignores header-row mutations, so typing does not fire a channel change; `P6--` does not match the regex and is harmless.
- Do not add `data-fx` attributes anywhere; they belong to the effects layer.
- The effects layer swallows the first key press or click on 666 (the "trap"). That is intended; do not work around it.

## p666.ts

- One file, `src/pages/p666.ts`, shaped like `src/pages/p100.ts`: three `contentRows` arrays, one shared `fastext`, `load(subpage)` picking the array, `export const p666: PageModule = { pageNumber: 666, subpageCount: 3, load }`.
- Double-height row 1, mosaic bands and concealed cells use the existing renderer types; no renderer changes.
- Subpage 3 face: mosaic cells, White on Black, rows 5–14, about 16 cells wide, centred.
- Register it in `src/main.ts`: `createRegistry([NOT_FOUND_MODULE, p100, p666])`.

## Dial display

- Implement `updateKeypadDisplay(buffer)` in `src/main.ts` (currently a no-op).
- Pure helper `formatDial(buffer: string, currentPage: number): string` in `src/nav/dial.ts`: `'' → P<current>`, `'6' → 'P6--'`, `'66' → 'P66-'`.
- Writing to the DOM: set `textContent` of the first four cells of `[data-row="0"]` in the mounted grid. No full re-render.

## Not-found header

- Replace the static `NOT_FOUND_MODULE` header with the requested number: `loadPage` passes the requested number, and the not-found page is composed with `pageNumber: requested`. Clamp the display to three digits.
- Not-found pages are still not pushed to history.

## Out of scope here

- REVEAL key and hidden page 999. The router only accepts 100–899, so 999 needs a router range change; that is a separate spec.
- Row noise and the vertical-hold roll between subpages: the effects layer already does both on 666.
