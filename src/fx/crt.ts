/**
 * src/fx/crt.ts
 *
 * Presentation layer only: CRT power-on, channel-change static and the
 * ambient room light. It observes the DOM that the renderer produces and
 * never touches renderer or navigation state.
 */

const PALETTE: Readonly<Record<string, readonly [number, number, number]>> = {
  'tt-black': [0, 0, 0],
  'tt-red': [255, 0, 0],
  'tt-green': [0, 255, 0],
  'tt-yellow': [255, 255, 0],
  'tt-blue': [0, 0, 255],
  'tt-magenta': [255, 0, 255],
  'tt-cyan': [0, 255, 255],
  'tt-white': [255, 255, 255],
};

/** Weight of a filled background cell relative to one glyph. */
const BG_CELL_WEIGHT = 6;
/** Weight of one lit sixel relative to one glyph. */
const SIXEL_WEIGHT = 0.5;
/** How long the static burst shows on a page change, in ms. */
const STATIC_MS = 170;
/** Ignore DOM changes for this long after a burst, so one page = one burst. */
const SETTLE_MS = 250;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function paletteKey(value: string): string | null {
  const match = /--(tt-[a-z]+)/.exec(value);
  return match?.[1] ?? null;
}

function addColour(
  acc: { r: number; g: number; b: number; w: number },
  key: string | null,
  weight: number,
): void {
  if (key === null || key === 'tt-black' || weight <= 0) return;
  const rgb = PALETTE[key];
  if (rgb === undefined) return;
  acc.r += rgb[0] * weight;
  acc.g += rgb[1] * weight;
  acc.b += rgb[2] * weight;
  acc.w += weight;
}

/** Average colour of everything lit on screen, header row excluded. */
function measureAmbient(screen: HTMLElement): [number, number, number] | null {
  const acc = { r: 0, g: 0, b: 0, w: 0 };
  const rows = screen.querySelectorAll<HTMLElement>('.tt-row:not([data-row="0"])');
  for (const row of Array.from(rows)) {
    for (const cell of Array.from(row.children)) {
      if (!(cell instanceof HTMLElement)) continue;
      if (cell.classList.contains('tt-mosaic')) {
        const lit = cell.querySelectorAll('.tt-six--on').length;
        addColour(acc, paletteKey(cell.style.getPropertyValue('--tt-fg')), lit * SIXEL_WEIGHT);
        addColour(acc, paletteKey(cell.style.getPropertyValue('--tt-bg')), BG_CELL_WEIGHT);
        continue;
      }
      const hasGlyph = (cell.textContent ?? '').trim().length > 0;
      addColour(acc, paletteKey(cell.style.color), hasGlyph ? 1 : 0);
      addColour(acc, paletteKey(cell.style.backgroundColor), BG_CELL_WEIGHT);
    }
  }
  if (acc.w === 0) return null;
  return [acc.r / acc.w, acc.g / acc.w, acc.b / acc.w];
}

function applyAmbient(screen: HTMLElement): void {
  const rgb = measureAmbient(screen);
  const [r, g, b] = rgb ?? [90, 110, 140];
  document.documentElement.style.setProperty(
    '--ambient',
    `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`,
  );
}

/** Paints one frame of analogue snow into the canvas. */
function paintStatic(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const { width, height } = canvas;
  const frame = ctx.createImageData(width, height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(frame, 0, 0);
}

function burstStatic(glass: HTMLElement, canvas: HTMLCanvasElement): void {
  if (reducedMotion.matches) return;
  glass.classList.add('is-tuning');
  const started = performance.now();
  const tick = (now: number): void => {
    paintStatic(canvas);
    if (now - started < STATIC_MS) {
      requestAnimationFrame(tick);
    } else {
      glass.classList.remove('is-tuning');
    }
  };
  requestAnimationFrame(tick);
}

/** Page number shown in the header ("P123"), or null while digits are typed. */
export function readPageNumber(screen: HTMLElement): number | null {
  const header = screen.querySelector('[data-row="0"]');
  if (header === null) return null;
  const text = Array.from(header.children)
    .slice(0, 4)
    .map((cell) => cell.textContent ?? '')
    .join('');
  const match = /^P(\d{3})$/.exec(text);
  return match?.[1] === undefined ? null : Number(match[1]);
}

/** Details sent with the `tv:tune` and `tv:settled` window events. */
export interface TuneDetail {
  readonly page: number | null;
  /** A frozen copy of the picture that was on screen before this change. */
  readonly previous: HTMLElement | null;
}

function emit(name: 'tv:tune' | 'tv:settled', detail: TuneDetail): void {
  window.dispatchEvent(new CustomEvent<TuneDetail>(name, { detail }));
}

function snapshot(screen: HTMLElement): HTMLElement | null {
  const picture = screen.querySelector<HTMLElement>('.tt-screen');
  if (picture === null) return null;
  const copy = picture.cloneNode(true) as HTMLElement;
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}

function isHeaderMutation(record: MutationRecord): boolean {
  const node = record.target instanceof Element ? record.target : record.target.parentElement;
  return node?.closest('[data-row="0"]') != null;
}

function start(): void {
  const screen = document.getElementById('screen');
  const glass = document.querySelector<HTMLElement>('.tv__glass');
  const canvas = document.querySelector<HTMLCanvasElement>('.tv__static');
  if (screen === null || glass === null || canvas === null) {
    console.warn('[fx] TV markup missing; effects disabled.');
    return;
  }

  let settling = false;
  let lastPicture: HTMLElement | null = null;
  const onPageChange = (): void => {
    if (settling) return;
    settling = true;
    emit('tv:tune', { page: readPageNumber(screen), previous: lastPicture });
    burstStatic(glass, canvas);
    window.setTimeout(() => {
      applyAmbient(screen);
      lastPicture = snapshot(screen);
      emit('tv:settled', { page: readPageNumber(screen), previous: lastPicture });
      settling = false;
    }, SETTLE_MS);
  };

  const observer = new MutationObserver((records) => {
    if (records.some((record) => !isHeaderMutation(record))) onPageChange();
  });
  observer.observe(screen, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  // First paint: the set warms up, then the room catches the light.
  window.setTimeout(() => {
    applyAmbient(screen);
    lastPicture = snapshot(screen);
    emit('tv:settled', { page: readPageNumber(screen), previous: lastPicture });
  }, SETTLE_MS);
  document.documentElement.classList.add('is-powered');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
