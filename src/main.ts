/**
 * src/main.ts
 *
 * Entry point. Wires the DOM to the renderer and nav modules.
 * No business logic beyond event dispatch and timer management.
 *
 * Timer ownership (as specified in .kiro/specs/navigation/design.md):
 *   - Keypad timeout  : setTimeout  2 000 ms, owned here
 *   - Subpage cycling : setInterval 8 000 ms, owned here
 *   - Clock tick      : setInterval 1 000 ms, owned here (unconditional)
 */

import { mountGrid, renderPage, updateClock as domUpdateClock } from './renderer/dom-renderer.ts';
import {
  initialKeypadState,
  appendDigit,
  timeoutExpired,
  resetKeypad,
  type KeypadState,
} from './nav/keypad.ts';
import {
  createRegistry,
  initialRouterState,
  navigateTo,
  advance,
  type RouterState,
  type PageModule,
} from './nav/router.ts';
import {
  initialHistoryState,
  push as historyPush,
  back as historyBack,
  forward as historyForward,
  type HistoryState,
} from './nav/history.ts';
import {
  initialFastextState,
  activateSlot,
  type FastextState,
  type FastextColour,
} from './nav/fastext.ts';
import { p100 } from './pages/p100.ts';

// ---------------------------------------------------------------------------
// Not-found fallback page module
// ---------------------------------------------------------------------------

import { composePage } from './renderer/layout.ts';
import type { TeletextPage } from './renderer/types.ts';

const NOT_FOUND_MODULE: PageModule = {
  pageNumber: 0,
  subpageCount: 1,
  load(_subpage: number): TeletextPage {
    return composePage(
      { pageNumber: 100, serviceName: 'PAGE 100' },
      [
        { cells: [] },
        { cells: [] },
        {
          cells: Array.from({ length: 40 }, (_, i) => {
            const text = '        PAGE NOT FOUND          ';
            return { kind: 'text' as const, char: text[i] ?? ' ', fg: 'Yellow' as const, bg: 'Black' as const };
          }),
        },
        { cells: [] },
        {
          cells: Array.from({ length: 40 }, (_, i) => {
            const text = '    That page does not exist.   ';
            return { kind: 'text' as const, char: text[i] ?? ' ', fg: 'White' as const, bg: 'Black' as const };
          }),
        },
      ],
      {},
    );
  },
};

// ---------------------------------------------------------------------------
// Nav state
// ---------------------------------------------------------------------------

interface NavState {
  keypad:  KeypadState;
  router:  RouterState;
  history: HistoryState;
  fastext: FastextState;
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

const START_PAGE = 100;

const registry = createRegistry([NOT_FOUND_MODULE, p100]);

const screenEl = document.getElementById('screen');

if (screenEl === null) throw new Error('Missing #screen element');

const screenHost: HTMLElement = screenEl;
const mounted = mountGrid(screenHost);

// ---------------------------------------------------------------------------
// Scaling
// ---------------------------------------------------------------------------

const SCREEN_SIZE = 480;

// Fit the fixed 480px screen inside the TV glass (#screen), not the window:
// the glass is narrower than the window on desktop and shares the phone
// screen with the remote.
function applyScale(): void {
  const { clientWidth, clientHeight } = screenHost;
  if (clientWidth === 0 || clientHeight === 0) return;
  const scale = Math.min(clientWidth, clientHeight) / SCREEN_SIZE;
  mounted.screen.style.transform = `scale(${scale})`;
  mounted.screen.style.transformOrigin = 'top center';
}

new ResizeObserver(applyScale).observe(screenHost);
applyScale();

// ---------------------------------------------------------------------------
// Nav state initialisation
// ---------------------------------------------------------------------------

let nav: NavState = {
  keypad:  initialKeypadState(),
  router:  initialRouterState(START_PAGE),
  history: initialHistoryState(START_PAGE),
  fastext: initialFastextState(),
};

// ---------------------------------------------------------------------------
// Timer handles (owned exclusively by main.ts)
// ---------------------------------------------------------------------------

let keypadTimeoutId: number | null = null;
let cycleIntervalId: number | null = null;

// ---------------------------------------------------------------------------
// Nav event types
// ---------------------------------------------------------------------------

type NavEvent =
  | { type: 'digit';          digit: string }
  | { type: 'keypadTimeout' }
  | { type: 'keypadReset' }
  | { type: 'navigate';       page: number }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'fastext';        colour: FastextColour }
  | { type: 'subpageAdvance' };

// ---------------------------------------------------------------------------
// loadPage: render a page number, update timers and history
// ---------------------------------------------------------------------------

function loadPage(pageNumber: number, addToHistory: boolean): void {
  const result = navigateTo(nav.router, registry, pageNumber);

  nav = { ...nav, router: result.state };

  // History: suppress sentinel (not-found) pages.
  if (addToHistory && result.state.currentPage !== 0) {
    nav = { ...nav, history: historyPush(nav.history, result.state.currentPage) };
  }

  // Cycling timer.
  if (result.stopCycling && cycleIntervalId !== null) {
    clearInterval(cycleIntervalId);
    cycleIntervalId = null;
  }
  if (result.startCycling) {
    cycleIntervalId = setInterval(() => dispatch({ type: 'subpageAdvance' }), 8000);
  }

  renderPage(mounted, result.page);
}

// ---------------------------------------------------------------------------
// applyNavEvent: pure nav logic, returns updated state + intent
// ---------------------------------------------------------------------------

interface NavEventResult {
  readonly state:          NavState;
  readonly navigate:       number | null;
  readonly keypadDisplay:  string | null;
  readonly scheduleTimeout: boolean;
  readonly cancelTimeout:   boolean;
}

function applyNavEvent(state: NavState, event: NavEvent): NavEventResult {
  let navigate: number | null = null;
  let keypadDisplay: string | null = null;
  let scheduleTimeout = false;
  let cancelTimeout = false;
  let next = state;

  switch (event.type) {

    case 'digit': {
      const kResult = appendDigit(state.keypad, event.digit);
      scheduleTimeout = kResult.scheduleTimeout;
      cancelTimeout   = kResult.cancelTimeout;
      navigate        = kResult.navigate !== null ? parseInt(kResult.navigate, 10) : null;
      keypadDisplay   = kResult.navigate !== null ? '' : kResult.state.buffer;
      next = { ...next, keypad: kResult.state };
      break;
    }

    case 'keypadTimeout': {
      const kResult = timeoutExpired(state.keypad);
      keypadDisplay = '';
      next = { ...next, keypad: kResult.state };
      break;
    }

    case 'keypadReset': {
      const kResult = resetKeypad(state.keypad);
      cancelTimeout = kResult.cancelTimeout;
      keypadDisplay = '';
      next = { ...next, keypad: kResult.state };
      break;
    }

    case 'navigate': {
      navigate = event.page;
      break;
    }

    case 'back': {
      const hResult = historyBack(state.history);
      next = { ...next, history: hResult.state };
      if (hResult.page !== null) navigate = hResult.page;
      break;
    }

    case 'forward': {
      const hResult = historyForward(state.history);
      next = { ...next, history: hResult.state };
      if (hResult.page !== null) navigate = hResult.page;
      break;
    }

    case 'fastext': {
      const page = activateSlot(state.fastext, event.colour);
      if (page !== null) navigate = page;
      break;
    }

    case 'subpageAdvance': {
      const rResult = advance(state.router, registry);
      next = { ...next, router: rResult.state };
      renderPage(mounted, rResult.page);
      break;
    }
  }

  return { state: next, navigate, keypadDisplay, scheduleTimeout, cancelTimeout };
}

// ---------------------------------------------------------------------------
// dispatch: apply event, manage timers, trigger page load
// ---------------------------------------------------------------------------

function dispatch(event: NavEvent): void {
  const result = applyNavEvent(nav, event);
  nav = result.state;

  // Keypad timer management.
  if (result.cancelTimeout && keypadTimeoutId !== null) {
    clearTimeout(keypadTimeoutId);
    keypadTimeoutId = null;
  }
  if (result.scheduleTimeout) {
    // Store the new id in keypad state so applyNavEvent can read it on the
    // next event (determines whether a cancel is needed).
    keypadTimeoutId = setTimeout(() => dispatch({ type: 'keypadTimeout' }), 2000);
    nav = { ...nav, keypad: { ...nav.keypad, timeoutId: keypadTimeoutId } };
  }

  // On-screen keypad buffer display (optional element).
  if (result.keypadDisplay !== null) {
    updateKeypadDisplay(result.keypadDisplay);
  }

  // Navigation: history recording is done inside loadPage for direct
  // navigations from keypad/fastext/links; back/forward skip re-push.
  if (result.navigate !== null) {
    const addToHistory = event.type !== 'back' && event.type !== 'forward';
    loadPage(result.navigate, addToHistory);
  }
}

// ---------------------------------------------------------------------------
// Keypad display (cosmetic — no DOM element required)
// ---------------------------------------------------------------------------

function updateKeypadDisplay(buffer: string): void {
  // If the HTML ever gains a dedicated display element, update it here.
  // For now this is a no-op; the buffer is visible only via ARIA or console.
  void buffer;
}

// ---------------------------------------------------------------------------
// Keyboard events
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key >= '0' && e.key <= '9') {
    dispatch({ type: 'digit', digit: e.key });
  } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
    dispatch({ type: 'back' });
  } else if (e.key === 'ArrowRight') {
    dispatch({ type: 'forward' });
  } else if (e.key === 'Escape') {
    dispatch({ type: 'keypadReset' });
  } else if (e.key === 'F1' || e.key === 'r') {
    dispatch({ type: 'fastext', colour: 'Red' });
  } else if (e.key === 'F2' || e.key === 'g') {
    dispatch({ type: 'fastext', colour: 'Green' });
  } else if (e.key === 'F3' || e.key === 'y') {
    dispatch({ type: 'fastext', colour: 'Yellow' });
  } else if (e.key === 'F4' || e.key === 'c') {
    dispatch({ type: 'fastext', colour: 'Cyan' });
  }
});

// ---------------------------------------------------------------------------
// On-screen remote buttons
// ---------------------------------------------------------------------------

document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const btn = target.closest<HTMLElement>('[data-key],[data-nav],[data-fastext]');
  if (btn === null) return;

  const key     = btn.dataset['key'];
  const nav_    = btn.dataset['nav'];
  const fastext = btn.dataset['fastext'];

  if (key !== undefined) {
    dispatch({ type: 'digit', digit: key });
  } else if (nav_ === 'prev') {
    dispatch({ type: 'back' });
  } else if (nav_ === 'next') {
    dispatch({ type: 'forward' });
  } else if (fastext === 'red') {
    dispatch({ type: 'fastext', colour: 'Red' });
  } else if (fastext === 'green') {
    dispatch({ type: 'fastext', colour: 'Green' });
  } else if (fastext === 'yellow') {
    dispatch({ type: 'fastext', colour: 'Yellow' });
  } else if (fastext === 'cyan') {
    dispatch({ type: 'fastext', colour: 'Cyan' });
  }
});

// ---------------------------------------------------------------------------
// Clock: once-a-second, independent of nav events
// ---------------------------------------------------------------------------

setInterval(() => {
  domUpdateClock(mounted, new Date());
}, 1000);

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

loadPage(START_PAGE, false);
