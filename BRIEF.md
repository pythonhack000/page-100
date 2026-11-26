# Page 100: teletext, resurrected

Kiroween 2026 entry, category **Resurrection**. Deadline: Dec 4, 2026, 2:00 PM PT.

## The idea
Teletext (Ceefax, Oracle, Videotext) put news, weather, sport and TV listings on numbered pages of 40 x 24 coloured block characters. It died with analogue TV. Page 100 brings it back as a web app with live data.

It is not only nostalgia. A teletext page is about 1 KB of text, so Page 100 loads on the slowest, most expensive mobile connections: 2G, rural Central Asia, a phone on its last megabytes. One screen, no images, no trackers, no ads. You type a three-digit page number like you did on the remote.

## Who it is for
- People on slow or metered connections who want today's news, weather and exchange rates in one glance.
- Everyone who remembers flicking to page 100 on the TV.

## Must have
- A 40 x 24 teletext screen rendered in the browser: the 8 teletext colours, double-height headlines, mosaic block graphics (2 x 3 sixels per cell), a header row with page number, service name and a live clock.
- Navigation like a remote: type three digits, Fastext coloured links (red / green / yellow / cyan) at the bottom, arrow keys for next / previous page, on-screen keypad on phones.
- Pages: 100 index, 101-109 news headlines (from public RSS feeds), 400 weather for a chosen city (Open-Meteo, no API key), 500 exchange rates (open.er-api.com, includes TJS), 888 about. Subpages rotate (1/3, 2/3...) like real teletext.
- Data is built ahead of time: a scheduled GitHub Action fetches feeds every 30 minutes and writes one small JSON file per page. The site itself is static (GitHub Pages). No server, no keys.
- Each page JSON stays under 2 KB. A "page weight" counter on page 888 proves it.
- The Halloween part: page 666 is the ghost of the broadcast, a haunted page that glitches, scrolls a "last transmission" and hides an easter egg. Signal noise, rolling bars and ghost frames between page changes are part of the look, not decoration on top.

## Constraints
- Plain TypeScript, Vite, no UI framework. Pure functions for layout and rendering so they can be unit tested with Vitest.
- Accessible: every page also exists as plain text for screen readers.
- MIT licence. Open source on GitHub.
- No third-party trademarks in names or art: no "Ceefax", no BBC, no channel logos.

## Kiro usage (judged)
- Steering files for product, tech stack and the teletext rules (grid size, colours, control codes).
- One spec per feature: renderer, navigation, data pipeline, haunted page.
- Hooks: run tests on save of src files; check page JSON size after the data build.
