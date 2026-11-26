# Product: Page 100

## What it is

Page 100 is a browser-based teletext service. It renders a 40×24 character grid in the 8 classic teletext colours, with double-height headlines, mosaic block graphics (2×3 sixels per cell), and a header row showing page number, service name, and a live clock — the same layout Ceefax used.

Data is built ahead of time. A GitHub Action fetches public feeds every 30 minutes and writes one small JSON file per page. The site is served as static files on GitHub Pages with no server, no API keys, and no backend.

## Who it is for

- People on slow or metered connections (2G, rural, low-data) who want today's news, weather, and exchange rates in one screen.
- Anyone who remembers typing a page number on a TV remote.

## Page map

| Page | Content |
|------|---------|
| 100 | Index |
| 101–109 | News headlines (public RSS feeds, subpages rotate 1/3, 2/3…) |
| 400 | Weather for a chosen city (Open-Meteo, no API key) |
| 500 | Exchange rates (open.er-api.com, includes TJS) |
| 666 | Haunted page — glitch effects, rolling bars, ghost frames, hidden easter egg |
| 888 | About + page weight counter proving each JSON stays under 2 KB |

## Navigation

Three ways to move between pages, mirroring a physical remote:

- Type a three-digit page number directly.
- Fastext colour links (red / green / yellow / cyan) at the bottom of each page.
- Arrow keys for next / previous page.
- On-screen keypad for touchscreens.

## What it is not

- Not a framework-based app. Plain TypeScript and Vite only; no React, Vue, or similar.
- Not server-dependent. No backend, no API keys stored anywhere, no runtime compute.
- Not heavy. Each page JSON is under 2 KB. No images, no trackers, no ads.
- Not branded with third-party marks. No "Ceefax", no BBC logos, no channel names.
- Not inaccessible. Every page renders as plain text for screen readers alongside the grid view.
