# Tasks: Page 666 and the dial display

Test-first. Tests go in `tests/pages/` and `tests/nav/`. Run `npx vitest run` after each task; all existing tests must stay green.

## Priority 1 (do these first, they make the horror sequence reachable)

- [ ] **1.** `tests/pages/p666.test.ts`: `p666.pageNumber === 666`, `subpageCount === 3`, and `load(n)` for n = 1, 2, 3 returns a page whose row 0 columns 0–3 read `P666`. *(US-01)*
- [ ] **2.** `src/pages/p666.ts` subpage 1 "LAST TRANSMISSION" from `docs/page-content.md`; test the row texts and colours, and that row 18 cells are concealed. *(US-01)*
- [ ] **3.** Subpage 2 "WEATHER NOWHERE"; test row texts and colours. *(US-01)*
- [ ] **4.** Subpage 3 ghost face; test that rows 5–14 contain mosaic cells and nothing outside columns 12–27. *(US-01)*
- [ ] **5.** Register `p666` in `src/main.ts`. *(US-01)*

## Priority 2

- [ ] **6.** `tests/nav/dial.test.ts` + `src/nav/dial.ts` `formatDial`: `('', 100) → 'P100'`, `('6', 100) → 'P6--'`, `('66', 100) → 'P66-'`. *(US-02)*
- [ ] **7.** `updateKeypadDisplay` in `src/main.ts` writes `formatDial` into row 0 columns 0–3; timeout and reset restore the current page. *(US-02)*
- [ ] **8.** Not-found header shows the requested number; test with 123 and 999. *(US-03)*

## Check by hand

- [ ] **9.** `npm run dev`, type 6, 6, 6 on the remote: header shows `P6--`, `P66-`, then page 666 loads and the room turns red within a second.
