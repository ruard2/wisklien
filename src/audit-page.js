// HTML voor de Max-test (/audit): lijst met tests en het rapport per test. Alleen voor de beheerder.
import { itemScore } from './audit.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
:root{--bg:#f6f5fb;--card:#fff;--ink:#1d1838;--muted:#6b6788;--line:#e4e0f5;--p:#5b3df5;--good:#12a150;--bad:#e5484d;--warn:#e07b00}
@media (prefers-color-scheme:dark){:root{--bg:#14121f;--card:#1e1b2e;--ink:#eeeaff;--muted:#a19cc0;--line:#2e2a45}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:980px;margin:0 auto;padding:20px 16px 60px}h1{margin:.2em 0}h2{margin:1.4em 0 .5em}h3{margin:.8em 0 .3em;font-size:15px}
a{color:var(--p)}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:10px 0}
.muted{color:var(--muted)}.small{font-size:13px}table{border-collapse:collapse;width:100%}td,th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:12px;color:var(--muted);font-weight:600}.num{text-align:right;font-variant-numeric:tabular-nums}
.s1,.s2{color:var(--bad);font-weight:700}.s3{color:var(--warn);font-weight:700}.s4,.s5{color:var(--good);font-weight:700}
.chip{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;background:var(--line);margin:0 4px 2px 0}.chip.bad{background:#fde4e4;color:#a1161b}.chip.warn{background:#fff1d6;color:#8a4b00}
details>summary{cursor:pointer;list-style:none}details>summary::-webkit-details-marker{display:none}
.item>summary{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.score{min-width:40px;font-weight:800}
.bubble{border-radius:12px;padding:8px 12px;margin:6px 0;white-space:pre-wrap}.max{background:#ece8ff}.kid{background:#e8f6ee;margin-left:40px}
@media (prefers-color-scheme:dark){.max{background:#2a2450}.kid{background:#173226}.chip.bad{background:#4a1c1f;color:#ffb4b6}.chip.warn{background:#46300f;color:#ffd18a}}
ol,ul{margin:4px 0 4px 20px;padding:0}.prob{border-left:3px solid var(--warn);padding:4px 10px;margin:6px 0}.prob.e3{border-color:var(--bad)}.prob.e1{border-color:var(--line)}
form.inline{display:inline}button,select,input{font:inherit;padding:6px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink)}button{background:var(--p);color:#fff;border:0;cursor:pointer}
.bar{height:8px;background:var(--line);border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:var(--p)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.grid div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}.grid b{display:block;font-size:22px}
`;
export const page = (title, body, refresh = 0) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${refresh ? `<meta http-equiv="refresh" content="${refresh}">` : ''}<meta name="robots" content="noindex"><style>${CSS}</style></head><body><main>${body}</main></body></html>`;

const sc = (v) => (typeof v === 'number' ? `<span class="s${Math.round(v)}">${v.toFixed ? (Number.isInteger(v) ? v : v.toFixed(1)) : v}</span>` : '<span class="muted">–</span>');
const DIMS = [['som', 'Som'], ['stappenplan', 'Stappenplan'], ['tussenstappen', 'Tussenstappen'], ['tips', 'Tips'], ['max_begin', 'Max vooraf'], ['max_na_fout', 'Max na fout'], ['max_stap', 'Max bij stap'], ['samenhang', 'Samenhang'], ['taal', 'Taal']];
const avg = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function loginPage(err = '', noPin = false) {
  return page('Max-test', `<h1>🧪 Max-test</h1><div class="card">${noPin
    ? '<p>Zet eerst <code>PARENT_PIN</code> in de omgeving (Railway → Variables). Met die beheerderspincode open je deze pagina.</p>'
    : `<form method="post" action="/audit/login"><p>Beheerderspincode (PARENT_PIN):</p><input type="password" name="pin" autofocus> <button>Open</button></form>${err ? `<p class="s1">${esc(err)}</p>` : ''}`}</div>`);
}

export function listPage(jobs, { ai, model, judge }) {
  const rows = jobs.map((j) => `<tr><td><a href="/audit/${j.id}">#${j.id}</a></td><td>${new Date(j.created_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</td><td>${j.lang === 'af' ? '🇿🇦 AF' : '🇳🇱 NL'}</td><td>${j.soort === 'meetlat' ? '📏 meetlat' : '🎲 willekeurig'}${j.versie ? ` <span class="small muted">${esc(j.versie)}</span>` : ''}</td>
    <td class="num">${j.done}/${j.n}</td><td>${esc(j.status)}${j.error ? ` <span class="muted small">${esc(j.error)}</span>` : ''}</td><td class="small muted">${esc(j.model || '')}${j.judge_model && j.judge_model !== j.model ? ` · beoordelaar ${esc(j.judge_model)}` : ''}${j.kid_model ? ` · kind ${esc(j.kid_model)}` : ''}</td></tr>`).join('');
  return page('Max-test', `<h1>🧪 Max-test</h1>
    <p class="muted">De échte Meester Max (zelfde prompts en model als in de app) krijgt een stapel sommen: "Hoe begin ik?", een fout antwoord met een kort gesprek, en vastlopen bij een tussenstap. Alles wordt bewaard en door een AI-beoordelaar nagekeken. Kinderen en ouders zien hier niets van.</p>
    <div class="card"><form method="post" action="/audit/start">
      <b>Nieuwe test</b><br><br>
      Taal <select name="lang"><option value="nl">Nederlands</option><option value="af">Afrikaans</option></select>
      &nbsp; Soort <select name="soort"><option value="meetlat">📏 Meetlat (alle sjablonen, vast)</option><option value="willekeurig">🎲 Willekeurige sommen</option></select>
      &nbsp; Aantal <select name="n">${[10, 25, 50, 100, 150, 200].map((n) => `<option ${n === 100 ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <details style="margin-top:10px"><summary class="small"><b>Modellen</b> (goedkoper testen)</summary>
        <div class="small" style="display:grid;gap:6px;margin-top:8px;grid-template-columns:auto 1fr;align-items:center">
          <span>Max</span><input name="max" list="modellen" placeholder="leeg = ${esc(model || 'model van de app')}">
          <span>Beoordelaar</span><input name="judge" list="modellen" placeholder="leeg = ${esc(judge || 'zelfde als Max')}">
          <span>Gespeeld kind</span><input name="kid" list="modellen" placeholder="leeg = zelfde als Max">
        </div>
        <datalist id="modellen">${['gpt-5.4-mini', 'gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-5.5', 'gpt-6-luna'].map((m) => `<option value="${m}">`).join('')}</datalist>
        <p class="small muted">Max op een ander model testen verandert niets in de app: zo zie je op de meetlat of een goedkoper model goed genoeg uitlegt, vóór je het in de app zet (OPENAI_MODEL op Railway).</p>
      </details>
      <br><button ${ai ? '' : 'disabled'}>Start</button>
      <p class="small muted"><b>Meetlat</b>: elke soort som één keer, steeds precies dezelfde sommen, foute antwoorden en kind-reacties (± 160 gevallen; het aantal telt dan niet). Daarmee vergelijk je versies eerlijk. <b>Willekeurig</b>: nieuwe sommen, om dingen te vinden die de meetlat mist.</p>
      <p class="small muted">Model: ${esc(model || 'AI staat uit')}${judge ? ` · beoordelaar: ${esc(judge)}` : ''}. Per som ± 7 AI-aanroepen; 100 sommen duurt ± 20-40 minuten. Je kunt deze pagina sluiten: de test loopt door op de server.</p>
    </form></div>
    ${jobs.filter((j) => j.soort === 'meetlat' && j.status === 'klaar').length >= 2 ? `<div class="card"><form method="get" action="/audit/vergelijk"><b>Twee meetlat-runs vergelijken</b><br><br>
      Oud <select name="a">${jobs.filter((j) => j.soort === 'meetlat').map((j, i) => `<option value="${j.id}" ${i === 1 ? 'selected' : ''}>#${j.id} ${j.lang.toUpperCase()} ${esc(j.versie || '')}</option>`).join('')}</select>
      &nbsp; Nieuw <select name="b">${jobs.filter((j) => j.soort === 'meetlat').map((j, i) => `<option value="${j.id}" ${i === 0 ? 'selected' : ''}>#${j.id} ${j.lang.toUpperCase()} ${esc(j.versie || '')}</option>`).join('')}</select>
      &nbsp; <button>Vergelijk</button></form></div>` : ''}
    ${jobs.length ? `<div class="card"><table><tr><th>Test</th><th>Gestart</th><th>Taal</th><th>Soort</th><th class="num">Klaar</th><th>Status</th><th>Model</th></tr>${rows}</table></div>` : ''}
    <p class="small"><form class="inline" method="post" action="/audit/logout"><button style="background:var(--line);color:var(--ink)">Uitloggen</button></form></p>`);
}

function probHTML(p) {
  return `<div class="prob e${p.ernst || 2}"><span class="chip">${esc(p.waar)}</span><span class="chip ${p.ernst >= 3 ? 'bad' : p.ernst === 2 ? 'warn' : ''}">${esc(p.soort)}</span>
    ${p.citaat ? `<div class="small muted">“${esc(p.citaat)}”</div>` : ''}<div>${esc(p.uitleg)}</div>${p.voorstel ? `<div class="small"><b>Voorstel:</b> ${esc(p.voorstel)}</div>` : ''}</div>`;
}
function itemHTML(it, i) {
  const v = it.verdict || {}, c = v.cijfers || {};
  const s = itemScore(it);
  const flags = [
    (v.rekenfouten || []).length ? `<span class="chip bad">${v.rekenfouten.length} rekenfout</span>` : '',
    v.max_verklapt ? '<span class="chip bad">verklapt</span>' : '',
    v.max_herkent_fout === false ? '<span class="chip warn">fout niet herkend</span>' : '',
    it.rekencontrole?.length ? `<span class="chip warn">rekencontrole ${it.rekencontrole.length}</span>` : '',
    it.fouten?.length ? `<span class="chip bad">${it.fouten.length} AI-fout</span>` : '',
  ].join('');
  const turns = (it.gesprekken?.na_fout || []).map((t) => `<div class="bubble ${t.wie === 'max' ? 'max' : 'kid'}">${t.wie === 'max' ? '🧑‍🏫 ' : '🧒 '}${esc(t.tekst)}${t.vorm ? ` <span class="small muted">[${esc(t.vorm)}]</span>` : ''}</div>`).join('');
  const st = it.gesprekken?.stap;
  return `<details class="card item" id="som-${i}"><summary><span class="score">${sc(Math.max(1, Math.min(5, s)))}</span><b>${esc(it.label)}</b><span class="muted">${esc(it.levelName)}</span><span>${esc(it.som.replace(/^Som: /, '').slice(0, 90))}</span>${flags}</summary>
    <p class="small muted">${esc(v.oordeel || '')}</p>
    <table class="small"><tr>${DIMS.map(([, l]) => `<th>${l}</th>`).join('')}</tr><tr>${DIMS.map(([k]) => `<td>${sc(c[k])}</td>`).join('')}</tr></table>
    ${(v.rekenfouten || []).map((r) => probHTML({ waar: r.waar, soort: 'rekenfout', ernst: 3, citaat: r.citaat, uitleg: r.uitleg })).join('')}
    ${(v.problemen || []).map(probHTML).join('')}
    <h3>De som</h3><div style="white-space:pre-wrap">${esc(it.som)}</div>${it.opties ? `<div class="small">Keuzes: ${it.opties.map(esc).join(' · ')}</div>` : ''}<div>Antwoord: <b>${esc(it.antwoord)}</b></div>
    <h3>Stappenplan</h3><ol>${(it.stappenplan || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    ${it.hints?.length ? `<h3>Hints</h3><ol>${it.hints.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${it.tussenstappen?.length ? `<h3>Tussenstappen</h3><ol>${it.tussenstappen.map((x) => `<li>${esc(x.vraag)} → <b>${esc(x.antwoord)}</b>${x.tip ? `<div class="small muted">tip: ${esc(x.tip)}</div>` : ''}</li>`).join('')}</ol>${it.slot ? `<div class="small">Slot: ${esc(it.slot)}</div>` : ''}` : ''}
    <h3>Vóór het antwoord</h3><div class="bubble kid">🧒 ${esc(it.gesprekken?.begin?.kind)}</div><div class="bubble max">🧑‍🏫 ${esc(it.gesprekken?.begin?.max ?? '(geen antwoord)')}</div>
    <h3>Na een fout antwoord: “${esc(it.fout_antwoord?.gegeven)}”</h3>
    <div class="small muted">${it.fout_antwoord?.herkend ? `Herkende denkfout: ${esc(it.fout_antwoord.herkend.label)} — ${esc(it.fout_antwoord.herkend.wat_helpt)}` : `Geen bekende denkfout (${esc(it.fout_antwoord?.soort)})`}</div>${turns}
    ${st ? `<h3>Vast bij tussenstap ${st.stap}: ${esc(st.vraag)}</h3><div class="small muted">Goed: ${esc(st.goed)} · kind vulde in: ${esc(st.gegeven)} · tip van de app: ${esc(st.tip || '–')}</div>
      <div class="bubble kid">🧒 ${esc(st.kind)}</div><div class="bubble max">🧑‍🏫 ${esc(st.max ?? '(geen antwoord)')}</div>` : ''}
    ${it.rekencontrole?.length ? `<h3>Rekencontrole (code)</h3><ul class="small">${it.rekencontrole.map((r) => `<li>[${esc(r.waar)}] ${esc(r.expr)} — links is ${esc(r.verwacht)}${r.keten ? ' (is-teken-ketting)' : ''}</li>`).join('')}</ul>` : ''}
    ${it.fouten?.length ? `<h3>Fouten bij AI-aanroepen</h3><ul class="small">${it.fouten.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </details>`;
}

export function reportPage(job, items, nParts = 0) {
  const judged = items.filter((it) => it.verdict?.cijfers);
  const byCat = {};
  for (const it of judged) (byCat[it.label] ||= []).push(it);
  const dimAvg = Object.fromEntries(DIMS.map(([k]) => [k, avg(judged.map((it) => it.verdict.cijfers[k]))]));
  const rek = judged.reduce((a, it) => a + (it.verdict.rekenfouten?.length ? 1 : 0), 0);
  const verklapt = judged.filter((it) => it.verdict.max_verklapt).length;
  const gemist = judged.filter((it) => it.verdict.max_herkent_fout === false).length;
  const herkenbaar = judged.filter((it) => it.fout_antwoord?.herkend).length;
  const soorten = {};
  for (const it of judged) for (const p of it.verdict.problemen || []) { const k = `${p.waar} · ${p.soort}`; soorten[k] = (soorten[k] || 0) + 1; }
  const S = job.summary;
  const pct = job.n ? Math.round((100 * items.length) / job.n) : 0;
  const running = job.status === 'bezig';
  const sorted = [...items].map((it, i) => ({ it, i })).sort((a, b) => itemScore(a.it) - itemScore(b.it));
  const body = `<p><a href="/audit">‹ Alle tests</a></p>
    <h1>🧪 Max-test #${job.id} · ${job.lang === 'af' ? 'Afrikaans' : 'Nederlands'} · ${job.soort === 'meetlat' ? '📏 meetlat' : '🎲 willekeurig'}</h1>
    ${job.versie ? `<p class="small muted">Versie van de app: ${esc(job.versie)}</p>` : ''}
    <p class="muted">${new Date(job.created_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })} · ${esc(job.model || '')}${job.judge_model && job.judge_model !== job.model ? ` · beoordelaar ${esc(job.judge_model)}` : ''} · status: <b>${esc(job.status)}</b>
      ${running ? ` · <form class="inline" method="post" action="/audit/${job.id}/stop"><button style="padding:2px 10px">Stop</button></form>` : `${job.status !== 'klaar' ? ` · <form class="inline" method="post" action="/audit/${job.id}/verder"><button style="padding:2px 10px">Verder</button></form>` : ''} · <form class="inline" method="post" action="/audit/${job.id}/delete" onsubmit="return confirm('Test verwijderen?')"><button style="padding:2px 10px;background:var(--bad)">Verwijder</button></form>`}</p>
    ${job.error ? `<div class="card"><b class="s1">Gestopt door een fout:</b> ${esc(job.error)}<br><span class="small muted">Met "Verder" gaat de test door; sommen die al klaar zijn, blijven staan.</span></div>` : ''}
    ${items.length ? `<div class="card"><b>⬇️ Downloaden voor Claude</b> <span class="small muted">(compact, in delen van ± 100 kB zodat ze als bijlage passen; stuur ze allemaal)</span><br>
      ${Array.from({ length: nParts }, (_, i) => `<a href="/audit/${job.id}/deel/${i + 1}">deel ${i + 1}</a>`).join(' · ')}
      <span class="small muted"> · of <a href="/audit/${job.id}.json">alles in één bestand</a></span></div>` : ''}
    ${running ? `<div class="card"><b>Bezig: ${items.length} van ${job.n} sommen</b><div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div><p class="small muted">Deze pagina ververst vanzelf.</p></div>` : ''}
    ${S ? `<h2>Samenvatting</h2><div class="card"><p>${esc(S.samenvatting)}</p>
      ${S.wat_goed_gaat?.length ? `<p><b>Wat goed gaat:</b> ${S.wat_goed_gaat.map(esc).join(' · ')}</p>` : ''}</div>
      <h2>Verbeterpunten</h2>${(S.verbeterpunten || []).map((p, i) => `<div class="card"><b>${i + 1}. ${esc(p.titel)}</b> <span class="chip">${esc(p.waar)}</span> <span class="chip warn">${esc(p.hoe_vaak)}</span>
        ${p.voorbeeld ? `<div class="small muted">“${esc(p.voorbeeld)}”</div>` : ''}<div>${esc(p.oplossing)}</div></div>`).join('')}
      ${S.onderdelen_slechtst?.length ? `<h2>Onderdelen die het slechtst gaan</h2><div class="card"><ul>${S.onderdelen_slechtst.map((o) => `<li><b>${esc(o.onderdeel)}</b>: ${esc(o.waarom)}</li>`).join('')}</ul></div>` : ''}` : ''}
    <h2>Cijfers</h2>
    <div class="grid">
      <div><b>${judged.length}</b><span class="small muted">sommen beoordeeld</span></div>
      <div><b class="${rek ? 's1' : 's5'}">${rek}</b><span class="small muted">sommen met een rekenfout</span></div>
      <div><b class="${verklapt ? 's2' : 's5'}">${verklapt}</b><span class="small muted">keer antwoord verklapt</span></div>
      <div><b class="${gemist ? 's3' : 's5'}">${gemist}</b><span class="small muted">fout niet herkend door Max</span></div>
      <div><b>${herkenbaar}</b><span class="small muted">fouten herkend door de app</span></div>
    </div>
    <div class="card"><table><tr>${DIMS.map(([, l]) => `<th>${l}</th>`).join('')}</tr><tr>${DIMS.map(([k]) => `<td>${sc(dimAvg[k])}</td>`).join('')}</tr></table></div>
    <h2>Per onderdeel</h2><div class="card"><table><tr><th>Onderdeel</th><th class="num">Sommen</th>${DIMS.map(([, l]) => `<th>${l}</th>`).join('')}<th class="num">Rekenfout</th></tr>
      ${Object.entries(byCat).sort((a, b) => avg(a[1].map(itemScore)) - avg(b[1].map(itemScore))).map(([l, its]) => `<tr><td>${esc(l)}</td><td class="num">${its.length}</td>${DIMS.map(([k]) => `<td>${sc(avg(its.map((it) => it.verdict.cijfers[k])))}</td>`).join('')}<td class="num">${its.filter((it) => it.verdict.rekenfouten?.length).length || ''}</td></tr>`).join('')}</table></div>
    <h2>Meest gevonden problemen</h2><div class="card"><table>${Object.entries(soorten).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `<tr><td>${esc(k)}</td><td class="num">${n}×</td></tr>`).join('')}</table></div>
    <h2>Alle sommen <span class="muted small">(slechtste eerst, klik om te openen)</span></h2>
    ${sorted.map(({ it, i }) => itemHTML(it, i)).join('')}`;
  return page(`Max-test #${job.id}`, body, running ? 20 : 0);
}

// Twee meetlat-runs naast elkaar: wat werd beter, wat slechter?
export function comparePage(A, B, v) {
  const L = { som: 'Som', stappenplan: 'Stappenplan', tussenstappen: 'Tussenstappen', tips: 'Tips', max_begin: 'Max vooraf', max_na_fout: 'Max na fout', max_stap: 'Max bij stap', samenhang: 'Samenhang', taal: 'Taal' };
  const fmt = (x) => (x == null ? '–' : x.toFixed(2));
  const delta = (a, b, lagerBeter = false) => { if (a == null || b == null) return ''; const d = b - a; const goed = lagerBeter ? d < 0 : d > 0; return Math.abs(d) < 0.05 ? '<span class="muted">=</span>' : `<b class="${goed ? 's5' : 's1'}">${d > 0 ? '+' : ''}${Number.isInteger(d) ? d : fmt(d)}</b>`; };
  const rij = (x) => `<tr><td>${x.goud ? '⭐ ' : ''}<b>${esc(x.label)}</b> <span class="muted">${esc(x.levelName)}</span><div class="small muted">${esc(String(x.som).replace(/^Som: /, '').slice(0, 110))}</div>
    <div class="small">A: ${esc(x.oordeelA || '')}</div><div class="small">B: ${esc(x.oordeelB || '')}</div></td><td class="num">${fmt(x.a)}</td><td class="num">${fmt(x.b)}</td><td class="num">${delta(x.a, x.b)}</td></tr>`;
  const body = `<p><a href="/audit">‹ Alle tests</a></p><h1>📏 Meetlat: #${A.id} → #${B.id}</h1>
    <p class="muted">${A.lang === B.lang ? (A.lang === 'af' ? 'Afrikaans' : 'Nederlands') : '⚠️ verschillende talen'} · ${v.n} gevallen in allebei · A: ${esc(A.versie || '?')} (${esc(A.model || '')}) · B: ${esc(B.versie || '?')} (${esc(B.model || '')})</p>
    <div class="card"><table><tr><th></th><th class="num">A (oud)</th><th class="num">B (nieuw)</th><th class="num">verschil</th></tr>
      ${Object.entries(v.dims).map(([k, d]) => `<tr><td>${L[k]}</td><td class="num">${fmt(d.a)}</td><td class="num">${fmt(d.b)}</td><td class="num">${delta(d.a, d.b)}</td></tr>`).join('')}
      <tr><td>Sommen met een rekenfout</td><td class="num">${v.tellers.rekenfout.a}</td><td class="num">${v.tellers.rekenfout.b}</td><td class="num">${delta(v.tellers.rekenfout.a, v.tellers.rekenfout.b, true)}</td></tr>
      <tr><td>Antwoord verklapt</td><td class="num">${v.tellers.verklapt.a}</td><td class="num">${v.tellers.verklapt.b}</td><td class="num">${delta(v.tellers.verklapt.a, v.tellers.verklapt.b, true)}</td></tr>
      <tr><td>Fout niet herkend</td><td class="num">${v.tellers.nietHerkend.a}</td><td class="num">${v.tellers.nietHerkend.b}</td><td class="num">${delta(v.tellers.nietHerkend.a, v.tellers.nietHerkend.b, true)}</td></tr></table>
      <p class="small muted">Let op: de beoordelaar is ook een AI en wisselt een beetje per keer. Verschillen kleiner dan ± 0,2 zijn ruis; kijk vooral naar de gevallen hieronder.</p></div>
    ${v.goud.length ? `<h2>⭐ Gouden gevallen (fouten die we eerder zagen)</h2><div class="card"><table><tr><th>Geval</th><th class="num">A</th><th class="num">B</th><th class="num">±</th></tr>${v.goud.map(rij).join('')}</table></div>` : ''}
    <h2>Slechter geworden (${v.slechter.length})</h2><div class="card">${v.slechter.length ? `<table><tr><th>Geval</th><th class="num">A</th><th class="num">B</th><th class="num">±</th></tr>${v.slechter.map(rij).join('')}</table>` : '<p class="muted">Niets duidelijk slechter. 🎉</p>'}</div>
    <h2>Beter geworden (${v.beter.length})</h2><div class="card">${v.beter.length ? `<table><tr><th>Geval</th><th class="num">A</th><th class="num">B</th><th class="num">±</th></tr>${v.beter.map(rij).join('')}</table>` : '<p class="muted">Niets duidelijk beter.</p>'}</div>`;
  return page(`Meetlat #${A.id} → #${B.id}`, body);
}
