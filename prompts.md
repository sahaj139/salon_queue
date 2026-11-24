# Prompts used (in order)

Built with an AI coding agent (Claude Code). Docs were written first; each prompt points to them.

1. **Setup / understand**
   > Read AGENTS.md and all of docs/. Summarise the app in 8 bullets and list questions. Then set up
   > React + Vite + Tailwind with empty pages for all 7 screens, the charcoal + gold theme and the EN/GU toggle.

2. **Storage choice**
   > Pick the simplest way to keep phone, tablet and TV in sync across separate devices. Explain your choice
   > in 3 lines before writing code.
   *(Answer: localStorage only syncs tabs in one browser, so a tiny Node server holds the queue in memory and
   every screen polls it every 1.5 s.)*

3. **Rules first**
   > Put every rule from docs/03-flows-rules.md in ONE file (shared/queue.js): statuses and allowed moves,
   > Call next, waiting time, one spot per phone, no-show after 10 min, online closing 30 min before close.
   > Add a small unit test for Call next preferences and the waiting-time formula.

4. **Home + Join**
   > Build Screen 1 (Home) and Screen 2 (Join Queue) from docs/02-screens.md with dummy services and barbers
   > Ravi, Amit, Imran. Validate the 10-digit phone and the 3-service limit. The live summary must update as I
   > select services.

5. **My Status**
   > After Confirm, give a token (S-1, S-2…) and open My Status. Show position and estimated wait using the rule
   > in docs/03-flows-rules.md. Add the 'Start coming' and 'It's your turn' states.

6. **Refine UI**
   > Make the 'It's your turn!' screen feel exciting: full-screen gold, large text, a gentle pulse animation and
   > phone vibration. Keep the rest of My Status unchanged.

7. **Reception**
   > Build the Reception Dashboard for a 10-inch tablet in landscape. Customers who join from a phone must appear
   > automatically. Call next must follow the barber-preference rules exactly. Use 8 dummy customers so I can test
   > Call next, No-show and Cancel. Reuse the Join form for + Add walk-in.

8. **Barber View + TV**
   > Build Barber View (Screen 5) and the Waiting Area TV (Screen 6). Start/Done and On break must update
   > Reception, TV and the customer's phone within 5 seconds. TV text readable from 5 metres.

9. **Owner Settings**
   > Build Screen 7. Turning off a service hides it from Join; closing the queue disables online joining with a
   > clear message. Add today's stats cards.

10. **Rules, edge cases, polish**
    > Implement the no-show, cancel and barber-on-break rules from docs/03-flows-rules.md. Add friendly empty
    > states, e.g. 'No one waiting — walk right in!'. Check every screen in Gujarati; make tap targets ≥ 44px.

11. **Verify**
    > Go through the test checklist in docs/03-flows-rules.md. Write a Playwright test for each item using
    > separate browser contexts as phone, tablet and TV. Report pass/fail and fix failures without changing the design.

12. **Bug fix (didn't work first time)**
    > The TV flashes the last called token every time I open /display, even if nobody was called. Expected: only
    > tokens called after the screen is open should flash. Explain why, then fix it and add a test.
    *(Cause: the screen treated "first data from the server" as a new call.)*

13. **Deploy**
    > Prepare this app for deployment: build command, no localhost URLs, one Render web service for API + frontend.
    > Put the live link at the very top of README.md as **Live demo:** <url> with the test PIN right below it.
