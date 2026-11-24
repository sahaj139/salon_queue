import { useState } from 'react';
import { Link } from 'react-router-dom';
import { setLang, useLang } from './i18n.js';
import { useQueue } from './store.js';

export const btn = 'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2';
export const gold = `${btn} bg-gold text-ink hover:bg-gold-soft`;
export const ghost = `${btn} border border-white/15 hover:bg-white/5`;
export const danger = `${btn} border border-red-400/40 text-red-300 hover:bg-red-500/10`;
export const input = 'w-full min-h-11 rounded-xl bg-ink border border-white/10 px-3 text-base focus:border-gold focus:outline-none';

const COLORS = { ravi: 'bg-amber-600', amit: 'bg-teal-600', imran: 'bg-indigo-600' };
export function Avatar({ barber, size = 'size-10 text-lg' }) {
  const { name } = useLang();
  return <span aria-hidden className={`${size} ${COLORS[barber.id] || 'bg-stone-600'} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`}>{name(barber.name).charAt(0)}</span>;
}

export function LangToggle() {
  const { lang, t } = useLang();
  return <button data-testid="lang-toggle" className={`${ghost} !min-h-11 text-sm`} onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}>{t('langToggle')}</button>;
}

export function Shell({ children, wide = false, title, backTo }) {
  const { state, error } = useQueue();
  const { t } = useLang();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/90 backdrop-blur">
        <div className={`mx-auto flex items-center gap-3 px-4 py-2 ${wide ? 'max-w-7xl' : 'max-w-xl'}`}>
          {backTo && <Link to={backTo} className={`${ghost} !px-3`} aria-label={t('back')}>←</Link>}
          <Link to="/" className="flex min-h-11 items-center gap-2 font-display text-lg font-bold text-gold">
            <span aria-hidden>✂</span><span className="truncate">{title || state?.settings.salonName}</span>
          </Link>
          <div className="ml-auto"><LangToggle /></div>
        </div>
      </header>
      {error && <p role="status" className="bg-red-900/60 px-4 py-2 text-center text-sm">{t(error)}</p>}
      <main className={`mx-auto px-4 py-5 ${wide ? 'max-w-7xl' : 'max-w-xl'}`}>{state ? children : <Loading />}</main>
    </div>
  );
}

export const Loading = () => <div className="flex justify-center py-20"><span className="size-10 animate-spin rounded-full border-4 border-gold/30 border-t-gold" /></div>;

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl font-bold text-gold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Demo PIN gate for staff screens; remembered for this browser tab only.
// ponytail: UI-only gate, the API itself is open. Add server-side auth before real use.
export const STAFF_PIN = '1234';
export function PinGate({ children }) {
  const { t } = useLang();
  const [ok, setOk] = useState(() => { try { return sessionStorage.getItem('staff') === '1'; } catch { return false; } });
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  if (ok) return children;
  const submit = (e) => {
    e.preventDefault();
    if (pin === STAFF_PIN) { try { sessionStorage.setItem('staff', '1'); } catch { /* ignore */ } setOk(true); }
    else { setWrong(true); setPin(''); }
  };
  return (
    <Shell>
      <form onSubmit={submit} className="card mx-auto mt-10 max-w-sm space-y-4 p-6 text-center">
        <div className="text-4xl" aria-hidden>🔒</div>
        <h1 className="font-display text-2xl font-bold text-gold">{t('pinTitle')}</h1>
        <label className="block text-sm text-gray-300" htmlFor="pin">{t('pinHint')}</label>
        <input id="pin" data-testid="pin" className={`${input} text-center text-2xl tracking-[.5em]`} inputMode="numeric" maxLength={4} autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        {wrong && <p className="text-sm text-red-300">{t('pinWrong')}</p>}
        <button className={`${gold} w-full`}>{t('unlock')}</button>
      </form>
    </Shell>
  );
}

export const hhmmLabel = (hhmm, lang) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(lang === 'gu' ? 'gu-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(Date.UTC(2000, 0, 1, h, m));
};
export const clockLabel = (ms, lang, tz) => new Intl.DateTimeFormat(lang === 'gu' ? 'gu-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(ms);
export const mins = (ms) => Math.max(0, Math.floor(ms / 60000));
export const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
