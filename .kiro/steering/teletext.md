# Teletext Rules: Page 100

## Grid

40 columns × 24 rows. Each cell holds one character, a foreground colour, a background colour (default Black), and one set of attributes (double-height, mosaic, concealed). Both colours are drawn from the same 8-colour set. Row indices are 0–23; column indices are 0–39.

Concealed cells hide their content by setting the foreground colour equal to the background colour.

## Colours

Eight colours only. No other colours are permitted.

| Name    | Hex       | CSS custom property   |
|---------|-----------|-----------------------|
| Black   | `#000000` | `--tt-black`          |
| Red     | `#FF0000` | `--tt-red`            |
| Green   | `#00FF00` | `--tt-green`          |
| Yellow  | `#FFFF00` | `--tt-yellow`         |
| Blue    | `#0000FF` | `--tt-blue`           |
| Magenta | `#FF00FF` | `--tt-magenta`        |
| Cyan    | `#00FFFF` | `--tt-cyan`           |
| White   | `#FFFFFF` | `--tt-white`          |

Default foreground: White. Default background: Black.

## Double-height

A double-height row occupies two grid rows: a top half and a bottom half. The source content is authored once; `double-height.ts` splits it into a top-cell row and a bottom-cell row. Both rows must be present and contiguous. Normal-height rows may not be interleaved between a double-height pair.

## Mosaic block graphics

A cell has a `kind` of `'text'` or `'mosaic'`. A mosaic cell stores a `sixels` value — an integer 0–63 — using the same bit layout:

```
bit 0 → top-left      bit 1 → top-right
bit 2 → middle-left   bit 3 → middle-right
bit 4 → bottom-left   bit 5 → bottom-right
```

Bit value 1 means the sixel is filled (foreground colour); 0 means empty (background colour). A mosaic cell is not stored as a Unicode character. It is rendered in the DOM as a `<span>` containing a 2×3 CSS grid of six block elements, each filled with the cell's foreground or background colour. `mosaic.ts` validates that `sixels` is an integer in the range 0–63; there is no `encodeMosaic`/`decodeMosaic` and no web font dependency.

## Header row (row 0)

Row 0 is reserved. Fixed layout:

```
P100  PAGE 100         SERVICE NAME  HH:MM:SS
```

- Columns 0–3: page number, format `Pnnn` (e.g. `P100`).
- Columns 4–7: single space pad.
- Columns 8–31: service name, left-aligned, padded with spaces to 24 characters.
- Columns 32–39: live clock, format `HH:MM:SS`, updated every second.

Header foreground: White on Black. Clock digits update in place; no full-row rerender.

## Fastext bar (row 23)

Row 23 is reserved for Fastext colour links. Four fixed slots:

| Columns | Colour  | Slot   |
|---------|---------|--------|
| 0–9     | Red     | link 1 |
| 10–19   | Green   | link 2 |
| 20–29   | Yellow  | link 3 |
| 30–39   | Cyan    | link 4 |

Each slot is 10 characters: a space, the page number (3 chars), and a label padded to 6 chars. If a slot has no link, it is filled with spaces in Black. `fastext.ts` manages the four link slots per page.

## Page numbering

Valid page numbers are 100–899. Numbers outside this range are not routable. Pages 100–109 may have subpages (see below). No page number contains a letter; all navigation uses three decimal digits.

## Subpages

A page with multiple subpages cycles through them automatically. Subpage notation is `n/N` (e.g. `1/3`, `2/3`, `3/3`). The router in `router.ts` tracks the current subpage index per page and advances it on a fixed interval. Subpage count is determined by the page module at load time. Direct digit navigation always lands on subpage 1.
