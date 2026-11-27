# Requirements: Page 666 and the dial display

Feature scope: `src/pages/p666.ts`, the keypad display and the not-found header in `src/main.ts`. The horror effects (`src/fx/`) already exist and are out of scope: they start by themselves when the header reads `P666`. Content source: `docs/page-content.md`, section "666".

---

## 1. Page 666

**US-01** — As a viewer, I need page 666 to exist so the index entry "666 ???" leads somewhere.

- WHEN page 666 is requested, THE SYSTEM SHALL return a registered page module with three subpages.
- THE SYSTEM SHALL compose each subpage with header `{ pageNumber: 666, serviceName: 'PAGE 100' }`, so row 0 columns 0–3 read exactly `P666`.
- THE SYSTEM SHALL render subpage 1 ("LAST TRANSMISSION"), subpage 2 ("WEATHER NOWHERE") and subpage 3 (the ghost face) exactly as laid out in `docs/page-content.md`, rows, text and colours included.
- THE SYSTEM SHALL render row 18 of subpage 1 as concealed cells (`concealed: true`).
- THE SYSTEM SHALL use the Fastext links red → 100 "Index", green/yellow/cyan → 666 "...".
- THE SYSTEM SHALL cycle the subpages every 8 000 ms through the existing router cycling; no new timer.

## 2. Dial display

**US-02** — As a viewer, I need to see the digits I am typing, like a real set that shows the page it is searching for.

- WHEN one digit is in the keypad buffer, THE SYSTEM SHALL show `P` + the digit + `--` in row 0 columns 0–3 (e.g. `P6--`).
- WHEN two digits are in the buffer, THE SYSTEM SHALL show `P` + both digits + `-` (e.g. `P66-`).
- WHEN the third digit completes the entry, THE SYSTEM SHALL show the page that loads (`P666`, or the requested number on not-found).
- WHEN the keypad times out or is reset, THE SYSTEM SHALL restore the current page number in columns 0–3.
- THE SYSTEM SHALL change only columns 0–3 of row 0; the service name and the clock SHALL NOT change.

## 3. Not-found header

**US-03** — As a viewer, I need the not-found page to show the number I asked for, not P100.

- WHEN an unregistered page `n` is requested, THE SYSTEM SHALL render the not-found page with header page number `n` (e.g. `P123`).
- WHEN `n` is outside 100–899, THE SYSTEM SHALL still show the three digits typed.
