/**
 * Tests for src/renderer/colours.ts
 *
 * Covers tasks 1–5 from .kiro/specs/teletext-renderer/tasks.md (US-02).
 * Pure functions only — no DOM access.
 */

import { describe, it, expect } from 'vitest';
import type { TeletextColour } from '../../src/renderer/types.ts';
import {
  COLOUR_HEX,
  COLOUR_CSS,
  validateColour,
  colourToCSS,
} from '../../src/renderer/colours.ts';

// ---------------------------------------------------------------------------
// The canonical eight colours used across multiple tests.
// ---------------------------------------------------------------------------

const ALL_COLOURS: TeletextColour[] = [
  'Black',
  'Red',
  'Green',
  'Yellow',
  'Blue',
  'Magenta',
  'Cyan',
  'White',
];

// ---------------------------------------------------------------------------
// Task 1 — COLOUR_HEX maps all eight colour names to their hex strings (US-02)
// ---------------------------------------------------------------------------

describe('COLOUR_HEX', () => {
  it('contains exactly eight entries', () => {
    // Arrange / Act
    const keys = Object.keys(COLOUR_HEX);

    // Assert
    expect(keys).toHaveLength(8);
  });

  it('maps Black to #000000', () => {
    expect(COLOUR_HEX['Black']).toBe('#000000');
  });

  it('maps Red to #FF0000', () => {
    expect(COLOUR_HEX['Red']).toBe('#FF0000');
  });

  it('maps Green to #00FF00', () => {
    expect(COLOUR_HEX['Green']).toBe('#00FF00');
  });

  it('maps Yellow to #FFFF00', () => {
    expect(COLOUR_HEX['Yellow']).toBe('#FFFF00');
  });

  it('maps Blue to #0000FF', () => {
    expect(COLOUR_HEX['Blue']).toBe('#0000FF');
  });

  it('maps Magenta to #FF00FF', () => {
    expect(COLOUR_HEX['Magenta']).toBe('#FF00FF');
  });

  it('maps Cyan to #00FFFF', () => {
    expect(COLOUR_HEX['Cyan']).toBe('#00FFFF');
  });

  it('maps White to #FFFFFF', () => {
    expect(COLOUR_HEX['White']).toBe('#FFFFFF');
  });

  it('contains only the eight permitted colour names as keys', () => {
    // Arrange
    const expectedKeys = new Set<string>(ALL_COLOURS);

    // Act
    const actualKeys = new Set(Object.keys(COLOUR_HEX));

    // Assert
    expect(actualKeys).toEqual(expectedKeys);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — COLOUR_CSS maps all eight colour names to --tt-* strings (US-02)
// ---------------------------------------------------------------------------

describe('COLOUR_CSS', () => {
  it('contains exactly eight entries', () => {
    expect(Object.keys(COLOUR_CSS)).toHaveLength(8);
  });

  it('maps Black to --tt-black', () => {
    expect(COLOUR_CSS['Black']).toBe('--tt-black');
  });

  it('maps Red to --tt-red', () => {
    expect(COLOUR_CSS['Red']).toBe('--tt-red');
  });

  it('maps Green to --tt-green', () => {
    expect(COLOUR_CSS['Green']).toBe('--tt-green');
  });

  it('maps Yellow to --tt-yellow', () => {
    expect(COLOUR_CSS['Yellow']).toBe('--tt-yellow');
  });

  it('maps Blue to --tt-blue', () => {
    expect(COLOUR_CSS['Blue']).toBe('--tt-blue');
  });

  it('maps Magenta to --tt-magenta', () => {
    expect(COLOUR_CSS['Magenta']).toBe('--tt-magenta');
  });

  it('maps Cyan to --tt-cyan', () => {
    expect(COLOUR_CSS['Cyan']).toBe('--tt-cyan');
  });

  it('maps White to --tt-white', () => {
    expect(COLOUR_CSS['White']).toBe('--tt-white');
  });

  it('contains only the eight permitted colour names as keys', () => {
    const expectedKeys = new Set<string>(ALL_COLOURS);
    const actualKeys = new Set(Object.keys(COLOUR_CSS));
    expect(actualKeys).toEqual(expectedKeys);
  });

  it('every value begins with --tt-', () => {
    // Arrange / Act
    const values = Object.values(COLOUR_CSS);

    // Assert
    for (const value of values) {
      expect(value).toMatch(/^--tt-/);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3 — validateColour returns its input unchanged for all eight valid
//           colour names (US-02)
// ---------------------------------------------------------------------------

describe('validateColour — valid inputs', () => {
  it.each(ALL_COLOURS)('returns %s unchanged', (colour) => {
    // Arrange / Act
    const result = validateColour(colour);

    // Assert
    expect(result).toBe(colour);
  });
});

// ---------------------------------------------------------------------------
// Task 4 — validateColour throws TypeError for invalid inputs (US-02)
// ---------------------------------------------------------------------------

describe('validateColour — invalid inputs', () => {
  it('throws TypeError for a capitalised-but-wrong name ("Purple")', () => {
    // Arrange / Act / Assert
    expect(() => validateColour('Purple')).toThrow(TypeError);
  });

  it('throws TypeError for an empty string', () => {
    expect(() => validateColour('')).toThrow(TypeError);
  });

  it('throws TypeError for a lowercase valid name ("white")', () => {
    expect(() => validateColour('white')).toThrow(TypeError);
  });

  it('throws TypeError for a lowercase valid name ("black")', () => {
    expect(() => validateColour('black')).toThrow(TypeError);
  });

  it('throws TypeError for a hex string that happens to match a colour value', () => {
    expect(() => validateColour('#FFFFFF')).toThrow(TypeError);
  });

  it('throws TypeError for a CSS custom property string', () => {
    expect(() => validateColour('--tt-white')).toThrow(TypeError);
  });

  it('throws TypeError for a number', () => {
    expect(() => validateColour(42)).toThrow(TypeError);
  });

  it('throws TypeError for null', () => {
    expect(() => validateColour(null)).toThrow(TypeError);
  });

  it('throws TypeError for undefined', () => {
    expect(() => validateColour(undefined)).toThrow(TypeError);
  });

  it('throws TypeError for an object', () => {
    expect(() => validateColour({ colour: 'White' })).toThrow(TypeError);
  });

  it('throws TypeError for an array', () => {
    expect(() => validateColour(['White'])).toThrow(TypeError);
  });

  it('error message includes the invalid value', () => {
    // Arrange
    let errorMessage = '';

    // Act
    try {
      validateColour('Orange');
    } catch (e) {
      if (e instanceof TypeError) errorMessage = e.message;
    }

    // Assert
    expect(errorMessage).toContain('Orange');
  });
});

// ---------------------------------------------------------------------------
// Task 5 — colourToCSS returns the var(--tt-*) expression for each colour
//           (US-02)
// ---------------------------------------------------------------------------

describe('colourToCSS', () => {
  it('returns var(--tt-white) for White', () => {
    // Arrange / Act
    const result = colourToCSS('White');

    // Assert
    expect(result).toBe('var(--tt-white)');
  });

  it('returns var(--tt-black) for Black', () => {
    expect(colourToCSS('Black')).toBe('var(--tt-black)');
  });

  it('returns var(--tt-red) for Red', () => {
    expect(colourToCSS('Red')).toBe('var(--tt-red)');
  });

  it('returns var(--tt-green) for Green', () => {
    expect(colourToCSS('Green')).toBe('var(--tt-green)');
  });

  it('returns var(--tt-yellow) for Yellow', () => {
    expect(colourToCSS('Yellow')).toBe('var(--tt-yellow)');
  });

  it('returns var(--tt-blue) for Blue', () => {
    expect(colourToCSS('Blue')).toBe('var(--tt-blue)');
  });

  it('returns var(--tt-magenta) for Magenta', () => {
    expect(colourToCSS('Magenta')).toBe('var(--tt-magenta)');
  });

  it('returns var(--tt-cyan) for Cyan', () => {
    expect(colourToCSS('Cyan')).toBe('var(--tt-cyan)');
  });

  it('every colour produces a string wrapped in var()', () => {
    // Arrange / Act / Assert
    for (const colour of ALL_COLOURS) {
      const result = colourToCSS(colour);
      expect(result).toMatch(/^var\(--tt-[a-z]+\)$/);
    }
  });

  it('the CSS property inside var() matches the COLOUR_CSS entry for that colour', () => {
    // Arrange / Act / Assert
    for (const colour of ALL_COLOURS) {
      const result = colourToCSS(colour);
      const expected = `var(${COLOUR_CSS[colour]})`;
      expect(result).toBe(expected);
    }
  });
});
