# Requirements: Navigation

Feature scope: `src/nav/` — digit accumulator (keypad), page router, browsing history, and Fastext link slots. No DOM, no rendering, no data fetching.

---

## 1. Digit Accumulator (Keypad)

**US-01** — As a viewer, I need to type a three-digit page number so I can jump directly to any page.

- WHEN a digit (0–9) is entered, THE SYSTEM SHALL append it to an internal buffer of up to three digits.
- WHEN the buffer reaches three digits, THE SYSTEM SHALL fire a navigation event carrying the accumulated three-digit number as a string, then clear the buffer.
- WHEN a digit is entered and the buffer already holds three digits, THE SYSTEM SHALL discard the existing buffer, start a new buffer with the incoming digit, and restart the timeout.
- WHEN a digit is entered and no further digit follows within 2 000 milliseconds, THE SYSTEM SHALL clear the buffer and fire no navigation event.
- WHEN a non-digit value is supplied to the accumulator, THE SYSTEM SHALL ignore it and leave the buffer unchanged.
- WHEN the buffer is cleared (by timeout or by a completed three-digit entry), THE SYSTEM SHALL reset the timeout.
- WHEN `reset()` is called explicitly, THE SYSTEM SHALL clear the buffer and cancel any pending timeout without firing a navigation event.
- THE SYSTEM SHALL expose the current buffer contents at any time so an on-screen keypad can display the digits entered so far.

---

## 2. Router

**US-02** — As the navigation layer, I need a router that maps three-digit page numbers to page modules so the display can load any valid page.

- WHEN a three-digit page number in the range 100–899 is requested, THE SYSTEM SHALL return the corresponding page module.
- WHEN a page number outside the range 100–899 is requested, THE SYSTEM SHALL return the page-not-found fallback module rather than throwing.
- WHEN a page number is requested that is within the valid range but has no registered module, THE SYSTEM SHALL return the page-not-found fallback module.
- WHEN a page with subpages is loaded, THE SYSTEM SHALL start at subpage index 1 and advance through the subpages in sequence on each call to `advance()`.
- WHEN the last subpage of a page is active and `advance()` is called, THE SYSTEM SHALL wrap back to subpage 1.
- WHEN a page number is navigated to directly (via digit entry or Fastext link), THE SYSTEM SHALL reset the subpage index for that page to 1.
- WHEN subpage cycling is active, THE SYSTEM SHALL advance the subpage index on a fixed interval of 8 000 milliseconds.
- WHEN `stopCycling()` is called, THE SYSTEM SHALL cancel any pending interval without changing the current subpage index.
- WHEN the subpage count for a page is 1, THE SYSTEM SHALL not start the cycling interval.
- WHEN a page module is registered, THE SYSTEM SHALL accept a subpage count of 1 or greater; a count less than 1 SHALL throw a range error.
- WHEN the router is queried for the current subpage notation, THE SYSTEM SHALL return an `n/N` string (e.g. `"2/3"`) where `n` is the current subpage index and `N` is the total subpage count; for a single-subpage page it SHALL return `"1/1"`.

---

## 3. History Stack

**US-03** — As a viewer, I need previous/next navigation so I can retrace the pages I have visited using the arrow keys.

- WHEN a page is navigated to, THE SYSTEM SHALL push the page number onto the back stack and clear the forward stack.
- WHEN the back stack has more than one entry and `back()` is called, THE SYSTEM SHALL pop the current page number onto the forward stack, pop the previous page number off the back stack, and return the previous page number.
- WHEN `back()` is called and the back stack has only one entry (the current page), THE SYSTEM SHALL return `null` and leave both stacks unchanged.
- WHEN the forward stack is non-empty and `forward()` is called, THE SYSTEM SHALL pop the top of the forward stack, push it onto the back stack, and return that page number.
- WHEN `forward()` is called and the forward stack is empty, THE SYSTEM SHALL return `null` and leave both stacks unchanged.
- WHEN a new page is navigated to while the forward stack is non-empty, THE SYSTEM SHALL discard the entire forward stack before pushing the new page number.
- WHEN the history is inspected, THE SYSTEM SHALL expose the current page number as the top of the back stack without consuming it.
- WHEN `clear()` is called, THE SYSTEM SHALL empty both stacks without firing any navigation event.
- THE SYSTEM SHALL place no upper bound on the depth of either stack within the limits of available memory.

---

## 4. Fastext Link Slots

**US-04** — As a page author, I need four colour-coded Fastext link slots so viewers can navigate to related pages with a single keypress.

- WHEN a Fastext descriptor is created for a page, THE SYSTEM SHALL accept exactly four slots corresponding to the colours Red, Green, Yellow, and Cyan, in that order.
- WHEN a slot is assigned a link, THE SYSTEM SHALL accept a target page number in the range 100–899 and an optional label of at most 6 characters.
- WHEN a label is supplied that is shorter than 6 characters, THE SYSTEM SHALL pad it with trailing spaces to exactly 6 characters.
- WHEN a label is supplied that is longer than 6 characters, THE SYSTEM SHALL throw a range error and leave the slot unchanged.
- WHEN a slot has no link assigned, THE SYSTEM SHALL represent it as empty; querying an empty slot SHALL return `null`.
- WHEN the Fastext bar layout is requested, THE SYSTEM SHALL return four slot descriptors each containing: the colour, a leading space, the three-digit target page number, and the 6-character label — 10 characters in total per slot.
- WHEN a slot is empty and the Fastext bar layout is requested, THE SYSTEM SHALL return 10 spaces for that slot with a Black foreground, as specified in `teletext.md`.
- WHEN the target page number for a slot is activated (e.g. by pressing the corresponding colour key), THE SYSTEM SHALL emit a navigation event carrying that page number; the router treats this the same as a direct digit entry.
- WHEN a target page number outside 100–899 is assigned to a slot, THE SYSTEM SHALL throw a range error and leave the slot unchanged.
- WHEN `clearSlot(colour)` is called, THE SYSTEM SHALL remove the link from that slot and reset it to empty.
- WHEN `clearAll()` is called, THE SYSTEM SHALL reset all four slots to empty.
