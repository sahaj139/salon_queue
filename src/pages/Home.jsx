import { Link } from 'react-router-dom';
import { ACTIVE, barberStatus, onlineStatus, queueWait, salonOpen, waitingList } from '../../shared/queue.js';
import { useLang } from '../i18n.js';
import { useNow, useQueue } from '../store.js';
import { Avatar, Shell, gold, ghost, hhmmLabel } from '../ui.jsx';

const CHIP = { busy: 'text-amber-300', free: 'text-emerald-300', break: 'text-sky-300', off: 'text-gray-500' };

export default function Home() {
  return <Shell><HomeBody /></Shell>;
}

function HomeBody() {
  const { state: s } = useQueue();
  const { t, name, lang } = useLang();
  const now = useNow(15000);
  const n = waitingList(s).length;
  const online = onlineStatus(s, now);
  const open = salonOpen(s, now);
  let mySpot = null;
  try { mySpot = s.customers.find((c) => c.id === localStorage.getItem('mySpot') && ACTIVE.includes(c.status)); } catch { /* ignore */ }

  return (
    <div className="space-y-5">
      <section className="pt-4 text-center">
        <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full border-2 border-gold text-4xl text-gold" aria-hidden>✂</div>
        <h1 className="font-display text-3xl font-bold">{s.settings.salonName}</h1>
        <p className="mt-1 text-gray-400">{t('appTagline')}</p>
        <span data-testid="open-badge" className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${open ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
          <span className={`size-2 rounded-full ${open ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {open ? `${t('open')} · ${t('closesAt', { time: hhmmLabel(s.settings.closeTime, lang) })}` : `${t('closed')} · ${t('opensAt', { time: hhmmLabel(s.settings.openTime, lang) })}`}
        </span>
      </section>

      <section data-testid="live-card" className="card p-5 text-center">
        {n === 0 ? (
          <p className="text-lg font-semibold text-gold">{t('emptyQueue')}</p>
        ) : (
          <p className="text-lg"><span className="text-3xl font-bold text-gold">{n === 1 ? t('onePersonWaiting') : t('peopleWaiting', { n })}</span><br />{t('aboutMin', { n: queueWait(s) })}</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wider text-gray-400">{t('barbersToday')}</h2>
        <div className="flex flex-wrap gap-2">
          {s.barbers.map((b) => {
            const st = barberStatus(s, b);
            return (
              <span key={b.id} data-testid={`chip-${b.id}`} className="card flex items-center gap-2 !rounded-full py-1.5 pl-1.5 pr-4">
                <Avatar barber={b} size="size-8 text-sm" />
                <span className="font-semibold">{name(b.name)}</span>
                <span className={`text-sm ${CHIP[st]}`}>({t(`st_${st}`)})</span>
              </span>
            );
          })}
        </div>
      </section>

      {mySpot && <Link to={`/status/${mySpot.id}`} className={`${ghost} w-full !min-h-14 text-lg`}>{t('viewMySpot')} · {mySpot.token}</Link>}

      {online === 'open' ? (
        <Link to="/join" data-testid="join-btn" className={`${gold} w-full !min-h-16 text-xl`}>{t('joinQueue')}</Link>
      ) : (
        <div className="space-y-2">
          <button data-testid="join-btn" disabled className={`${gold} w-full !min-h-16 text-xl`}>{t('joinQueue')}</button>
          <p data-testid="closed-msg" role="status" className="rounded-xl bg-amber-500/10 p-3 text-center text-amber-200">{t(online, { time: hhmmLabel(s.settings.openTime, lang) })}</p>
        </div>
      )}

      <nav className="flex flex-wrap justify-center gap-x-4 border-t border-white/5 pt-4 text-sm text-gray-400">
        <span className="inline-flex min-h-11 items-center">{t('staffLinks')}:</span>
        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to="/reception">{t('navReception')}</Link>
        {s.barbers.map((b) => <Link key={b.id} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to={`/barber/${b.id}`}>{t('navBarber')}: {name(b.name)}</Link>)}
        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to="/display">{t('navDisplay')}</Link>
        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to="/admin">{t('navAdmin')}</Link>
      </nav>
    </div>
  );
}
