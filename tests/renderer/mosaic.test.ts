/**
 * Tests for src/renderer/mosaic.ts
 *
 * Covers tasks 18–22 from .kiro/specs/teletext-renderer/tasks.md (US-04).
 * Pure functions only — no DOM access.
 */

import { describe, it, expect } from 'vitest';
import { validateSixels } from '../../src/renderer/mosaic.ts';
import * as mosaicModule from '../../src/renderer/mosaic.ts';

// ---------------------------------------------------------------------------
// Task 18: validateSixels returns the input unchanged for integers 0–63
// ---------------------------------------------------------------------------

describe('validateSixels — valid inputs', () => {
  it('returns 0 unchanged (lower boundary)', () => {
    // Arrange
    const input = 0;

    // Act
    const result = validateSixels(input);

    // Assert
    expect(result).toBe(0);
  });

  it('returns 63 unchanged (upper boundary)', () => {
    // Arrange
    const input = 63;

    // Act
    const result = validateSixels(input);

    // Assert
    expect(result).toBe(63);
  });

  it('returns a mid-range integer unchanged', () => {
    // Arrange
    const input = 42;

    // Act
    const result = validateSixels(input);

    // Assert
    expect(result).toBe(42);
  });

  it('returns every integer in the full 0–63 range', () => {
    // Arrange / Act / Assert in one sweep
    for (let i = 0; i <= 63; i++) {
      expect(validateSixels(i)).toBe(i);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 19: validateSixels throws TypeError for non-integer numbers
// ---------------------------------------------------------------------------

describe('validateSixels — non-integer numbers', () => {
  it('throws TypeError for 1.5', () => {
    // Arrange
    const input = 1.5;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for 0.1', () => {
    // Arrange
    const input = 0.1;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for 62.9999', () => {
    // Arrange
    const input = 62.9999;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for NaN', () => {
    // Arrange
    const input = NaN;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for Infinity', () => {
    // Arrange
    const input = Infinity;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for -Infinity', () => {
    // Arrange
    const input = -Infinity;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Task 20: validateSixels throws TypeError for integers outside 0–63
// ---------------------------------------------------------------------------

describe('validateSixels — out-of-range integers', () => {
  it('throws TypeError for -1', () => {
    // Arrange
    const input = -1;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for 64', () => {
    // Arrange
    const input = 64;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for a large positive integer', () => {
    // Arrange
    const input = 1000;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for a large negative integer', () => {
    // Arrange
    const input = -100;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Task 21: validateSixels throws TypeError for non-number inputs
// ---------------------------------------------------------------------------

describe('validateSixels — non-number inputs', () => {
  it('throws TypeError for a numeric string "5"', () => {
    // Arrange
    const input: unknown = '5';

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for null', () => {
    // Arrange
    const input: unknown = null;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for undefined', () => {
    // Arrange
    const input: unknown = undefined;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for a boolean', () => {
    // Arrange
    const input: unknown = true;

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for an object', () => {
    // Arrange
    const input: unknown = { sixels: 10 };

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });

  it('throws TypeError for an array', () => {
    // Arrange
    const input: unknown = [10];

    // Act & Assert
    expect(() => validateSixels(input)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Task 22: mosaic.ts does not export encodeMosaic or decodeMosaic
// ---------------------------------------------------------------------------

describe('mosaic module exports', () => {
  it('does not export encodeMosaic', () => {
    // Arrange / Act / Assert
    expect((mosaicModule as Record<string, unknown>)['encodeMosaic']).toBeUndefined();
  });

  it('does not export decodeMosaic', () => {
    // Arrange / Act / Assert
    expect((mosaicModule as Record<string, unknown>)['decodeMosaic']).toBeUndefined();
  });

  it('exports validateSixels as a function', () => {
    // Arrange / Act / Assert
    expect(typeof validateSixels).toBe('function');
  });
});
