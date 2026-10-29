const MAX_BYTES = 8192;
const encoder = new TextEncoder();
export function beijingDay(now) {
  return new Date(now + 8 * 3600_000).toISOString().slice(0, 10);
}
export function nextReset(now) {
  return Math.floor(Date.parse(beijingDay(now) + 'T00:00:00+08:00') / 1000) + 86400;
}
export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (typeof data.message !== 'string' || typeof data.id !== 'string') return null;
  if (data.nickname != null && typeof data.nickname !== 'string') return null;
  const message = data.message.trim();
  const nickname = (data.nickname || '').trim();
  if (!message || [...message].length > 500 || [...nickname].length > 20) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) return null;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message + nickname)) return null;
  return { id: data.id, nickname, message };
}
export async function ipKey(ip, day, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(day + '\n' + ip));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function readJSON(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) throw new Error('TOO_LARGE');
  if (!request.body) throw new Error('INVALID');
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BYTES) { await reader.cancel(); throw new Error('TOO_LARGE'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', {fatal:true, ignoreBOM:false}).decode(bytes));
}
function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
}
function response(status, body, origin, extras = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff', 'Vary':'Origin',
      ...(origin ? {'Access-Control-Allow-Origin':origin} : {}), ...extras,
    },
  });
}
export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/messages') return response(404, {code:'NOT_FOUND'});
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins(env).includes(origin)) return response(403, {code:'ORIGIN_DENIED'});
  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:{
    'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Max-Age':'600', 'Vary':'Origin',
  }});
  if (request.method !== 'POST') return response(405, {code:'METHOD_NOT_ALLOWED'}, origin, {Allow:'POST, OPTIONS'});
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return response(415, {code:'JSON_REQUIRED'}, origin);
  if (!env.DB || !env.IP_HASH_SECRET || env.IP_HASH_SECRET.length < 32) return response(503, {code:'NOT_CONFIGURED'}, origin);
  // Only trust the Cloudflare edge header; never accept an IP supplied in JSON/X-Forwarded-For.
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return response(503, {code:'IP_UNAVAILABLE'}, origin);
  let data;
  try { data = validate(await readJSON(request)); }
  catch (error) { return response(error.message === 'TOO_LARGE' ? 413 : 400, {code:error.message === 'TOO_LARGE' ? 'TOO_LARGE' : 'INVALID_MESSAGE'}, origin); }
  if (!data) return response(400, {code:'INVALID_MESSAGE'}, origin);
  const day = beijingDay(now);
  const key = await ipKey(ip, day, env.IP_HASH_SECRET);
  const previousKey = await ipKey(ip, beijingDay(now - 86400_000), env.IP_HASH_SECRET);
  const timestamp = Math.floor(now / 1000);
  try {
    // Duplicate submission across midnight must not insert twice or consume quota.
    const existing = await env.DB.prepare('SELECT ip_key, nickname, message FROM messages WHERE id = ?').bind(data.id).first();
    if (existing) {
      const same = [key, previousKey].includes(existing.ip_key) && existing.nickname === data.nickname && existing.message === data.message;
      return response(same ? 200 : 409, {code:same ? 'ALREADY_RECEIVED' : 'ID_CONFLICT'}, origin);
    }
    // Daily quota and same-day cooldown are enforced atomically by the trigger.
    // The cooldown resets at the daily boundary along with the quota.
    await env.DB.prepare('INSERT INTO messages (id, ip_key, day, nickname, message, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
      .bind(data.id, key, day, data.nickname, data.message, timestamp).run();
    // Another request may have used this id concurrently. Confirm ownership/content.
    const saved = await env.DB.prepare('SELECT ip_key, nickname, message FROM messages WHERE id = ?').bind(data.id).first();
    if (!saved) return response(503, {code:'SAVE_FAILED'}, origin);
    if (saved.ip_key !== key || saved.nickname !== data.nickname || saved.message !== data.message) return response(409, {code:'ID_CONFLICT'}, origin);
    return response(201, {code:'RECEIVED'}, origin);
  } catch (error) {
    const text = String(error.message || '') + String(error.cause?.message || '');
    if (text.includes('MESSAGE_DAILY_LIMIT')) return response(429, {code:'DAILY_LIMIT', retryAt:nextReset(now)}, origin, {'Retry-After':String(nextReset(now) - timestamp)});
    if (text.includes('MESSAGE_COOLDOWN')) return response(429, {code:'COOLDOWN', retryAt:timestamp + 60}, origin, {'Retry-After':'60'});
    // Do not log request bodies, messages, IP addresses or secret values.
    return response(503, {code:'SAVE_FAILED'}, origin);
  }
}
export default {
  fetch(request, env) { return handle(request, env); },
  async scheduled(_event, env) {
    // Routine retention cleanup: delete messages older than 90 days.
    await env.DB.prepare('DELETE FROM messages WHERE created_at < ?').bind(Math.floor(Date.now() / 1000) - 90 * 86400).run();
  },
};
