// Тот же приёмник заявок, но для Cloudflare Workers (бесплатно, без привязки карты).
// Секреты задаются в настройках воркера: BOT_TOKEN, CHAT_ID, ALLOWED_ORIGIN.
// В репозитории и на сайте токена нет.

const RATE = { windowMs: 10 * 60 * 1000, max: 5 };
const hits = new Map();
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function limited(ip) {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (list.length >= RATE.max) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'method' });
    if (!allowed) return reply(500, { ok: false, error: 'config' });
    if (origin !== allowed) return reply(403, { ok: false, error: 'origin' });

    let data;
    try { data = await request.json(); } catch { return reply(400, { ok: false, error: 'json' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, { ok: false, error: 'json' });
    if (data.website) return reply(200, { ok: true }); // ловушка для ботов

    const name = clean(data.name, 120);
    const message = clean(data.message, 2000);
    const lang = data.lang === 'en' ? 'en' : 'ru';
    if (message.length < 3) return reply(400, { ok: false, error: 'empty' });
    if (data.consent !== true) return reply(400, { ok: false, error: 'consent' });

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (limited(ip)) return reply(429, { ok: false, error: 'rate' });
    if (!env.BOT_TOKEN || !env.CHAT_ID) return reply(500, { ok: false, error: 'config' });

    const text = [`<b>Заявка с сайта</b> (${lang})`, `<b>От:</b> ${esc(name || 'не указано')}`, '', esc(message)].join('\n');
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    return res.ok ? reply(200, { ok: true }) : reply(502, { ok: false, error: 'telegram' });
  },
};
