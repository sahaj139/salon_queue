# Salon Queue Management System

**Live demo:** https://salon-queue-yourname.onrender.com  ← replace with your Render URL after deploying
**Hosted on:** Render (one Web Service: Node/Express API + built React frontend)
**Staff PIN (Reception / Barber / Owner screens):** `1234`

## About
Customers join the salon queue from their phone, see their position and estimated wait, and
get a full-screen "It's your turn!" when called. Reception runs the queue on a tablet, barbers
use a phone screen, and a TV in the waiting area shows who's in which chair and who's next.
English / Gujarati on every screen.

| Screen | URL | Device |
|---|---|---|
| Home | `/` | phone |
| Join Queue | `/join` | phone |
| My Status | `/status/:id` | phone |
| Reception Dashboard | `/reception` | tablet (PIN) |
| Barber View | `/barber/ravi`, `/barber/amit`, `/barber/imran` | phone (PIN) |
| Waiting Area TV | `/display` | TV |
| Owner Settings | `/admin` | tablet (PIN) |

The server starts with 8 demo customers. Owner Settings → *Demo tools* can reload or clear them.

## Docs (read these first)
- [AGENTS.md](AGENTS.md) — instructions for the coding agent
- [docs/01-brief.md](docs/01-brief.md) — problem, users, must-haves, don't-build list
- [docs/02-screens.md](docs/02-screens.md) — every screen, element and button
- [docs/03-flows-rules.md](docs/03-flows-rules.md) — flows, queue rules, test checklist
- [prompts.md](prompts.md) — every prompt used, in order
- [reflection.md](reflection.md) — what the agent got wrong and how it was fixed

## Run locally
```bash
npm install
npm run dev          # http://localhost:5173 (API runs inside the Vite dev server)
# open it on your phone: http://<your-laptop-ip>:5173
```
Production build: `npm run build && npm start` → http://localhost:3000

## Tests
```bash
npx playwright install chromium   # first time only
npm test                          # rules unit tests + 16 Playwright end-to-end tests
```
The Playwright suite (`tests/e2e.spec.js`) automates the whole checklist from
`docs/03-flows-rules.md`, using separate browser contexts as phone, tablet and TV.

## How it works
- **Rules in one place:** `shared/queue.js` — statuses, Call next, waiting time, no-show, hours.
  The server uses it to apply every action; the screens use it to show positions and waits.
- **Sync:** the server keeps the queue in memory; every screen polls `/api/state` every 1.5 s,
  so phone, tablet and TV agree within 5 s. Actions go to `POST /api/action`.
- **Storage choice:** in-memory is the simplest thing that syncs across devices. It resets when
  the server restarts (Render free tier sleeps after 15 min idle) — fine for a lab demo.

## Deploy on Render
1. Push this folder to a GitHub repo.
2. render.com → **New → Blueprint** → pick the repo (uses `render.yaml`), or
   **New → Web Service** with Build `npm install && npm run build`, Start `npm start`.
3. Copy the `https://….onrender.com` URL into the **Live demo** line at the top of this file.

Vercel alone is not used because the shared queue needs a running server; Render hosts both
the API and the frontend from one service, so there are no localhost URLs or env vars to set.

## Tech
React 19 · Vite · Tailwind CSS v4 · React Router · Node/Express · Playwright
