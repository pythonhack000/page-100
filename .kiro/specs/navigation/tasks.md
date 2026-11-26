# Tasks: Navigation

Each task targets one file and one behaviour. Test file mirrors the source path under `tests/nav/`. All tasks are test-first: write the test, then the implementation.

---

## `keypad.ts`

- [ ] **1.** `initialKeypadState` returns `{ buffer: '', timeoutId: null }`. *(US-01)*
- [ ] **2.** `appendDigit` appends a single digit to an empty buffer and returns `scheduleTimeout: true`, `cancelTimeout: false`, `navigate: null`. *(US-01)*
- [ ] **3.** `appendDigit` appends a second digit to a one-digit buffer; buffer becomes two digits, `scheduleTimeout: true`, `cancelTimeout: true` (previous timeout must be replaced). *(US-01)*
- [ ] **4.** `appendDigit` on a two-digit buffer completes a three-digit entry: `navigate` equals the completed string, buffer resets to `''`, `scheduleTimeout: false`, `cancelTimeout: true`. *(US-01)*
- [ ] **5.** `appendDigit` on a full (three-digit) buffer discards the old buffer, starts a new one with the incoming digit, `cancelTimeout: true`, `scheduleTimeout: true`, `navigate: null`. *(US-01)*
- [ ] **6.** `appendDigit` with a non-digit value (`'a'`, `' '`, `''`, `'10'`) returns state unchanged, `navigate: null`, `scheduleTimeout: false`, `cancelTimeout: false`. *(US-01)*
- [ ] **7.** `timeoutExpired` returns `buffer: ''`, `timeoutId: null`, `navigate: null`, `scheduleTimeout: false`, `cancelTimeout: false`. *(US-01)*
- [ ] **8.** `resetKeypad` on a non-empty buffer returns `buffer: ''`, `navigate: null`, `cancelTimeout: true`, `scheduleTimeout: false`. *(US-01)*
- [ ] **9.** `resetKeypad` on an empty buffer (no pending timeout) returns `cancelTimeout: false`. *(US-01)*
- [ ] **10.** `getBuffer` returns the exact current buffer string without modifying state. *(US-01)*

---

## `router.ts`

### `createRegistry`

- [ ] **11.** `createRegistry` with a valid array of page modules returns a `ReadonlyMap` whose size equals the number of distinct page numbers supplied. *(US-02)*
- [ ] **12.** `createRegistry` accepts a module with `pageNumber === 0` (the not-found sentinel) and `subpageCount === 1` without throwing. *(US-02)*
- [ ] **13.** `createRegistry` accepts a module with `pageNumber` in 100–899 and `subpageCount ≥ 1` without throwing. *(US-02)*
- [ ] **14.** `createRegistry` throws `RangeError` when any module's `subpageCount < 1`. *(US-02)*
- [ ] **15.** `createRegistry` throws `RangeError` when any module's `pageNumber` is outside 0–899 (e.g. `900`, `-1`). *(US-02)*
- [ ] **16.** When two modules share the same `pageNumber`, `createRegistry` stores the last one and discards the earlier one. *(US-02)*

### `initialRouterState`

- [ ] **17.** `initialRouterState` returns `{ currentPage: startPage, subpageIndex: 1 }`. Timer IDs are not present in `RouterState`. *(US-02)*

### `navigateTo`

- [ ] **18.** `navigateTo` with a valid registered page number returns the page from that module's `load(1)` and `subpageIndex: 1`. *(US-02)*
- [ ] **19.** `navigateTo` with a page number outside 100–899 returns the not-found module's page instead of throwing. *(US-02)*
- [ ] **20.** `navigateTo` with a valid but unregistered page number returns the not-found module's page. *(US-02)*
- [ ] **21.** `navigateTo` always resets `subpageIndex` to 1 and signals `stopCycling: true`. *(US-02)*
- [ ] **22.** `navigateTo` signals `startCycling: true` only when the target page's `subpageCount > 1`; it signals `startCycling: false` when `subpageCount === 1`. *(US-02)*
- [ ] **23.** Two `navigateTo` calls with separate registries created by `createRegistry` do not share state; results are independent. *(US-02)*

### `advance`

- [ ] **24.** `advance` increments `subpageIndex` by 1 and returns the page from `load(newIndex)`; it does not signal `startCycling` or `stopCycling`. *(US-02)*
- [ ] **25.** `advance` wraps `subpageIndex` from `subpageCount` back to 1 on the next call. *(US-02)*

### `getSubpageNotation`

- [ ] **26.** `getSubpageNotation` returns `'n/N'` for the current subpage index and total count (e.g. `'2/3'`). *(US-02)*
- [ ] **27.** `getSubpageNotation` returns `'1/1'` for a single-subpage page. *(US-02)*

---

## `history.ts`

- [ ] **28.** `initialHistoryState` returns `{ back: [startPage], forward: [] }`. *(US-03)*
- [ ] **29.** `push` appends the page number to the back stack and returns an empty forward stack. *(US-03)*
- [ ] **30.** `push` discards any existing forward entries before appending the new page number. *(US-03)*
- [ ] **31.** `push` is a no-op when the supplied page number equals the current top of the back stack. *(US-03)*
- [ ] **32.** `back` with more than one entry in the back stack moves the current page to the front of the forward stack and returns the previous page. *(US-03)*
- [ ] **33.** `back` with exactly one entry in the back stack returns `{ state (unchanged), page: null }`. *(US-03)*
- [ ] **34.** `forward` with a non-empty forward stack moves `forward[0]` to the top of the back stack and returns that page number. *(US-03)*
- [ ] **35.** `forward` with an empty forward stack returns `{ state (unchanged), page: null }`. *(US-03)*
- [ ] **36.** `current` returns the top of the back stack without modifying either stack. *(US-03)*
- [ ] **37.** `clearHistory` returns `{ back: [], forward: [] }`. *(US-03)*
- [ ] **38.** All history operations return new state objects; the input state arrays are never mutated. *(US-03)*

---

## `fastext.ts`

- [ ] **39.** `initialFastextState` returns all four slots as `null`. *(US-04)*
- [ ] **40.** `setSlot` accepts a `FastextLink` imported from `src/renderer/types.ts`; calling `setSlot` with a valid page number (100–899) and a label of at most 6 characters stores the link. *(US-04)*
- [ ] **41.** `setSlot` pads a label shorter than 6 characters with trailing spaces to exactly 6 characters. *(US-04)*
- [ ] **42.** `setSlot` throws `RangeError` for a label longer than 6 characters and leaves the slot unchanged. *(US-04)*
- [ ] **43.** `setSlot` throws `RangeError` for a page number outside 100–899 and leaves the slot unchanged. *(US-04)*
- [ ] **44.** `clearSlot` sets the specified colour slot to `null` and leaves the other three slots unchanged. *(US-04)*
- [ ] **45.** `clearAll` returns a state equivalent to `initialFastextState`. *(US-04)*
- [ ] **46.** `getSlot` returns `{ colour, link: null }` for an empty slot. *(US-04)*
- [ ] **47.** `getSlot` returns `{ colour, link: FastextLink }` for a populated slot, with the label padded to exactly 6 characters. *(US-04)*
- [ ] **48.** `getLayout` returns a four-element tuple in the fixed order Red → Green → Yellow → Cyan. *(US-04)*
- [ ] **49.** `getLayout` for a non-empty slot produces `text` of exactly 10 characters: one space, the zero-padded three-digit page number, and the 6-character label. *(US-04)*
- [ ] **50.** `getLayout` for an empty slot produces `text` of exactly 10 spaces and `isEmpty: true`. *(US-04)*
- [ ] **51.** `toDescriptor` returns a `FastextDescriptor` (imported from `src/renderer/types.ts`) whose populated slots match the stored `FastextLink` values and whose empty slots are `undefined`. *(US-04)*
- [ ] **52.** `activateSlot` returns the target page number for a populated slot. *(US-04)*
- [ ] **53.** `activateSlot` returns `null` for an empty slot. *(US-04)*
- [ ] **54.** All `fastext.ts` operations return new state objects; the input state is never mutated. *(US-04)*
