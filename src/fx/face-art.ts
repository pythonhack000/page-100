/**
 * src/fx/face-art.ts
 *
 * The face behind page 666, drawn in teletext blocks: gaunt, hollow-eyed,
 * and grinning a little wider every time the signal drops. Pure data, so
 * it can be tested without a DOM.
 *
 * # is a lit block, o a dim one (shadow), . is dark. The eye sockets are
 * left empty: the pupils are separate elements that follow the pointer.
 */

const TOP = [
  '............########............',
  '..........############..........',
  '........################........',
  '.......##################.......',
  '......####################......',
  '.....######################.....',
  '.....######################.....',
  '....##oooooo########oooooo##....',
  '....#oo....oo######oo....oo#....',
  '....#o......o######o......o#....',
  '....#o......o######o......o#....',
  '....#o......o######o......o#....',
  '....#oo....oo######oo....oo#....',
  '....##oooooo###oo###oooooo##....',
  '.....#ooo######oo######ooo#.....',
  '.....#oo######o..o######oo#.....',
  '......oo#####o....o#####oo......',
  '......oo################oo......',
  '.......o################o.......',
] as const;

const BOTTOM = [
  '.........##############.........',
  '..........############..........',
  '...........##########...........',
  '.............######.............',
  '..............####..............',
] as const;

/** The mouth, from a thin smile to a grin that splits the face. */
const MOUTHS = [
  [
    '.......o#####.####.#####o.......',
    '........#####.#.#..#####........',
    '........######....######........',
    '.........######.#######.........',
  ],
  [
    '.......o###.########.###o.......',
    '........###.#.#.#.#..###........',
    '........####........####........',
    '.........####.#.#.#####.........',
  ],
  [
    '.......o#.############.#o.......',
    '........#.#.#.#.#.#.#..#........',
    '........##............##........',
    '.........##.#.#.#.#.###.........',
  ],
  [
    '........################........',
    '........#.#.#.#.#.#.#.#.........',
    '................................',
    '..........#.#.#.#.#.#.#.........',
  ],
] as const;

export const FACE_FRAMES: readonly (readonly string[])[] = MOUTHS.map((mouth) => [...TOP, ...mouth, ...BOTTOM]);
export const FACE_COLUMNS = 32;
export const FACE_ROWS = 28;
/** Rows that change between frames. */
export const MOUTH_ROWS: readonly number[] = MOUTHS[0].map((_, index) => TOP.length + index);
/** Centre of each eye socket, in block units. */
export const SOCKETS = [
  { x: 9, y: 10.5 },
  { x: 23, y: 10.5 },
] as const;
