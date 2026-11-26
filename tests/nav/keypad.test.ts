/**
 * Tests for src/nav/keypad.ts
 *
 * Covers every requirement in US-01 of .kiro/specs/navigation/requirements.md
 * and every task (1–10) in .kiro/specs/navigation/tasks.md.
 *
 * Design contract:
 *   - keypad.ts is pure: no DOM, no real timers, no global mutation.
 *   - Timer ownership lives in main.ts.  The module signals intent via
 *     `scheduleTimeout` / `cancelTimeout`; tests never call setTimeout.
 *   - `noUncheckedIndexedAccess` is enabled: array element access returns
 *     `T | undefined`.  Test helpers extract values explicitly and narrow
 *     with non-null assertions only where the invariant is documented.
 *
 * Arrange-Act-Assert throughout.  Each `it` block asserts exactly one
 * observable property so a failure identifies the broken behaviour
 * without ambiguity.
 */

import { describe, it, expect } from 'vitest';
import {
  initialKeypadState,
  appendDigit,
  timeoutExpired,
  resetKeypad,
  getBuffer,
} from '../../src/nav/keypad.ts';
import type { KeypadState } from '../../src/nav/keypad.ts';

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

/**
 * Constructs a KeypadState directly.
 * Keeps test Arrange sections from repeating the full object literal.
 */
function makeState(buffer: string, timeoutId: number | null = null): KeypadState {
  return { buffer, timeoutId };
}

// ---------------------------------------------------------------------------
// Task 1 — initialKeypadState
// Returns { buffer: '', timeoutId: null }.
// ---------------------------------------------------------------------------

describe('initialKeypadState', () => {
  it('returns an empty buffer', () => {
    // Arrange / Act
    const state = initialKeypadState();
    // Assert
    expect(state.buffer).toBe('');
  });

  it('returns null for timeoutId', () => {
    // Arrange / Act
    const state = initialKeypadState();
    // Assert
    expect(state.timeoutId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Task 2 — appendDigit: first digit into an empty buffer
// WHEN a digit is entered, THE SYSTEM SHALL append it to the buffer.
// scheduleTimeout: true, cancelTimeout: false (no prior timeout), navigate: null.
// ---------------------------------------------------------------------------

describe('appendDigit — first digit into an empty buffer', () => {
  it('appends the digit to the buffer', () => {
    // Arrange
    const state = initialKeypadState();
    // Act
    const result = appendDigit(state, '5');
    // Assert
    expect(result.state.buffer).toBe('5');
  });

  it('navigate is null', () => {
    // Arrange
    const state = initialKeypadState();
    // Act
    const result = appendDigit(state, '5');
    // Assert
    expect(result.navigate).toBeNull();
  });

  it('scheduleTimeout is true', () => {
    // Arrange
    const state = initialKeypadState();
    // Act
    const result = appendDigit(state, '5');
    // Assert
    expect(result.scheduleTimeout).toBe(true);
  });

  it('cancelTimeout is false when no prior timeout exists', () => {
    // Arrange
    const state = initialKeypadState(); // timeoutId: null
    // Act
    const result = appendDigit(state, '5');
    // Assert
    expect(result.cancelTimeout).toBe(false);
  });

  it('cancelTimeout is true when a prior timeout is pending', () => {
    // Arrange — simulate that main.ts already set a timeout
    const state = makeState('', 42);
    // Act
    const result = appendDigit(state, '5');
    // Assert
    expect(result.cancelTimeout).toBe(true);
  });

  it('every decimal digit 0–9 is accepted', () => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
    for (const digit of digits) {
      // Arrange
      const state = initialKeypadState();
      // Act
      const result = appendDigit(state, digit);
      // Assert
      expect(result.state.buffer).toBe(digit);
      expect(result.navigate).toBeNull();
      expect(result.scheduleTimeout).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3 — appendDigit: second digit (one-digit buffer → two digits)
// buffer grows to two digits, scheduleTimeout: true, cancelTimeout: true
// (the previous timeout must be replaced).
// ---------------------------------------------------------------------------

describe('appendDigit — second digit into a one-digit buffer', () => {
  it('appends the digit to give a two-character buffer', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    // Act
    const result = appendDigit(s1, '0');
    // Assert
    expect(result.state.buffer).toBe('10');
  });

  it('navigate is null', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    // Act
    const result = appendDigit(s1, '0');
    // Assert
    expect(result.navigate).toBeNull();
  });

  it('scheduleTimeout is true', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    // Act
    const result = appendDigit(s1, '0');
    // Assert
    expect(result.scheduleTimeout).toBe(true);
  });

  it('cancelTimeout is true because the first digit set a pending timeout', () => {
    // Arrange — first appendDigit leaves a pending timeout handle in state
    const s0 = makeState('', 1);        // simulate a pending timeout
    const { state: s1 } = appendDigit(s0, '1'); // s1 carries forward timeoutId
    // Act
    const result = appendDigit(s1, '0');
    // Assert
    expect(result.cancelTimeout).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 4 — appendDigit: third digit completes the buffer
// WHEN the buffer reaches three digits, THE SYSTEM SHALL fire navigate,
// reset the buffer, cancelTimeout: true, scheduleTimeout: false.
// ---------------------------------------------------------------------------

describe('appendDigit — third digit completes the entry', () => {
  it('navigate equals the three-digit string', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert
    expect(result.navigate).toBe('100');
  });

  it('buffer is empty after completion', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '4');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert
    expect(result.state.buffer).toBe('');
  });

  it('scheduleTimeout is false', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '4');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert
    expect(result.scheduleTimeout).toBe(false);
  });

  it('cancelTimeout is true when a timeout was pending', () => {
    // Arrange — carry a timeout handle through the chain
    const s0 = makeState('', 10);
    const { state: s1 } = appendDigit(s0, '4');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert
    expect(result.cancelTimeout).toBe(true);
  });

  it('navigate is "100" for the lower page-number boundary', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert
    expect(result.navigate).toBe('100');
  });

  it('navigate is "899" for the upper page-number boundary', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '8');
    const { state: s2 } = appendDigit(s1, '9');
    // Act
    const result = appendDigit(s2, '9');
    // Assert
    expect(result.navigate).toBe('899');
  });

  it('navigate is "666" (haunted page)', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '6');
    const { state: s2 } = appendDigit(s1, '6');
    // Act
    const result = appendDigit(s2, '6');
    // Assert
    expect(result.navigate).toBe('666');
  });

  it('navigate is "500" (exchange rates page)', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '5');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert
    expect(result.navigate).toBe('500');
  });

  it('navigate carries all-zero digits: "000"', () => {
    // Arrange — sub-100 input is still formed and fired; the router rejects it
    const { state: s1 } = appendDigit(initialKeypadState(), '0');
    const { state: s2 } = appendDigit(s1, '0');
    // Act
    const result = appendDigit(s2, '0');
    // Assert — keypad fires whatever three digits it accumulated
    expect(result.navigate).toBe('000');
  });
});

// ---------------------------------------------------------------------------
// Task 5 — appendDigit: overflow (digit typed into a full buffer)
// WHEN buffer already holds three digits, THE SYSTEM SHALL discard the
// existing buffer, start a new one with the incoming digit, and restart
// the timeout: cancelTimeout: true, scheduleTimeout: true, navigate: null.
// ---------------------------------------------------------------------------

describe('appendDigit — digit typed into a full (three-digit) buffer', () => {
  it('discards the old buffer and starts a new one with the incoming digit', () => {
    // Arrange
    const full = makeState('400', 7);
    // Act
    const result = appendDigit(full, '8');
    // Assert
    expect(result.state.buffer).toBe('8');
  });

  it('navigate is null — the old buffer is silently discarded', () => {
    // Arrange
    const full = makeState('100', 7);
    // Act
    const result = appendDigit(full, '4');
    // Assert
    expect(result.navigate).toBeNull();
  });

  it('cancelTimeout is true', () => {
    // Arrange
    const full = makeState('100', 7);
    // Act
    const result = appendDigit(full, '4');
    // Assert
    expect(result.cancelTimeout).toBe(true);
  });

  it('scheduleTimeout is true', () => {
    // Arrange
    const full = makeState('100', 7);
    // Act
    const result = appendDigit(full, '4');
    // Assert
    expect(result.scheduleTimeout).toBe(true);
  });

  it('completing digits after the overflow fires the new page number', () => {
    // Arrange — restart with '8' overflowing '400'
    const { state: after8 } = appendDigit(makeState('400', 11), '8');
    const { state: after88 } = appendDigit(after8, '8');
    // Act
    const result = appendDigit(after88, '8');
    // Assert
    expect(result.navigate).toBe('888');
  });
});

// ---------------------------------------------------------------------------
// Task 6 — appendDigit: non-digit input is silently ignored
// WHEN a non-digit value is supplied, THE SYSTEM SHALL ignore it and leave
// the buffer unchanged, with no side-effect signals.
// ---------------------------------------------------------------------------

describe('appendDigit — non-digit input', () => {
  it('leaves the buffer unchanged for a letter', () => {
    // Arrange
    const state = makeState('1');
    // Act
    const result = appendDigit(state, 'a');
    // Assert
    expect(result.state.buffer).toBe('1');
  });

  it('navigate is null for a letter', () => {
    // Arrange
    const state = makeState('1');
    // Act
    const result = appendDigit(state, 'a');
    // Assert
    expect(result.navigate).toBeNull();
  });

  it('scheduleTimeout is false for a letter', () => {
    // Arrange
    const state = makeState('1');
    // Act
    const result = appendDigit(state, 'a');
    // Assert
    expect(result.scheduleTimeout).toBe(false);
  });

  it('cancelTimeout is false for a letter — does not interfere with existing timeout', () => {
    // Arrange
    const state = makeState('1', 3);
    // Act
    const result = appendDigit(state, 'a');
    // Assert
    expect(result.cancelTimeout).toBe(false);
  });

  it('leaves the buffer unchanged for an empty string', () => {
    // Arrange
    const state = makeState('10');
    // Act
    const result = appendDigit(state, '');
    // Assert
    expect(result.state.buffer).toBe('10');
  });

  it('leaves the buffer unchanged for a multi-character string', () => {
    // Arrange — '23' has length 2, fails /^[0-9]$/
    const state = makeState('10');
    // Act
    const result = appendDigit(state, '23');
    // Assert
    expect(result.state.buffer).toBe('10');
  });

  it('leaves the buffer unchanged for a space character', () => {
    // Arrange
    const state = makeState('1');
    // Act
    const result = appendDigit(state, ' ');
    // Assert
    expect(result.state.buffer).toBe('1');
  });

  it('leaves the buffer unchanged for a decimal point', () => {
    // Arrange
    const state = makeState('10');
    // Act
    const result = appendDigit(state, '.');
    // Assert
    expect(result.state.buffer).toBe('10');
  });

  it('returns the same state reference for a non-digit (no allocation)', () => {
    // Arrange
    const state = makeState('10');
    // Act
    const result = appendDigit(state, 'z');
    // Assert — the spec says "returns state unchanged"; the implementation
    // returns the identical reference rather than a copy.
    expect(result.state).toBe(state);
  });

  it('leaves the buffer unchanged for a negative-sign character', () => {
    // Arrange
    const state = makeState('4');
    // Act
    const result = appendDigit(state, '-');
    // Assert
    expect(result.state.buffer).toBe('4');
  });

  it('leaves the buffer unchanged for an uppercase letter', () => {
    // Arrange
    const state = makeState('10');
    // Act
    const result = appendDigit(state, 'A');
    // Assert
    expect(result.state.buffer).toBe('10');
  });
});

// ---------------------------------------------------------------------------
// Task 7 — timeoutExpired
// WHEN no further digit follows within 2 000 ms, THE SYSTEM SHALL clear the
// buffer and fire no navigation event.
// cancelTimeout: false (timeout already fired), scheduleTimeout: false.
// ---------------------------------------------------------------------------

describe('timeoutExpired', () => {
  it('clears a one-digit buffer', () => {
    // Arrange
    const state = makeState('4', 2);
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.state.buffer).toBe('');
  });

  it('clears a two-digit buffer', () => {
    // Arrange
    const state = makeState('10', 1);
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.state.buffer).toBe('');
  });

  it('sets timeoutId to null', () => {
    // Arrange
    const state = makeState('10', 1);
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.state.timeoutId).toBeNull();
  });

  it('navigate is null', () => {
    // Arrange
    const state = makeState('10', 1);
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.navigate).toBeNull();
  });

  it('scheduleTimeout is false', () => {
    // Arrange
    const state = makeState('10', 1);
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.scheduleTimeout).toBe(false);
  });

  it('cancelTimeout is false — the timeout already fired; nothing to cancel', () => {
    // Arrange
    const state = makeState('10', 1);
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.cancelTimeout).toBe(false);
  });

  it('is a no-op on an already-empty buffer with no timeout', () => {
    // Arrange
    const state = initialKeypadState();
    // Act
    const result = timeoutExpired(state);
    // Assert
    expect(result.state.buffer).toBe('');
    expect(result.state.timeoutId).toBeNull();
    expect(result.navigate).toBeNull();
    expect(result.scheduleTimeout).toBe(false);
    expect(result.cancelTimeout).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 8 — resetKeypad: non-empty buffer
// WHEN reset() is called explicitly, THE SYSTEM SHALL clear the buffer and
// cancel any pending timeout without firing a navigation event.
// ---------------------------------------------------------------------------

describe('resetKeypad — non-empty buffer with pending timeout', () => {
  it('clears the buffer', () => {
    // Arrange
    const state = makeState('10', 5);
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.state.buffer).toBe('');
  });

  it('navigate is null', () => {
    // Arrange
    const state = makeState('10', 5);
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.navigate).toBeNull();
  });

  it('cancelTimeout is true when a timeout is pending', () => {
    // Arrange
    const state = makeState('10', 5);
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.cancelTimeout).toBe(true);
  });

  it('scheduleTimeout is false', () => {
    // Arrange
    const state = makeState('10', 5);
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.scheduleTimeout).toBe(false);
  });

  it('timeoutId is null in the returned state', () => {
    // Arrange
    const state = makeState('10', 5);
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.state.timeoutId).toBeNull();
  });

  it('works when called on a full three-digit buffer', () => {
    // Arrange
    const state = makeState('100', 9);
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.state.buffer).toBe('');
    expect(result.navigate).toBeNull();
    expect(result.cancelTimeout).toBe(true);
    expect(result.scheduleTimeout).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 9 — resetKeypad: empty buffer, no pending timeout
// cancelTimeout must be false — there is nothing to cancel.
// ---------------------------------------------------------------------------

describe('resetKeypad — empty buffer with no pending timeout', () => {
  it('cancelTimeout is false', () => {
    // Arrange
    const state = makeState('10', null); // non-empty buffer, no timeout
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.cancelTimeout).toBe(false);
  });

  it('is a complete no-op on a genuinely empty initial state', () => {
    // Arrange
    const state = initialKeypadState();
    // Act
    const result = resetKeypad(state);
    // Assert
    expect(result.state.buffer).toBe('');
    expect(result.state.timeoutId).toBeNull();
    expect(result.navigate).toBeNull();
    expect(result.cancelTimeout).toBe(false);
    expect(result.scheduleTimeout).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 10 — getBuffer: exposes current buffer contents without modifying state
// THE SYSTEM SHALL expose the current buffer contents at any time so an
// on-screen keypad can display the digits entered so far.
// ---------------------------------------------------------------------------

describe('getBuffer — pure read, no state change', () => {
  it('returns empty string from the initial state', () => {
    // Arrange
    const state = initialKeypadState();
    // Act / Assert
    expect(getBuffer(state)).toBe('');
  });

  it('returns the single digit already in the buffer', () => {
    // Arrange
    const state = makeState('3');
    // Act / Assert
    expect(getBuffer(state)).toBe('3');
  });

  it('returns the two digits already in the buffer', () => {
    // Arrange
    const state = makeState('47');
    // Act / Assert
    expect(getBuffer(state)).toBe('47');
  });

  it('returns the three-digit string already in the buffer', () => {
    // Arrange
    const state = makeState('100');
    // Act / Assert
    expect(getBuffer(state)).toBe('100');
  });

  it('does not modify the state', () => {
    // Arrange
    const state = makeState('72');
    const bufferBefore = state.buffer;
    const idBefore = state.timeoutId;
    // Act
    getBuffer(state);
    // Assert
    expect(state.buffer).toBe(bufferBefore);
    expect(state.timeoutId).toBe(idBefore);
  });

  it('reflects the buffer after each appendDigit in a live chain', () => {
    // Arrange / Act
    const { state: s1 } = appendDigit(initialKeypadState(), '7');
    expect(getBuffer(s1)).toBe('7');

    const { state: s2 } = appendDigit(s1, '2');
    expect(getBuffer(s2)).toBe('72');

    // After completion the buffer clears
    const { state: s3 } = appendDigit(s2, '0');
    expect(getBuffer(s3)).toBe('');
  });

  it('reflects an empty buffer after timeoutExpired', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '4');
    // Act
    const { state: s2 } = timeoutExpired(s1);
    // Assert
    expect(getBuffer(s2)).toBe('');
  });

  it('reflects an empty buffer after resetKeypad', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    // Act
    const { state: s2 } = resetKeypad(s1);
    // Assert
    expect(getBuffer(s2)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Immutability — no input state may be mutated by any operation
// ---------------------------------------------------------------------------

describe('immutability — input state is never mutated', () => {
  it('appendDigit does not mutate the input buffer', () => {
    // Arrange
    const state = makeState('1');
    // Act
    appendDigit(state, '2');
    // Assert
    expect(state.buffer).toBe('1');
  });

  it('appendDigit does not mutate the input timeoutId', () => {
    // Arrange
    const state = makeState('', 99);
    // Act
    appendDigit(state, '5');
    // Assert
    expect(state.timeoutId).toBe(99);
  });

  it('timeoutExpired does not mutate the input buffer', () => {
    // Arrange
    const state = makeState('10', 3);
    // Act
    timeoutExpired(state);
    // Assert
    expect(state.buffer).toBe('10');
  });

  it('resetKeypad does not mutate the input buffer', () => {
    // Arrange
    const state = makeState('10', 3);
    // Act
    resetKeypad(state);
    // Assert
    expect(state.buffer).toBe('10');
  });
});

// ---------------------------------------------------------------------------
// Requirement: buffer cleared and timeout reset after a completed entry
// (edge case: the state machine resets correctly so the next sequence works)
// ---------------------------------------------------------------------------

describe('state machine resets correctly between sequences', () => {
  it('a second three-digit sequence after the first fires independently', () => {
    // Arrange — first sequence
    const { state: a1 } = appendDigit(initialKeypadState(), '1');
    const { state: a2 } = appendDigit(a1, '0');
    const { state: a3, navigate: nav1 } = appendDigit(a2, '0');
    expect(nav1).toBe('100');
    expect(a3.buffer).toBe('');

    // Act — second sequence starting from the cleared state
    const { state: b1 } = appendDigit(a3, '4');
    const { state: b2 } = appendDigit(b1, '0');
    const { navigate: nav2 } = appendDigit(b2, '0');

    // Assert
    expect(nav2).toBe('400');
  });

  it('a timeout mid-sequence resets the buffer so the next sequence starts fresh', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '5');
    const { state: cleared } = timeoutExpired(s1);
    expect(cleared.buffer).toBe('');

    // Act — fresh sequence
    const { state: n1 } = appendDigit(cleared, '8');
    const { state: n2 } = appendDigit(n1, '8');
    const { navigate } = appendDigit(n2, '8');

    // Assert
    expect(navigate).toBe('888');
  });

  it('an explicit reset mid-sequence resets the buffer so the next sequence starts fresh', () => {
    // Arrange
    const { state: s1 } = appendDigit(initialKeypadState(), '1');
    const { state: cleared } = resetKeypad(s1);
    expect(cleared.buffer).toBe('');

    // Act — fresh sequence
    const { state: n1 } = appendDigit(cleared, '6');
    const { state: n2 } = appendDigit(n1, '6');
    const { navigate } = appendDigit(n2, '6');

    // Assert
    expect(navigate).toBe('666');
  });
});
