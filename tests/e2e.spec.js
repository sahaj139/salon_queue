// End-to-end version of the test checklist in docs/03-flows-rules.md.
import { test, expect } from '@playwright/test';
import { dict } from '../src/i18n.js';

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const TABLET = { viewport: { width: 1280, height: 800 } };
const TV = { viewport: { width: 1920, height: 1080 } };
const SYNC = { timeout: 5000 }; // docs: every screen updates within 5 s

async function reset(request) {
  const r = await request.post('/api/action', { data: { type: 'reset', demo: false, settings: { openTime: '00:00', closeTime: '23:59' } } });
  expect(r.ok()).toBeTruthy();
}
async function api(request, data) {
  const r = await request.post('/api/action', { data });
  const body = await r.json();
  expect(body.error, JSON.stringify(data)).toBeUndefined();
  return body;
}
const walkIn = (request, name, phone, services = ['haircut'], barber = 'any') =>
  api(request, { type: 'join', name, phone, services, barber, source: 'walkin' });

// Opens a page in its own browser context (= separate device). staff=true skips the PIN gate.
async function device(browser, opts, path, staff = false) {
  const ctx = await browser.newContext(opts);
  if (staff) await ctx.addInitScript(() => sessionStorage.setItem('staff', '1'));
  const page = await ctx.newPage();
  await page.goto(path);
  return page;
}

async function joinViaUI(page, { name = 'Kunal Shah', phone = '9876543210', services = ['haircut'], barber = 'any' } = {}) {
  await page.goto('/join');
  await page.getByTestId('name').fill(name);
  await page.getByTestId('phone').fill(phone);
  for (const s of services) await page.getByTestId(`svc-${s}`).click();
  await page.getByTestId(`barber-${barber}`).click();
  await page.getByTestId('confirm').click();
  await expect(page).toHaveURL(/\/status\//);
}

test.beforeEach(async ({ request }) => reset(request));

test('1. join with 2 services shows correct total time and price', async ({ browser }) => {
  const phone = await device(browser, PHONE, '/');
  await phone.getByTestId('join-btn').click();
  await phone.getByTestId('svc-haircut').click();
  await expect(phone.getByTestId('summary')).toContainText('Total 30 min · ₹150');
  await phone.getByTestId('svc-beard').click();
  await expect(phone.getByTestId('summary')).toContainText('Total 45 min · ₹230 · Expected wait ~0 min');
  await phone.getByTestId('name').fill('Kunal Shah');
  await phone.getByTestId('phone').fill('9876543210');
  await phone.getByTestId('confirm').click();
  await expect(phone.getByTestId('token')).toHaveText('S-1');
  await expect(phone.getByTestId('position')).toHaveText('1st in line');
});

test('2. same phone joining twice is shown the existing spot, no duplicate', async ({ browser, request }) => {
  const phone = await device(browser, PHONE, '/');
  await joinViaUI(phone);
  const first = phone.url();
  await joinViaUI(phone, { name: 'Kunal again', services: ['beard'] });
  expect(phone.url().split('?')[0]).toBe(first);
  await expect(phone.getByTestId('existing-msg')).toBeVisible();
  await expect(phone.getByTestId('token')).toHaveText('S-1');
  const { state } = await (await request.get('/api/state')).json();
  expect(state.customers).toHaveLength(1);
});

test('3. call next for Amit skips a customer who chose Ravi', async ({ browser, request }) => {
  await walkIn(request, 'Ravi Fan', '9000000001', ['haircut'], 'ravi');
  await walkIn(request, 'Anyone', '9000000002', ['beard'], 'any');
  const rec = await device(browser, TABLET, '/reception', true);
  await expect(rec.getByTestId('call-amit')).toContainText('S-2');
  await rec.getByTestId('call-amit').click();
  await expect(rec.getByTestId('row-S-2')).toHaveAttribute('data-status', 'called');
  await expect(rec.getByTestId('row-S-1')).toHaveAttribute('data-status', 'waiting');
  await expect(rec.getByTestId('bcard-amit')).toContainText('Anyone');
  // Imran is free but nobody else is for him: Ravi's customer is never offered to him.
  await expect(rec.getByTestId('call-imran')).toBeDisabled();
  await rec.getByTestId('call-ravi').click();
  await expect(rec.getByTestId('bcard-ravi')).toContainText('Ravi Fan');
});

test("4. call next → customer's phone shows 'It's your turn' within 5 s", async ({ browser }) => {
  const phone = await device(browser, PHONE, '/');
  await joinViaUI(phone, { barber: 'amit' });
  const rec = await device(browser, TABLET, '/reception', true);
  await rec.getByTestId('call-amit').click();
  await expect(phone.getByTestId('your-turn')).toBeVisible(SYNC);
  await expect(phone.getByTestId('your-turn')).toContainText('Go to Amit');
});

test('5. Start / Done on Barber View updates Reception and TV', async ({ browser, request }) => {
  await walkIn(request, 'Harsh Mehta', '9000000001');
  await api(request, { type: 'callNext', barberId: 'ravi' });
  const barber = await device(browser, PHONE, '/barber/ravi', true);
  const rec = await device(browser, TABLET, '/reception', true);
  const tv = await device(browser, TV, '/display');
  await expect(tv.getByTestId('tv-now-ravi')).toHaveText('S-1');
  await expect(tv.getByTestId('flash')).toHaveCount(0); // old calls don't flash on load

  await barber.getByTestId('start').click();
  await expect(barber.getByTestId('timer')).toBeVisible();
  await expect(rec.getByTestId('done-ravi')).toBeVisible(SYNC);
  await expect(rec.getByTestId('bcard-ravi')).toContainText('min left');

  await barber.getByTestId('done').click();
  await expect(rec.getByTestId('bcard-ravi')).toContainText('Chair free', SYNC);
  await expect(tv.getByTestId('tv-ravi')).toContainText('Free', SYNC);
  await expect(tv.getByTestId('tv-now-ravi')).toHaveCount(0);
});

test('6. no-show, then re-add → end of queue with a new token', async ({ browser, request }) => {
  await walkIn(request, 'Late Larry', '9000000001');
  await walkIn(request, 'Bina', '9000000002');
  await walkIn(request, 'Chirag', '9000000003');
  await api(request, { type: 'callNext', barberId: 'ravi' });
  const rec = await device(browser, TABLET, '/reception', true);
  await rec.getByTestId('rownoshow-S-1').click();
  await expect(rec.getByTestId('noshowrow-S-1')).toBeVisible();
  await rec.getByTestId('readd-S-1').click();
  const rows = rec.getByTestId('queue-list').locator('li');
  await expect(rows).toHaveCount(3);
  await expect(rows.last()).toHaveAttribute('data-testid', 'row-S-4');
  await expect(rows.last()).toContainText('Late Larry');
  await expect(rec.getByTestId('noshowrow-S-1')).toHaveCount(0);
});

test('7. closing the online queue disables Join with a message; walk-ins still work', async ({ browser }) => {
  const admin = await device(browser, TABLET, '/admin', true);
  await admin.getByTestId('queue-switch').click();
  await expect(admin.getByTestId('queue-switch')).toHaveAttribute('aria-checked', 'false');
  const phone = await device(browser, PHONE, '/');
  await expect(phone.getByTestId('join-btn')).toBeDisabled();
  await expect(phone.getByTestId('closed-msg')).toContainText('Online queue is closed');
  await phone.goto('/join');
  await expect(phone.getByTestId('closed-msg')).toBeVisible();

  const rec = await device(browser, TABLET, '/reception', true);
  await rec.getByTestId('add-walkin').click();
  const dlg = rec.getByRole('dialog');
  await dlg.getByTestId('name').fill('Walk In');
  await dlg.getByTestId('phone').fill('9000000009');
  await dlg.getByTestId('svc-beard').click();
  await dlg.getByTestId('confirm').click();
  await expect(rec.getByTestId('row-S-1')).toContainText('Walk In');
});

test('8. language toggle switches all labels to Gujarati on every screen', async ({ browser, request }) => {
  await walkIn(request, 'Kunal', '9000000001', ['haircut'], 'ravi');
  const { result } = await walkIn(request, 'Nita', '9000000002', ['beard']);
  await api(request, { type: 'callNext', barberId: 'ravi' });
  await api(request, { type: 'setBreak', barberId: 'imran', onBreak: true });
  // English labels that must never show in Gujarati mode (skip placeholders / tiny words).
  const english = Object.entries(dict.en).filter(([k, v]) => k !== 'langToggle' && !v.includes('{') && v.length > 3 && v !== dict.gu[k]).map(([, v]) => v);

  const page = await device(browser, TABLET, '/', true);
  await page.getByTestId('lang-toggle').click();
  await expect(page.getByTestId('join-btn')).toHaveText('લાઇનમાં જોડાઓ');
  for (const path of ['/', '/join', `/status/${result.id}`, '/reception', '/barber/ravi', '/barber/imran', '/display', '/admin']) {
    await page.goto(path);
    await expect(page.getByTestId('lang-toggle')).toHaveText('English');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    const leftovers = english.filter((e) => text.includes(e));
    expect(leftovers, `untranslated on ${path}`).toEqual([]);
  }
  await page.getByTestId('lang-toggle').click();
  await expect(page.getByRole('heading', { name: 'Owner settings' })).toBeVisible();
});

test('9. waiting time goes down as customers finish', async ({ browser, request }) => {
  for (let i = 1; i <= 6; i++) await walkIn(request, `C${i}`, `900000000${i}`); // 6 × 30 min, 3 barbers
  const phone = await device(browser, PHONE, '/');
  await joinViaUI(phone);
  await expect(phone.getByTestId('wait')).toHaveText('60');
  await expect(phone.getByTestId('position')).toHaveText('7th in line');
  for (const b of ['ravi', 'amit', 'imran']) {
    const { result } = await api(request, { type: 'callNext', barberId: b });
    await api(request, { type: 'start', id: result.id });
    await api(request, { type: 'done', id: result.id });
  }
  await expect(phone.getByTestId('wait')).toHaveText('30', SYNC);
  await expect(phone.getByTestId('position')).toHaveText('4th in line');
  await expect(phone.getByTestId('coming-banner')).toHaveCount(0);
  for (const b of ['ravi', 'amit']) {
    const { result } = await api(request, { type: 'callNext', barberId: b });
    await api(request, { type: 'done', id: (await api(request, { type: 'start', id: result.id }), result.id) });
  }
  await expect(phone.getByTestId('position')).toHaveText('2nd in line', SYNC);
  await expect(phone.getByTestId('coming-banner')).toContainText('Start coming to the salon');
  const { result } = await api(request, { type: 'callNext', barberId: 'imran' });
  await expect(phone.getByTestId('next-banner')).toContainText("You’re next!", SYNC);
  await expect(phone.getByTestId('wait')).toHaveText('0');
  expect(result.id).toBeTruthy();
});

test('10. phone, tablet and TV windows all stay in sync', async ({ browser }) => {
  const phone = await device(browser, PHONE, '/');
  const rec = await device(browser, TABLET, '/reception', true);
  const tv = await device(browser, TV, '/display');
  await expect(tv.getByTestId('tv-empty')).toBeVisible();
  await expect(rec.getByTestId('empty')).toContainText('No one waiting');

  await joinViaUI(phone, { name: 'Sync Sam' });
  await expect(rec.getByTestId('row-S-1')).toContainText('Sync Sam', SYNC);
  await expect(tv.getByTestId('tv-next-S-1')).toBeVisible(SYNC);

  await rec.getByTestId('call-imran').click();
  await expect(phone.getByTestId('your-turn')).toContainText('Go to Imran', SYNC);
  await expect(tv.getByTestId('flash')).toContainText('S-1', SYNC);
  await expect(tv.getByTestId('tv-now-imran')).toHaveText('S-1');
  await expect(tv.getByTestId('tv-next-S-1')).toHaveCount(0);

  await rec.getByTestId('start-imran').click();
  await expect(phone.getByTestId('state-msg')).toContainText('Enjoy your service with Imran', SYNC);
  await rec.getByTestId('done-imran').click();
  await expect(phone.getByTestId('state-msg')).toContainText('Thank you', SYNC);
  await expect(tv.getByTestId('tv-imran')).toContainText('Free', SYNC);
});

test('11. phone validation and the 3-service limit', async ({ browser }) => {
  const phone = await device(browser, PHONE, '/join');
  await phone.getByTestId('confirm').click();
  await expect(phone.getByTestId('err-name')).toBeVisible();
  await expect(phone.getByTestId('err-phone')).toBeVisible();
  await expect(phone.getByTestId('err-services')).toBeVisible();
  await phone.getByTestId('phone').fill('98ab765');
  await expect(phone.getByTestId('phone')).toHaveValue('98765');
  await phone.getByTestId('name').fill('Test');
  for (const s of ['haircut', 'beard', 'spa', 'shave']) await phone.getByTestId(`svc-${s}`).click();
  await expect(phone.getByTestId('limit-msg')).toContainText('up to 3 services');
  await expect(phone.getByTestId('svc-shave')).toHaveAttribute('aria-pressed', 'false');
  await phone.getByTestId('confirm').click();
  await expect(phone.getByTestId('err-phone')).toContainText('10-digit');
  await expect(phone).toHaveURL(/\/join$/);
});

test('12. cancel my spot asks for confirmation', async ({ browser }) => {
  const phone = await device(browser, PHONE, '/');
  await joinViaUI(phone);
  await phone.getByTestId('cancel-spot').click();
  await phone.getByRole('button', { name: 'Keep my spot' }).click();
  await expect(phone.getByTestId('position')).toBeVisible();
  await phone.getByTestId('cancel-spot').click();
  await phone.getByTestId('confirm-cancel').click();
  await expect(phone.getByTestId('state-msg')).toContainText('cancelled');
});

test("13. barber on break → customer sees 'Ravi is on break' and Call next is off", async ({ browser }) => {
  const phone = await device(browser, PHONE, '/');
  await joinViaUI(phone, { barber: 'ravi' });
  const barber = await device(browser, PHONE, '/barber/ravi', true);
  await barber.getByTestId('set-break').click();
  await expect(phone.getByTestId('break-banner')).toContainText('Ravi is on break', SYNC);
  await expect(barber.getByTestId('call-next')).toBeDisabled();
  const rec = await device(browser, TABLET, '/reception', true);
  await expect(rec.getByTestId('call-ravi')).toBeDisabled();
  await expect(rec.getByTestId('call-amit')).toBeDisabled(); // Amit must not take Ravi's customer
  await barber.getByTestId('set-available').click();
  await expect(phone.getByTestId('break-banner')).toHaveCount(0, SYNC);
  await expect(barber.getByTestId('next-for-you')).toContainText('S-1 Kunal Shah (Haircut)');
});

test('14. owner settings: service off hides it from Join; duty toggle; stats', async ({ browser, request }) => {
  const admin = await device(browser, TABLET, '/admin', true);
  await admin.getByTestId('svc-spa-active').click();
  await admin.getByTestId('duty-imran').click();
  const phone = await device(browser, PHONE, '/join');
  await expect(phone.getByTestId('svc-haircut')).toBeVisible();
  await expect(phone.getByTestId('svc-spa')).toHaveCount(0);
  await expect(phone.getByTestId('barber-imran')).toHaveCount(0);

  await walkIn(request, 'A', '9000000001');
  const { result } = await api(request, { type: 'callNext', barberId: 'ravi' });
  await api(request, { type: 'start', id: result.id });
  await api(request, { type: 'done', id: result.id });
  await expect(admin.getByTestId('stat-served')).toContainText('1', SYNC);
  await admin.getByTestId('svc-haircut-price').fill('175');
  await admin.getByTestId('svc-haircut-price').blur();
  await phone.reload();
  await expect(phone.getByTestId('svc-haircut')).toContainText('₹175', SYNC);
});

test('15. staff PIN gate and 44px tap targets on phone', async ({ browser, request }) => {
  const gate = await device(browser, TABLET, '/reception');
  await gate.getByTestId('pin').fill('0000');
  await gate.getByRole('button', { name: 'Unlock' }).click();
  await expect(gate.getByText('Wrong PIN')).toBeVisible();
  await gate.getByTestId('pin').fill('1234');
  await gate.getByRole('button', { name: 'Unlock' }).click();
  await expect(gate.getByTestId('add-walkin')).toBeVisible();

  await walkIn(request, 'Kunal', '9000000001');
  const { result } = await walkIn(request, 'Nita', '9000000002');
  const phone = await device(browser, PHONE, '/', true);
  for (const path of ['/', '/join', `/status/${result.id}`, '/barber/ravi']) {
    await phone.goto(path);
    await phone.locator('button').first().waitFor();
    const small = await phone.locator('button:visible, a:visible, input:visible').evaluateAll((els) =>
      els.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.outerHTML.slice(0, 80)));
    expect(small, `small tap targets on ${path}`).toEqual([]);
  }
});

test('16. empty states and not-found screens', async ({ browser }) => {
  const page = await device(browser, PHONE, '/', true);
  await expect(page.getByTestId('live-card')).toContainText('No one waiting — walk right in!');
  await page.goto('/status/nope');
  await expect(page.getByTestId('not-found')).toBeVisible();
  await page.goto('/barber/nobody');
  await expect(page.getByTestId('barber-missing')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('chip-ravi')).toContainText('free');
});
