# Tech Stack: Page 100

## Language and tooling

- TypeScript 5, `strict: true`. No `any`, no type assertions without a comment.
- Vite for dev server and production build. Output is a static site (plain HTML, JS, CSS).
- Vitest for unit tests. Pure functions for rendering and layout must be tested; no DOM tests for core logic.
- No UI framework. No React, Vue, Svelte, or similar.

## Hosting

- GitHub Pages. The repo serves everything under `docs/` (or the configured Pages root) as static files.
- No server, no edge functions, no API proxy.

## Data pipeline

- A GitHub Actions workflow runs on a schedule (`*/30 * * * *`, every 30 minutes).
- Each job fetches one or more public feeds and writes a single JSON file per page into `public/data/`.
- JSON files are committed back to the repo (or uploaded as artifacts and deployed directly).
- Every JSON file must stay under 2 KB. The workflow fails if any file exceeds that limit.
- No secrets or API keys. All sources are keyless and public.

## Data sources

| Page | Source | Notes |
|------|--------|-------|
| 101–109 | Public RSS feeds (BBC World, Reuters, etc.) | Parse with a lightweight XML parser; keep only headline + summary |
| 400 | [Open-Meteo](https://open-meteo.com/) | Free, no key; query by latitude/longitude |
| 500 | [open.er-api.com](https://www.exchangerate-api.com/docs/free) | Free tier, no key; includes TJS |

## File layout

```
src/
  renderer/   # grid, colours, double-height, mosaic — pure TS, fully tested
  nav/        # page routing, fastext, keypad — pure TS, fully tested
  pages/      # one module per page, assembles TeletextPage from JSON data
  main.ts     # entry point, wires DOM to renderer and nav
public/
  data/       # one JSON file per page, written by the data build
.github/
  workflows/
    data-build.yml   # scheduled fetch + JSON write
    deploy.yml       # Vite build + GitHub Pages deploy
```

## Constraints

- MIT licence.
- No third-party trademarks in source, assets, or strings.
- Every page must render as plain text for screen readers alongside the grid view.
- Hooks: run Vitest on save of `src/**/*.ts`; assert JSON sizes after the data build.
