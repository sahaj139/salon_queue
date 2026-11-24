import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { barberById, currentFor, nextFor, serviceById } from '../../shared/queue.js';
import { useLang } from '../i18n.js';
import { act, useNow, useQueue } from '../store.js';
import { Avatar, Shell, gold, mins, mmss } from '../ui.jsx';

export default function Barber() {
  return <Shell><BarberBody /></Shell>;
}

function BarberBody() {
  const { id } = useParams();
  const { state: s } = useQueue();
  const { t, name } = useLang();
  const now = useNow(1000);
  const [err, setErr] = useState(null);
  const b = barberById(s, id);
  if (!b) return <p data-testid="barber-missing" className="card p-8 text-center text-lg">{t('barberNotFound')}</p>;

  const run = (a) => act(a).then(() => setErr(null), (e) => setErr(e.message));
  const cur = currentFor(s, b.id);
  const next = nextFor(s, b.id);
  const svcNames = (c) => c.services.map((x) => name(serviceById(s, x)?.name)).join(', ');

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Avatar barber={b} size="size-14 text-2xl" />
        <h1 className="font-display text-3xl font-bold">{name(b.name)}</h1>
      </header>

      {!b.onDuty ? (
        <p data-testid="off-duty" className="card p-6 text-center text-lg text-gray-300">{t('offDutyToday')}</p>
      ) : (
        <>
          <div role="group" className="grid grid-cols-2 gap-1 rounded-2xl bg-charcoal p-1">
            {[false, true].map((v) => (
              <button key={String(v)} data-testid={v ? 'set-break' : 'set-available'} aria-pressed={b.onBreak === v}
                className={`min-h-12 rounded-xl font-semibold ${b.onBreak === v ? (v ? 'bg-sky-600 text-white' : 'bg-emerald-600 text-white') : 'text-gray-400'}`}
                onClick={() => run({ type: 'setBreak', barberId: b.id, onBreak: v })}>
                {v ? t('onBreak') : t('available')}
              </button>
            ))}
          </div>

          <section data-testid="current" className="card p-5">
            <h2 className="mb-2 text-sm uppercase tracking-wider text-gray-400">{t('current')}</h2>
            {cur ? (
              <>
                <p className="font-display text-4xl font-bold text-gold">{cur.token}</p>
                <p className="text-xl font-semibold">{cur.name}</p>
                <p className="text-gray-400">{svcNames(cur)}</p>
                {cur.status === 'inchair' ? (
                  <>
                    <p className="mt-3 text-gray-400">{t('sinceStart')} <span data-testid="timer" className="font-mono text-2xl text-white">{mmss(now - cur.startedAt)}</span></p>
                    <button data-testid="done" className={`${gold} mt-4 w-full !min-h-16 text-2xl`} onClick={() => run({ type: 'done', id: cur.id })}>{t('done')}</button>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-amber-200">{t('waitingToArrive')} · {t('calledAgo', { n: mins(now - cur.calledAt) })}</p>
                    <button data-testid="start" className={`${gold} mt-4 w-full !min-h-16 text-2xl`} onClick={() => run({ type: 'start', id: cur.id })}>{t('start')}</button>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-lg">{t('chairIsFree')}</p>
                <button data-testid="call-next" className={`${gold} mt-4 w-full !min-h-16 text-2xl`} disabled={b.onBreak || !next} onClick={() => run({ type: 'callNext', barberId: b.id })}>{t('callNext')}</button>
              </>
            )}
          </section>

          <p data-testid="next-for-you" className="card p-4 text-center">
            {next ? t('nextForYou', { token: next.token, name: next.name, services: svcNames(next) }) : t('noOneForYou')}
          </p>
          {err && <p className="text-center text-red-300">{t(err)}</p>}
        </>
      )}
    </div>
  );
}
