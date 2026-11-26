# Design: Navigation

Feature scope: `src/nav/` — digit accumulator, page router, browsing history, and Fastext link slots. No DOM, no rendering, no data fetching.

---

## State Model

All four navigation modules use immutable state: every mutating operation returns a new state value rather than modifying the input. This keeps unit tests free of setup/teardown noise, makes the history stack trivially serialisable, and lets `main.ts` hold the single authoritative state reference.

```ts
// The shape held by main.ts; navigation events replace the whole record.
interface NavState {
  keypad:  KeypadState;
  router:  RouterState;
  history: HistoryState;
  fastext: FastextState;
}
```

`main.ts` owns one `NavState` binding. Every keyboard or timer event produces a new `NavState` via a reducer-style update:

```ts
let nav: NavState = initialNavState(registry, START_PAGE);

function dispatch(event: NavEvent): void {
  const result = applyNavEvent(nav, registry, event);
  nav = result.state;
  if (result.navigate != null) loadPage(result.navigate);
  if (result.keypadDisplay != null) updateKeypadDisplay(result.keypadDisplay);
}
```

Side effects (DOM updates, timers) remain in `main.ts`. The nav modules are pure.

---

## `src/nav/keypad.ts`

### State

```ts
interface KeypadState {
  readonly buffer: string;        // '' | '0'–'9' | '00'–'99' | '000'–'999'
  readonly timeoutId: number | null; // opaque handle passed back to main.ts for cancellation
}

function initialKeypadState(): KeypadState;
// Returns { buffer: '', timeoutId: null }
```

### Operations

```ts
interface KeypadResult {
  readonly state: KeypadState;
  readonly navigate: string | null;  // non-null when buffer completed a three-digit number
  readonly scheduleTimeout: boolean; // true when main.ts must set a 2 000 ms timeout
  readonly cancelTimeout: boolean;   // true when main.ts must cancel the current timeout
}

function appendDigit(state: KeypadState, digit: string): KeypadResult;
// digit must satisfy /^[0-9]$/ — anything else returns state unchanged with no side effects.
// When buffer is full (3 chars), discards old buffer, starts fresh with digit:
//   cancelTimeout: true, scheduleTimeout: true, navigate: null, buffer: digit.
// When buffer reaches 3 chars after appending:
//   navigate: the completed string, buffer: '', cancelTimeout: true, scheduleTimeout: false.
// Otherwise:
//   scheduleTimeout: true, cancelTimeout: (previous timeoutId != null).

function timeoutExpired(state: KeypadState): KeypadResult;
// Called by main.ts when the 2 000 ms timeout fires.
// Returns state with buffer: '', timeoutId: null, navigate: null.
// cancelTimeout: false (timeout already fired), scheduleTimeout: false.

function resetKeypad(state: KeypadState): KeypadResult;
// Explicit reset (e.g. Escape key). Clears buffer, signals cancel.
// navigate: null, cancelTimeout: (timeoutId != null), scheduleTimeout: false.

function getBuffer(state: KeypadState): string;
// Returns the current buffer string ('', '1', '10', etc.). Pure read; no state change.
```

### Notes

- `timeoutId` is not a timer handle managed inside the module. `KeypadResult.scheduleTimeout` tells `main.ts` to call `setTimeout(() => dispatch({ type: 'keypadTimeout' }), 2000)` and store the returned handle in `state.timeoutId` before updating `nav`. `KeypadResult.cancelTimeout` tells `main.ts` to call `clearTimeout(state.timeoutId)`. This keeps the module dependency-free and independently testable.
- `appendDigit` with a non-digit returns `{ state, navigate: null, scheduleTimeout: false, cancelTimeout: false }` — no changes.

---

## `src/nav/router.ts`

### Types

```ts
interface PageModule {
  readonly pageNumber: number;   // 100–899
  readonly subpageCount: number; // ≥ 1
  readonly load: (subpage: number) => TeletextPage;
}
```

`TeletextPage` is imported from `src/renderer/layout.ts`. The router does not render; it stores loaders.

### Registry

The registry is a `ReadonlyMap` created once at startup by `main.ts` and passed explicitly to every router operation. There is no module-level mutable variable.

```ts
function createRegistry(modules: readonly PageModule[]): ReadonlyMap<number, PageModule>;
// Validates each module:
//   Throws RangeError if module.subpageCount < 1.
//   Throws RangeError if module.pageNumber is outside 0–899
//     (sentinel 0 is the not-found fallback; valid page numbers are 100–899).
// If two modules share the same pageNumber, the last one wins.
// Returns a frozen ReadonlyMap; callers must not attempt to modify it.
```

`main.ts` calls `createRegistry` once during initialisation, before any routing:

```ts
const registry = createRegistry([NOT_FOUND_MODULE, p100, p101_109, p400, p500, p666, p888]);
```

Passing `registry` as an explicit argument to `navigateTo` and `advance` means tests create their own isolated map with no shared state between test cases.

### State

```ts
interface RouterState {
  readonly currentPage: number;
  readonly subpageIndex: number;  // 1-based, 1 ≤ subpageIndex ≤ subpageCount
}

function initialRouterState(startPage: number): RouterState;
// Returns { currentPage: startPage, subpageIndex: 1 }.
```

Timer IDs are not part of `RouterState`. `main.ts` holds the cycling interval handle in a local variable alongside `nav`.

### Operations

```ts
interface RouterResult {
  readonly state: RouterState;
  readonly page: TeletextPage;
  readonly subpageNotation: string;      // e.g. '2/3' or '1/1'
  readonly startCycling: boolean;        // true when main.ts must set an 8 000 ms interval
  readonly stopCycling: boolean;         // true when main.ts must clear the current interval
}

function navigateTo(
  state: RouterState,
  registry: ReadonlyMap<number, PageModule>,
  pageNumber: number
): RouterResult;
// Valid range 100–899; out-of-range or unregistered → not-found module (sentinel 0).
// Always resets subpageIndex to 1 and signals stopCycling: true.
// Signals startCycling: true only when the page's subpageCount > 1.

function advance(
  state: RouterState,
  registry: ReadonlyMap<number, PageModule>
): RouterResult;
// Increments subpageIndex; wraps from subpageCount back to 1.
// Does not change currentPage. Does not signal start/stopCycling (interval stays running).
// Called by main.ts on each cycling interval tick.

function getSubpageNotation(
  state: RouterState,
  registry: ReadonlyMap<number, PageModule>
): string;
// Returns 'n/N' string from currentPage's subpageCount and subpageIndex.
// Pure read; no state change.
```

### Not-found fallback

A module registered under the sentinel number `0` serves as the page-not-found page. `main.ts` includes it first in the array passed to `createRegistry`:

```ts
createRegistry([NOT_FOUND_MODULE, ...]); // NOT_FOUND_MODULE.pageNumber === 0
```

`navigateTo` falls through to it when the page number is out of range or unregistered. The sentinel never appears in the visible page number display; `main.ts` checks `result.state.currentPage === 0` to decide whether to suppress history recording.

### Timer ownership

Same pattern as `keypad.ts`. `startCycling: true` → `main.ts` calls `setInterval(() => dispatch({ type: 'subpageAdvance' }), 8000)` and stores the handle in a local variable. `stopCycling: true` → `main.ts` calls `clearInterval` on that handle. The module itself never touches `setTimeout`/`setInterval` and carries no timer ID in its state.

---

## `src/nav/history.ts`

### State

```ts
interface HistoryState {
  readonly back:    readonly number[];  // back[back.length - 1] is the current page
  readonly forward: readonly number[];  // forward[0] is the most recent 'forward' target
}

function initialHistoryState(startPage: number): HistoryState;
// Returns { back: [startPage], forward: [] }.
```

### Operations

```ts
function push(state: HistoryState, pageNumber: number): HistoryState;
// Appends pageNumber to back; discards forward entirely.
// No-op if pageNumber equals the current top of back (prevents duplicate entries on reload).

function back(state: HistoryState): { state: HistoryState; page: number | null };
// When back.length ≤ 1: returns { state (unchanged), page: null }.
// Otherwise: moves back[last] to forward[0], returns new state and the new top of back.

function forward(state: HistoryState): { state: HistoryState; page: number | null };
// When forward is empty: returns { state (unchanged), page: null }.
// Otherwise: moves forward[0] to back[last], returns new state and the page moved.

function current(state: HistoryState): number | null;
// Returns back[back.length - 1], or null if back is empty (should not occur in practice).

function clearHistory(state: HistoryState): HistoryState;
// Returns { back: [], forward: [] }.
```

### Immutability

All returned `HistoryState` objects are new values. Arrays use the spread operator for copy-on-write; no mutation of the input arrays. This means two history snapshots can safely co-exist (useful for page-666 "ghost history" easter egg).

---

## `src/nav/fastext.ts`

### Types

`fastext.ts` imports `FastextLink` and `FastextDescriptor` from `src/renderer/types.ts` and reuses them directly. It does not define its own versions of these types.

```ts
// From src/renderer/types.ts — reproduced here for reference only; do not redeclare.
//
// interface FastextLink {
//   readonly page:  number;  // 100–899
//   readonly label: string;  // padded or truncated to fit the 10-character slot
// }
//
// interface FastextDescriptor {
//   red?:    FastextLink;
//   green?:  FastextLink;
//   yellow?: FastextLink;
//   cyan?:   FastextLink;
// }
```

Each slot is 10 characters wide (40 columns ÷ 4 slots). The formatted text for a populated slot is: one leading space, the zero-padded three-digit page number (3 chars), and a label padded or truncated to 6 characters — 10 characters in total. `fastext.ts` enforces the 6-character label constraint when writing a slot; `layout.ts` reads the slot via `FastextDescriptor` and formats row 23.

The local `FastextColour` type is still defined in `fastext.ts` because it is nav-specific and is not part of the renderer types:

```ts
type FastextColour = 'Red' | 'Green' | 'Yellow' | 'Cyan';
```

### State

```ts
interface FastextState {
  readonly red:    FastextLink | null;
  readonly green:  FastextLink | null;
  readonly yellow: FastextLink | null;
  readonly cyan:   FastextLink | null;
}

function initialFastextState(): FastextState;
// Returns { red: null, green: null, yellow: null, cyan: null }.
```

### Operations

```ts
function setSlot(
  state: FastextState,
  colour: FastextColour,
  page: number,
  label: string
): FastextState;
// Throws RangeError if page is outside 100–899.
// Throws RangeError if label.length > 6.
// Pads label with trailing spaces to exactly 6 characters if shorter.
// Returns a new FastextState with the specified slot updated.

function clearSlot(state: FastextState, colour: FastextColour): FastextState;
// Returns a new FastextState with the specified slot set to null.

function clearAll(state: FastextState): FastextState;
// Returns initialFastextState().

function getSlot(state: FastextState, colour: FastextColour): { colour: FastextColour; link: FastextLink | null };
// Pure read. Returns { colour, link } where link may be null.

function toDescriptor(state: FastextState): FastextDescriptor;
// Converts FastextState to a FastextDescriptor for consumption by layout.ts / composePage.
// Slots that are null are omitted (the optional fields in FastextDescriptor are left undefined).
// Pure read; no state change.

function getLayout(state: FastextState): [FastextSlotLayout, FastextSlotLayout, FastextSlotLayout, FastextSlotLayout];
// Returns a fixed-length tuple [Red, Green, Yellow, Cyan].
// For a non-empty slot: text = ' ' + pageNumber.toString().padStart(3, '0') + label (10 chars), isEmpty: false.
// For an empty slot:    text = '          ' (10 spaces), isEmpty: true.

function activateSlot(state: FastextState, colour: FastextColour): number | null;
// Returns the target page number for the slot, or null if the slot is empty.
// main.ts passes a non-null result to dispatch({ type: 'navigate', page }).
// Pure read; no state change.
```

`FastextSlotLayout` is a nav-internal type used only by `getLayout` to pass formatted bar data to `main.ts` before it reaches `layout.ts`:

```ts
interface FastextSlotLayout {
  readonly colour:  FastextColour;
  readonly text:    string;    // exactly 10 characters
  readonly isEmpty: boolean;   // true when no link; foreground is Black
}
```

### Colour ordering

`getLayout` always returns the tuple in the fixed order Red → Green → Yellow → Cyan, matching the column assignments in `teletext.md` (columns 0–9, 10–19, 20–29, 30–39). Page modules never specify column positions; the order is structural.

---

## Error Model

All errors are standard JavaScript `Error` subclasses thrown synchronously. Navigation errors never surface to the DOM; they indicate a programming mistake in a page module or in `main.ts`, not a runtime condition.

| Class | Thrown by | Condition |
|---|---|---|
| `RangeError` | `setSlot`, `activateSlot` | Page number outside 100–899 |
| `RangeError` | `setSlot` | Label longer than 6 characters |
| `RangeError` | `createRegistry` | `subpageCount < 1` or page number outside 0–899 |
| `TypeError` | `appendDigit` | (not thrown; non-digits are silently ignored) |

Invalid user input (typing non-digits, pressing arrow keys on the first page) is handled by returning `null` or leaving state unchanged — never by throwing. Errors are reserved for page-author mistakes caught at startup.

---

## `main.ts` Wiring

### Event types

```ts
type NavEvent =
  | { type: 'digit';          digit: string }
  | { type: 'keypadTimeout' }
  | { type: 'keypadReset' }
  | { type: 'navigate';       page: number }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'fastext';        colour: FastextColour }
  | { type: 'subpageAdvance' };
```

### `applyNavEvent`

```ts
interface NavEventResult {
  readonly state:          NavState;
  readonly navigate:       number | null;   // page to load, if any
  readonly keypadDisplay:  string | null;   // buffer string to show on-screen keypad, if changed
}

function applyNavEvent(
  state: NavState,
  registry: ReadonlyMap<number, PageModule>,
  event: NavEvent
): NavEventResult;
```

`applyNavEvent` is a pure function in `main.ts` (or a thin adapter module). It delegates to the four nav modules and returns a new `NavState`. It does not touch the DOM or call timers. `registry` is passed through to router operations; keypad, history, and fastext do not need it.

### Keyboard handler

```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key >= '0' && e.key <= '9') {
    dispatch({ type: 'digit', digit: e.key });
  } else if (e.key === 'ArrowLeft'  || e.key === 'Backspace') {
    dispatch({ type: 'back' });
  } else if (e.key === 'ArrowRight') {
    dispatch({ type: 'forward' });
  } else if (e.key === 'Escape') {
    dispatch({ type: 'keypadReset' });
  } else if (e.key === 'F1') {
    dispatch({ type: 'fastext', colour: 'Red' });
  } else if (e.key === 'F2') {
    dispatch({ type: 'fastext', colour: 'Green' });
  } else if (e.key === 'F3') {
    dispatch({ type: 'fastext', colour: 'Yellow' });
  } else if (e.key === 'F4') {
    dispatch({ type: 'fastext', colour: 'Cyan' });
  }
});
```

Touch targets on the on-screen keypad call `dispatch({ type: 'digit', digit: btn.dataset.digit })` directly; no keyboard event is synthesised.

### Timer ownership (consolidated)

| Timer | Set by | Cleared by | Interval/Delay |
|---|---|---|---|
| Keypad timeout | `main.ts` on `scheduleTimeout: true` from `appendDigit` | `main.ts` on `cancelTimeout: true` | 2 000 ms, `setTimeout` |
| Subpage cycling | `main.ts` on `startCycling: true` from `navigateTo` | `main.ts` on `stopCycling: true` | 8 000 ms, `setInterval` |
| Clock tick | `main.ts` unconditionally at startup | Never | 1 000 ms, `setInterval` |

The cycling interval handle is stored in a local `let cycleIntervalId: ReturnType<typeof setInterval> | null` variable in `main.ts`, not in `RouterState`. The clock tick calls `updateClock(mountedGrid, new Date())` directly — it is not a nav event and does not pass through `applyNavEvent`.

---

## Requirement Coverage

| Requirement | Satisfied by |
|---|---|
| US-01 — digit buffer, 3-digit fire, 2 s timeout, non-digit ignore, explicit reset, buffer read | `keypad.ts`: `appendDigit`, `timeoutExpired`, `resetKeypad`, `getBuffer` |
| US-02 — 100–899 routing, not-found fallback, subpage cycling, reset on direct nav, `n/N` notation | `router.ts`: `createRegistry`, `navigateTo`, `advance`, `getSubpageNotation`, sentinel module |
| US-03 — back stack, forward stack, push clears forward, `back()`/`forward()` return null at boundary | `history.ts`: `push`, `back`, `forward`, `current`, `clearHistory` |
| US-04 — four slots, 100–899 validation, label pad/truncate error, empty slot → null, bar layout, activation event, `clearSlot`/`clearAll` | `fastext.ts`: `setSlot`, `clearSlot`, `clearAll`, `getSlot`, `getLayout`, `toDescriptor`, `activateSlot` |
