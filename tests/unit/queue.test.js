import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, seed, positionOf, queueWait, onlineStatus } from '../../shared/queue.js';
import { dict } from '../../src/i18n.js';

const T0 = Date.UTC(2026, 0, 10, 6, 0); // 11:30 IST
const fresh = () => seed(T0, { demo: false, settings: { openTime: '09:00', closeTime: '22:00' } });
const join = (s, name, phone, services, barber = 'any', source = 'online', at = T0) =>
  apply(s, { type: 'join', name, phone, services, barber, source }, at);

test('call next respects barber preference and FCFS', () => {
  let s = fresh();
  s = join(s, 'A', '9000000001', ['haircut'], 'ravi').state;
  s = join(s, 'B', '9000000002', ['beard'], 'any').state;
  const out = apply(s, { type: 'callNext', barberId: 'amit' }, T0);
  assert.equal(out.state.customers.find((c) => c.id === out.result.id).name, 'B');
  assert.throws(() => apply(out.state, { type: 'callNext', barberId: 'amit' }, T0), /errBarberBusy/);
  const r = apply(out.state, { type: 'callNext', barberId: 'ravi' }, T0);
  assert.equal(r.state.customers.find((c) => c.id === r.result.id).name, 'A');
});

test('wait = minutes ahead ÷ working barbers; duplicate phone returns existing', () => {
  let s = fresh();
  for (let i = 0; i < 4; i++) s = join(s, `C${i}`, `900000000${i}`, ['haircut']).state; // 4 × 30 min
  const last = s.customers[3];
  assert.deepEqual(positionOf(s, last.id), { position: 4, wait: 30 }); // 90 / 3
  assert.equal(queueWait(s), 40);
  const dup = join(s, 'Again', '9000000003', ['beard']);
  assert.deepEqual(dup.result, { id: last.id, existing: true });
  assert.equal(dup.state.customers.length, 4);
});

test('statuses never go backwards; no-show waits 10 min; re-add goes to the end', () => {
  let s = join(fresh(), 'A', '9000000001', ['haircut']).state;
  s = join(s, 'B', '9000000002', ['haircut']).state;
  const { state, result } = apply(s, { type: 'callNext', barberId: 'ravi' }, T0);
  assert.throws(() => apply(state, { type: 'noShow', id: result.id }, T0 + 5 * 60000), /errTooEarly/);
  assert.throws(() => apply(state, { type: 'done', id: result.id }, T0), /errBadMove/);
  let s2 = apply(state, { type: 'noShow', id: result.id }, T0 + 10 * 60000).state;
  const re = apply(s2, { type: 'readd', id: result.id }, T0 + 11 * 60000);
  const c = re.state.customers.find((x) => x.id === re.result.id);
  assert.equal(c.token, 'S-3');
  assert.equal(positionOf(re.state, c.id).position, 2);
});

test('online joining closes 30 min before closing; walk-ins still allowed', () => {
  const s = fresh();
  const late = Date.UTC(2026, 0, 10, 16, 0); // 21:30 IST
  assert.equal(onlineStatus(s, late), 'closingSoon');
  assert.throws(() => join(s, 'A', '9000000001', ['haircut'], 'any', 'online', late), /errQueueClosed/);
  assert.equal(join(s, 'A', '9000000001', ['haircut'], 'any', 'walkin', late).state.customers.length, 1);
});

test('validation: phone 10 digits, 1–3 services', () => {
  assert.throws(() => join(fresh(), 'A', '12345', ['haircut']), /errPhone/);
  assert.throws(() => join(fresh(), 'A', '9000000001', ['haircut', 'beard', 'spa', 'shave']), /errTooMany/);
});

test('every English label has a Gujarati translation', () => {
  assert.deepEqual(Object.keys(dict.en).filter((k) => !dict.gu[k]), []);
});
