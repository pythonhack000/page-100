/**
 * src/fx/cues.ts
 *
 * Named moments in the page-666 sequence. The director fires them; the
 * sound modules listen. Keeping the names in one union stops typos.
 */

export type CueName =
  | 'mutate-tick' // one letter of the page changed under the viewer's eyes
  | 'dead-air' // the picture dies, the hum stops
  | 'presence' // the face starts to come through
  | 'flash' // a subliminal line flickers up in the dark
  | 'stare' // silence: it stops, and looks straight at the viewer
  | 'scream' // the jaw drops and the face lunges
  | 'release'; // the set lets go and the page comes back

/** How long the face stares before it screams; the sound times its breath to it. */
export const STARE_MS = 1300;

export function cue(name: CueName): void {
  window.dispatchEvent(new CustomEvent<CueName>('tv:cue', { detail: name }));
}

export function onCue(handler: (name: CueName) => void): void {
  window.addEventListener('tv:cue', (event) => handler((event as CustomEvent<CueName>).detail));
}
