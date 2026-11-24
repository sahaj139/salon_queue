import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_SERVICES, onlineStatus, queueWait, serviceById } from '../../shared/queue.js';
import { useLang } from '../i18n.js';
import { act, useNow, useQueue } from '../store.js';
import { Avatar, Shell, gold, hhmmLabel, input } from '../ui.jsx';

export default function Join() {
  return <Shell backTo="/"><JoinPage /></Shell>;
}

function JoinPage() {
  const { state: s } = useQueue();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const online = onlineStatus(s, useNow(15000));
  if (online !== 'open') {
    return <p data-testid="closed-msg" role="status" className="card p-6 text-center text-lg text-amber-200">{t(online, { time: hhmmLabel(s.settings.openTime, lang) })}</p>;
  }
  return (
    <>
      <h1 className="mb-4 font-display text-2xl font-bold">{t('joinTitle')}</h1>
      <JoinForm
        source="online"
        onJoined={({ id, existing }) => {
          try { localStorage.setItem('mySpot', id); } catch { /* ignore */ }
          navigate(`/status/${id}${existing ? '?existing=1' : ''}`);
        }}
      />
    </>
  );
}

// Shared by Join (online) and Reception's walk-in pop-up.
export function JoinForm({ source, onJoined }) {
  const { state: s } = useQueue();
  const { t, name } = useLang();
  const [f, setF] = useState({ name: '', phone: '', services: [], barber: 'any' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined, form: undefined })); };

  const toggle = (id) => {
    if (f.services.includes(id)) { setLimitHit(false); return set('services', f.services.filter((x) => x !== id)); }
    if (f.services.length >= MAX_SERVICES) return setLimitHit(true);
    set('services', [...f.services, id]);
  };

  const picked = f.services.map((id) => serviceById(s, id)).filter(Boolean);
  const total = { min: picked.reduce((m, x) => m + x.minutes, 0), price: picked.reduce((m, x) => m + x.price, 0) };
  const barbers = s.barbers.filter((b) => b.onDuty);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = 'errName';
    if (!/^\d{10}$/.test(f.phone)) errs.phone = 'errPhone';
    if (!f.services.length) errs.services = 'errServices';
    if (Object.keys(errs).length) return setErrors(errs);
    setBusy(true);
    try {
      onJoined(await act({ type: 'join', ...f, source }));
    } catch (err) {
      setErrors(err.fields || { form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const Err = ({ k }) => (errors[k] ? <p data-testid={`err-${k}`} className="mt-1 text-sm text-red-300">{t(errors[k])}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-300">{t('yourName')}</span>
          <input data-testid="name" className={input} value={f.name} placeholder={t('namePh')} autoComplete="name" onChange={(e) => set('name', e.target.value)} />
          <Err k="name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-300">{t('phone')}</span>
          <input data-testid="phone" className={input} value={f.phone} placeholder={t('phonePh')} inputMode="numeric" autoComplete="tel" maxLength={10} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
          <Err k="phone" />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 flex w-full justify-between text-sm text-gray-300"><span>{t('chooseServices')}</span><span>{t('upTo3')}</span></legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {s.services.filter((x) => x.active).map((x) => {
            const on = f.services.includes(x.id);
            return (
              <button type="button" key={x.id} data-testid={`svc-${x.id}`} aria-pressed={on} onClick={() => toggle(x.id)}
                className={`card min-h-20 p-3 text-left transition ${on ? '!border-gold ring-2 ring-gold/60' : 'hover:!border-white/25'} ${!on && f.services.length >= MAX_SERVICES ? 'opacity-50' : ''}`}>
                <span className="block font-semibold">{name(x.name)}</span>
                <span className="mt-1 flex justify-between text-sm text-gray-400"><span>{t('min', { n: x.minutes })}</span><span className="font-bold text-gold">₹{x.price}</span></span>
              </button>
            );
          })}
        </div>
        {limitHit && <p data-testid="limit-msg" role="status" className="mt-2 text-sm text-amber-300">{t('maxServices')}</p>}
        <Err k="services" />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-gray-300">{t('chooseBarber')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: 'any' }, ...barbers].map((b) => {
            const on = f.barber === b.id;
            return (
              <button type="button" key={b.id} data-testid={`barber-${b.id}`} aria-pressed={on} onClick={() => set('barber', b.id)}
                className={`card flex min-h-16 items-center gap-3 p-3 text-left ${on ? '!border-gold ring-2 ring-gold/60' : 'hover:!border-white/25'} ${b.id === 'any' ? 'col-span-2' : ''}`}>
                {b.id === 'any' ? <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-full bg-gold text-xl text-ink">⚡</span> : <Avatar barber={b} />}
                <span>
                  <span className="block font-semibold">{b.id === 'any' ? t('anyBarber') : name(b.name)}</span>
                  {b.onBreak && <span className="text-sm text-sky-300">{t('onBreak')}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <Err k="barber" />
      </fieldset>

      <div data-testid="summary" aria-live="polite" className="sticky bottom-3 rounded-2xl border border-gold/40 bg-charcoal/95 p-4 text-center font-semibold shadow-xl backdrop-blur">
        {picked.length ? t('summary', { min: total.min, price: total.price, wait: queueWait(s) }) : <span className="font-normal text-gray-400">{t('pickServiceHint')}</span>}
        {errors.form && <p data-testid="err-form" className="mt-1 text-sm text-red-300">{t(errors.form)}</p>}
        <button data-testid="confirm" disabled={busy} className={`${gold} mt-3 w-full !min-h-14 text-lg`}>{busy ? t('saving') : source === 'walkin' ? t('add') : t('confirm')}</button>
      </div>
    </form>
  );
}
