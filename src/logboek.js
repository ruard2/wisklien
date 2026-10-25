// Logboek: ALLES wat er gebeurt, voor latere analyse.
//  · public.logboek — elke API-aanroep van de app (wat het kind of de ouder deed en wat de app terugstuurde): pad, verzoek,
//    antwoord, status, duur, toestel en kind.
//  · public.ai_log  — elke AI-aanroep (Max, profiel, notities, lessen, …): het doel, het model, de berichten die naar de AI
//    gingen, het antwoord, tokens en duur. De lange vaste instructies staan één keer in public.ai_prompt (per hash).
// Privacy: zoals de leerlog — geen echte naam (de schuilnaam, dezelfde die de AI ziet), geen pincodes of wachtwoorden,
// geen kladblok-plaatjes (alleen hoe groot ze waren). Heeft de ouder "Help de app verbeteren" uitgezet, dan wordt er voor
// dat kind niets gelogd. Bewaartermijn: LOGBOEK_DAGEN (standaard 730 dagen).
import crypto from 'node:crypto';
import { pool, kidStore, getKid, getSetting, kidContext } from './db.js';

export async function migrateLogboek() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.logboek (
      id bigserial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
      device text, kid_id int, alias text, lang text,
      methode text, pad text, status int, ms int, verzoek jsonb, antwoord jsonb
    );
    CREATE INDEX IF NOT EXISTS logboek_time ON public.logboek (created_at);
    CREATE INDEX IF NOT EXISTS logboek_kid ON public.logboek (kid_id, created_at);
    CREATE TABLE IF NOT EXISTS public.ai_prompt (hash text PRIMARY KEY, tekst text NOT NULL, eerst timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS public.ai_log (
      id bigserial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
      kid_id int, alias text, lang text, bron text, doel text, model text, effort text,
      prompt_hash text, berichten jsonb, antwoord jsonb, invoer int, cache int, uitvoer int, denk int, ms int, uit_cache boolean, fout text
    );
    CREATE INDEX IF NOT EXISTS ai_log_time ON public.ai_log (created_at);
    CREATE INDEX IF NOT EXISTS ai_log_kid ON public.ai_log (kid_id, created_at);
  `);
  const dagen = Number(process.env.LOGBOEK_DAGEN || 730);
  await pool.query(`DELETE FROM public.logboek WHERE created_at < now() - ($1 || ' days')::interval`, [String(dagen)]).catch(() => {});
  await pool.query(`DELETE FROM public.ai_log WHERE created_at < now() - ($1 || ' days')::interval`, [String(dagen)]).catch(() => {});
}

// ---- per kind: mag het (onderzoek aan), en de schuilnaam ----
const magCache = new Map();
let aliasFor = (id) => `Leerling-${id}`;
export function zetAlias(fn) { aliasFor = fn; }
async function kindInfo(kidId) {
  if (!kidId) return null;
  const c = magCache.get(kidId);
  if (c && Date.now() - c.t < 5 * 60e3) return c.v;
  const k = await getKid(kidId).catch(() => null);
  let v = null;
  if (k) {
    const mag = await kidStore.run(kidContext(k), () => getSetting('research', true)).catch(() => true);
    v = { mag: mag !== false, alias: aliasFor(k.id), naam: k.name, lang: k.lang };
  }
  magCache.set(kidId, { t: Date.now(), v });
  return v;
}
export const vergeetKind = (kidId) => magCache.delete(kidId);

// ---- opschonen: geheimen eruit, plaatjes alleen als grootte, naam → schuilnaam, maximale lengte ----
const GEHEIM = /^(pin|password|pw|pw2|wachtwoord|wagwoord|secret|token)$/i;
function schoon(x, naam, alias, diepte = 0) {
  if (x == null || diepte > 12) return x;
  if (typeof x === 'string') {
    let t = x.startsWith('data:image/') ? `[plaatje ${Math.round(x.length / 1024)} kB]` : x;
    if (naam && naam.length >= 2) t = t.replace(new RegExp(`\\b${naam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), alias);
    return t.length > 20000 ? `${t.slice(0, 20000)}… [${t.length} tekens]` : t;
  }
  if (Array.isArray(x)) return x.slice(0, 500).map((y) => schoon(y, naam, alias, diepte + 1));
  if (typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, GEHEIM.test(k) ? '[weg]' : schoon(v, naam, alias, diepte + 1)]));
  return x;
}

// ---- 1. elke API-aanroep (Express-middleware) ----
export function apiLogger({ kidIdOf, deviceOf }) {
  return (req, res, next) => {
    if (!req.path.startsWith('/api/') || process.env.LOGBOEK === '0') return next();
    const t0 = Date.now();
    let body;
    const json = res.json.bind(res);
    res.json = (b) => { body = b; return json(b); };
    res.on('finish', () => {
      (async () => {
        const kidId = kidIdOf(req) || body?.kid?.id || null;
        const info = await kindInfo(kidId);
        if (info && !info.mag) return;
        await pool.query(`INSERT INTO public.logboek(device, kid_id, alias, lang, methode, pad, status, ms, verzoek, antwoord) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [deviceOf(req), info ? kidId : null, info?.alias || null, info?.lang || null, req.method, req.originalUrl.slice(0, 300), res.statusCode, Date.now() - t0,
            JSON.stringify(schoon(req.method === 'GET' ? req.query : req.body || {}, info?.naam, info?.alias)), JSON.stringify(schoon(body ?? null, info?.naam, info?.alias))]);
      })().catch((e) => console.error('[logboek]', e.message));
    });
    next();
  };
}

// ---- 2. elke AI-aanroep (vanuit src/ai.js) ----
const bekend = new Set();
export async function logAI({ system, messages, antwoord, model, effort, usage, ms, uitCache, fout, doel }) {
  try {
    if (process.env.LOGBOEK === '0') return;
    const st = kidStore.getStore();
    const test = !!st?.cache;
    if (test && process.env.AI_LOG_TEST !== '1') return; // de Max-test bewaart zijn eigen resultaten al (public.max_audit)
    const info = await kindInfo(st?.kid);
    if (info && !info.mag) return;
    const hash = crypto.createHash('sha256').update(String(system)).digest('hex').slice(0, 32);
    if (!bekend.has(hash)) { await pool.query('INSERT INTO public.ai_prompt(hash, tekst) VALUES ($1,$2) ON CONFLICT DO NOTHING', [hash, String(system)]); bekend.add(hash); }
    const zonderPlaatje = (messages || []).map((m) => ({ ...m, content: typeof m.content === 'string' ? m.content : schoon(m.content) }));
    await pool.query(`INSERT INTO public.ai_log(kid_id, alias, lang, bron, doel, model, effort, prompt_hash, berichten, antwoord, invoer, cache, uitvoer, denk, ms, uit_cache, fout)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [info ? st.kid : null, info?.alias || null, info?.lang || st?.lang || null, test ? 'test' : 'app', String(doel || String(system).split('\n')[0]).slice(0, 120), model || null, effort || null, hash,
        JSON.stringify(schoon(zonderPlaatje, info?.naam, info?.alias)), JSON.stringify(schoon(antwoord ?? null, info?.naam, info?.alias)),
        usage?.prompt_tokens ?? null, usage?.prompt_tokens_details?.cached_tokens ?? null, usage?.completion_tokens ?? null, usage?.completion_tokens_details?.reasoning_tokens ?? null,
        ms ?? null, !!uitCache, fout || null]);
  } catch (e) { console.error('[ai-log]', e.message); }
}

// ---- export voor analyse (beheerder, /audit/logboek.json) ----
export async function logboekExport({ soort = 'api', dagen = 7, kid = null, limiet = 20000 } = {}) {
  const d = String(Math.max(1, Math.min(3650, Number(dagen) || 7)));
  const k = kid ? Number(kid) : null;
  if (soort === 'ai') {
    const rows = (await pool.query(`SELECT * FROM public.ai_log WHERE created_at > now() - ($1 || ' days')::interval AND ($2::int IS NULL OR kid_id = $2) ORDER BY id LIMIT $3`, [d, k, limiet])).rows;
    const hashes = [...new Set(rows.map((r) => r.prompt_hash))];
    const prompts = hashes.length ? Object.fromEntries((await pool.query('SELECT hash, tekst FROM public.ai_prompt WHERE hash = ANY($1)', [hashes])).rows.map((r) => [r.hash, r.tekst])) : {};
    return { soort, dagen: Number(d), prompts, rijen: rows };
  }
  const rows = (await pool.query(`SELECT * FROM public.logboek WHERE created_at > now() - ($1 || ' days')::interval AND ($2::int IS NULL OR kid_id = $2) ORDER BY id LIMIT $3`, [d, k, limiet])).rows;
  return { soort, dagen: Number(d), rijen: rows };
}
export async function logboekTelling() {
  const r = (await pool.query(`SELECT (SELECT COUNT(*) FROM public.logboek WHERE created_at > now() - interval '7 days')::int AS api7,
    (SELECT COUNT(*) FROM public.ai_log WHERE created_at > now() - interval '7 days')::int AS ai7,
    (SELECT COUNT(*) FROM public.logboek)::int AS api, (SELECT COUNT(*) FROM public.ai_log)::int AS ai`).catch(() => ({ rows: [{}] }))).rows[0];
  return r;
}
