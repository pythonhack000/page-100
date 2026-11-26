/**
 * Mosaic block graphics for the teletext renderer.
 *
 * A mosaic cell stores a `sixels` value — an integer 0–63 — encoding which of
 * the six sub-cell blocks are filled with the foreground colour:
 *
 * ```
 * bit 0 → top-left      bit 1 → top-right
 * bit 2 → middle-left   bit 3 → middle-right
 * bit 4 → bottom-left   bit 5 → bottom-right
 * ```
 *
 * This module exposes only validation. Rendering is handled entirely by CSS in
 * the DOM renderer; no Unicode block characters or web fonts are used.
 *
 * Pure functions only — no DOM access, no side effects.
 */

// MosaicCell is not used in function signatures here but is re-exported so
// callers can import the type alongside the validator from one place.
export type { MosaicCell } from './types.js';

/**
 * Assert that `sixels` is an integer in the range 0–63.
 *
 * Returns the value unchanged on success. Throws `TypeError` if the value is
 * not a number, is a non-integer number, or is an integer outside 0–63.
 *
 * @param sixels - The candidate sixels value to validate.
 * @returns The validated sixels value.
 * @throws {TypeError} When `sixels` fails any validation check.
 */
export function validateSixels(sixels: unknown): number {
  if (typeof sixels !== 'number') {
    throw new TypeError(
      `sixels must be a number, got ${typeof sixels}`
    );
  }

  if (!Number.isInteger(sixels)) {
    throw new TypeError(
      `sixels must be an integer, got ${sixels}`
    );
  }

  if (sixels < 0 || sixels > 63) {
    throw new TypeError(
      `sixels must be in the range 0–63, got ${sixels}`
    );
  }

  return sixels;
}
