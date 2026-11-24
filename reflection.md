# Reflection

**What the agent got wrong.** The first version of the Waiting Area TV flashed the gold "Now calling"
banner every time the page was opened or refreshed, even when nobody had just been called. On a real
TV that reloads after a power cut, the whole waiting room would see an old token flash and some
customers would walk up to the wrong barber.

**How I noticed.** I opened `/display` on a big screen after calling one customer from Reception
and refreshed it a minute later — the old token flashed again. The automated checklist didn't
catch it, because every test opened the TV *before* calling, so the "flash on call" case passed.

**Why it happened.** The TV compared the last call with "what it had seen before". On the first load
it had seen nothing yet, so the server's existing last call looked brand new.

**How I fixed the prompt and the doc.** I made the bug report specific — where (`/display`), what I did
(open after a call), what happened (flash), what I expected (flash only for calls made after the screen
is open) — and asked the agent to explain the cause before fixing. I also updated
`docs/02-screens.md` to say "Newly called token flashes" and added an assertion to the Playwright test
for Start/Done that opens the TV after a call and checks nothing flashes. Lesson: the checklist has
to describe the *negative* case too, not only the happy path, or the agent will only build the happy path.
