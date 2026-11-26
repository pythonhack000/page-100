/**
 * Digit accumulator for three-digit page number entry.
 *
 * Pure functions — no DOM, no timers, no global state.
 * Timer ownership lives in main.ts; this module signals intent via
 * `scheduleTimeout` / `cancelTimeout` in every result.
 *
 * Compatible with `noUncheckedIndexedAccess`.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface KeypadState {
  readonly buffer: string;           // '' | one digit | two digits | three digits
  readonly timeoutId: number | null; // opaque handle owned by main.ts
}

/** Returns the initial state: empty buffer, no pending timeout. */
export function initialKeypadState(): KeypadState {
  return { buffer: '', timeoutId: null };
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface KeypadResult {
  readonly state: KeypadState;
  /** Non-null when the buffer completed a three-digit number. */
  readonly navigate: string | null;
  /** True when main.ts must call setTimeout(…, 2000) and store the handle. */
  readonly scheduleTimeout: boolean;
  /** True when main.ts must call clearTimeout on the current handle. */
  readonly cancelTimeout: boolean;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Appends a single decimal digit to the buffer.
 *
 * - Non-digits (anything that does not match /^[0-9]$/) are silently ignored;
 *   the input state is returned unchanged with no side-effect signals.
 * - When the buffer already holds three digits, the old buffer is discarded
 *   and a fresh buffer is started with the incoming digit.
 * - When the buffer reaches three digits after appending, `navigate` carries
 *   the completed string and the buffer is cleared.
 */
export function appendDigit(state: KeypadState, digit: string): KeypadResult {
  // Validate: exactly one character, 0–9.
  if (!/^[0-9]$/.test(digit)) {
    return {
      state,
      navigate: null,
      scheduleTimeout: false,
      cancelTimeout: false,
    };
  }

  const hadTimeout = state.timeoutId !== null;

  // Overflow: buffer already full — discard and restart.
  if (state.buffer.length >= 3) {
    return {
      state: { buffer: digit, timeoutId: null },
      navigate: null,
      scheduleTimeout: true,
      cancelTimeout: true,
    };
  }

  const newBuffer = state.buffer + digit;

  // Completion: three digits accumulated.
  if (newBuffer.length === 3) {
    return {
      state: { buffer: '', timeoutId: null },
      navigate: newBuffer,
      scheduleTimeout: false,
      cancelTimeout: hadTimeout,
    };
  }

  // Normal append: one or two digits so far.
  // Keep the pending handle so the next digit still knows to cancel it;
  // main.ts replaces it with the new handle after scheduling.
  return {
    state: { buffer: newBuffer, timeoutId: state.timeoutId },
    navigate: null,
    scheduleTimeout: true,
    cancelTimeout: hadTimeout,
  };
}

/**
 * Called by main.ts when the 2 000 ms timeout fires.
 * Clears the buffer without firing a navigation event.
 */
export function timeoutExpired(state: KeypadState): KeypadResult {
  return {
    state: { buffer: '', timeoutId: null },
    navigate: null,
    scheduleTimeout: false,
    cancelTimeout: false, // timeout already fired; nothing to cancel
  };
}

/**
 * Explicit reset (e.g. Escape key).
 * Clears the buffer and signals cancellation of any pending timeout.
 */
export function resetKeypad(state: KeypadState): KeypadResult {
  return {
    state: { buffer: '', timeoutId: null },
    navigate: null,
    scheduleTimeout: false,
    cancelTimeout: state.timeoutId !== null,
  };
}

/**
 * Returns the current buffer string without modifying state.
 * Used by the on-screen keypad to display digits entered so far.
 */
export function getBuffer(state: KeypadState): string {
  return state.buffer;
}
