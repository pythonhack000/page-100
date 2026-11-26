/**
 * Tests for src/nav/fastext.ts
 *
 * Covers every requirement in US-04 of .kiro/specs/navigation/requirements.md
 * and every operation defined in the Fastext section of
 * .kiro/specs/navigation/design.md.
 *
 * Tasks covered (from .kiro/specs/navigation/tasks.md):
 *   initialFastextState — task 39
 *   setSlot             — tasks 40–43
 *   clearSlot           — task 44
 *   clearAll            — task 45
 *   getSlot             — tasks 46–47
 *   getLayout           — tasks 48–50
 *   toDescriptor        — task 51
 *   activateSlot        — tasks 52–53
 *   immutability        — task 54
 *
 * Design contracts:
 *   - fastext.ts is pure: no DOM, no timers, no global mutation.
 *   - FastextLink and FastextDescriptor are imported from src/renderer/types.ts;
 *     fastext.ts does not redeclare them.
 *   - FastextColour ('Red' | 'Green' | 'Yellow' | 'Cyan') is nav-internal.
 *   - `noUncheckedIndexedAccess` is enabled: array/tuple element access returns
 *     `T | undefined`. Values are narrowed explicitly before use.
 *   - All mutating operations return new state; the input state is never changed.
 *
 * Arrange-Act-Assert throughout. Each `it` block asserts exactly one
 * observable property so a failure identifies the broken behaviour without
 * ambiguity.
 */

import { describe, it, expect } from 'vitest';
import {
  initialFastextState,
  setSlot,
  clearSlot,
  clearAll,
  getSlot,
  getLayout,
  toDescriptor,
  activateSlot,
} from '../../src/nav/fastext.ts';
import type { FastextState, FastextColour } from '../../src/nav/fastext.ts';
import type { FastextLink } from '../../src/renderer/types.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** All four Fastext colour names in canonical order. */
const ALL_COLOURS: readonly FastextColour[] = ['Red', 'Green', 'Yellow', 'Cyan'];

/** Builds a FastextLink with sensible defaults. */
function makeLink(page: number, label: string): FastextLink {
  return { page, label };
}

/**
 * Returns a FastextState with every slot populated via setSlot so that
 * individual operation tests can start from a known non-empty state without
 * repeating boilerplate.
 */
function makePopulatedState(): FastextState {
  let s = initialFastextState();
  s = setSlot(s, 'Red',    100, 'News');
  s = setSlot(s, 'Green',  400, 'Wthr');
  s = setSlot(s, 'Yellow', 500, 'Rates');
  s = setSlot(s, 'Cyan',   888, 'About');
  return s;
}

// ---------------------------------------------------------------------------
// initialFastextState — task 39
// All four slots are null on initialisation.
// ---------------------------------------------------------------------------

describe('initialFastextState', () => {
  it('returns null for the red slot', () => {
    // Arrange / Act
    const state = initialFastextState();
    // Assert
    expect(state.red).toBeNull();
  });

  it('returns null for the green slot', () => {
    const state = initialFastextState();
    expect(state.green).toBeNull();
  });

  it('returns null for the yellow slot', () => {
    const state = initialFastextState();
    expect(state.yellow).toBeNull();
  });

  it('returns null for the cyan slot', () => {
    const state = initialFastextState();
    expect(state.cyan).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setSlot — tasks 40–43
// ---------------------------------------------------------------------------

describe('setSlot', () => {
  // task 40 — valid page number and label up to 6 characters stores the link
  it('stores a link when page number is 100 and label is exactly 6 characters', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Red', 100, 'News  ');
    // Assert
    expect(next.red).not.toBeNull();
    expect(next.red?.page).toBe(100);
  });

  it('stores a link when page number is 899 (upper boundary)', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Green', 899, 'Last');
    // Assert
    expect(next.green).not.toBeNull();
    expect(next.green?.page).toBe(899);
  });

  it('stores a link in the yellow slot independently of other slots', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Yellow', 500, 'Rates');
    // Assert
    expect(next.yellow).not.toBeNull();
    expect(next.red).toBeNull();
    expect(next.green).toBeNull();
    expect(next.cyan).toBeNull();
  });

  it('stores a link in the cyan slot independently of other slots', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Cyan', 888, 'About');
    // Assert
    expect(next.cyan).not.toBeNull();
    expect(next.red).toBeNull();
    expect(next.green).toBeNull();
    expect(next.yellow).toBeNull();
  });

  // task 41 — label shorter than 6 characters is padded to exactly 6
  it('pads a 4-character label to exactly 6 characters with trailing spaces', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Red', 101, 'News');
    // Assert
    expect(next.red?.label).toBe('News  ');
    expect(next.red?.label.length).toBe(6);
  });

  it('pads an empty label to 6 spaces', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Green', 400, '');
    // Assert
    expect(next.green?.label).toBe('      ');
    expect(next.green?.label.length).toBe(6);
  });

  it('leaves a 6-character label unchanged (no trimming, no extra padding)', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Cyan', 888, 'Spooky');
    // Assert
    expect(next.cyan?.label).toBe('Spooky');
    expect(next.cyan?.label.length).toBe(6);
  });

  it('pads a 1-character label to 6 characters', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = setSlot(state, 'Yellow', 200, 'X');
    // Assert
    expect(next.yellow?.label).toBe('X     ');
    expect(next.yellow?.label.length).toBe(6);
  });

  // task 42 — label longer than 6 characters throws RangeError, slot unchanged
  it('throws RangeError when label is 7 characters', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    expect(() => setSlot(state, 'Red', 100, 'TooLong')).toThrow(RangeError);
  });

  it('throws RangeError when label is much longer than 6 characters', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    expect(() => setSlot(state, 'Green', 400, 'WayTooLong!')).toThrow(RangeError);
  });

  it('leaves the slot null when label throws', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    expect(() => setSlot(state, 'Red', 100, 'TooLong')).toThrow(RangeError);
    // Assert — original state is untouched (immutability)
    expect(state.red).toBeNull();
  });

  // task 43 — page number outside 100–899 throws RangeError, slot unchanged
  it('throws RangeError when page number is 99', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    expect(() => setSlot(state, 'Red', 99, 'Low')).toThrow(RangeError);
  });

  it('throws RangeError when page number is 900', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    expect(() => setSlot(state, 'Green', 900, 'High')).toThrow(RangeError);
  });

  it('throws RangeError when page number is 0', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    expect(() => setSlot(state, 'Yellow', 0, 'Zero')).toThrow(RangeError);
  });

  it('throws RangeError when page number is negative', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    expect(() => setSlot(state, 'Cyan', -1, 'Neg')).toThrow(RangeError);
  });

  it('leaves the slot null when page number throws', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    expect(() => setSlot(state, 'Red', 99, 'Low')).toThrow(RangeError);
    // Assert — original state is untouched
    expect(state.red).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearSlot — task 44
// Sets the named slot to null; leaves the other three unchanged.
// ---------------------------------------------------------------------------

describe('clearSlot', () => {
  it('sets the red slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearSlot(state, 'Red');
    // Assert
    expect(next.red).toBeNull();
  });

  it('leaves green, yellow, and cyan unchanged when clearing red', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearSlot(state, 'Red');
    // Assert
    expect(next.green).not.toBeNull();
    expect(next.yellow).not.toBeNull();
    expect(next.cyan).not.toBeNull();
  });

  it('sets the green slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearSlot(state, 'Green');
    // Assert
    expect(next.green).toBeNull();
  });

  it('leaves red, yellow, and cyan unchanged when clearing green', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearSlot(state, 'Green');
    // Assert
    expect(next.red).not.toBeNull();
    expect(next.yellow).not.toBeNull();
    expect(next.cyan).not.toBeNull();
  });

  it('sets the yellow slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearSlot(state, 'Yellow');
    // Assert
    expect(next.yellow).toBeNull();
  });

  it('sets the cyan slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearSlot(state, 'Cyan');
    // Assert
    expect(next.cyan).toBeNull();
  });

  it('is a no-op in terms of other slots when clearing an already-null slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const next = clearSlot(state, 'Red');
    // Assert
    expect(next.red).toBeNull();
    expect(next.green).toBeNull();
    expect(next.yellow).toBeNull();
    expect(next.cyan).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearAll — task 45
// Equivalent to initialFastextState: all four slots become null.
// ---------------------------------------------------------------------------

describe('clearAll', () => {
  it('sets the red slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearAll(state);
    // Assert
    expect(next.red).toBeNull();
  });

  it('sets the green slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearAll(state);
    // Assert
    expect(next.green).toBeNull();
  });

  it('sets the yellow slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearAll(state);
    // Assert
    expect(next.yellow).toBeNull();
  });

  it('sets the cyan slot to null', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearAll(state);
    // Assert
    expect(next.cyan).toBeNull();
  });

  it('produces the same shape as initialFastextState', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const next = clearAll(state);
    // Assert
    expect(next).toEqual(initialFastextState());
  });
});

// ---------------------------------------------------------------------------
// getSlot — tasks 46–47
// Pure read; returns { colour, link } where link may be null.
// ---------------------------------------------------------------------------

describe('getSlot', () => {
  // task 46 — empty slot
  it('returns link: null for an empty red slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const result = getSlot(state, 'Red');
    // Assert
    expect(result.link).toBeNull();
  });

  it('returns the correct colour for an empty slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const result = getSlot(state, 'Green');
    // Assert
    expect(result.colour).toBe('Green');
  });

  it('returns link: null for every colour when state is fully empty', () => {
    // Arrange
    const state = initialFastextState();
    // Act / Assert
    for (const colour of ALL_COLOURS) {
      expect(getSlot(state, colour).link).toBeNull();
    }
  });

  // task 47 — populated slot
  it('returns a FastextLink with the stored page number for a populated red slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 101, 'News');
    // Act
    const result = getSlot(state, 'Red');
    // Assert
    expect(result.link?.page).toBe(101);
  });

  it('returns a label padded to exactly 6 characters for a populated slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Cyan', 888, 'About');
    // Act
    const result = getSlot(state, 'Cyan');
    // Assert
    expect(result.link?.label.length).toBe(6);
    expect(result.link?.label).toBe('About ');
  });

  it('returns the correct colour identifier alongside the link', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Yellow', 500, 'Rate');
    // Act
    const result = getSlot(state, 'Yellow');
    // Assert
    expect(result.colour).toBe('Yellow');
  });
});

// ---------------------------------------------------------------------------
// getLayout — tasks 48–50
// Returns a fixed-length 4-tuple [Red, Green, Yellow, Cyan].
// ---------------------------------------------------------------------------

describe('getLayout', () => {
  // task 48 — tuple order is always Red → Green → Yellow → Cyan
  it('returns exactly four elements', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const layout = getLayout(state);
    // Assert
    expect(layout.length).toBe(4);
  });

  it('places Red at index 0', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const layout = getLayout(state);
    // Assert — noUncheckedIndexedAccess: narrow before use
    const slot = layout[0];
    expect(slot).toBeDefined();
    expect(slot!.colour).toBe('Red');
  });

  it('places Green at index 1', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const layout = getLayout(state);
    // Assert
    const slot = layout[1];
    expect(slot).toBeDefined();
    expect(slot!.colour).toBe('Green');
  });

  it('places Yellow at index 2', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const layout = getLayout(state);
    // Assert
    const slot = layout[2];
    expect(slot).toBeDefined();
    expect(slot!.colour).toBe('Yellow');
  });

  it('places Cyan at index 3', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const layout = getLayout(state);
    // Assert
    const slot = layout[3];
    expect(slot).toBeDefined();
    expect(slot!.colour).toBe('Cyan');
  });

  // task 49 — non-empty slot: text is exactly 10 characters
  it('produces text of exactly 10 characters for a populated slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 101, 'News');
    // Act
    const layout = getLayout(state);
    const slot = layout[0];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.text.length).toBe(10);
  });

  it('starts the text with a leading space for a populated slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 101, 'News');
    // Act
    const slot = getLayout(state)[0];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.text[0]).toBe(' ');
  });

  it('encodes the page number as a zero-padded three-digit string in columns 1–3', () => {
    // Arrange — page 101 → '101'
    const state = setSlot(initialFastextState(), 'Green', 101, 'News');
    // Act
    const slot = getLayout(state)[1];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.text.slice(1, 4)).toBe('101');
  });

  it('zero-pads a page number below 100 — not expected by design but boundary: 100 stays "100"', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Yellow', 100, 'Index');
    // Act
    const slot = getLayout(state)[2];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.text.slice(1, 4)).toBe('100');
  });

  it('places the 6-character label in columns 4–9 of the slot text', () => {
    // Arrange — 'News' padded to 'News  '
    const state = setSlot(initialFastextState(), 'Red', 101, 'News');
    // Act
    const slot = getLayout(state)[0];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.text.slice(4)).toBe('News  ');
  });

  it('marks a populated slot as isEmpty: false', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Cyan', 888, 'About');
    // Act
    const slot = getLayout(state)[3];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.isEmpty).toBe(false);
  });

  // task 50 — empty slot: text is 10 spaces, isEmpty: true
  it('produces 10 spaces for an empty slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const slot = getLayout(state)[0];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.text).toBe('          ');
    expect(slot!.text.length).toBe(10);
  });

  it('marks an empty slot as isEmpty: true', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const slot = getLayout(state)[2];
    // Assert
    expect(slot).toBeDefined();
    expect(slot!.isEmpty).toBe(true);
  });

  it('marks all four slots as isEmpty: true when state is fully empty', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const layout = getLayout(state);
    // Assert — noUncheckedIndexedAccess: iterate with index to narrow
    for (let i = 0; i < 4; i++) {
      const slot = layout[i];
      expect(slot).toBeDefined();
      expect(slot!.isEmpty).toBe(true);
    }
  });

  it('renders a mix of populated and empty slots correctly', () => {
    // Arrange — only Red and Cyan populated
    let state = initialFastextState();
    state = setSlot(state, 'Red',  100, 'Index');
    state = setSlot(state, 'Cyan', 888, 'About');
    // Act
    const layout = getLayout(state);
    // Assert Red (index 0)
    const red = layout[0];
    expect(red).toBeDefined();
    expect(red!.isEmpty).toBe(false);
    expect(red!.text.length).toBe(10);
    // Assert Green (index 1) is empty
    const green = layout[1];
    expect(green).toBeDefined();
    expect(green!.isEmpty).toBe(true);
    expect(green!.text).toBe('          ');
    // Assert Yellow (index 2) is empty
    const yellow = layout[2];
    expect(yellow).toBeDefined();
    expect(yellow!.isEmpty).toBe(true);
    // Assert Cyan (index 3)
    const cyan = layout[3];
    expect(cyan).toBeDefined();
    expect(cyan!.isEmpty).toBe(false);
    expect(cyan!.text.length).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// toDescriptor — task 51
// Converts FastextState to a FastextDescriptor for layout.ts.
// Populated slots appear as FastextLink; empty slots are undefined.
// ---------------------------------------------------------------------------

describe('toDescriptor', () => {
  it('returns undefined for the red field when the red slot is empty', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.red).toBeUndefined();
  });

  it('returns undefined for all four fields when all slots are empty', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.red).toBeUndefined();
    expect(desc.green).toBeUndefined();
    expect(desc.yellow).toBeUndefined();
    expect(desc.cyan).toBeUndefined();
  });

  it('populates the red field when the red slot is set', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 100, 'Index');
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.red).toBeDefined();
    expect(desc.red?.page).toBe(100);
  });

  it('populates the green field when the green slot is set', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Green', 400, 'Wthr');
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.green?.page).toBe(400);
  });

  it('populates the yellow field when the yellow slot is set', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Yellow', 500, 'Rates');
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.yellow?.page).toBe(500);
  });

  it('populates the cyan field when the cyan slot is set', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Cyan', 888, 'About');
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.cyan?.page).toBe(888);
  });

  it('carries the padded label into the descriptor', () => {
    // Arrange — 'News' padded to 'News  ' by setSlot
    const state = setSlot(initialFastextState(), 'Red', 101, 'News');
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.red?.label).toBe('News  ');
  });

  it('leaves unset slots undefined when others are populated', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 100, 'Index');
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.red).toBeDefined();
    expect(desc.green).toBeUndefined();
    expect(desc.yellow).toBeUndefined();
    expect(desc.cyan).toBeUndefined();
  });

  it('populates all four fields when all slots are set', () => {
    // Arrange
    const state = makePopulatedState();
    // Act
    const desc = toDescriptor(state);
    // Assert
    expect(desc.red).toBeDefined();
    expect(desc.green).toBeDefined();
    expect(desc.yellow).toBeDefined();
    expect(desc.cyan).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// activateSlot — tasks 52–53
// Pure read; returns target page number or null.
// ---------------------------------------------------------------------------

describe('activateSlot', () => {
  // task 52 — populated slot returns page number
  it('returns the page number for a populated red slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 100, 'Index');
    // Act
    const result = activateSlot(state, 'Red');
    // Assert
    expect(result).toBe(100);
  });

  it('returns the page number for a populated green slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Green', 400, 'Wthr');
    // Act
    const result = activateSlot(state, 'Green');
    // Assert
    expect(result).toBe(400);
  });

  it('returns the page number for a populated yellow slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Yellow', 500, 'Rates');
    // Act
    const result = activateSlot(state, 'Yellow');
    // Assert
    expect(result).toBe(500);
  });

  it('returns the page number for a populated cyan slot', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Cyan', 888, 'About');
    // Act
    const result = activateSlot(state, 'Cyan');
    // Assert
    expect(result).toBe(888);
  });

  // task 53 — empty slot returns null
  it('returns null for an empty red slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const result = activateSlot(state, 'Red');
    // Assert
    expect(result).toBeNull();
  });

  it('returns null for an empty green slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const result = activateSlot(state, 'Green');
    // Assert
    expect(result).toBeNull();
  });

  it('returns null for an empty yellow slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const result = activateSlot(state, 'Yellow');
    // Assert
    expect(result).toBeNull();
  });

  it('returns null for an empty cyan slot', () => {
    // Arrange
    const state = initialFastextState();
    // Act
    const result = activateSlot(state, 'Cyan');
    // Assert
    expect(result).toBeNull();
  });

  it('returns null for a slot that was populated then cleared', () => {
    // Arrange
    const populated = setSlot(initialFastextState(), 'Red', 100, 'Index');
    const cleared = clearSlot(populated, 'Red');
    // Act
    const result = activateSlot(cleared, 'Red');
    // Assert
    expect(result).toBeNull();
  });

  it('does not modify state (pure read)', () => {
    // Arrange
    const state = setSlot(initialFastextState(), 'Red', 100, 'Index');
    // Act
    activateSlot(state, 'Red');
    // Assert — state is unchanged
    expect(state.red?.page).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Immutability — task 54
// Every operation returns a new state object; the input state is never mutated.
// ---------------------------------------------------------------------------

describe('immutability', () => {
  it('setSlot returns a new object reference', () => {
    // Arrange
    const before = initialFastextState();
    // Act
    const after = setSlot(before, 'Red', 100, 'Index');
    // Assert
    expect(after).not.toBe(before);
  });

  it('setSlot does not mutate the input state', () => {
    // Arrange
    const before = initialFastextState();
    // Act
    setSlot(before, 'Red', 100, 'Index');
    // Assert — before is unchanged
    expect(before.red).toBeNull();
  });

  it('clearSlot returns a new object reference', () => {
    // Arrange
    const before = makePopulatedState();
    // Act
    const after = clearSlot(before, 'Red');
    // Assert
    expect(after).not.toBe(before);
  });

  it('clearSlot does not mutate the input state', () => {
    // Arrange
    const before = makePopulatedState();
    const originalRed = before.red;
    // Act
    clearSlot(before, 'Red');
    // Assert — before.red still holds the original link
    expect(before.red).toBe(originalRed);
  });

  it('clearAll returns a new object reference', () => {
    // Arrange
    const before = makePopulatedState();
    // Act
    const after = clearAll(before);
    // Assert
    expect(after).not.toBe(before);
  });

  it('clearAll does not mutate the input state', () => {
    // Arrange
    const before = makePopulatedState();
    const originalGreen = before.green;
    // Act
    clearAll(before);
    // Assert — before.green still holds the original link
    expect(before.green).toBe(originalGreen);
  });

  it('successive setSlot calls produce independent state snapshots', () => {
    // Arrange
    const s0 = initialFastextState();
    const s1 = setSlot(s0, 'Red', 100, 'Index');
    // Act
    const s2 = setSlot(s1, 'Green', 400, 'Wthr');
    // Assert — s1 is not affected by the second call
    expect(s1.green).toBeNull();
    expect(s2.green).not.toBeNull();
  });
});
