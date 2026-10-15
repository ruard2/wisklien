// Leerlog: elke interactie (antwoord, gesprek met Max, les, uitleg van het kind, feedback) in één centrale
// tabel public.leerlog, om de app en de AI-leraar te verbeteren. Per kind met taal, land, groep/graad en
// leeftijd, maar ZONDER echte naam: alleen de schuilnaam (dezelfde die de AI ziet). Ouders kunnen het
// uitzetten ("Help de app verbeteren" in het ouderscherm); dan wordt er voor dat kind niets gelogd.
import { pool, kidStore, getKid, getSetting } from './db.js';
import { aliasFor } from './ai.js';

export async function migrateLeerlog() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.leerlog (
      id bigserial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      kid_id int NOT NULL,
      alias text NOT NULL,
      lang text, country text, grade int, age int,
      kind text NOT NULL,          -- antwoord | gesprek | les | uitleg | reflectie | feedback | ouder_feedback
      cat text, level int, session_id int,
      data jsonb NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS leerlog_time ON public.leerlog (created_at);
    CREATE INDEX IF NOT EXISTS leerlog_kind ON public.leerlog (kind, created_at);
  `);
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Nooit iets laten mislukken door het loggen: fouten alleen in de serverlog.
export async function logEvent(kind, data = {}, meta = {}) {
  try {
    const st = kidStore.getStore();
    if (!st?.kid) return;
    if ((await getSetting('research', true)) === false) return;
    const k = await getKid(st.kid);
    if (!k) return;
    const alias = aliasFor(k.id);
    let json = JSON.stringify(data);
    // de echte naam (ook in getypte tekst van het kind) vervangen door de schuilnaam
    if (k.name && k.name.length >= 2) json = json.replace(new RegExp(`\\b${escRe(k.name)}\\b`, 'gi'), alias);
    await pool.query(`INSERT INTO public.leerlog(kid_id, alias, lang, country, grade, age, kind, cat, level, session_id, data)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [k.id, alias, k.lang || 'nl', k.country || 'NL', k.grade ?? null, k.age ?? null, kind, meta.cat ?? null, meta.level ?? null, meta.session ?? null, json]);
  } catch (e) { console.error('[leerlog]', e.message); }
}
