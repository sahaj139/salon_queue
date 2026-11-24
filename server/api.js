import { apply, seed, QueueError } from '../shared/queue.js';

// ponytail: in-memory state, resets on server restart. Swap for a JSON file / DB if a salon needs history.
let state = seed();
const env = process.env.NOSHOW_MINUTES;
if (env !== undefined) state.settings.noShowMinutes = Number(env);

const send = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

// Connect/Express-style middleware, used by the Vite dev server and by server/index.js.
export async function api(req, res, next) {
  const url = req.url.split('?')[0];
  if (url === '/api/state' && req.method === 'GET') return send(res, 200, { state, now: Date.now() });
  if (url !== '/api/action' || req.method !== 'POST') return next();
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e5) return send(res, 413, { error: 'errBadMove' });
  }
  try {
    const action = JSON.parse(raw || '{}');
    const keep = state.settings.noShowMinutes;
    const out = apply(state, action, Date.now());
    state = out.state;
    if (action.type === 'reset' && action.settings?.noShowMinutes === undefined) state.settings.noShowMinutes = keep;
    send(res, 200, { state, result: out.result, now: Date.now() });
  } catch (e) {
    if (e instanceof QueueError) return send(res, 400, { error: e.message, fields: e.fields });
    send(res, 400, { error: 'errBadMove' });
  }
}
