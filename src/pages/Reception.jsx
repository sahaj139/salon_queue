import { useState } from 'react';
import { LONG_WAIT_MIN, barberById, barberStatus, currentFor, minutesOf, nextFor, serviceById, waitingList } from '../../shared/queue.js';
import { useLang } from '../i18n.js';
import { act, useNow, useQueue } from '../store.js';
import { Avatar, Modal, Shell, danger, ghost, gold, mins } from '../ui.jsx';
import { JoinForm } from './Join.jsx';

export default function Reception() {
  const { t } = useLang();
  return <Shell wide title={t('receptionTitle')}><Dashboard /></Shell>;
}

// Runs an action and shows its error (if any) as a toast.
function useAction() {
  const [err, setErr] = useState(null);
  const run = (a) => act(a).then(() => setErr(null), (e) => setErr(e.message));
  return [run, err, () => setErr(null)];
}

function Dashboard() {
  const { state: s } = useQueue();
  const { t, name } = useLang();
  const now = useNow(1000);
  const [walkIn, setWalkIn] = useState(false);
  const [run, err, clearErr] = useAction();
  const queue = [...s.customers.filter((c) => c.status === 'called'), ...waitingList(s)];
  const noShows = s.customers.filter((c) => c.status === 'noshow' && !c.readded);
  const inChair = s.customers.filter((c) => c.status === 'inchair').length;
  const svcNames = (c) => c.services.map((x) => name(serviceById(s, x)?.name)).join(', ');
  const noShowLeft = (c) => s.settings.noShowMinutes - mins(now - c.calledAt);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{t('receptionTitle')}</h1>
        <span className="rounded-full bg-white/5 px-3 py-1 text-sm">{t('waitingCount', { n: waitingList(s).length })}</span>
        <span className="rounded-full bg-white/5 px-3 py-1 text-sm">{t('inChairCount', { n: inChair })}</span>
        <button data-testid="add-walkin" className={`${gold} ml-auto`} onClick={() => setWalkIn(true)}>{t('addWalkIn')}</button>
      </div>

      {err && <button data-testid="toast" onClick={clearErr} className="w-full rounded-xl bg-red-900/60 p-3 text-left">{t(err)}</button>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {s.barbers.filter((b) => b.onDuty).map((b) => {
            const cur = currentFor(s, b.id);
            const st = barberStatus(s, b);
            const total = cur ? minutesOf(s, cur) : 0;
            const used = cur?.startedAt ? (now - cur.startedAt) / 60000 : 0;
            const next = nextFor(s, b.id);
            return (
              <article key={b.id} data-testid={`bcard-${b.id}`} className="card space-y-3 p-4">
                <header className="flex items-center gap-3">
                  <Avatar barber={b} />
                  <h2 className="text-lg font-bold">{name(b.name)}</h2>
                  <span className="ml-auto text-sm text-gray-400">{t(`st_${st}`)}</span>
                </header>
                {cur ? (
                  <div className="rounded-xl bg-ink/60 p-3">
                    <p><b className="text-gold">{cur.token}</b> · {cur.name}</p>
                    <p className="text-sm text-gray-400">{svcNames(cur)}</p>
                    {cur.status === 'inchair' ? (
                      <>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold transition-all" style={{ width: `${Math.min(100, (used / total) * 100)}%` }} /></div>
                        <p className="mt-1 text-sm">{used <= total ? t('timeLeft', { n: Math.ceil(total - used) }) : t('overtime', { n: Math.floor(used - total) })}</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-amber-200">{t('calledAgo', { n: mins(now - cur.calledAt) })}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button data-testid={`start-${b.id}`} className={gold} onClick={() => run({ type: 'start', id: cur.id })}>{t('start')}</button>
                          <button data-testid={`noshow-${b.id}`} className={danger} disabled={noShowLeft(cur) > 0} onClick={() => run({ type: 'noShow', id: cur.id })}>
                            {noShowLeft(cur) > 0 ? t('noShowIn', { n: noShowLeft(cur) }) : t('noShow')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">{t('chairFree')}</p>
                )}
                {cur?.status === 'inchair' && <button data-testid={`done-${b.id}`} className={`${ghost} w-full`} onClick={() => run({ type: 'done', id: cur.id })}>{t('done')}</button>}
                <button data-testid={`call-${b.id}`} className={`${gold} w-full`} disabled={st !== 'free' || !next} onClick={() => run({ type: 'callNext', barberId: b.id })}>
                  {t('callNext')}{next && st === 'free' ? ` · ${next.token}` : ''}
                </button>
              </article>
            );
          })}
        </section>

        <section className="space-y-5">
          <div className="card overflow-hidden">
            <h2 className="border-b border-white/5 px-4 py-3 font-bold">{t('queue')}</h2>
            {queue.length === 0 ? (
              <p data-testid="empty" className="p-8 text-center text-lg text-gold">{t('emptyQueue')}</p>
            ) : (
              <ol data-testid="queue-list" className="divide-y divide-white/5">
                {queue.map((c) => {
                  const waited = mins((c.calledAt || now) - c.joinedAt);
                  const long = c.status === 'waiting' && waited > LONG_WAIT_MIN;
                  const pref = c.barber === 'any' ? t('anyBarber') : name(barberById(s, c.barber)?.name);
                  return (
                    <li key={c.id} data-testid={`row-${c.token}`} data-status={c.status} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${long ? 'bg-amber-500/15' : ''} ${c.status === 'called' ? 'bg-gold/10' : ''}`}>
                      <span className="w-14 font-display text-xl font-bold text-gold">{c.token}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{c.name} <span className="text-xs font-normal text-gray-500">· {t(c.source === 'walkin' ? 'walkIn' : 'online')}</span></span>
                        <span className="block text-sm text-gray-400">{svcNames(c)} · {c.status === 'called' ? t('calledTo', { name: name(barberById(s, c.assignedBarber)?.name) }) : pref}</span>
                      </span>
                      <span data-testid="waited" className={`text-sm tabular-nums ${long ? 'font-bold text-amber-300' : 'text-gray-300'}`}>{t('min', { n: waited })}</span>
                      {c.status === 'waiting'
                        ? <button data-testid={`cancel-${c.token}`} className={danger} onClick={() => run({ type: 'cancel', id: c.id })}>{t('cancel')}</button>
                        : <button data-testid={`rownoshow-${c.token}`} className={danger} disabled={noShowLeft(c) > 0} onClick={() => run({ type: 'noShow', id: c.id })}>{t('noShow')}</button>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {noShows.length > 0 && (
            <div className="card">
              <h2 className="border-b border-white/5 px-4 py-3 font-bold">{t('noShowsToday')}</h2>
              <ul className="divide-y divide-white/5">
                {noShows.map((c) => (
                  <li key={c.id} data-testid={`noshowrow-${c.token}`} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-14 font-bold text-gray-400 line-through">{c.token}</span>
                    <span className="flex-1">{c.name}</span>
                    <button data-testid={`readd-${c.token}`} className={ghost} onClick={() => run({ type: 'readd', id: c.id })}>{t('readd')}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {walkIn && (
        <Modal title={t('walkInTitle')} onClose={() => setWalkIn(false)}>
          <JoinForm source="walkin" onJoined={() => setWalkIn(false)} />
          <button className={`${ghost} mt-3 w-full`} onClick={() => setWalkIn(false)}>{t('close')}</button>
        </Modal>
      )}
    </div>
  );
}
