/**
 * src/nav/fastext.ts
 *
 * Manages the four Fastext colour-link slots (Red / Green / Yellow / Cyan).
 * Pure functions — no DOM, no timers, no global mutation.
 * Immutable: every mutating operation returns a new state; inputs are never changed.
 *
 * Implements US-04 from .kiro/specs/navigation/requirements.md.
 */

import type { FastextLink, FastextDescriptor } from '../renderer/types.ts';

// ---------------------------------------------------------------------------
// Nav-internal types
// ---------------------------------------------------------------------------

/** The four Fastext colours. Nav-specific; not part of the renderer types. */
export type FastextColour = 'Red' | 'Green' | 'Yellow' | 'Cyan';

/** Formatted data for one slot in the row-23 bar, used by main.ts. */
export interface FastextSlotLayout {
  readonly colour: FastextColour;
  /** Exactly 10 characters. */
  readonly text: string;
  /** True when no link is set; the slot foreground is Black. */
  readonly isEmpty: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface FastextState {
  readonly red: FastextLink | null;
  readonly green: FastextLink | null;
  readonly yellow: FastextLink | null;
  readonly cyan: FastextLink | null;
}

/** Returns a state with all four slots set to null. */
export function initialFastextState(): FastextState {
  return { red: null, green: null, yellow: null, cyan: null };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Retrieves the link stored under `colour` from the state record. */
function readSlot(state: FastextState, colour: FastextColour): FastextLink | null {
  switch (colour) {
    case 'Red':    return state.red;
    case 'Green':  return state.green;
    case 'Yellow': return state.yellow;
    case 'Cyan':   return state.cyan;
  }
}

/** Returns a new state with one slot replaced, leaving the other three unchanged. */
function writeSlot(
  state: FastextState,
  colour: FastextColour,
  value: FastextLink | null,
): FastextState {
  switch (colour) {
    case 'Red':    return { ...state, red:    value };
    case 'Green':  return { ...state, green:  value };
    case 'Yellow': return { ...state, yellow: value };
    case 'Cyan':   return { ...state, cyan:   value };
  }
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Stores a link in the named slot.
 *
 * Throws `RangeError` if `page` is outside 100–899.
 * Throws `RangeError` if `label.length` exceeds 6.
 * Pads `label` with trailing spaces to exactly 6 characters when shorter.
 */
export function setSlot(
  state: FastextState,
  colour: FastextColour,
  page: number,
  label: string,
): FastextState {
  if (page < 100 || page > 899) {
    throw new RangeError(
      `Fastext page number must be in the range 100–899; got ${page}.`,
    );
  }
  if (label.length > 6) {
    throw new RangeError(
      `Fastext label must be at most 6 characters; got ${label.length} ("${label}").`,
    );
  }
  const paddedLabel = label.padEnd(6, ' ');
  const link: FastextLink = { page, label: paddedLabel };
  return writeSlot(state, colour, link);
}

/**
 * Sets the named slot to null.
 * No-op if the slot is already null; always returns a new state object.
 */
export function clearSlot(state: FastextState, colour: FastextColour): FastextState {
  return writeSlot(state, colour, null);
}

/** Sets all four slots to null. Equivalent to `initialFastextState()`. */
export function clearAll(_state: FastextState): FastextState {
  return initialFastextState();
}

/** Pure read. Returns `{ colour, link }` where `link` may be null. */
export function getSlot(
  state: FastextState,
  colour: FastextColour,
): { colour: FastextColour; link: FastextLink | null } {
  return { colour, link: readSlot(state, colour) };
}

/**
 * Returns a fixed-length tuple `[Red, Green, Yellow, Cyan]`, each element
 * containing the formatted 10-character slot text and an `isEmpty` flag.
 */
export function getLayout(
  state: FastextState,
): [FastextSlotLayout, FastextSlotLayout, FastextSlotLayout, FastextSlotLayout] {
  const colours: readonly FastextColour[] = ['Red', 'Green', 'Yellow', 'Cyan'];
  const slots = colours.map((colour): FastextSlotLayout => {
    const link = readSlot(state, colour);
    if (link === null) {
      return { colour, text: '          ', isEmpty: true };
    }
    // ' ' + zero-padded 3-digit page + 6-char label = 10 chars
    const text = ' ' + String(link.page).padStart(3, '0') + link.label;
    return { colour, text, isEmpty: false };
  });

  // The map always produces exactly 4 elements; narrow each for noUncheckedIndexedAccess.
  const s0 = slots[0];
  const s1 = slots[1];
  const s2 = slots[2];
  const s3 = slots[3];

  if (s0 === undefined || s1 === undefined || s2 === undefined || s3 === undefined) {
    // Should never happen; guard satisfies the compiler under noUncheckedIndexedAccess.
    throw new RangeError('getLayout: unexpected missing slot.');
  }

  return [s0, s1, s2, s3];
}

/**
 * Converts `FastextState` to a `FastextDescriptor` for consumption by
 * `layout.ts` / `composePage`. Null slots are omitted (optional fields left
 * undefined). Pure read; no state change.
 */
export function toDescriptor(state: FastextState): FastextDescriptor {
  const desc: FastextDescriptor = {};
  if (state.red    !== null) desc.red    = state.red;
  if (state.green  !== null) desc.green  = state.green;
  if (state.yellow !== null) desc.yellow = state.yellow;
  if (state.cyan   !== null) desc.cyan   = state.cyan;
  return desc;
}

/**
 * Returns the target page number for the named slot, or `null` if the slot is
 * empty. Pure read; does not modify state.
 */
export function activateSlot(state: FastextState, colour: FastextColour): number | null {
  const link = readSlot(state, colour);
  return link !== null ? link.page : null;
}
