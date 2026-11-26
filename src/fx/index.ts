/**
 * src/fx/index.ts
 *
 * Presentation effects around the teletext screen. Listeners register
 * first, then crt.ts starts observing the screen and emitting tv:* events.
 */

import './sound.ts';
import './haunt.ts';
import './crt.ts';
