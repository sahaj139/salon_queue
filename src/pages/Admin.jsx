import { useState } from 'react';
import { stats } from '../../shared/queue.js';
import { useLang } from '../i18n.js';
import { act, useQueue } from '../store.js';
import { Avatar, Shell, danger, ghost, input } from '../ui.jsx';

export default function Admin() {
  const { t } = useLang();
  return <Shell wide title={t('adminTitle')}><AdminBody /></Shell>;
}

function Switch({ on, onChange, label, testid, onText, offText }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} data-testid={testid} onClick={() => onChange(!on)}
      className={`inline-flex min-h-11 min-w-24 items-center justify-center rounded-full px-4 font-semibold transition ${on ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300'}`}>
      {on ? onText : offText}
    </button>
  );
}

function AdminBody() {
  const { state: s } = useQueue();
  const { t, name } = useLang();
  const [err, setErr] = useState(null);
  const run = (a) => act(a).then(() => setErr(null), (e) => setErr(e.message));
  const st = stats(s);
  const cards = [['served', st.served], ['avgWait', t('min', { n: st.avgWait })], ['noShows', st.noShows], ['waitingNow', st.waiting]];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{t('adminTitle')}</h1>
      {err && <p className="rounded-xl bg-red-900/60 p-3">{t(err)}</p>}

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wider text-gray-400">{t('statsToday')}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([k, v]) => (
            <div key={k} data-testid={`stat-${k}`} className="card p-4">
              <p className="text-sm text-gray-400">{t(k)}</p>
              <p className="text-3xl font-bold text-gold">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{t('onlineQueue')}</h2>
            <Switch testid="queue-switch" label={t('onlineQueue')} on={s.settings.queueOpen} onText={t('queueOpen')} offText={t('queueClosed')}
              onChange={(v) => run({ type: 'setSettings', patch: { queueOpen: v } })} />
          </div>
          <div>
            <h3 className="mb-2 text-sm text-gray-400">{t('hours')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {['openTime', 'closeTime'].map((k) => (
                <label key={k} className="block text-sm">
                  <span className="mb-1 block text-gray-300">{t(k)}</span>
                  <input type="time" data-testid={k} className={input} value={s.settings[k]} onChange={(e) => run({ type: 'setSettings', patch: { [k]: e.target.value } })} />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">{t('barbersOnDuty')}</h2>
          <ul className="space-y-2">
            {s.barbers.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <Avatar barber={b} />
                <span className="flex-1 font-semibold">{name(b.name)}</span>
                <Switch testid={`duty-${b.id}`} label={name(b.name)} on={b.onDuty} onText={t('onDuty')} offText={t('offDuty')}
                  onChange={(v) => run({ type: 'setDuty', barberId: b.id, onDuty: v })} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 text-lg font-bold">{t('services')}</h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-gray-400">
            <tr><th className="p-2">{t('nameEn')}</th><th className="p-2">{t('nameGu')}</th><th className="p-2">{t('minutesLbl')}</th><th className="p-2">{t('price')}</th><th className="p-2">{t('active')}</th></tr>
          </thead>
          <tbody>
            {s.services.map((x) => (
              <ServiceRow key={x.id} svc={x} run={run} t={t} />
            ))}
          </tbody>
        </table>
      </section>

      <section className="card flex flex-wrap items-center gap-3 p-5">
        <h2 className="mr-auto text-lg font-bold">{t('demoTools')}</h2>
        <button data-testid="load-demo" className={ghost} onClick={() => run({ type: 'reset', demo: true, settings: s.settings })}>{t('loadDemo')}</button>
        <button data-testid="clear-queue" className={danger} onClick={() => run({ type: 'reset', demo: false, settings: s.settings })}>{t('clearQueue')}</button>
      </section>
    </div>
  );
}

// Text fields save on blur so typing isn't interrupted by the 1.5 s refresh.
function ServiceRow({ svc, run, t }) {
  const field = (key, value, patch, type = 'text') => (
    <input key={`${key}-${value}`} type={type} data-testid={`svc-${svc.id}-${key}`} defaultValue={value} className={`${input} !min-h-10`}
      onBlur={(e) => e.target.value !== String(value) && run({ type: 'setService', id: svc.id, patch: patch(e.target.value) })} />
  );
  return (
    <tr className="border-t border-white/5">
      <td className="p-2">{field('en', svc.name.en, (v) => ({ name: { en: v } }))}</td>
      <td className="p-2">{field('gu', svc.name.gu, (v) => ({ name: { gu: v } }))}</td>
      <td className="w-24 p-2">{field('min', svc.minutes, (v) => ({ minutes: v }), 'number')}</td>
      <td className="w-28 p-2">{field('price', svc.price, (v) => ({ price: v }), 'number')}</td>
      <td className="p-2">
        <Switch testid={`svc-${svc.id}-active`} label={svc.name.en} on={svc.active} onText={t('active')} offText={t('svcOff')}
          onChange={(v) => run({ type: 'setService', id: svc.id, patch: { active: v } })} />
      </td>
    </tr>
  );
}
