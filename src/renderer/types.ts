/**
 * Core data model for the teletext renderer.
 * Pure types only — no DOM access, no side effects.
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The eight permitted teletext colours. No other values are valid. */
export type TeletextColour =
  | 'Black'
  | 'Red'
  | 'Green'
  | 'Yellow'
  | 'Blue'
  | 'Magenta'
  | 'Cyan'
  | 'White';

// ---------------------------------------------------------------------------
// Cell attributes
// ---------------------------------------------------------------------------

/** Per-cell rendering attributes. Default value for every field is `false`. */
export interface CellAttributes {
  /** This cell is the top half of a double-height pair. */
  doubleHeight: boolean;
  /** This cell is the bottom half of a double-height pair; the renderer copies style from the top half and skips its own text. */
  doubleHeightBottom: boolean;
  /** This cell holds a mosaic block graphic rather than a text character. */
  mosaic: boolean;
  /** This cell is concealed; content is hidden by matching foreground to background. */
  concealed: boolean;
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

/** A cell that holds a single Unicode code point. */
export interface TextCell {
  kind: 'text';
  /** A single Unicode code point. Default: U+0020 (space). */
  char: string;
  /** Foreground colour. Default: `'White'`. */
  fg: TeletextColour;
  /** Background colour. Default: `'Black'`. */
  bg: TeletextColour;
  attrs: CellAttributes;
}

/**
 * A cell that holds a 2×3 mosaic block graphic.
 *
 * Bit layout of `sixels` (integer 0–63):
 * ```
 * bit 0 → top-left      bit 1 → top-right
 * bit 2 → middle-left   bit 3 → middle-right
 * bit 4 → bottom-left   bit 5 → bottom-right
 * ```
 * A set bit means the sixel is filled (foreground colour); clear means background.
 */
export interface MosaicCell {
  kind: 'mosaic';
  /** Integer in the range 0–63. Validated by `mosaic.ts`. */
  sixels: number;
  /** Foreground colour. Default: `'White'`. */
  fg: TeletextColour;
  /** Background colour. Default: `'Black'`. */
  bg: TeletextColour;
  attrs: CellAttributes;
}

/** Discriminated union of the two cell kinds. */
export type Cell = TextCell | MosaicCell;

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

/**
 * A flat array of exactly 960 cells representing the 40×24 character grid.
 * Index formula: `row * 40 + col`.
 * Row indices: 0–23. Column indices: 0–39.
 */
export type Grid = Cell[];

// ---------------------------------------------------------------------------
// Page descriptors
// ---------------------------------------------------------------------------

/** Describes the fixed header fields for row 0. */
export interface HeaderDescriptor {
  /** Valid range: 100–899. */
  pageNumber: number;
  /** Truncated or padded to exactly 24 characters by `layout.ts`. */
  serviceName: string;
}

/** A single Fastext colour-link slot. */
export interface FastextLink {
  /** Valid range: 100–899. */
  page: number;
  /** Padded or truncated to fit the 10-character slot. */
  label: string;
}

/** Describes the four Fastext link slots for row 23. */
export interface FastextDescriptor {
  red?: FastextLink;
  green?: FastextLink;
  yellow?: FastextLink;
  cyan?: FastextLink;
}

// ---------------------------------------------------------------------------
// Row spec
// ---------------------------------------------------------------------------

/**
 * Author-facing description of a single content row (rows 1–22).
 * `composePage` maps each `RowSpec` onto the grid in order.
 */
export interface RowSpec {
  /**
   * Up to 40 partial cell descriptors.
   * Missing fields fall back to defaults; rows shorter than 40 are right-padded
   * with default cells.
   */
  cells: Array<Partial<TextCell> | Partial<MosaicCell>>;
  /**
   * When `true`, `applyDoubleHeight` is called for this row, which consumes
   * the next content slot for the bottom half.
   */
  doubleHeight?: boolean;
}

// ---------------------------------------------------------------------------
// Page output
// ---------------------------------------------------------------------------

/**
 * The complete, rendered state of a teletext page.
 * Returned by `composePage` and consumed by the DOM renderer.
 */
export interface TeletextPage {
  /** Fully populated 960-cell grid. */
  grid: Grid;
  /**
   * 24 plain-text lines, one per row.
   * Mosaic cells are replaced with a space.
   * Double-height bottom-half rows are an empty string.
   * Trailing spaces are trimmed from each line.
   */
  plainText: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the structure of a page or grid operation is invalid —
 * for example, more than 22 content rows, or a double-height row that would
 * overwrite non-default content.
 *
 * Distinct from `TypeError` (bad colour or sixel value) and `RangeError`
 * (out-of-bounds grid index).
 */
export class StructureError extends Error {
  override readonly name = 'StructureError';

  constructor(message: string) {
    super(message);
    // Restore the prototype chain so `instanceof StructureError` works after
    // transpilation to ES5/CommonJS.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
