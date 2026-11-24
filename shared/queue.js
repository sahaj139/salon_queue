// All queue rules live here (docs/03-flows-rules.md). Used by the server to apply
// actions and by every screen to show positions and waits. Pure functions only.

export const MAX_SERVICES = 3;
export const ONLINE_CLOSE_BEFORE_MIN = 30;
export const LONG_WAIT_MIN = 60;
export const ACTIVE = ['waiting', 'called', 'inchair'];

// Allowed status moves. Anything else is refused.
const MOVES = { waiting: ['called', 'cancelled'], called: ['inchair', 'noshow'], inchair: ['done'] };

const SERVICES = [
  ['haircut', 'Haircut', 'હેરકટ', 30, 150],
  ['beard', 'Beard trim', 'દાઢી ટ્રીમ', 15, 80],
  ['spa', 'Hair spa', 'હેર સ્પા', 45, 400],
  ['shave', 'Clean shave', 'ક્લીન શેવ', 20, 100],
  ['massage', 'Head massage', 'માથાની માલિશ', 20, 120],
  ['colour', 'Hair colour', 'હેર કલર', 60, 600],
  ['kids', 'Kids cut', 'બાળકોનો હેરકટ', 20, 100],
];
const BARBERS = [
  ['ravi', 'Ravi', 'રવિ'],
  ['amit', 'Amit', 'અમિત'],
  ['imran', 'Imran', 'ઇમરાન'],
];
const DEMO = [
  ['Kunal Shah', 'haircut', 'any', 72],
  ['Priya Patel', 'spa', 'ravi', 55],
  ['Harsh Mehta', 'haircut,beard', 'any', 40],
  ['Jignesh Desai', 'shave', 'amit', 31],
  ['Arjun Joshi', 'kids', 'any', 22],
  ['Mehul Trivedi', 'haircut,massage', 'imran', 15],
  ['Rohan Parmar', 'beard', 'any', 8],
  ['Sneha Rana', 'colour', 'ravi', 3],
];

export function seed(now = Date.now(), { demo = true, settings = {} } = {}) {
  let s = {
    settings: { salonName: 'Royal Cuts Salon', tz: 'Asia/Kolkata', openTime: '09:00', closeTime: '22:00', queueOpen: true, noShowMinutes: 10, ...settings },
    services: SERVICES.map(([id, en, gu, minutes, price]) => ({ id, name: { en, gu }, minutes, price, active: true })),
    barbers: BARBERS.map(([id, en, gu]) => ({ id, name: { en, gu }, onDuty: true, onBreak: false })),
    customers: [],
    nextToken: 1,
    lastCall: null,
  };
  if (demo) {
    for (const [i, [name, svc, barber, ago]] of DEMO.entries()) {
      s = apply(s, { type: 'join', name, phone: `98765000${String(i).padStart(2, '0')}`, services: svc.split(','), barber, source: 'walkin' }, now - ago * 60000).state;
    }
  }
  return s;
}

// ---------- read helpers ----------
export const serviceById = (s, id) => s.services.find((x) => x.id === id);
export const barberById = (s, id) => s.barbers.find((b) => b.id === id);
export const minutesOf = (s, c) => c.services.reduce((m, id) => m + (serviceById(s, id)?.minutes || 0), 0);
export const priceOf = (s, c) => c.services.reduce((m, id) => m + (serviceById(s, id)?.price || 0), 0);
export const waitingList = (s) => s.customers.filter((c) => c.status === 'waiting').sort((a, b) => a.seq - b.seq);
export const workingBarbers = (s) => s.barbers.filter((b) => b.onDuty && !b.onBreak);

// Waiting time ≈ minutes of services ahead ÷ barbers working (min 1), rounded up.
export const estimateWait = (s, ahead) =>
  Math.ceil(ahead.reduce((m, c) => m + minutesOf(s, c), 0) / Math.max(1, workingBarbers(s).length));

export const queueWait = (s) => estimateWait(s, waitingList(s));

export function positionOf(s, id) {
  const w = waitingList(s);
  const i = w.findIndex((c) => c.id === id);
  return i < 0 ? null : { position: i + 1, wait: estimateWait(s, w.slice(0, i)) };
}

// The customer currently with a barber (called or in the chair).
export const currentFor = (s, barberId) =>
  s.customers.find((c) => c.assignedBarber === barberId && (c.status === 'called' || c.status === 'inchair'));

// Call next for barber X = earliest waiting customer who chose X or "any".
export const nextFor = (s, barberId) => waitingList(s).find((c) => c.barber === barberId || c.barber === 'any');

export function barberStatus(s, b) {
  if (!b.onDuty) return 'off';
  if (b.onBreak) return 'break';
  return currentFor(s, b.id) ? 'busy' : 'free';
}

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export function localMinutes(now, tz) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now));
  return Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
}
export function salonOpen(s, now) {
  const t = localMinutes(now, s.settings.tz);
  return t >= toMin(s.settings.openTime) && t < toMin(s.settings.closeTime);
}
// 'open' | 'closedByOwner' | 'closedHours' | 'closingSoon'
export function onlineStatus(s, now) {
  if (!s.settings.queueOpen) return 'closedByOwner';
  if (!salonOpen(s, now)) return 'closedHours';
  if (localMinutes(now, s.settings.tz) >= toMin(s.settings.closeTime) - ONLINE_CLOSE_BEFORE_MIN) return 'closingSoon';
  return 'open';
}

export function stats(s) {
  const called = s.customers.filter((c) => c.calledAt);
  const avg = called.length ? Math.round(called.reduce((m, c) => m + (c.calledAt - c.joinedAt), 0) / called.length / 60000) : 0;
  return {
    served: s.customers.filter((c) => c.status === 'done').length,
    avgWait: avg,
    noShows: s.customers.filter((c) => c.status === 'noshow').length,
    waiting: waitingList(s).length,
  };
}

export const tokenNum = (c) => Number(c.token.slice(2));

// ---------- validation ----------
export function validateJoin(s, { name, phone, services, barber }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'errName';
  if (!/^\d{10}$/.test(phone || '')) errors.phone = 'errPhone';
  if (!services?.length) errors.services = 'errServices';
  else if (services.length > MAX_SERVICES) errors.services = 'errTooMany';
  else if (services.some((id) => !serviceById(s, id)?.active)) errors.services = 'errServices';
  if (barber !== 'any' && !barberById(s, barber)?.onDuty) errors.barber = 'errBarber';
  return errors;
}

// ---------- actions ----------
class QueueError extends Error {}
const fail = (code) => { throw new QueueError(code); };

function move(c, to) {
  if (!MOVES[c.status]?.includes(to)) fail('errBadMove');
  c.status = to;
}

// Returns { state, result }. Throws QueueError(code) when the rules refuse the action.
export function apply(prev, a, now = Date.now()) {
  if (a.type === 'reset') return { state: seed(now, a), result: {} };
  const s = structuredClone(prev);
  const find = (id) => s.customers.find((c) => c.id === id) || fail('errNoCustomer');
  const barber = (id) => barberById(s, id) || fail('errBarber');
  let result = {};

  switch (a.type) {
    case 'join': {
      const phone = String(a.phone || '').trim();
      const existing = s.customers.find((c) => c.phone === phone && ACTIVE.includes(c.status));
      if (existing) return { state: prev, result: { id: existing.id, existing: true } };
      const errors = validateJoin(s, { ...a, phone });
      if (Object.keys(errors).length) { const e = new QueueError(Object.values(errors)[0]); e.fields = errors; throw e; }
      if (a.source !== 'walkin' && onlineStatus(s, now) !== 'open') fail('errQueueClosed');
      const n = s.nextToken++;
      const c = {
        id: `${n}-${Math.random().toString(36).slice(2, 8)}`, token: `S-${n}`, seq: n,
        name: a.name.trim(), phone, services: [...a.services], barber: a.barber,
        source: a.source === 'walkin' ? 'walkin' : 'online', status: 'waiting',
        joinedAt: now, calledAt: null, startedAt: null, doneAt: null, assignedBarber: null,
      };
      s.customers.push(c);
      result = { id: c.id };
      break;
    }
    case 'callNext': {
      const b = barber(a.barberId);
      if (!b.onDuty || b.onBreak) fail('errBarberAway');
      if (currentFor(s, b.id)) fail('errBarberBusy');
      const c = nextFor(s, b.id) || fail('errNoneWaiting');
      move(c, 'called');
      Object.assign(c, { calledAt: now, assignedBarber: b.id });
      s.lastCall = { token: c.token, barberId: b.id, at: now };
      result = { id: c.id };
      break;
    }
    case 'start': { const c = find(a.id); move(c, 'inchair'); c.startedAt = now; break; }
    case 'done': { const c = find(a.id); move(c, 'done'); c.doneAt = now; break; }
    case 'cancel': { move(find(a.id), 'cancelled'); break; }
    case 'noShow': {
      const c = find(a.id);
      if (c.status === 'called' && now - c.calledAt < s.settings.noShowMinutes * 60000) fail('errTooEarly');
      move(c, 'noshow');
      break;
    }
    case 'readd': {
      const c = find(a.id);
      if (c.status !== 'noshow' || c.readded) fail('errBadMove');
      c.readded = true;
      return apply(s, { type: 'join', name: c.name, phone: c.phone, services: c.services.filter((id) => serviceById(s, id)?.active), barber: c.barber, source: 'walkin' }, now);
    }
    case 'setBreak': barber(a.barberId).onBreak = !!a.onBreak; break;
    case 'setDuty': barber(a.barberId).onDuty = !!a.onDuty; break;
    case 'setService': {
      const svc = serviceById(s, a.id) || fail('errServices');
      const { name, minutes, price, active } = a.patch || {};
      if (name) svc.name = { ...svc.name, ...name };
      if (minutes !== undefined) svc.minutes = Math.max(1, Math.round(Number(minutes)) || 1);
      if (price !== undefined) svc.price = Math.max(0, Math.round(Number(price)) || 0);
      if (active !== undefined) svc.active = !!active;
      break;
    }
    case 'setSettings': {
      const { queueOpen, openTime, closeTime, salonName } = a.patch || {};
      if (queueOpen !== undefined) s.settings.queueOpen = !!queueOpen;
      for (const [k, v] of Object.entries({ openTime, closeTime })) if (/^\d\d:\d\d$/.test(v || '')) s.settings[k] = v;
      if (salonName?.trim()) s.settings.salonName = salonName.trim();
      break;
    }
    default: fail('errBadMove');
  }
  return { state: s, result };
}

export { QueueError };
