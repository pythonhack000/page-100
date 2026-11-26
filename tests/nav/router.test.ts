/**
 * Tests for src/nav/router.ts
 *
 * Covers every requirement in US-02 of .kiro/specs/navigation/requirements.md
 * and every operation defined in the Router section of
 * .kiro/specs/navigation/design.md.
 *
 * Tasks covered (from .kiro/specs/navigation/tasks.md):
 *   createRegistry    — tasks 11–16
 *   initialRouterState — task 17
 *   navigateTo        — tasks 18–23
 *   advance           — tasks 24–25
 *   getSubpageNotation — tasks 26–27
 *
 * Design contracts:
 *   - router.ts is pure: no DOM, no timers, no global mutation.
 *   - Timer ownership (startCycling / stopCycling) lives in main.ts; the router
 *     only signals intent via RouterResult fields.
 *   - The not-found fallback is registered under the sentinel pageNumber 0.
 *   - `noUncheckedIndexedAccess` is enabled: all array element access is
 *     narrowed explicitly before use.
 *
 * Arrange-Act-Assert throughout.
 */

import { describe, it, expect } from 'vitest';
import {
  createRegistry,
  initialRouterState,
  navigateTo,
  advance,
  getSubpageNotation,
} from '../../src/nav/router.ts';
import type { RouterState, PageModule } from '../../src/nav/router.ts';
import type { TeletextPage } from '../../src/renderer/types.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Builds a minimal TeletextPage for use as a stub return value. */
function makePage(label: string): TeletextPage {
  return {
    grid: [],
    plainText: [label],
  };
}

/**
 * Builds a PageModule stub.
 * `load` returns a page whose first plainText line encodes the subpage number
 * so tests can verify which subpage was loaded.
 */
function makeModule(
  pageNumber: number,
  subpageCount: number = 1,
): PageModule {
  return {
    pageNumber,
    subpageCount,
    load: (subpage: number) => makePage(`page-${pageNumber}/sub-${subpage}`),
  };
}

/** Returns a registry containing the not-found sentinel and any extra modules. */
function makeRegistry(...extra: PageModule[]): ReadonlyMap<number, PageModule> {
  const notFound: PageModule = {
    pageNumber: 0,
    subpageCount: 1,
    load: (_subpage: number) => makePage('not-found'),
  };
  return createRegistry([notFound, ...extra]);
}

// ---------------------------------------------------------------------------
// createRegistry — tasks 11–16
// ---------------------------------------------------------------------------

describe('createRegistry', () => {
  // task 11
  it('returns a ReadonlyMap whose size equals the number of distinct page numbers', () => {
    // Arrange
    const modules: PageModule[] = [
      makeModule(0),   // sentinel
      makeModule(100),
      makeModule(200),
      makeModule(400),
    ];
    // Act
    const registry = createRegistry(modules);
    // Assert
    expect(registry.size).toBe(4);
  });

  // task 12
  it('accepts the not-found sentinel (pageNumber 0, subpageCount 1) without throwing', () => {
    // Arrange
    const sentinel = makeModule(0, 1);
    // Act / Assert
    expect(() => createRegistry([sentinel])).not.toThrow();
  });

  // task 13
  it('accepts a module with pageNumber in 100–899 and subpageCount ≥ 1 without throwing', () => {
    // Arrange
    const mod100 = makeModule(100, 1);
    const mod899 = makeModule(899, 3);
    const sentinel = makeModule(0);
    // Act / Assert
    expect(() => createRegistry([sentinel, mod100, mod899])).not.toThrow();
  });

  // task 14 — subpageCount < 1
  it('throws RangeError when any module has subpageCount < 1', () => {
    // Arrange
    const bad: PageModule = {
      pageNumber: 100,
      subpageCount: 0,
      load: () => makePage('bad'),
    };
    const sentinel = makeModule(0);
    // Act / Assert
    expect(() => createRegistry([sentinel, bad])).toThrow(RangeError);
  });

  it('throws RangeError when subpageCount is negative', () => {
    // Arrange
    const bad: PageModule = {
      pageNumber: 200,
      subpageCount: -1,
      load: () => makePage('bad'),
    };
    const sentinel = makeModule(0);
    // Act / Assert
    expect(() => createRegistry([sentinel, bad])).toThrow(RangeError);
  });

  // task 15 — pageNumber outside 0–899
  it('throws RangeError when any module has pageNumber 900', () => {
    // Arrange
    const bad = makeModule(900);
    const sentinel = makeModule(0);
    // Act / Assert
    expect(() => createRegistry([sentinel, bad])).toThrow(RangeError);
  });

  it('throws RangeError when any module has a negative pageNumber', () => {
    // Arrange
    const bad = makeModule(-1);
    const sentinel = makeModule(0);
    // Act / Assert
    expect(() => createRegistry([sentinel, bad])).toThrow(RangeError);
  });

  // task 16 — last-wins on duplicate pageNumber
  it('stores the last module when two modules share the same pageNumber', () => {
    // Arrange
    const first: PageModule = {
      pageNumber: 100,
      subpageCount: 1,
      load: () => makePage('first'),
    };
    const last: PageModule = {
      pageNumber: 100,
      subpageCount: 2,
      load: (sub: number) => makePage(`last-${sub}`),
    };
    const sentinel = makeModule(0);
    // Act
    const registry = createRegistry([sentinel, first, last]);
    const stored = registry.get(100);
    // Assert — size reflects the deduplication
    expect(registry.size).toBe(2); // sentinel + one entry for 100
    // And the stored module is the last one (subpageCount 2, not 1)
    expect(stored?.subpageCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// initialRouterState — task 17
// ---------------------------------------------------------------------------

describe('initialRouterState', () => {
  it('sets currentPage to the supplied start page', () => {
    // Arrange / Act
    const state = initialRouterState(100);
    // Assert
    expect(state.currentPage).toBe(100);
  });

  it('sets subpageIndex to 1', () => {
    // Arrange / Act
    const state = initialRouterState(100);
    // Assert
    expect(state.subpageIndex).toBe(1);
  });

  it('records whatever start page is supplied', () => {
    // Arrange / Act
    const state = initialRouterState(666);
    // Assert
    expect(state.currentPage).toBe(666);
  });

  it('contains no timer ID fields', () => {
    // Arrange / Act
    const state = initialRouterState(100);
    // Assert — RouterState must not carry timer handles
    expect(state).not.toHaveProperty('timeoutId');
    expect(state).not.toHaveProperty('intervalId');
    expect(state).not.toHaveProperty('cycleId');
  });
});

// ---------------------------------------------------------------------------
// navigateTo — tasks 18–23
// ---------------------------------------------------------------------------

describe('navigateTo', () => {
  // task 18 — valid registered page
  it('returns the page from the registered module when given a valid page number', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert — load(1) was called, so plainText[0] encodes page 100, subpage 1
    const firstLine = result.page.plainText[0];
    expect(firstLine).toBe('page-100/sub-1');
  });

  it('sets state.currentPage to the requested page number', () => {
    // Arrange
    const registry = makeRegistry(makeModule(400));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 400);
    // Assert
    expect(result.state.currentPage).toBe(400);
  });

  it('sets state.subpageIndex to 1', () => {
    // Arrange — start at a non-1 subpage by advancing first
    const registry = makeRegistry(makeModule(100, 3));
    let state = initialRouterState(100);
    state = advance(state, registry).state; // subpageIndex → 2
    // Act — navigate to the same page resets the index
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.state.subpageIndex).toBe(1);
  });

  // task 19 — out-of-range page number
  it('returns the not-found module page when page number is below 100', () => {
    // Arrange
    const registry = makeRegistry();
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 99);
    // Assert
    const firstLine = result.page.plainText[0];
    expect(firstLine).toBe('not-found');
  });

  it('returns the not-found module page when page number is 0', () => {
    // Arrange
    const registry = makeRegistry();
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 0);
    // Assert
    const firstLine = result.page.plainText[0];
    expect(firstLine).toBe('not-found');
  });

  it('returns the not-found module page when page number is 900', () => {
    // Arrange
    const registry = makeRegistry();
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 900);
    // Assert
    const firstLine = result.page.plainText[0];
    expect(firstLine).toBe('not-found');
  });

  it('does not throw when page number is out of range', () => {
    // Arrange
    const registry = makeRegistry();
    const state = initialRouterState(100);
    // Act / Assert
    expect(() => navigateTo(state, registry, 999)).not.toThrow();
  });

  // task 20 — valid but unregistered page number
  it('returns the not-found module page when page number is valid but unregistered', () => {
    // Arrange — registry contains 100 but not 200
    const registry = makeRegistry(makeModule(100));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 200);
    // Assert
    const firstLine = result.page.plainText[0];
    expect(firstLine).toBe('not-found');
  });

  // task 21 — always resets subpageIndex and signals stopCycling
  it('signals stopCycling: true on every navigateTo call', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.stopCycling).toBe(true);
  });

  it('resets subpageIndex to 1 even when navigating to the already-current page', () => {
    // Arrange — manually put state at subpageIndex 2
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 2 };
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.state.subpageIndex).toBe(1);
  });

  // task 22 — startCycling only when subpageCount > 1
  it('signals startCycling: true when the target page has more than one subpage', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.startCycling).toBe(true);
  });

  it('signals startCycling: false when the target page has exactly one subpage', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 1));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.startCycling).toBe(false);
  });

  it('signals startCycling: false when navigating to the not-found page', () => {
    // Arrange
    const registry = makeRegistry();
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 999);
    // Assert
    expect(result.startCycling).toBe(false);
  });

  // task 23 — isolated registries share no state
  it('two separate registries produce independent results', () => {
    // Arrange — same page number, different modules in each registry
    const moduleA: PageModule = {
      pageNumber: 100,
      subpageCount: 1,
      load: () => makePage('registry-A'),
    };
    const moduleB: PageModule = {
      pageNumber: 100,
      subpageCount: 2,
      load: (sub: number) => makePage(`registry-B-${sub}`),
    };
    const registryA = makeRegistry(moduleA);
    const registryB = makeRegistry(moduleB);
    const state = initialRouterState(100);
    // Act
    const resultA = navigateTo(state, registryA, 100);
    const resultB = navigateTo(state, registryB, 100);
    // Assert — pages come from different modules
    expect(resultA.page.plainText[0]).toBe('registry-A');
    expect(resultB.page.plainText[0]).toBe('registry-B-1');
    // And cycling intent differs
    expect(resultA.startCycling).toBe(false);
    expect(resultB.startCycling).toBe(true);
  });

  // subpageNotation on navigateTo always starts at 1/N
  it('returns subpageNotation "1/3" after navigating to a three-subpage page', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.subpageNotation).toBe('1/3');
  });

  it('returns subpageNotation "1/1" after navigating to a single-subpage page', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 1));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 100);
    // Assert
    expect(result.subpageNotation).toBe('1/1');
  });
});

// ---------------------------------------------------------------------------
// advance — tasks 24–25
// ---------------------------------------------------------------------------

describe('advance', () => {
  // task 24 — increments subpageIndex and loads that subpage
  it('increments subpageIndex by 1', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.state.subpageIndex).toBe(2);
  });

  it('calls load with the new subpage index', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert — load(2) was called
    expect(result.page.plainText[0]).toBe('page-100/sub-2');
  });

  it('does not change currentPage', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.state.currentPage).toBe(100);
  });

  it('does not signal startCycling', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.startCycling).toBe(false);
  });

  it('does not signal stopCycling', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.stopCycling).toBe(false);
  });

  // task 25 — wraps from subpageCount back to 1
  it('wraps subpageIndex from subpageCount back to 1', () => {
    // Arrange — place state at the last subpage
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 3 };
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.state.subpageIndex).toBe(1);
  });

  it('calls load(1) after wrapping', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 3 };
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.page.plainText[0]).toBe('page-100/sub-1');
  });

  it('wraps correctly for a two-subpage page', () => {
    // Arrange
    const registry = makeRegistry(makeModule(500, 2));
    const state: RouterState = { currentPage: 500, subpageIndex: 2 };
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.state.subpageIndex).toBe(1);
  });

  it('advances through all subpages in sequence before wrapping', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    let state = initialRouterState(100); // subpageIndex: 1
    // Act
    const r2 = advance(state, registry);
    state = r2.state; // subpageIndex: 2
    const r3 = advance(state, registry);
    state = r3.state; // subpageIndex: 3
    const r1 = advance(state, registry);
    // Assert
    expect(r2.state.subpageIndex).toBe(2);
    expect(r3.state.subpageIndex).toBe(3);
    expect(r1.state.subpageIndex).toBe(1);
  });

  it('returns the correct subpageNotation after advancing', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.subpageNotation).toBe('2/3');
  });
});

// ---------------------------------------------------------------------------
// getSubpageNotation — tasks 26–27
// ---------------------------------------------------------------------------

describe('getSubpageNotation', () => {
  // task 26 — 'n/N' format
  it('returns "1/3" when subpageIndex is 1 and subpageCount is 3', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 1 };
    // Act
    const notation = getSubpageNotation(state, registry);
    // Assert
    expect(notation).toBe('1/3');
  });

  it('returns "2/3" when subpageIndex is 2 and subpageCount is 3', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 2 };
    // Act
    const notation = getSubpageNotation(state, registry);
    // Assert
    expect(notation).toBe('2/3');
  });

  it('returns "3/3" when subpageIndex is 3 and subpageCount is 3', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 3 };
    // Act
    const notation = getSubpageNotation(state, registry);
    // Assert
    expect(notation).toBe('3/3');
  });

  // task 27 — single-subpage page returns '1/1'
  it('returns "1/1" for a single-subpage page', () => {
    // Arrange
    const registry = makeRegistry(makeModule(400, 1));
    const state: RouterState = { currentPage: 400, subpageIndex: 1 };
    // Act
    const notation = getSubpageNotation(state, registry);
    // Assert
    expect(notation).toBe('1/1');
  });

  it('is a pure read and does not alter the state', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state: RouterState = { currentPage: 100, subpageIndex: 2 };
    // Act
    getSubpageNotation(state, registry);
    // Assert — state object is unchanged
    expect(state.subpageIndex).toBe(2);
    expect(state.currentPage).toBe(100);
  });

  it('returns the correct notation for a five-subpage page', () => {
    // Arrange
    const registry = makeRegistry(makeModule(101, 5));
    const state: RouterState = { currentPage: 101, subpageIndex: 4 };
    // Act
    const notation = getSubpageNotation(state, registry);
    // Assert
    expect(notation).toBe('4/5');
  });
});

// ---------------------------------------------------------------------------
// Immutability — navigateTo and advance return new state objects
// ---------------------------------------------------------------------------

describe('state immutability', () => {
  it('navigateTo returns a new RouterState object, not the input', () => {
    // Arrange
    const registry = makeRegistry(makeModule(400));
    const state = initialRouterState(100);
    // Act
    const result = navigateTo(state, registry, 400);
    // Assert
    expect(result.state).not.toBe(state);
  });

  it('advance returns a new RouterState object, not the input', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 2));
    const state = initialRouterState(100);
    // Act
    const result = advance(state, registry);
    // Assert
    expect(result.state).not.toBe(state);
  });

  it('the input RouterState is unchanged after navigateTo', () => {
    // Arrange
    const registry = makeRegistry(makeModule(400));
    const state = initialRouterState(100);
    const originalPage = state.currentPage;
    const originalSubpage = state.subpageIndex;
    // Act
    navigateTo(state, registry, 400);
    // Assert
    expect(state.currentPage).toBe(originalPage);
    expect(state.subpageIndex).toBe(originalSubpage);
  });

  it('the input RouterState is unchanged after advance', () => {
    // Arrange
    const registry = makeRegistry(makeModule(100, 3));
    const state = initialRouterState(100);
    const originalSubpage = state.subpageIndex;
    // Act
    advance(state, registry);
    // Assert
    expect(state.subpageIndex).toBe(originalSubpage);
  });
});
