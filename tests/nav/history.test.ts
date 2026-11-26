/**
 * Tests for src/nav/history.ts
 *
 * Covers every requirement in US-03 of .kiro/specs/navigation/requirements.md
 * and every operation defined in the History Stack section of
 * .kiro/specs/navigation/design.md.
 *
 * Design contract:
 *   - history.ts is pure: no DOM, no timers, no global mutation.
 *   - All returned HistoryState objects are new values (copy-on-write arrays).
 *   - `noUncheckedIndexedAccess` is enabled: array element access returns
 *     `T | undefined`.  Values are narrowed explicitly before use.
 *
 * Arrange-Act-Assert throughout.  Each `it` block asserts exactly one
 * observable property so a failure identifies the broken behaviour
 * without ambiguity.
 */

import { describe, it, expect } from 'vitest';
import {
  initialHistoryState,
  push,
  back,
  forward,
  current,
  clearHistory,
} from '../../src/nav/history.ts';
import type { HistoryState } from '../../src/nav/history.ts';

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

/**
 * Constructs a HistoryState directly.
 * Keeps test Arrange sections from repeating full object literals.
 */
function makeState(
  backStack: readonly number[],
  forwardStack: readonly number[] = [],
): HistoryState {
  return { back: backStack, forward: forwardStack };
}

// ---------------------------------------------------------------------------
// initialHistoryState
// Returns { back: [startPage], forward: [] }.
// ---------------------------------------------------------------------------

describe('initialHistoryState', () => {
  it('places the start page as the sole entry in the back stack', () => {
    // Arrange / Act
    const state = initialHistoryState(100);
    // Assert
    expect(state.back).toEqual([100]);
  });

  it('returns an empty forward stack', () => {
    // Arrange / Act
    const state = initialHistoryState(100);
    // Assert
    expect(state.forward).toEqual([]);
  });

  it('records whatever start page is supplied', () => {
    // Arrange / Act
    const state = initialHistoryState(666);
    // Assert
    expect(state.back).toEqual([666]);
  });
});

// ---------------------------------------------------------------------------
// current
// Returns back[back.length - 1], or null if back is empty.
// ---------------------------------------------------------------------------

describe('current', () => {
  it('returns the top of the back stack', () => {
    // Arrange
    const state = makeState([100, 400, 500]);
    // Act
    const result = current(state);
    // Assert
    expect(result).toBe(500);
  });

  it('returns the only entry when the back stack has one element', () => {
    // Arrange
    const state = initialHistoryState(100);
    // Act
    const result = current(state);
    // Assert
    expect(result).toBe(100);
  });

  it('returns null when the back stack is empty', () => {
    // Arrange
    const state = makeState([]);
    // Act
    const result = current(state);
    // Assert
    expect(result).toBeNull();
  });

  it('is a pure read — does not modify the state', () => {
    // Arrange
    const state = makeState([100, 400]);
    const backBefore = state.back.slice();
    // Act
    current(state);
    // Assert
    expect(state.back).toEqual(backBefore);
  });
});

// ---------------------------------------------------------------------------
// push
// US-03: WHEN a page is navigated to, THE SYSTEM SHALL push the page number
// onto the back stack and clear the forward stack.
// ---------------------------------------------------------------------------

describe('push — basic navigation', () => {
  it('appends the new page to the back stack', () => {
    // Arrange
    const state = initialHistoryState(100);
    // Act
    const next = push(state, 400);
    // Assert
    expect(next.back).toEqual([100, 400]);
  });

  it('clears the forward stack when a new page is pushed', () => {
    // Arrange — simulate having gone back so forward is non-empty
    const state = makeState([100], [500]);
    // Act
    const next = push(state, 400);
    // Assert
    expect(next.forward).toEqual([]);
  });

  it('current() returns the newly pushed page', () => {
    // Arrange
    const state = initialHistoryState(100);
    // Act
    const next = push(state, 400);
    // Assert
    expect(current(next)).toBe(400);
  });

  it('accumulates a chain of pages on the back stack', () => {
    // Arrange
    const s0 = initialHistoryState(100);
    // Act
    const s1 = push(s0, 400);
    const s2 = push(s1, 500);
    const s3 = push(s2, 666);
    // Assert
    expect(s3.back).toEqual([100, 400, 500, 666]);
  });

  it('discards the entire forward stack, not just the top entry', () => {
    // Arrange
    const state = makeState([100], [500, 888, 666]);
    // Act
    const next = push(state, 400);
    // Assert
    expect(next.forward).toEqual([]);
  });

  it('does not mutate the input back stack', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    push(state, 500);
    // Assert
    expect(state.back).toEqual([100, 400]);
  });

  it('does not mutate the input forward stack', () => {
    // Arrange
    const state = makeState([100], [500]);
    // Act
    push(state, 400);
    // Assert
    expect(state.forward).toEqual([500]);
  });
});

// ---------------------------------------------------------------------------
// push — no-op for duplicate current page
// Design: "No-op if pageNumber equals the current top of back (prevents
// duplicate entries on reload)."
// ---------------------------------------------------------------------------

describe('push — duplicate prevention', () => {
  it('does not append when the page equals the current top of back', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const next = push(state, 400);
    // Assert
    expect(next.back).toEqual([100, 400]);
  });

  it('leaves the forward stack intact when the push is a no-op', () => {
    // Arrange — the forward stack should not be cleared for a duplicate
    const state = makeState([100, 400], [500]);
    // Act
    const next = push(state, 400);
    // Assert — forward must remain unchanged (no navigation occurred)
    expect(next.forward).toEqual([500]);
  });

  it('no-op push on initial state keeps back stack length at 1', () => {
    // Arrange
    const state = initialHistoryState(100);
    // Act
    const next = push(state, 100);
    // Assert
    expect(next.back.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// back
// US-03: WHEN back() is called and back stack has > 1 entry, pop current
// onto forward, return new top of back.
// WHEN back stack has only one entry, return null, leave stacks unchanged.
// ---------------------------------------------------------------------------

describe('back — with navigable history', () => {
  it('returns the previous page number', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const result = back(state);
    // Assert
    expect(result.page).toBe(100);
  });

  it('removes the current page from the back stack', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const result = back(state);
    // Assert
    expect(result.state.back).toEqual([100]);
  });

  it('pushes the current page onto the front of the forward stack', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const result = back(state);
    // Assert
    expect(result.state.forward).toEqual([400]);
  });

  it('prepends to an existing forward stack rather than replacing it', () => {
    // Arrange — forward already has an entry
    const state = makeState([100, 400, 500], [888]);
    // Act
    const result = back(state);
    // Assert
    expect(result.state.forward).toEqual([500, 888]);
  });

  it('current() returns the previous page after back()', () => {
    // Arrange
    const state = makeState([100, 400, 500]);
    // Act
    const result = back(state);
    // Assert
    expect(current(result.state)).toBe(400);
  });

  it('a chain of back() calls walks all the way to the first page', () => {
    // Arrange
    const s0 = makeState([100, 400, 500, 666]);
    // Act
    const r1 = back(s0);
    const r2 = back(r1.state);
    const r3 = back(r2.state);
    // Assert — arrived at the first page
    expect(r3.page).toBe(100);
    expect(current(r3.state)).toBe(100);
    // forward stack accumulates pages in reverse visit order
    expect(r3.state.forward).toEqual([400, 500, 666]);
  });

  it('does not mutate the input back stack', () => {
    // Arrange
    const state = makeState([100, 400]);
    const backBefore = state.back.slice();
    // Act
    back(state);
    // Assert
    expect(state.back).toEqual(backBefore);
  });

  it('does not mutate the input forward stack', () => {
    // Arrange
    const state = makeState([100, 400], [500]);
    // Act
    back(state);
    // Assert
    expect(state.forward).toEqual([500]);
  });
});

describe('back — at the beginning of history', () => {
  it('returns null when the back stack has exactly one entry', () => {
    // Arrange
    const state = makeState([100]);
    // Act
    const result = back(state);
    // Assert
    expect(result.page).toBeNull();
  });

  it('leaves the back stack unchanged when at the beginning', () => {
    // Arrange
    const state = makeState([100]);
    // Act
    const result = back(state);
    // Assert
    expect(result.state.back).toEqual([100]);
  });

  it('leaves the forward stack unchanged when at the beginning', () => {
    // Arrange
    const state = makeState([100], [400]);
    // Act
    const result = back(state);
    // Assert
    expect(result.state.forward).toEqual([400]);
  });

  it('returns null when the back stack is empty', () => {
    // Arrange — degenerate state; should not occur in practice but must not throw
    const state = makeState([]);
    // Act
    const result = back(state);
    // Assert
    expect(result.page).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// forward
// US-03: WHEN forward() is called and forward stack is non-empty, pop top
// onto back stack, return that page.
// WHEN forward stack is empty, return null, leave stacks unchanged.
// ---------------------------------------------------------------------------

describe('forward — with navigable future', () => {
  it('returns the page at the top of the forward stack', () => {
    // Arrange
    const state = makeState([100], [400]);
    // Act
    const result = forward(state);
    // Assert
    expect(result.page).toBe(400);
  });

  it('removes the top entry from the forward stack', () => {
    // Arrange
    const state = makeState([100], [400, 500]);
    // Act
    const result = forward(state);
    // Assert
    expect(result.state.forward).toEqual([500]);
  });

  it('appends the page to the back stack', () => {
    // Arrange
    const state = makeState([100], [400]);
    // Act
    const result = forward(state);
    // Assert
    expect(result.state.back).toEqual([100, 400]);
  });

  it('current() returns the restored page after forward()', () => {
    // Arrange
    const state = makeState([100], [400]);
    // Act
    const result = forward(state);
    // Assert
    expect(current(result.state)).toBe(400);
  });

  it('a chain of forward() calls restores all pages in order', () => {
    // Arrange — the forward stack was built by going back through 666 → 500 → 400
    const s0 = makeState([100], [400, 500, 666]);
    // Act
    const r1 = forward(s0);
    const r2 = forward(r1.state);
    const r3 = forward(r2.state);
    // Assert
    expect(r3.page).toBe(666);
    expect(r3.state.back).toEqual([100, 400, 500, 666]);
    expect(r3.state.forward).toEqual([]);
  });

  it('does not mutate the input back stack', () => {
    // Arrange
    const state = makeState([100], [400]);
    const backBefore = state.back.slice();
    // Act
    forward(state);
    // Assert
    expect(state.back).toEqual(backBefore);
  });

  it('does not mutate the input forward stack', () => {
    // Arrange
    const state = makeState([100], [400, 500]);
    const fwdBefore = state.forward.slice();
    // Act
    forward(state);
    // Assert
    expect(state.forward).toEqual(fwdBefore);
  });
});

describe('forward — at the end of history', () => {
  it('returns null when the forward stack is empty', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const result = forward(state);
    // Assert
    expect(result.page).toBeNull();
  });

  it('leaves the back stack unchanged when forward stack is empty', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const result = forward(state);
    // Assert
    expect(result.state.back).toEqual([100, 400]);
  });

  it('leaves the forward stack unchanged (empty) when forward stack is empty', () => {
    // Arrange
    const state = makeState([100, 400]);
    // Act
    const result = forward(state);
    // Assert
    expect(result.state.forward).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// push clears forward stack (US-03: navigating to a new page discards future)
// Covered above in push — basic navigation; this block tests the round-trip.
// ---------------------------------------------------------------------------

describe('push clears forward stack — round-trip', () => {
  it('after back() then push(), forward() returns null', () => {
    // Arrange — build history 100 → 400, then go back
    const s0 = initialHistoryState(100);
    const s1 = push(s0, 400);
    const { state: s2 } = back(s1);
    // Confirm forward stack is populated
    expect(s2.forward).toEqual([400]);

    // Act — navigate to a new page while forward stack is non-empty
    const s3 = push(s2, 500);

    // Assert — forward is gone
    expect(s3.forward).toEqual([]);
    const fwd = forward(s3);
    expect(fwd.page).toBeNull();
  });

  it('after three back() calls then push(), forward stack is empty', () => {
    // Arrange
    const s0 = makeState([100, 400, 500, 666]);
    const r1 = back(s0);
    const r2 = back(r1.state);
    const r3 = back(r2.state);
    expect(r3.state.forward).toEqual([400, 500, 666]);

    // Act
    const s4 = push(r3.state, 888);

    // Assert
    expect(s4.forward).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// clearHistory
// US-03: WHEN clear() is called, THE SYSTEM SHALL empty both stacks.
// ---------------------------------------------------------------------------

describe('clearHistory', () => {
  it('empties the back stack', () => {
    // Arrange
    const state = makeState([100, 400, 500]);
    // Act
    const next = clearHistory(state);
    // Assert
    expect(next.back).toEqual([]);
  });

  it('empties the forward stack', () => {
    // Arrange
    const state = makeState([100], [400, 500]);
    // Act
    const next = clearHistory(state);
    // Assert
    expect(next.forward).toEqual([]);
  });

  it('does not mutate the input back stack', () => {
    // Arrange
    const state = makeState([100, 400]);
    const backBefore = state.back.slice();
    // Act
    clearHistory(state);
    // Assert
    expect(state.back).toEqual(backBefore);
  });

  it('does not mutate the input forward stack', () => {
    // Arrange
    const state = makeState([100], [400]);
    // Act
    clearHistory(state);
    // Assert
    expect(state.forward).toEqual([400]);
  });

  it('current() returns null after clearHistory', () => {
    // Arrange
    const state = initialHistoryState(100);
    // Act
    const next = clearHistory(state);
    // Assert
    expect(current(next)).toBeNull();
  });

  it('back() returns null after clearHistory', () => {
    // Arrange
    const state = makeState([100, 400]);
    const cleared = clearHistory(state);
    // Act
    const result = back(cleared);
    // Assert
    expect(result.page).toBeNull();
  });

  it('forward() returns null after clearHistory', () => {
    // Arrange
    const state = makeState([100], [400]);
    const cleared = clearHistory(state);
    // Act
    const result = forward(cleared);
    // Assert
    expect(result.page).toBeNull();
  });

  it('is idempotent — clearing an already-empty state returns empty stacks', () => {
    // Arrange
    const state = makeState([], []);
    // Act
    const next = clearHistory(state);
    // Assert
    expect(next.back).toEqual([]);
    expect(next.forward).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// No upper bound on stack depth (US-03)
// THE SYSTEM SHALL place no upper bound on the depth of either stack.
// ---------------------------------------------------------------------------

describe('no upper bound on stack depth', () => {
  it('back stack grows to 1 000 entries without truncation', () => {
    // Arrange
    let state = initialHistoryState(100);
    // Act — push 999 additional pages
    for (let i = 1; i < 1000; i++) {
      state = push(state, 100 + (i % 800));
    }
    // Assert
    expect(state.back.length).toBe(1000);
  });

  it('forward stack grows to 1 000 entries via repeated back() calls', () => {
    // Arrange — build a 1 000-entry back stack
    let state = initialHistoryState(100);
    for (let i = 1; i < 1000; i++) {
      state = push(state, 100 + (i % 800));
    }
    // Act — walk back 999 steps, filling the forward stack
    for (let i = 0; i < 999; i++) {
      const result = back(state);
      state = result.state;
    }
    // Assert
    expect(state.forward.length).toBe(999);
    expect(state.back.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Immutability — round-trip: original state is usable after derived state diverges
// Design: "two history snapshots can safely co-exist"
// ---------------------------------------------------------------------------

describe('immutability — snapshots co-exist independently', () => {
  it('the original state is unchanged after push() on a copy', () => {
    // Arrange
    const original = initialHistoryState(100);
    // Act
    const derived = push(original, 400);
    // Assert — original is untouched
    expect(original.back).toEqual([100]);
    expect(original.forward).toEqual([]);
    expect(derived.back).toEqual([100, 400]);
  });

  it('two back() snapshots diverge independently', () => {
    // Arrange
    const base = makeState([100, 400, 500]);
    const snap1 = back(base).state;  // went back once
    const snap2 = back(base).state;  // went back once from the same base

    // Act — go back a second time from snap1
    const snap1b = back(snap1).state;

    // Assert — snap2 is unaffected by further navigation on snap1
    expect(snap2.back).toEqual([100, 400]);
    expect(snap1b.back).toEqual([100]);
  });

  it('push() on two independent branches does not share array references', () => {
    // Arrange
    const base = initialHistoryState(100);
    // Act
    const branch1 = push(base, 400);
    const branch2 = push(base, 500);
    // Assert — the two branches have independent back arrays
    expect(branch1.back).toEqual([100, 400]);
    expect(branch2.back).toEqual([100, 500]);
  });
});
