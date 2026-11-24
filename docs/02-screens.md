# Screens & Features

Staff screens (Reception, Barber, Admin) ask for a 4-digit PIN once per browser tab
(demo PIN **1234**). Every screen has the EN / ગુ language toggle in the header.
All buttons are at least 44 px tall.

## Screen 1: Home (`/`) — customer, phone
- Salon name + scissors logo, badge "Open · Closes 10:00 PM" (or "Online queue closed").
- Live card: "6 people waiting · about 50 min". Empty: "No one waiting — walk right in!"
- Barber chips with status: Ravi (busy) · Amit (free) · Imran (on break).
- Big gold **[ Join Queue ]** → `/join`. Disabled with the reason when online joining is closed.
- If this phone already has a spot: **[ View my spot ]** → `/status/:id`.
- Small footer links to the staff screens.

## Screen 2: Join Queue (`/join`) — customer, phone
- Name (required), Phone (exactly 10 digits, validated on Confirm).
- Service cards, multi-select, **max 3**: name, minutes, ₹ price. A 4th tap shows
  "You can pick up to 3 services". Services switched off by the owner are hidden.
- Barber picker: "Any barber (fastest)" or a barber card (initial avatar). Barbers off duty
  are hidden; a barber on break shows "On break".
- Live summary: "Total 45 min · ₹230 · Expected wait ~35 min" — updates on every tap.
- **[ Confirm ]** → creates a token, opens My Status. Same phone already in queue → opens
  the existing spot with "You already have a spot".
- Error states: inline red text; closed queue → the form is replaced by the closed message.

## Screen 3: My Status (`/status/:id`) — customer, phone
- Token "S-14" large, position "4th in line".
- Circular countdown ring "about 35 min"; refreshes by itself.
- 2nd in line: banner "Start coming to the salon". 1st: "You're next!".
- Chosen barber on break: "Ravi is on break".
- When called: full-screen gold "It's your turn! Go to Ravi" with pulse + vibration.
- In chair: "Enjoy your service with Ravi". Done: "Thank you, see you again!".
- Cancelled / No-show: clear message (+ "Please talk to the reception").
- **[ Cancel my spot ]** → confirmation pop-up → Cancelled.
- Unknown id: "We couldn't find this spot" + Home link.

## Screen 4: Reception Dashboard (`/reception`) — tablet landscape
- Top: title, counts, **[ + Add walk-in ]** → quick form pop-up (name, phone, services, barber).
  Walk-ins are allowed even when online joining is closed.
- Left: one card per barber on duty: status, current customer (token, name, services),
  time left as a progress bar, **[ Call next ]**, and for a called customer
  **[ Start ]** + **[ No-show ]** (No-show unlocks 10 min after the call).
- Right: queue in order — token, name, services, preferred barber, waiting time,
  **[ Cancel ]** for waiting rows, **[ No-show ]** for called rows. Waiting > 60 min → amber.
- Below: No-shows today with **[ Re-add ]** (new token, end of queue).
- Empty: "No one waiting — walk right in!"

## Screen 5: Barber View (`/barber/:id`) — barber, phone
- Header: avatar, name, toggle **On break / Available**.
- Current customer: token, name, services, timer since start.
- Big buttons: **[ Start ]** (when called) → **[ Done ]** (when in chair).
- Chair free: "Your chair is free" + **[ Call next ]**.
- "Next for you: S-15 Kunal (Haircut)" or "No one waiting for you".
- Unknown barber id → "Barber not found". Off duty → "You are off duty today".

## Screen 6: Waiting Area TV (`/display`) — TV landscape, readable from 5 m
- Header: salon name, clock.
- Left: row per barber on duty: avatar, name, "Now: S-12" / "Free" / "On break".
- Right: "Up next" — 5 tokens with name and estimated time (e.g. "~7:45 PM").
- A token called while the screen is open flashes gold full-width + chime (tap "Enable sound" once).
  Opening or refreshing the TV never re-flashes an old call.
- Empty: "No one waiting — walk right in!"

## Screen 7: Owner Settings (`/admin`) — owner, tablet/phone
- Today's stats cards: customers served, average wait, no-shows, waiting now.
- Queue switch: Open / Closed for online joining. Opening and closing time.
- Barbers on duty today (toggle per barber).
- Services list: name EN, name GU, minutes, price, on/off.
- Demo tools: "Load demo customers", "Clear queue".
