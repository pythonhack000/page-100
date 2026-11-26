# Folder Structure: Page 100

## `src/renderer/`
Pure TypeScript. No DOM access. Fully unit-tested.

- `grid.ts` — 40×24 cell model; character, colour, and attribute per cell
- `colours.ts` — the 8 teletext colours as CSS custom properties and cell attribute constants
- `double-height.ts` — splits a double-height row into top/bottom cell pairs
- `mosaic.ts` — encodes/decodes 2×3 sixel block graphics into mosaic characters
- `layout.ts` — composes a `TeletextPage` (header row + content rows + fastext bar) from structured data

## `src/nav/`
Pure TypeScript. No DOM access. Fully unit-tested.

- `router.ts` — maps a three-digit page number to a page module; handles subpage cycling (1/3, 2/3…)
- `fastext.ts` — four colour-link slots (red / green / yellow / cyan) per page
- `keypad.ts` — digit accumulator: buffers up to 3 keystrokes then fires a navigation event
- `history.ts` — previous/next page stack for arrow-key navigation

## `src/pages/`
One module per page. Each imports its JSON from `public/data/` and returns a `TeletextPage`.

- `p100.ts` — index page; static content, lists all available pages
- `p101_109.ts` — news headlines; reads `news.json`, maps items to rows, rotates subpages
- `p400.ts` — weather; reads `weather.json`, formats temperature, wind, condition rows
- `p500.ts` — exchange rates; reads `rates.json`, formats currency pairs in a table
- `p666.ts` — haunted page; glitch effects, rolling bars, ghost frames, easter egg logic
- `p888.ts` — about + page weight counter; reads all data files and displays their sizes

## `src/main.ts`
Entry point. Imports renderer, nav, and page modules. Wires DOM canvas/container to the renderer. Attaches keyboard and touch event listeners. No business logic.

## `scripts/build-data/`
Node scripts run by the GitHub Actions data-build workflow. Not bundled into the site.

- `fetch-news.ts` — fetches RSS feeds, parses XML, writes `public/data/news.json`
- `fetch-weather.ts` — queries Open-Meteo by lat/lon, writes `public/data/weather.json`
- `fetch-rates.ts` — queries open.er-api.com, writes `public/data/rates.json`
- `check-sizes.ts` — asserts every file in `public/data/` is under 2 KB; exits non-zero on failure

## `public/data/`
Static JSON files committed to the repo. Written by the data-build workflow; never by the browser.

- `news.json` — array of `{ headline, summary }` objects, one per news item
- `weather.json` — current conditions and short forecast for the configured city
- `rates.json` — base currency (USD) plus a fixed list of pairs including TJS

Each file must stay under 2 KB. `check-sizes.ts` enforces this in CI.

## `tests/`
Vitest unit tests. Mirror the `src/` structure.

- `renderer/` — tests for grid, colour, double-height, mosaic, and layout functions
- `nav/` — tests for router, fastext, keypad, and history logic
- `pages/` — tests for each page module using fixture JSON (not live network calls)

No DOM tests. All test subjects are pure functions or classes with no side effects.
