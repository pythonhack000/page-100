/**
 * Teletext colour constants and validation.
 * Pure functions — no DOM access, no side effects.
 */

import type { TeletextColour } from './types.ts';

// ---------------------------------------------------------------------------
// Colour tables
// ---------------------------------------------------------------------------

/**
 * Maps each of the eight teletext colour names to its canonical hex string.
 * Task 1 (US-02).
 */
export const COLOUR_HEX: Readonly<Record<TeletextColour, string>> = {
  Black:   '#000000',
  Red:     '#FF0000',
  Green:   '#00FF00',
  Yellow:  '#FFFF00',
  Blue:    '#0000FF',
  Magenta: '#FF00FF',
  Cyan:    '#00FFFF',
  White:   '#FFFFFF',
} as const;

/**
 * Maps each of the eight teletext colour names to its CSS custom property
 * string (without `var()`).
 * Task 2 (US-02).
 */
export const COLOUR_CSS: Readonly<Record<TeletextColour, string>> = {
  Black:   '--tt-black',
  Red:     '--tt-red',
  Green:   '--tt-green',
  Yellow:  '--tt-yellow',
  Blue:    '--tt-blue',
  Magenta: '--tt-magenta',
  Cyan:    '--tt-cyan',
  White:   '--tt-white',
} as const;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns `c` unchanged when it is one of the eight valid `TeletextColour`
 * names. Throws `TypeError` for any other value.
 * Tasks 3 & 4 (US-02).
 */
export function validateColour(c: unknown): TeletextColour {
  if (typeof c === 'string' && Object.hasOwn(COLOUR_HEX, c)) {
    return c as TeletextColour;
  }
  throw new TypeError(
    `Invalid teletext colour: ${JSON.stringify(c)}. ` +
    `Must be one of: ${Object.keys(COLOUR_HEX).join(', ')}.`,
  );
}

// ---------------------------------------------------------------------------
// CSS helper
// ---------------------------------------------------------------------------

/**
 * Returns the `var(--tt-*)` expression for the given colour.
 * Task 5 (US-02).
 */
export function colourToCSS(c: TeletextColour): string {
  return `var(${COLOUR_CSS[c]})`;
}
