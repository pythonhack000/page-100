# Page 100

Teletext, resurrected. A 40 x 24 screen of coloured blocks in your browser, with live news, weather and exchange rates. Each page is about 1 KB, so it loads on a 2G connection or a phone on its last megabytes.

Type a three-digit page number like on an old TV remote. Use the coloured Fastext buttons to jump between sections, and the arrow keys to flip pages.

> Kiroween 2026 entry. Work in progress.

## Pages

| Page | What's on it |
|------|--------------|
| 100 | Index |
| 101-109 | News headlines |
| 400 | Weather |
| 500 | Exchange rates (includes TJS) |
| 666 | Do not tune in after midnight |
| 888 | About, plus the page weight counter |

## How it works

- **Renderer.** Pure TypeScript in `src/renderer/`: a 40 x 24 cell grid with the eight teletext colours, double-height rows and 2 x 3 mosaic block graphics. Every page also renders as plain text for screen readers.
- **Data.** A scheduled GitHub Action fetches keyless public feeds every 30 minutes and writes one JSON file per page into `public/data/`. Each file is capped at 2 KB.
- **Hosting.** A static site on GitHub Pages. There's no server, no API keys, no trackers and no ads.

## Run it

```sh
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run build   # production build into dist/
```

## Built with Kiro

The `.kiro/` directory holds the project's steering files (product, tech, structure, teletext rules) and one spec per feature (requirements, design, tasks). Kiro wrote the specs and the feature code from them. Claude Code was used alongside it for review, test fixes and build tooling.

## Licence

MIT. See [LICENSE](LICENSE).
