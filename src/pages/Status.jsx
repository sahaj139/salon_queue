import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { barberById, positionOf, serviceById } from '../../shared/queue.js';
import { ordinal, useLang } from '../i18n.js';
import { act, useQueue } from '../store.js';
import { Modal, Shell, danger, ghost, gold } from '../ui.jsx';

export default function Status() {
  return <Shell backTo="/"><StatusBody /></Shell>;
}

function StatusBody() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state: s } = useQueue();
  const { t, name, lang } = useLang();
  const c = s.customers.find((x) => x.id === id);
  const [asking, setAsking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [err, setErr] = useState(null);
  const maxWait = useRef(0);
  const prevStatus = useRef(c?.status);

  useEffect(() => {
    if (c?.status === 'called' && prevStatus.current !== 'called') { setDismissed(false); navigator.vibrate?.([300, 150, 300, 150, 600]); }
    prevStatus.current = c?.status;
  }, [c?.status]);

  if (!c) {
    return (
      <div className="card p-8 text-center">
        <p data-testid="not-found" className="mb-4 text-lg">{t('notFound')}</p>
        <Link to="/" className={gold}>{t('home')}</Link>
      </div>
    );
  }

  const pos = positionOf(s, c.id);
  const barber = barberById(s, c.assignedBarber || c.barber);
  const barberName = barber ? name(barber.name) : '';
  if (pos) maxWait.current = Math.max(maxWait.current, pos.wait, 1);

  const cancel = async () => {
    try { await act({ type: 'cancel', id: c.id }); setAsking(false); } catch (e) { setErr(e.message); setAsking(false); }
  };

  return (
    <div className="space-y-4">
      {params.get('existing') && <p data-testid="existing-msg" role="status" className="rounded-xl bg-sky-500/10 p-3 text-center text-sky-200">{t('alreadyHaveSpot')}</p>}

      <section className="card p-6 text-center">
        <p className="text-sm uppercase tracking-wider text-gray-400">{t('token')}</p>
        <p data-testid="token" className="font-display text-6xl font-bold text-gold">{c.token}</p>
        <p className="mt-1 text-gray-300">{c.name}</p>

        {c.status === 'waiting' && pos && (
          <>
            <p data-testid="position" className="mt-3 text-2xl font-bold">{t('inLine', { pos: ordinal(lang, pos.position) })}</p>
            <Ring value={pos.wait} max={maxWait.current} label={t('aboutWait')} unit={t('minutes')} />
          </>
        )}
        {c.status === 'inchair' && <p data-testid="state-msg" className="mt-4 text-xl text-gold">{t('inChair', { name: barberName })}</p>}
        {c.status === 'done' && <p data-testid="state-msg" className="mt-4 text-xl text-gold">{t('doneMsg')}</p>}
        {(c.status === 'cancelled' || c.status === 'noshow') && (
          <div className="mt-4 space-y-3">
            <p data-testid="state-msg" className="text-xl text-amber-200">{t(c.status === 'noshow' ? 'noShowMsg' : 'cancelledMsg')}</p>
            {c.status === 'noshow' && <p className="text-gray-300">{t('talkToReception')}</p>}
            <Link to="/join" className={gold}>{t('joinAgain')}</Link>
          </div>
        )}
        {c.status === 'called' && dismissed && <p data-testid="state-msg" className="mt-4 rounded-xl bg-gold p-3 text-xl font-bold text-ink">{t('yourTurn')} {t('goTo', { name: barberName })}</p>}
      </section>

      {c.status === 'waiting' && pos?.position === 1 && <Banner testid="next-banner" text={t('youreNext')} strong />}
      {c.status === 'waiting' && pos?.position <= 2 && <Banner testid="coming-banner" text={t('startComing')} />}
      {c.status === 'waiting' && barber && (barber.onBreak || !barber.onDuty) && <Banner testid="break-banner" text={t('barberOnBreak', { name: barberName })} info />}

      <section className="card space-y-1 p-4 text-sm">
        <p><span className="text-gray-400">{t('yourServices')}:</span> {c.services.map((x) => name(serviceById(s, x)?.name)).join(', ')}</p>
        <p><span className="text-gray-400">{t('yourBarber')}:</span> {c.barber === 'any' && !c.assignedBarber ? t('anyBarber') : barberName}</p>
      </section>

      {err && <p className="text-center text-red-300">{t(err)}</p>}
      {c.status === 'waiting' && <button data-testid="cancel-spot" className={`${danger} w-full`} onClick={() => setAsking(true)}>{t('cancelSpot')}</button>}

      {asking && (
        <Modal title={t('cancelSpot')} onClose={() => setAsking(false)}>
          <p className="mb-5 text-gray-300">{t('cancelConfirm')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button className={ghost} onClick={() => setAsking(false)}>{t('keepSpot')}</button>
            <button data-testid="confirm-cancel" className={`${danger} !bg-red-600 !text-white`} onClick={cancel}>{t('yesCancel')}</button>
          </div>
        </Modal>
      )}

      {c.status === 'called' && !dismissed && (
        <div data-testid="your-turn" role="alert" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gold p-6 text-center text-ink">
          <div className="pulse-gold space-y-4">
            <p className="text-7xl" aria-hidden>✂</p>
            <p className="font-display text-5xl font-bold">{t('yourTurn')}</p>
            <p className="text-3xl font-semibold">{t('goTo', { name: barberName })}</p>
            <p className="font-display text-4xl font-bold">{c.token}</p>
          </div>
          <button className={`${btnDark} w-full max-w-xs !min-h-14 text-lg`} onClick={() => setDismissed(true)}>{t('gotIt')}</button>
        </div>
      )}
    </div>
  );
}

const btnDark = 'inline-flex items-center justify-center rounded-xl bg-ink px-4 font-semibold text-gold';

function Banner({ text, strong, info, testid }) {
  const tone = strong ? 'bg-gold text-ink font-bold text-xl' : info ? 'bg-sky-500/15 text-sky-200' : 'bg-emerald-500/15 text-emerald-200 font-semibold';
  return <p data-testid={testid} role="status" className={`rounded-2xl p-4 text-center ${tone}`}>{text}</p>;
}

function Ring({ value, max, label, unit }) {
  const r = 70, c = 2 * Math.PI * r;
  const frac = max ? value / max : 0;
  return (
    <div className="relative mx-auto mt-4 size-48">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgb(255 255 255 / .08)" strokeWidth="10" />
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-gold)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400">{label}</span>
        <span data-testid="wait" className="text-4xl font-bold">{value}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
    </div>
  );
}
