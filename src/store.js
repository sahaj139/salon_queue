import { useEffect, useState, useSyncExternalStore } from 'react';

// Every screen polls the server every 1.5 s, so all windows/devices stay in sync (< 5 s).
const POLL_MS = 1500;
let snap = { state: null, error: null, skew: 0 };
const subs = new Set();
const emit = (patch) => { snap = { ...snap, ...patch }; subs.forEach((f) => f()); };

async function refresh() {
  try {
    const r = await fetch('/api/state', { cache: 'no-store' });
    const { state, now } = await r.json();
    emit({ state, error: null, skew: now - Date.now() });
  } catch {
    emit({ error: 'errNetwork' });
  }
}

let timer;
function subscribe(f) {
  subs.add(f);
  if (!timer) { refresh(); timer = setInterval(refresh, POLL_MS); }
  return () => { subs.delete(f); if (!subs.size) { clearInterval(timer); timer = null; } };
}

export function useQueue() {
  return useSyncExternalStore(subscribe, () => snap);
}

// Sends an action; resolves with the result or throws an Error whose message is an i18n key.
export async function act(action) {
  let body;
  try {
    const r = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
    body = await r.json();
  } catch {
    throw new Error('errNetwork');
  }
  if (body.error) throw Object.assign(new Error(body.error), { fields: body.fields });
  emit({ state: body.state, error: null, skew: body.now - Date.now() });
  return body.result;
}

// Server-aligned clock that ticks every `ms`.
export function useNow(ms = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), ms); return () => clearInterval(id); }, [ms]);
  return Date.now() + snap.skew;
}
