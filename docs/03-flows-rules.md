# Flows & Rules

## Flow: remote customer
1. Opens Home → Join → picks Haircut + "Any barber" → gets S-14, 6th in line.
2. Watches My Status from home; at 2nd in line gets "Start coming to the salon".
3. Receptionist taps **Call next** on Amit's card → S-14 is *Called*.
4. Customer's phone (≤ 5 s): "It's your turn! Go to Amit"; TV flashes S-14 + chime.
5. Amit taps **Start**, then **Done** → S-14 leaves the queue.

## Flow: walk-in
Receptionist taps **+ Add walk-in** → name, phone, services, barber → joins the same
queue at the end (first come, first served).

## Flow: no-show
Called customer does not come within 10 min → receptionist taps **No-show**.
If they arrive later, receptionist taps **Re-add** → new token at the END of the queue.

## Statuses
`Waiting → Called → In chair → Done`. Never backwards.
`Waiting → Cancelled`. `Called → No-show`. Every other move is refused.

## Rules
- First come, first served (order of joining).
- **Call next for barber X** picks the earliest *waiting* customer who chose X or "Any".
- A customer who chose Ravi is never given to another barber.
- A barber has only one customer at a time: Call next is refused while they have a
  called or in-chair customer, or while they are on break / off duty.
- **Waiting time** ≈ total service minutes of the waiting customers ahead of you ÷ barbers
  working now (on duty and not on break, minimum 1), rounded up.
  For a new joiner, "ahead" = everyone waiting.
- **Position** = place among waiting customers (1st, 2nd, …).
- One active spot (Waiting / Called / In chair) per phone number — joining again shows
  the existing spot.
- Phone = exactly 10 digits. Name required. 1–3 active services.
- No-show allowed only 10 min after the call. Re-add = new token at the end.
- Online joining closes 30 min before closing time, outside opening hours, or when the
  owner switches it off. Walk-ins are still allowed.
- Barber on break → customers who chose them see "Ravi is on break"; Call next is off.
- Stats (today): served = Done count; average wait = join → call, in minutes; no-shows.

## Sync
One small Node server keeps the queue in memory; every screen polls it every 1.5 s, so all
windows/devices update within 5 s. The rules live only in `shared/queue.js`, used by the
server (to apply actions) and by the screens (to show positions and waits).

## Test checklist (automated in `tests/e2e.spec.js`)
- [x] Join with 2 services → correct total time and price shown
- [x] Same phone joins twice → shown existing spot, no duplicate
- [x] Call next for Amit skips a customer who chose Ravi
- [x] Call next → customer's phone shows "It's your turn" within 5 s
- [x] Start/Done on Barber View updates Reception and TV
- [x] No-show, then re-add → goes to end of queue with a new token
- [x] Close online queue → Join button disabled with message (walk-ins still work)
- [x] Language toggle switches all labels to Gujarati
- [x] Waiting time goes down as customers finish
- [x] Phone, tablet and TV windows all stay in sync
- [x] Phone validation and 3-service limit
- [x] Cancel my spot asks for confirmation
- [x] Barber on break → customer sees "Ravi is on break"
- [x] Turning a service off hides it from Join
- [x] Staff PIN gate; tap targets ≥ 44 px on phone
