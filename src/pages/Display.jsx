import { useEffect, useRef, useState } from 'react';
import { barberById, barberStatus, currentFor, positionOf, waitingList } from '../../shared/queue.js';
import { useLang } from '../i18n.js';
import { useNow, useQueue } from '../store.js';
import { Avatar, LangToggle, Loading, clockLabel, ghost } from '../ui.jsx';

let audio;
function chime() {
  try {
    audio ||= new AudioContext();
    [880, 1318.5].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + i * 0.25;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      o.connect(g).connect(audio.destination);
      o.start(t0); o.stop(t0 + 1);
    });
  } catch { /* no audio */ }
}

export default function Display() {
  const { state: s } = useQueue();
  const { t, name, lang } = useLang();
  const now = useNow(1000);
  const [sound, setSound] = useState(false);
  const [flash, setFlash] = useState(null);
  const lastAt = useRef(undefined);

  // Flash only for calls made after this screen loaded.
  const call = s?.lastCall;
  const key = s ? (call?.at ?? 0) : undefined;
  useEffect(() => {
    if (key === undefined) return;
    const first = lastAt.current === undefined;
    const changed = key !== lastAt.current;
    lastAt.current = key;
    if (first || !changed || !call) return;
    setFlash(call);
    if (sound) chime();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(id);
  }, [flash]);

  if (!s) return <Loading />;
  const upNext = waitingList(s).slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-4xl font-bold text-gold lg:text-5xl"><span aria-hidden>✂ </span>{s.settings.salonName}</h1>
        <span className="ml-auto font-mono text-4xl tabular-nums lg:text-5xl">{clockLabel(now, lang, s.settings.tz)}</span>
        <button data-testid="sound" className={ghost} onClick={() => { setSound(true); chime(); }}>{sound ? `🔔 ${t('soundOn')}` : `🔕 ${t('enableSound')}`}</button>
        <LangToggle />
      </header>

      {flash && (
        <div data-testid="flash" role="alert" className="flash rounded-3xl p-8 text-center text-ink">
          <p className="text-3xl font-semibold">{t('nowCalling')}</p>
          <p className="font-display text-8xl font-bold">{flash.token}</p>
          <p className="text-4xl font-semibold">{t('toBarber', { name: name(barberById(s, flash.barberId)?.name) })}</p>
        </div>
      )}

      <div className="grid flex-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {s.barbers.filter((b) => b.onDuty).map((b) => {
            const cur = currentFor(s, b.id);
            const st = barberStatus(s, b);
            return (
              <article key={b.id} data-testid={`tv-${b.id}`} className="card flex items-center gap-6 p-6">
                <Avatar barber={b} size="size-20 text-4xl" />
                <span className="text-4xl font-bold">{name(b.name)}</span>
                <span className="ml-auto text-right">
                  {cur ? (
                    <span className="text-4xl">{t('now')}: <b data-testid={`tv-now-${b.id}`} className="font-display text-5xl text-gold">{cur.token}</b></span>
                  ) : (
                    <span className={`text-3xl ${st === 'break' ? 'text-sky-300' : 'text-emerald-300'}`}>{st === 'break' ? t('onBreak') : t('free')}</span>
                  )}
                </span>
              </article>
            );
          })}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-3xl font-bold uppercase tracking-wider text-gray-300">{t('upNext')}</h2>
          {upNext.length === 0 ? (
            <p data-testid="tv-empty" className="py-16 text-center text-4xl text-gold">{t('emptyQueue')}</p>
          ) : (
            <ol data-testid="tv-next" className="space-y-3">
              {upNext.map((c) => (
                <li key={c.id} data-testid={`tv-next-${c.token}`} className="flex items-center gap-6 rounded-2xl bg-ink/60 px-6 py-4">
                  <span className="w-32 font-display text-5xl font-bold text-gold">{c.token}</span>
                  <span className="flex-1 truncate text-3xl">{c.name.split(' ')[0]}</span>
                  <span className="text-3xl tabular-nums text-gray-300">~{clockLabel(now + positionOf(s, c.id).wait * 60000, lang, s.settings.tz)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
