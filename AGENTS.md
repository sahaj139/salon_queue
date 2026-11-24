# AGENTS.md — Salon Queue Management

Queue app for a salon: customers join from their phone, see wait time, get called;
reception and barbers manage the queue; TV display shows who's next.

## Read first
- docs/01-brief.md → features + what NOT to build
- docs/02-screens.md → every screen's layout and behaviour
- docs/03-flows-rules.md → flows, queue rules, test checklist

## Stack
React + Vite + Tailwind CSS v4, React Router. Tiny Node/Express server for shared state.
- `npm run dev` → app + API on http://localhost:5173 (API mounted inside Vite)
- `npm run build && npm start` → production server on $PORT (default 3000)
- `npm test` → unit rules check + Playwright end-to-end checklist

Storage: in-memory state on the server, polled every 1.5 s by every screen. Simplest thing
that keeps phone, tablet and TV in sync across devices (localStorage can't cross devices).
Hosting: Render (one Web Service serves API + built frontend, see render.yaml).
Live link must be the first line after the title in README.md.

## How to work
- One screen or one feature per task. Don't touch other screens.
- Theme: charcoal (#1F2937) + gold (#D4A017); rounded cards; tap targets ≥ 44 px.
- All labels via `src/i18n.js` (EN/GU); no hard-coded text.
- Queue rules live in ONE place: `shared/queue.js`. Server and screens reuse it.
- Never add features from the 'Don't build' list.
- After each task: list changed files and how to test the change; run `npm test`.
