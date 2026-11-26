/**
 * Page router for the teletext service.
 *
 * Pure TypeScript. No DOM access, no timers, no global mutation.
 * Strict mode + noUncheckedIndexedAccess throughout.
 *
 * Implements US-02 from .kiro/specs/navigation/requirements.md
 * and the Router section of .kiro/specs/navigation/design.md.
 *
 * Timer ownership (startCycling / stopCycling) lives in main.ts;
 * this module only signals intent via RouterResult fields.
 */

import type { TeletextPage } from '../renderer/types.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PageModule {
  readonly pageNumber: number;   // 0 (sentinel / not-found) or 100–899
  readonly subpageCount: number; // ≥ 1
  readonly load: (subpage: number) => TeletextPage;
}

export interface RouterState {
  readonly currentPage: number;
  readonly subpageIndex: number; // 1-based, 1 ≤ subpageIndex ≤ subpageCount
}

export interface RouterResult {
  readonly state: RouterState;
  readonly page: TeletextPage;
  readonly subpageNotation: string; // e.g. '2/3' or '1/1'
  readonly startCycling: boolean;   // true → main.ts starts an 8 000 ms interval
  readonly stopCycling: boolean;    // true → main.ts clears the current interval
}

// ---------------------------------------------------------------------------
// createRegistry
// ---------------------------------------------------------------------------

/**
 * Validates and indexes an array of page modules into an immutable map keyed
 * by pageNumber.
 *
 * Rules:
 * - pageNumber must be in the range 0–899 (0 is the not-found sentinel).
 * - subpageCount must be ≥ 1.
 * - When two modules share the same pageNumber the last one wins.
 *
 * Throws `RangeError` for any validation failure.
 */
export function createRegistry(
  modules: readonly PageModule[],
): ReadonlyMap<number, PageModule> {
  const map = new Map<number, PageModule>();

  for (const mod of modules) {
    if (mod.pageNumber < 0 || mod.pageNumber > 899) {
      throw new RangeError(
        `PageModule.pageNumber must be in 0–899; got ${mod.pageNumber}`,
      );
    }
    if (mod.subpageCount < 1) {
      throw new RangeError(
        `PageModule.subpageCount must be ≥ 1; got ${mod.subpageCount} for page ${mod.pageNumber}`,
      );
    }
    // Last-wins: simply overwrite any existing entry with the same key.
    map.set(mod.pageNumber, mod);
  }

  return map as ReadonlyMap<number, PageModule>;
}

// ---------------------------------------------------------------------------
// initialRouterState
// ---------------------------------------------------------------------------

/** Returns the initial router state for a given start page. */
export function initialRouterState(startPage: number): RouterState {
  return { currentPage: startPage, subpageIndex: 1 };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the page module for `pageNumber`. Valid user-facing page numbers
 * are 100–899. Any number outside that range, or any in-range number that is
 * not registered, falls back to the not-found sentinel (registered under 0).
 *
 * Throws `RangeError` if no sentinel (0) is registered — that is a
 * programming error in main.ts.
 */
function resolveModule(
  registry: ReadonlyMap<number, PageModule>,
  pageNumber: number,
): PageModule {
  if (pageNumber >= 100 && pageNumber <= 899) {
    const mod = registry.get(pageNumber);
    if (mod !== undefined) {
      return mod;
    }
  }
  // Fall back to the not-found sentinel.
  const sentinel = registry.get(0);
  if (sentinel === undefined) {
    throw new RangeError(
      'No not-found sentinel (pageNumber 0) registered in the registry.',
    );
  }
  return sentinel;
}

function buildNotation(subpageIndex: number, subpageCount: number): string {
  return `${subpageIndex}/${subpageCount}`;
}

// ---------------------------------------------------------------------------
// navigateTo
// ---------------------------------------------------------------------------

/**
 * Navigates to `pageNumber`. Always resets subpageIndex to 1 and signals
 * `stopCycling`. Signals `startCycling` only when the resolved page has more
 * than one subpage.
 */
export function navigateTo(
  state: RouterState,
  registry: ReadonlyMap<number, PageModule>,
  pageNumber: number,
): RouterResult {
  const mod = resolveModule(registry, pageNumber);
  const newState: RouterState = {
    currentPage: mod.pageNumber,
    subpageIndex: 1,
  };
  const page = mod.load(1);
  return {
    state: newState,
    page,
    subpageNotation: buildNotation(1, mod.subpageCount),
    startCycling: mod.subpageCount > 1,
    stopCycling: true,
  };
}

// ---------------------------------------------------------------------------
// advance
// ---------------------------------------------------------------------------

/**
 * Advances the subpage index by one, wrapping from `subpageCount` back to 1.
 * Does not change `currentPage`. Does not signal start/stopCycling (the
 * interval in main.ts keeps running).
 */
export function advance(
  state: RouterState,
  registry: ReadonlyMap<number, PageModule>,
): RouterResult {
  const mod = resolveModule(registry, state.currentPage);
  const nextIndex =
    state.subpageIndex >= mod.subpageCount ? 1 : state.subpageIndex + 1;
  const newState: RouterState = {
    currentPage: state.currentPage,
    subpageIndex: nextIndex,
  };
  const page = mod.load(nextIndex);
  return {
    state: newState,
    page,
    subpageNotation: buildNotation(nextIndex, mod.subpageCount),
    startCycling: false,
    stopCycling: false,
  };
}

// ---------------------------------------------------------------------------
// getSubpageNotation
// ---------------------------------------------------------------------------

/**
 * Returns the `n/N` notation string for the current router state.
 * Pure read — no state change.
 */
export function getSubpageNotation(
  state: RouterState,
  registry: ReadonlyMap<number, PageModule>,
): string {
  const mod = resolveModule(registry, state.currentPage);
  return buildNotation(state.subpageIndex, mod.subpageCount);
}
