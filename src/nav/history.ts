/**
 * Browsing history for the teletext navigator.
 *
 * Pure functions — no DOM, no timers, no global mutation.
 * All returned HistoryState values are new objects; input arrays are never
 * modified (copy-on-write via spread).
 *
 * Compatible with `noUncheckedIndexedAccess`: every array element access is
 * narrowed before use.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface HistoryState {
  /** Visited pages in visit order. The last element is the current page. */
  readonly back: readonly number[];
  /**
   * Pages available to go forward to. The first element is the most recent
   * "forward" target (i.e. the page that was current before the last back()).
   */
  readonly forward: readonly number[];
}

/**
 * Returns the initial history state with `startPage` as the sole entry.
 */
export function initialHistoryState(startPage: number): HistoryState {
  return { back: [startPage], forward: [] };
}

// ---------------------------------------------------------------------------
// current
// ---------------------------------------------------------------------------

/**
 * Returns the current page (top of the back stack), or `null` if the back
 * stack is empty (degenerate state that should not occur in practice).
 */
export function current(state: HistoryState): number | null {
  const top = state.back[state.back.length - 1];
  return top ?? null;
}

// ---------------------------------------------------------------------------
// push
// ---------------------------------------------------------------------------

/**
 * Navigates to `pageNumber`.
 *
 * - Appends `pageNumber` to the back stack and clears the forward stack.
 * - No-op when `pageNumber` equals the current top of back (prevents
 *   duplicate entries on reload); in that case the forward stack is also
 *   left unchanged.
 */
export function push(state: HistoryState, pageNumber: number): HistoryState {
  const top = state.back[state.back.length - 1];
  if (top === pageNumber) {
    // Duplicate — return an equivalent state without mutation.
    return { back: state.back, forward: state.forward };
  }
  return {
    back: [...state.back, pageNumber],
    forward: [],
  };
}

// ---------------------------------------------------------------------------
// back
// ---------------------------------------------------------------------------

/**
 * Moves one step back in history.
 *
 * - When back.length ≤ 1 (or 0): returns `{ state (unchanged), page: null }`.
 * - Otherwise: removes the current page from the back stack, prepends it to
 *   the forward stack, and returns the new current page.
 */
export function back(
  state: HistoryState,
): { state: HistoryState; page: number | null } {
  if (state.back.length <= 1) {
    return { state, page: null };
  }

  // Safe: length > 1 guarantees both indices exist.
  const current_ = state.back[state.back.length - 1] as number;
  const newBack = state.back.slice(0, state.back.length - 1);
  const newForward = [current_, ...state.forward];
  const newTop = newBack[newBack.length - 1] as number;

  return {
    state: { back: newBack, forward: newForward },
    page: newTop,
  };
}

// ---------------------------------------------------------------------------
// forward
// ---------------------------------------------------------------------------

/**
 * Moves one step forward in history.
 *
 * - When forward is empty: returns `{ state (unchanged), page: null }`.
 * - Otherwise: removes forward[0], appends it to the back stack, and returns
 *   that page.
 */
export function forward(
  state: HistoryState,
): { state: HistoryState; page: number | null } {
  if (state.forward.length === 0) {
    return { state, page: null };
  }

  // Safe: length > 0 guarantees index 0 exists.
  const page = state.forward[0] as number;
  const newForward = state.forward.slice(1);
  const newBack = [...state.back, page];

  return {
    state: { back: newBack, forward: newForward },
    page,
  };
}

// ---------------------------------------------------------------------------
// clearHistory
// ---------------------------------------------------------------------------

/**
 * Returns a new state with both stacks emptied.
 */
export function clearHistory(_state: HistoryState): HistoryState {
  return { back: [], forward: [] };
}
