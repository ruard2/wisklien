// Rekenapp groep 8 — één pagina, geen build-stap.
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const $toast = document.getElementById('toast');

// ---------- hulpjes ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => withModels(esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));
const euro = (cents) => '€ ' + (cents / 100).toFixed(2).replace('.', ',');
const cents = (c) => (Math.round(c * 10) / 10).toString().replace('.', ',') + ' cent';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const LEVEL = ['groep 5', 'groep 6', 'groep 7', 'groep 8'];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
function toast(msg, ms = 2800) {
  $toast.textContent = msg; $toast.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => ($toast.hidden = true), ms);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#5b3df5', '#f5b100', '#12a150', '#e5484d', '#00b3ff'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = 1.2 + Math.random() * 1 + 's';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2800);
}
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
function sheet(html, onBind) {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet stack">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.onclick = (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); };
  onBind?.(bg, close);
  return close;
}

// Eigen ja/nee-popup (de standaard browser-confirm wordt soms geblokkeerd, bv. in een app op je telefoon)
function ask(html, yes = 'Ja', no = 'Nee', danger = false) {
  return new Promise((resolve) => {
    let done = false;
    const close = sheet(`<div style="text-align:center">${html}</div>
      <button class="btn block ${danger ? '' : 'good'}" data-yes ${danger ? 'style="background:var(--bad);box-shadow:none"' : ''}>${yes}</button>
      <button class="btn ghost block" data-no>${no}</button>`, (bg, closeFn) => {
      bg.querySelector('[data-yes]').onclick = () => { done = true; closeFn(); resolve(true); };
      bg.querySelector('[data-no]').onclick = () => { done = true; closeFn(); resolve(false); };
      bg.addEventListener('click', (e) => { if (e.target === bg && !done) resolve(false); });
    });
    void close;
  });
}

// ---------- voorlezen (gratis, in de browser) ----------
const ORD = { 2: 'halve', 3: 'derde', 4: 'vierde', 5: 'vijfde', 6: 'zesde', 7: 'zevende', 8: 'achtste', 9: 'negende', 10: 'tiende', 11: 'elfde', 12: 'twaalfde', 20: 'twintigste', 100: 'honderdste' };
const UNIT = { km: 'kilometer', m: 'meter', dm: 'decimeter', cm: 'centimeter', mm: 'millimeter' };
function speakable(t) {
  return String(t)
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/(\d{1,2}):(\d{2})/g, (m, h, mi) => `${h} uur ${mi === '00' ? '' : mi}`)
    .replace(/(\d+) 1\/2\b/g, '$1 en een half')
    .replace(/(\d+) (\d+)\/(\d+)/g, (m, w, a, b) => `${w} en ${a} ${ORD[b] || b + 'ste'}`)
    .replace(/\b1\/2\b/g, 'een half')
    .replace(/(\d+)\/(\d+)/g, (m, a, b) => `${a} ${ORD[b] || b + 'ste'}`)
    .replace(/€\s?(\d+),(\d\d)/g, (m, e, c) => (c === '00' ? `${e} euro` : `${e} euro ${Number(c)}`))
    .replace(/€\s?(\d+)/g, '$1 euro')
    .replace(/(\d),(\d)/g, '$1 komma $2')
    .replace(/×/g, ' keer ').replace(/ : /g, ' gedeeld door ').replace(/−/g, ' min ').replace(/\+/g, ' plus ').replace(/=/g, ' is ')
    .replace(/%/g, ' procent').replace(/°C/g, ' graden').replace(/°/g, ' graden')
    .replace(/\b(km|dm|cm|mm|m)([²³])/g, (x, u, p) => ` ${p === '²' ? 'vierkante' : 'kubieke'} ${UNIT[u]}`)
    .replace(/\.\.\./g, ' hoeveel ').replace(/…/g, ' ');
}
function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return toast('Voorlezen werkt niet op dit apparaat.');
    if (synth.speaking) { synth.cancel(); return; }
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = 'nl-NL'; u.rate = 0.92;
    const v = synth.getVoices().find((x) => x.lang?.toLowerCase().startsWith('nl'));
    if (v) u.voice = v;
    synth.speak(u);
  } catch { toast('Voorlezen lukt nu niet.'); }
}
const speakBtn = (text, small = false) => `<button class="speak ${small ? 'sm' : ''}" data-speak="${esc(text)}" aria-label="Voorlezen">🔊</button>`;
function bindSpeak(root) { root.querySelectorAll('[data-speak]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.speak); })); }
const hintHTML = (h) => `<div class="hint">💡 ${esc(h).replace(/\n/g, '<br>')}</div>`;

// ---------- humor ----------
const MOPPEN = [
  ['Wat zei de 0 tegen de 8?', 'Mooie riem! 😎'],
  ['Waarom was het rekenboek verdrietig?', 'Het zat vol problemen. 📚'],
  ['Waarom ging de breuk naar de dokter?', 'Hij voelde zich niet helemaal heel. 🤒'],
  ['Wat is het lievelingseten van een rekenaar?', 'Pi-zza. 🍕'],
  ['Waarom nam Sem een ladder mee naar de rekenles?', 'Hij wilde naar een hoger niveau. 🪜'],
  ['Wat doet een 8 als hij moe is?', 'Even liggen: ∞ 😴'],
  ['Waarom maakt een cirkel nooit ruzie?', 'Hij heeft geen zin in hoeken. ⭕'],
  ['Wat zegt een kommagetal dat te laat komt?', '"Sorry, ik zat nog achter de komma!" ⏰'],
  ['Waarom is een rechthoek nooit verdrietig?', 'Hij heeft vier rechte hoeken om op te leunen. 📐'],
  ['Hoe noem je een vierkant dat sport?', 'Een fit-kant. 💪'],
  ['Waarom kon de 7 niet slapen?', 'Hij lag te piekeren over de 8 die net op bezoek was. 🛏️'],
  ['Wat is de favoriete muziek van een driehoek?', 'Alles met 3 akkoorden. 🎸'],
  ['Waarom houdt een liniaal nooit op met praten?', 'Hij weet van alles de lengte. 📏'],
  ['Wat zei de procent tegen de taart?', '"Ik neem er 100% van." 🎂'],
];
const mop = () => MOPPEN[Math.floor(Math.random() * MOPPEN.length)];
const SUBLINES = ['Klaar om wat sommen een lesje te leren?', 'Je hersenen hebben zin in een workout. 🧠💪', 'Vandaag wordt een rekenmooie dag.', 'De sommen staan al te trillen van angst. 😱', 'Even je rekenspieren opwarmen?'];

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && data.error === 'login') { renderLogin(); throw new Error('login'); }
  if (res.status === 401 && data.error === 'kid') { renderWho(); throw new Error('login'); }
  if (!res.ok) { const e = new Error(data.error || 'Er ging iets mis'); e.status = res.status; e.data = data; throw e; }
  return data;
}

// Korte vaste uitleg per onderdeel (werkt ook zonder AI)
// "Zo pak je het aan": uit het didactisch handboek (server), op het niveau waarop het kind nu oefent.
// Overal dezelfde aanpak als in de hints, tussenstappen en bij Max.
function tipText(cat) {
  const a = STATE?.aanpak?.[cat];
  return a ? `${a.stappen.join(' ')} Bijvoorbeeld: ${a.voorbeeld}` : '';
}
function tipHTML(cat) {
  const a = STATE?.aanpak?.[cat];
  if (!a) return '';
  return `<p class="small muted" style="margin-top:4px">${esc(a.kern)}</p><ol class="steps" style="margin-top:6px">${a.stappen.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><p class="small" style="margin-top:6px"><b>Voorbeeld:</b> ${esc(a.voorbeeld)}</p>`;
}

// Groei-mindset: prijs de aanpak en de inzet, niet "slim zijn".
const PRAISE = {
  solo: ['Goed zo!', 'Knap uitgerekend!', 'Yes! Jouw aanpak werkt. 🎯', 'Netjes gedaan!', 'Helemaal goed!', 'Sterk gerekend! 💪',
    'Zo snel? Ben jij stiekem een rekenmachine? 🤖', 'Die som had geen schijn van kans. 🥊', 'Je brein draait overuren. Respect! 🧠', 'Boem! Raak. 🎯', 'Professor {naam} heeft gesproken. 🎓'],
  guided: ['Samen gelukt! Je deed alle stappen zelf. 🤝', 'Goed zo! Stap voor stap werkt.', 'Top! Zo bouw je het op.', 'Stapje voor stapje naar de top. 🧗'],
  retry: ['Kijk eens! Eerst fout, nu goed. Zo leer je! 🦸', 'Comeback! Nu snap je hem. 💪', 'Revanche genomen op die som! 😤'],
  double: ['Helemaal zelf én goed — dubbele centen! 🪙🪙', 'Zelf gedaan, dubbel verdiend! 🎯', 'Kassa! Dubbel zo rijk. 💰'],
  wrong: ['Nog niet goed — en dat is oké. Hiervan leer je.', 'Fout is niet erg: nu weet je wat je moet oefenen.',
    'Oeps! Die som was even stiekem. Zo zit hij in elkaar:', 'Je rekenhersenen waren nog aan het opwarmen. 🥶 Kijk:', 'Deze ging even mis, de volgende pakken we! 💪'],
  dunno: ['Eerlijk gezegd, knap! Dan leren we hem nu.', 'Weet je het niet? Prima, daar zijn we voor. 🙂', 'Goed dat je het zegt. Kijk even mee:'],
};

let STATE = null;

// ---------- router ----------
async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  $app.classList.remove('full');
  setTab(parts[0] || 'home');
  try {
    if (!parts.length) return await renderHome();
    if (parts[0] === 'voortgang') return parts[1] ? await renderCategory(parts[1]) : await renderProgress();
    if (parts[0] === 'spaarpot') return await renderPiggy();
    if (parts[0] === 'sessie') return await openSession(parts[1]);
    if (parts[0] === 'ouder') return await renderParent();
    if (parts[0] === 'overzicht') return await renderOverview();
    location.hash = '#/';
  } catch (e) {
    if (e.message !== 'login') { $app.innerHTML = `<div class="card"><h2>Oeps</h2><p class="muted">${esc(e.message)}</p><br><button class="btn" onclick="location.reload()">Opnieuw</button></div>`; }
  }
}
function setTab(name) {
  $tabs.hidden = name === 'sessie' || name === 'ouder' || name === 'overzicht';
  for (const a of $tabs.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === name);
}
window.addEventListener('hashchange', route);

// ---------- overzicht voor ouder/leerkracht: alle kinderen ----------
async function renderOverview() {
  let data;
  try { data = await api('/api/parent/all'); } catch (e) {
    if (e.status === 401) return pinScreen('Pincode voor ouder of leerkracht', async (pin) => { await api('/api/parent/login', { pin }); renderOverview(); });
    throw e;
  }
  const ago = (t) => {
    if (!t) return 'nog nooit';
    const d = Math.floor((Date.now() - new Date(t)) / 864e5);
    return d <= 0 ? 'vandaag' : d === 1 ? 'gisteren' : `${d} dagen geleden`;
  };
  const LV = ['g5', 'g6', 'g7', 'g8'];
  const TR = { vooruit: '↗', achteruit: '↘', gelijk: '→' };
  const ST = { nieuw: '🆕', 'mee bezig': '🔧', 'gaat beter': '📈', opgelost: '✅' };
  const kidCard = (k) => {
    const p = k.profile || {};
    const open = (p.zwakke_punten || []).filter((z) => z.status !== 'opgelost');
    const fixed = (p.zwakke_punten || []).filter((z) => z.status === 'opgelost');
    const weakest = [...k.stats].filter((s) => s.n).sort((a, b) => a.score - b.score).slice(0, 3);
    return `<div class="card stack ov-kid">
      <div class="row between"><div class="row"><span class="big-emoji" style="font-size:34px">${esc(k.avatar)}</span><div><h2 style="margin:0">${esc(k.name)}</h2>
        <div class="small muted">laatst geoefend: ${ago(k.lastActive)}${k.intakeDone ? '' : ' · starttoets nog niet af'}</div></div></div>
        <button class="btn ghost sm" data-open="${k.id}">Details ›</button></div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <span class="chip">📅 deze week: ${k.week.n} sommen${k.week.pct != null ? ` · ${k.week.pct}% goed` : ''}</span>
        <span class="chip">✅ ${k.sessions7} sessies</span><span class="chip">🔥 ${k.streak} ${k.streak === 1 ? 'dag' : 'dagen'}</span>
        <span class="chip coin">🪙 ${euro(k.wallet.balance)}</span>${k.reviewsOpen ? `<span class="chip">🔁 ${k.reviewsOpen} te herhalen</span>` : ''}
      </div>
      ${p.samenvatting ? `<p>${esc(p.samenvatting)}</p>` : `<p class="small muted">${data.ai ? 'Nog geen profiel: komt na de eerste sommen.' : 'AI staat uit: geen profiel.'}</p>`}
      ${open.length ? `<div><b>Werkt aan</b><ul class="ov-list">${open.slice(0, 5).map((z) => `<li><span title="${esc(z.status || '')}">${ST[z.status] || '•'}</span> <b>${esc(z.onderdeel)}</b>: ${esc(z.punt)}${z.bewijs ? `<div class="small muted">${esc(z.bewijs)}</div>` : ''}</li>`).join('')}</ul></div>` : ''}
      ${p.sterk?.length ? `<p class="small"><b>💪 Sterk:</b> ${p.sterk.map(esc).join(' · ')}</p>` : ''}
      ${fixed.length ? `<p class="small"><b>✅ Opgelost:</b> ${fixed.map((z) => esc(z.punt)).join(' · ')}</p>` : ''}
      ${(k.signals?.signals || []).some((s) => s.status === 'let op') ? `<div><b>🔧 Hoe leert ${esc(k.name)}</b><ul class="ov-list">${k.signals.signals.filter((s) => s.status === 'let op').map((s) => `<li>⚠️ <b>${esc(s.title)}</b><div class="small muted">${esc(s.evidence)}</div></li>`).join('')}</ul></div>` : ''}
      <details><summary class="small" style="font-weight:800;cursor:pointer">Hoe leert ${esc(k.name)}: alle signalen</summary>${signalsHTML(k.signals, data.teacher)}</details>
      <details><summary class="small" style="font-weight:800;cursor:pointer">Niveau per onderdeel</summary>
        <table class="list ov-levels">${k.stats.map((s) => `<tr><td>${esc(data.cats.find((c) => c.id === s.cat)?.icon || '')} ${esc(s.label)}</td>
          <td><span class="lv lv${s.levelIdx}">${LV[s.levelIdx]}</span></td><td class="small">${s.n ? `${s.pct14 ?? s.pct}%` : '–'}</td><td class="small" title="${esc(s.trend)}">${TR[s.trend] || ''}</td></tr>`).join('')}</table>
        <p class="small muted">g5–g8 = op welk groepsniveau er nu geoefend wordt · % goed (laatste 14 dagen) · pijl = trend</p></details>
      ${(k.misconceptions.length || k.scratchNotes.length || k.memory.length) ? `<details><summary class="small" style="font-weight:800;cursor:pointer">Denkfouten, kladblok en wat ${esc(data.teacher)} onthoudt</summary>
        ${k.misconceptions.length ? `<p class="small" style="margin-top:6px"><b>Denkfouten (30 dagen):</b> ${k.misconceptions.map((m) => `${esc(m.misconception)} (${m.n}×)`).join(' · ')}</p>` : ''}
        ${k.scratchNotes.map((n) => `<p class="small" style="margin-top:6px">✏️ ${esc(n.text)} → <b>${esc(n.given)}</b> ${n.correct ? '✅' : '❌'}<br><span class="muted">${esc(n.scratch_note)}</span></p>`).join('')}
        ${k.memory.length ? `<ul class="ov-list small">${k.memory.map((m) => `<li>${esc(m.n)} <span class="muted">(${esc(m.d)})</span></li>`).join('')}</ul>` : ''}</details>` : ''}
      ${!open.length && weakest.length && k.intakeDone ? `<p class="small"><b>Zwakste onderdelen nu:</b> ${weakest.map((s) => esc(s.label)).join(', ')}</p>` : ''}
    </div>`;
  };
  $app.innerHTML = `<div class="stack">
    <div class="row between"><a href="#/" class="small">‹ Terug</a><button class="btn ghost sm" data-logout>Uitloggen</button></div>
    <h1>👨‍🏫 Overzicht</h1>
    <p class="muted small">Alle kinderen op één plek. Het profiel en de zwakke punten houdt ${esc(data.teacher)} zelf bij (na elke sessie en elke 10 sommen). Namen gaan nooit naar de AI: die ziet alleen een schuilnaam.</p>
    ${data.kids.length ? data.kids.map(kidCard).join('') : '<div class="card"><p>Nog geen kinderen.</p></div>'}
  </div>`;
  $app.querySelectorAll('[data-open]').forEach((b) => (b.onclick = async () => { await api('/api/kids/select', { id: Number(b.dataset.open) }); location.hash = '#/ouder'; }));
  $app.querySelector('[data-logout]').onclick = async () => { await api('/api/parent/logout', {}); location.hash = '#/'; };
}

// ---------- rekenmodellen in de uitleg van Max (zoals de juf op het bord tekent) ----------
// Max schrijft bijv. [[strook: 3/4]]; dat wordt hier een plaatje. Zelfde modellen als op school.
const numNL = (x) => parseFloat(String(x).trim().replace(/\s/g, '').replace(',', '.'));
const fmtNL = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
const MODEL = {
  positieschema(arg) {
    const v = String(arg).trim().replace(/\s/g, '');
    const [heel, dec = ''] = v.split(',');
    const H = ['E', 'T', 'H', 'D', 'TD', 'HD', 'M'], HN = { E: 'eenheden', T: 'tientallen', H: 'honderdtallen', D: 'duizendtallen', TD: 'tienduizendtallen', HD: 'honderdduizendtallen', M: 'miljoenen' };
    const D = ['t', 'h', 'd'], DN = { t: 'tienden', h: 'honderdsten', d: 'duizendsten' };
    const hc = heel.split('').reverse().map((c, i) => [H[i], c]).reverse(), dc = dec.split('').map((c, i) => [D[i], c]);
    const cols = [...hc, ...(dc.length ? [[',', ',']] : []), ...dc];
    return `<table class="m-pos"><tr>${cols.map(([k]) => `<th title="${HN[k] || DN[k] || ''}">${k}</th>`).join('')}</tr><tr>${cols.map(([k, c]) => `<td class="${k === ',' ? 'komma' : ''}">${c}</td>`).join('')}</tr></table>
      <div class="m-leg">${cols.filter(([k]) => k !== ',').map(([k]) => `${k} = ${HN[k] || DN[k]}`).join(' · ')}</div>`;
  },
  strook(arg) {
    return String(arg).split(';').map((f) => {
      const m = f.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
      if (!m) return '';
      const k = +m[1], n = +m[2];
      if (!n || n > 24) return '';
      const W = 300, w = W / n, rows = Math.max(1, Math.ceil(k / n));
      let out = '';
      for (let r = 0; r < rows; r++) {
        out += `<svg viewBox="0 0 ${W + 70} 34" class="m-svg">${Array.from({ length: n }, (_, i) => `<rect x="${i * w + 1}" y="4" width="${w - 2}" height="24" rx="3" fill="${r * n + i < k ? 'var(--primary)' : 'var(--primary-soft)'}"/>`).join('')}<text x="${W + 10}" y="22" class="m-t">${r === rows - 1 ? `${k}/${n}` : ''}</text></svg>`;
      }
      return out;
    }).join('');
  },
  procentstrook(arg) {
    const parts = String(arg).split('|').map((x) => x.trim());
    const total = parts[0];
    const marks = parts.slice(1).map((p) => { const m = p.match(/^([\d,]+)\s*%\s*=\s*(.+)$/); return m ? [numNL(m[1]), m[2]] : null; }).filter(Boolean);
    const W = 300, x = (p) => 20 + (p / 100) * W;
    return `<svg viewBox="0 0 ${W + 40} 74" class="m-svg"><rect x="20" y="26" width="${W}" height="20" rx="3" fill="var(--primary-soft)" stroke="var(--primary)"/>
      ${[[0, '0'], [100, total], ...marks].map(([p, a]) => `<line x1="${x(p)}" y1="22" x2="${x(p)}" y2="50" stroke="var(--ink)"/><text x="${x(p)}" y="16" text-anchor="middle" class="m-t">${a}</text><text x="${x(p)}" y="66" text-anchor="middle" class="m-t muted">${fmtNL(p)}%</text>`).join('')}</svg>`;
  },
  getallenlijn(arg) {
    if (/\d:\d\d/.test(arg)) return MODEL.tijdlijn(arg);
    const [a, b, ms = ''] = String(arg).split('|');
    const from = numNL(a), to = numNL(b), marks = ms.split(';').map(numNL).filter((v) => !Number.isNaN(v));
    if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return '';
    const W = 300, x = (v) => 20 + ((v - from) / (to - from)) * W;
    const step = (to - from) / 10;
    return `<svg viewBox="0 0 ${W + 40} 60" class="m-svg"><line x1="20" y1="30" x2="${W + 20}" y2="30" stroke="var(--ink)" stroke-width="2"/>
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${x(from + i * step)}" y1="${i % 5 ? 25 : 21}" x2="${x(from + i * step)}" y2="${i % 5 ? 35 : 39}" stroke="var(--ink)"/>`).join('')}
      <text x="20" y="54" text-anchor="middle" class="m-t">${fmtNL(from)}</text><text x="${W + 20}" y="54" text-anchor="middle" class="m-t">${fmtNL(to)}</text>
      ${marks.map((v) => `<circle cx="${x(v)}" cy="30" r="5" fill="var(--primary)"/><text x="${x(v)}" y="14" text-anchor="middle" class="m-t" fill="var(--primary)">${fmtNL(v)}</text>`).join('')}</svg>`;
  },
  sprongen(arg) {
    const parts = String(arg).split('|').map((x) => x.trim());
    let cur = numNL(parts[0]);
    if (Number.isNaN(cur)) return '';
    const pts = [cur], labels = [];
    for (const j of parts.slice(1)) { const v = numNL(j.replace('−', '-').replace('+', '')); if (Number.isNaN(v)) continue; cur += v; pts.push(cur); labels.push(j.replace('-', '−')); }
    const lo = Math.min(...pts), hi = Math.max(...pts), W = 300, x = (v) => 20 + (hi === lo ? 0 : ((v - lo) / (hi - lo)) * W);
    return `<svg viewBox="0 0 ${W + 40} 80" class="m-svg"><line x1="10" y1="55" x2="${W + 30}" y2="55" stroke="var(--ink)" stroke-width="2"/>
      ${pts.map((v) => `<line x1="${x(v)}" y1="50" x2="${x(v)}" y2="60" stroke="var(--ink)"/><text x="${x(v)}" y="74" text-anchor="middle" class="m-t">${fmtNL(v)}</text>`).join('')}
      ${pts.slice(1).map((v, i) => { const x1 = x(pts[i]), x2 = x(v), mx = (x1 + x2) / 2; return `<path d="M${x1},50 Q${mx},12 ${x2},50" fill="none" stroke="var(--primary)" stroke-width="2"/><text x="${mx}" y="22" text-anchor="middle" class="m-t" fill="var(--primary)">${labels[i]}</text>`; }).join('')}</svg>`;
  },
  tabel(arg) {
    const rows = String(arg).split(';').map((r) => r.split('|').map((c) => c.trim()));
    return `<table class="m-tab">${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 && /[a-z]/i.test(c) ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</table>`;
  },
  hokjes(arg) {
    const m = String(arg).match(/(\d+)\s*[x×]\s*(\d+)/);
    if (!m) return '';
    const rows = Math.min(12, +m[1]), cols = Math.min(16, +m[2]), s = Math.min(26, 300 / cols);
    let cells = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells += `<rect x="${2 + x * s}" y="${2 + y * s}" width="${s}" height="${s}" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="1.5"/>`;
    return `<svg viewBox="0 0 ${cols * s + 4} ${rows * s + 4}" class="m-svg" style="max-width:${cols * s + 4}px">${cells}</svg><div class="m-leg">${rows} rijen van ${cols} hokjes</div>`;
  },
  rechthoek(arg, tri = false) {
    const [dims, unit = ''] = String(arg).split('|').map((x) => x.trim());
    const m = dims.match(/([\d,]+)\s*[x×]\s*([\d,]+)/);
    if (!m) return '';
    const L = numNL(m[1]), B = numNL(m[2]), k = Math.min(220 / L, 110 / B), w = L * k, h = B * k, x0 = 20, y0 = 22;
    const shape = tri ? `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="var(--ink)" stroke-dasharray="5 4" opacity=".4"/><polygon points="${x0},${y0 + h} ${x0 + w},${y0 + h} ${x0 + w * 0.35},${y0}" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="3"/>`
      : `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="3"/>`;
    return `<svg viewBox="0 0 ${w + 110} ${h + 50}" class="m-svg">${shape}<text x="${x0 + w / 2}" y="${tri ? y0 + h + 18 : 15}" text-anchor="middle" class="m-t">${m[1]} ${unit}</text><text x="${x0 + w + 8}" y="${y0 + h / 2 + 5}" class="m-t">${m[2]} ${unit}</text></svg>`;
  },
  driehoek(arg) { return MODEL.rechthoek(arg, true); },
  klok(arg) {
    const m = String(arg).match(/(\d{1,2}):(\d{2})/);
    if (!m) return '';
    const hh = +m[1] % 12, mm = +m[2], c = 60, r = 52;
    const hand = (deg, len, wdt) => { const a = (deg - 90) * Math.PI / 180; return `<line x1="${c}" y1="${c}" x2="${c + Math.cos(a) * len}" y2="${c + Math.sin(a) * len}" stroke="var(--ink)" stroke-width="${wdt}" stroke-linecap="round"/>`; };
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 - 90) * Math.PI / 180; return `<text x="${c + Math.cos(a) * 42}" y="${c + Math.sin(a) * 42 + 4}" text-anchor="middle" class="m-t" style="font-size:10px">${i || 12}</text>`; }).join('');
    return `<svg viewBox="0 0 120 120" class="m-svg" style="max-width:130px;margin:0 auto"><circle cx="${c}" cy="${c}" r="${r}" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="3"/>${ticks}${hand(hh * 30 + mm / 2, 26, 4)}${hand(mm * 6, 40, 2.5)}<circle cx="${c}" cy="${c}" r="3" fill="var(--ink)"/></svg><div class="m-leg">${m[1]}:${m[2]}</div>`;
  },
  tijdlijn(arg) {
    const toMin = (t) => { const m = String(t).trim().match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : NaN; };
    const lab = (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
    const [a, b, ms = ''] = String(arg).split('|');
    const from = toMin(a), to = toMin(b), marks = ms.split(';').map(toMin).filter((v) => !Number.isNaN(v));
    if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return '';
    const W = 300, x = (v) => 20 + ((v - from) / (to - from)) * W;
    return `<svg viewBox="0 0 ${W + 40} 60" class="m-svg"><line x1="20" y1="30" x2="${W + 20}" y2="30" stroke="var(--ink)" stroke-width="2"/>
      <text x="20" y="54" text-anchor="middle" class="m-t">${lab(from)}</text><text x="${W + 20}" y="54" text-anchor="middle" class="m-t">${lab(to)}</text>
      <line x1="20" y1="22" x2="20" y2="38" stroke="var(--ink)"/><line x1="${W + 20}" y1="22" x2="${W + 20}" y2="38" stroke="var(--ink)"/>
      ${marks.map((v) => `<circle cx="${x(v)}" cy="30" r="5" fill="var(--primary)"/><text x="${x(v)}" y="14" text-anchor="middle" class="m-t" fill="var(--primary)">${lab(v)}</text>`).join('')}</svg>`;
  },
};
// tekst van Max → HTML met plaatjes (de tekst is al ge-escaped)
function withModels(html) {
  html = html.replace(/\\[()[\]]/g, '').replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/\\(times|cdot)/g, '×').replace(/\\div/g, ':');
  return html.replace(/\[\[(\w+)\s*:\s*([^\]]+)\]\]/g, (m, kind, arg) => {
    try { const out = MODEL[kind.toLowerCase()]?.(arg); return out ? `<div class="model">${out}</div>` : ''; } catch { return ''; }
  });
}

// ---------- wie ben jij? (profielen, alleen een naam) ----------
async function renderWho() {
  $tabs.hidden = true;
  STATE = null;
  const { kids, avatars } = await api('/api/kids');
  let avatar = avatars[kids.length % avatars.length];
  const draw = (err = '', showNew = !kids.length) => {
    $app.innerHTML = `<div class="stack" style="margin-top:6vh">
      <div style="text-align:center"><div class="big-emoji">👋</div><h1 style="margin-top:6px">Wie ben jij?</h1>
        <p class="muted">${kids.length ? 'Tik op je naam.' : 'Welkom! Hoe heet je?'}</p></div>
      ${kids.length ? `<div class="who-grid">${kids.map((k) => `<button class="who-kid" data-kid="${k.id}"><span>${esc(k.avatar)}</span><b>${esc(k.name)}</b></button>`).join('')}</div>` : ''}
      ${showNew ? `<form class="card stack" data-new>
          <h3>${kids.length ? 'Nieuw profiel' : 'Maak je profiel'}</h3>
          <label class="field"><span style="font-weight:800">Je naam</span><input name="name" maxlength="30" placeholder="bijv. Christo" autocomplete="off" required></label>
          <div><div style="font-weight:800;margin-bottom:6px">Kies een plaatje</div>
          <div class="avatar-pick">${avatars.map((a) => `<button type="button" class="${a === avatar ? 'sel' : ''}" data-av="${a}">${a}</button>`).join('')}</div></div>
          <p class="small" style="color:var(--bad);min-height:18px">${esc(err)}</p>
          <button class="btn block">Start! 🚀</button>
        </form>` : '<button class="btn ghost block" data-shownew>➕ Ik ben nieuw</button>'}
      <a href="#/overzicht" class="small muted" style="text-align:center;margin-top:10px">👨‍🏫 Ouder of leerkracht? Bekijk het overzicht</a>
    </div>`;
    $app.querySelectorAll('[data-kid]').forEach((b) => (b.onclick = async () => { await api('/api/kids/select', { id: Number(b.dataset.kid) }); location.hash = '#/'; route(); }));
    $app.querySelector('[data-shownew]')?.addEventListener('click', () => draw('', true));
    $app.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => { avatar = b.dataset.av; $app.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('sel', x === b)); }));
    const form = $app.querySelector('[data-new]');
    if (form) {
      form.querySelector('input').focus();
      form.onsubmit = async (e) => {
        e.preventDefault();
        try { await api('/api/kids', { name: form.name.value, avatar }); location.hash = '#/'; route(); }
        catch (err) { draw(err.message, true); }
      };
    }
  };
  draw();
}
async function switchKid() {
  await api('/api/kids/leave', {});
  STATE = null;
  renderWho();
}

// ---------- login (alleen als APP_PIN aan staat) ----------
function renderLogin() {
  $tabs.hidden = true;
  pinScreen('Hoi! Wat is je pincode?', async (pin) => { await api('/api/login', { pin }); route(); });
}
function pinScreen(title, onDone) {
  let pin = '';
  const draw = (err = '') => {
    $app.innerHTML = `<div class="stack" style="margin-top:8vh">
      <div class="card" style="text-align:center"><div class="big-emoji">🔒</div><h2 style="margin-top:8px">${esc(title)}</h2>
      <div class="pin">${Array.from({ length: Math.max(4, pin.length) }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('')}</div>
      <p class="small" style="color:var(--bad);min-height:20px">${esc(err)}</p>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
      <button class="key fn" data-k="back">⌫</button><button class="key" data-k="0">0</button><button class="key fn" data-k="ok">OK</button></div></div></div>`;
    $app.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => press(b.dataset.k)));
  };
  const press = async (k) => {
    if (k === 'back') pin = pin.slice(0, -1);
    else if (k !== 'ok' && pin.length < 8) pin += k;
    if (k === 'ok' && pin) {
      try { await onDone(pin); return; } catch (e) { if (e.message === 'login') return; pin = ''; return draw(e.message); }
    }
    draw();
  };
  draw();
}

// =====================================================================
// HOME
// =====================================================================
async function renderHome() {
  STATE = await api('/api/state');
  const s = STATE;
  const d = s.today.daily;
  let main = '';
  if (!s.intakeDone) {
    main = `<div class="card hero stack">
      <div class="big-emoji">🚀</div>
      <div><div class="task-title">Starttoets</div>
      <p>${s.intakeActive ? 'Je bent al begonnen. Ga verder waar je was!' : `Eerst kijken wat je al kunt: ${s.points.intakeCount} sommen uit alle onderdelen (ongeveer een kwartiertje). We beginnen een groep lager dan jouw groep. Daarna leert de app je steeds beter kennen. Je kunt tussendoor stoppen.`}</p></div>
      <div class="row"><span class="chip coin">🪙 tot ${s.points.intake} cent</span></div>
      <button class="btn light block" data-start="intake">${s.intakeActive ? 'Verder met de starttoets' : 'Start de starttoets'}</button>
      <p class="small muted">Weet je iets niet? Geen probleem, druk op "Weet ik niet". Dan weten wij wat we gaan oefenen.</p></div>`;
  } else if (!s.today.schoolDay) {
    main = `<div class="card hero stack"><div class="big-emoji">🌴</div>
      <div><div class="task-title">Weekend!</div><p>Geen dagtaak vandaag. Maandag weer ${s.points.dailyCount} sommen voor ${s.points.daily} cent.</p></div>
      ${aheadBtn(s)}
      <button class="btn light block" data-start="practice">Toch even oefenen</button></div>`;
  } else if (!d || d.status === 'active') {
    main = `<div class="card hero stack"><div class="big-emoji">✏️</div>
      <div><div class="task-title">Dagtaak</div><p>${d ? `Je hebt er al ${d.answered} van de ${d.total} gedaan. Ga verder!` : `${s.points.dailyCount} sommen, vooral van onderdelen waar je nog beter in kunt worden.`}</p></div>
      <div class="row"><span class="chip coin">🪙 tot ${s.points.daily} cent</span><span class="chip" style="background:rgba(255,255,255,.2);color:inherit">± 20 min</span></div>
      ${d ? `<div class="progress light"><i style="width:${(d.answered / d.total) * 100}%"></i></div>` : ''}
      <button class="btn light block" data-start="daily">${d ? 'Verder' : 'Start dagtaak'}</button></div>`;
  } else {
    main = `<div class="card hero stack"><div class="big-emoji">🎉</div>
      <div><div class="task-title">Dagtaak klaar!</div><p>${d.correct} van de ${d.total} goed — je verdiende <b>${d.points} cent</b>.</p></div>
      ${aheadBtn(s)}
      <button class="btn ${s.ahead && s.ahead.status !== 'done' ? 'ghost-light' : 'light'} block" data-start="practice">Extra oefenen (zonder centen)</button></div>`;
  }

  const stuck = s.intakeDone ? s.skills.filter((x) => x.struggling) : [];
  const coach = stuck.length ? `<div class="card stack"><div class="row"><span class="big-emoji" style="font-size:32px">🧑‍🏫</span>
      <div><h3>Even opfrissen${s.ai ? ` met ${esc(s.teacher)}` : ''}</h3><p class="small muted">${s.ai ? 'Een korte les: uitleg, een voorbeeld en een paar vragen. Daarna oefenen.' : 'Hier gaan we extra mee aan de slag. Lees de uitleg en oefen dan.'}</p></div></div>
      ${stuck.slice(0, 3).map((x) => `<button class="btn ghost block" data-coach="${x.cat}">${x.icon} ${s.ai ? 'Les: ' : ''}${esc(x.label)}</button>`).join('')}</div>` : '';

  const earned = s.badges.filter((b) => b.earned);
  const badgesCard = earned.length ? `<a href="#/voortgang" class="card row between" style="text-decoration:none;color:inherit"><div><div class="small muted">Badges</div><div style="font-size:26px;letter-spacing:2px">${earned.slice(-8).map((b) => b.icon).join('')}</div></div><span class="muted">${earned.length}/${s.badges.length} ›</span></a>` : '';

  const top = s.intakeDone ? `<div class="card"><div class="row between"><h3>Sterk 💪</h3><a href="#/voortgang" class="small">Alles</a></div>
      ${s.skills.slice(0, 3).map(mini).join('')}
      <h3 style="margin-top:12px">Hier word je beter in 🌱</h3>${s.skills.slice(-3).reverse().map(mini).join('')}</div>` : '';

  $app.innerHTML = `<div class="stack">
    <div class="hello"><div><h1>Hoi ${esc(s.name)} ${esc(s.kid?.avatar || '👋')}</h1><p class="muted small" style="margin-top:2px">${pick(SUBLINES)}</p></div>
      <div class="row" style="gap:6px">${s.streak ? `<div class="streak" title="Schooldagen op rij">🔥 ${s.streak}</div>` : ''}<button class="switch-kid" data-switch title="Ander kind">👤</button></div></div>
    ${main}
    ${piggyCard(s)}
    ${s.intakeDone ? weekCard(s) : ''}
    ${coach}${badgesCard}${top}
    ${mopCard()}
  </div>`;
  bindStart();
  $app.querySelector('[data-switch]').onclick = async () => { if (await ask(`<div class="big-emoji">👤</div><h2>Ben jij niet ${esc(s.name)}?</h2><p class="muted">Dan kies je je eigen naam.</p>`, 'Ander kind kiezen', 'Ik ben het wel')) switchKid(); };
  $app.querySelector('[data-mop]')?.addEventListener('click', (e) => { const el = e.currentTarget.querySelector('.punch'); el.hidden = !el.hidden; });
  $app.querySelectorAll('[data-coach]').forEach((b) => (b.onclick = () => showCoach(b.dataset.coach)));
}
const DAG = ['ma', 'di', 'wo', 'do', 'vr'];
function aheadBtn(s) {
  const a = s.ahead;
  if (!a) return '';
  if (a.status === 'done') return `<p class="small">✅ De dagtaak van ${esc(a.name)} is ook al klaar. Lekker bezig!</p>`;
  if (a.status === 'active') return `<button class="btn light block" data-ahead>⏩ Verder met ${esc(a.name)} (${a.answered}/${s.points.dailyCount})</button>`;
  return `<button class="btn light block" data-ahead>⏩ Werk vooruit: doe ${esc(a.name)} alvast</button>`;
}
function mopCard() {
  const [vraag, clou] = mop();
  return `<button class="card mop" data-mop style="text-align:left;width:100%"><div class="small muted">😂 Rekenmop van de dag (tik voor het antwoord)</div><div style="font-weight:800;margin-top:4px">${esc(vraag)}</div><div class="punch" hidden>${esc(clou)}</div></button>`;
}
function piggyCard(s) {
  const g = s.goal;
  if (!g) return `<a href="#/spaarpot" class="card coin row between" style="text-decoration:none;color:inherit"><div class="row"><span class="big-emoji" style="font-size:34px">🐷</span><div><div class="small muted">In je spaarpot</div><div class="money" style="font-size:24px">${euro(s.wallet.balance)}</div></div></div><span class="small" style="font-weight:800;color:var(--primary)">🎯 Kies een doel ›</span></a>`;
  const pct = Math.min(100, (s.wallet.balance / g.cents) * 100);
  return `<a href="#/spaarpot" class="card coin stack" style="text-decoration:none;color:inherit;gap:8px">
    <div class="row between"><div class="row"><span class="big-emoji" style="font-size:30px">${g.reached ? '🎉' : '🎯'}</span><div><div class="small muted">Ik spaar voor</div><b style="font-size:18px">${esc(g.name)}</b></div></div><div style="text-align:right"><div class="money" style="font-size:20px">${euro(s.wallet.balance)}</div><div class="small muted">van ${euro(g.cents)}</div></div></div>
    <div class="goal-bar"><i style="width:${pct}%"></i></div>
    <div class="small" style="font-weight:800">${g.reached ? 'Doel gehaald! Laat het aan papa of mama zien. 🥳' : `Nog ${euro(g.left)} — dat is ongeveer ${Math.ceil(g.left / 40)} dagtaken.`}</div></a>`;
}
function weekCard(s) {
  const w = s.week;
  if (!w || !w.bonus) return '';
  return `<div class="card row between"><div><div style="font-weight:900">📅 Weekbonus +${w.bonus} cent</div><div class="small muted">${w.given ? 'Gehaald deze week! 🎉' : 'Maak alle 5 dagtaken van deze week af.'}</div></div>
    <div class="week">${w.days.map((d, i) => `<span class="${d.done ? 'on' : ''} ${d.today ? 'today' : ''}" title="${d.day}">${d.done ? '✓' : DAG[i]}</span>`).join('')}</div></div>`;
}
const sc = (score) => (score >= 85 ? 3 : score >= 60 ? 2 : score >= 35 ? 1 : 0);
function mini(x) {
  return `<div class="mini-skill"><span class="ico">${x.icon}</span><div><div style="font-weight:800">${esc(x.label)}</div><div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div></div><span class="small muted">${x.levelName}</span></div>`;
}
function bindStart() {
  $app.querySelectorAll('[data-start]').forEach((b) => (b.onclick = () => startSession(b.dataset.start, b.dataset.cat)));
  $app.querySelectorAll('[data-ahead]').forEach((b) => (b.onclick = () => startSession('daily', null, { ahead: true })));
}
function askGroep() {
  return new Promise((resolve) => {
    sheet(`<div style="text-align:center"><div class="big-emoji">🎒</div><h2 style="margin:8px 0">In welke groep zit je?</h2>
      <p class="muted">We beginnen een groepje lager, lekker rustig opstarten. Gaat het goed? Dan gaan de sommen vanzelf omhoog. 🚀</p></div>
      <div class="groep-pick">${[4, 5, 6, 7, 8].map((g) => `<button class="choice" data-g="${g}">${g}</button>`).join('')}</div>
      <button class="btn ghost block" data-close>Toch niet</button>`, (bg, close) => {
      bg.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { close(); resolve(Number(b.dataset.g)); }));
      bg.querySelector('[data-close]').addEventListener('click', () => resolve(null));
    });
  });
}
async function startSession(kind, cat, extra = {}) {
  const btn = document.activeElement;
  const busy = STATE?.ai && (kind === 'daily' || (kind === 'practice' && !cat));
  if (busy && btn?.classList?.contains('btn')) { btn.disabled = true; btn.innerHTML = `<span class="loader"></span> ${esc(STATE.teacher)} maakt je lesplan…`; }
  try {
    let groep;
    if (kind === 'intake' && !STATE?.intakeActive) {
      groep = await askGroep();
      if (!groep) return;
    }
    const data = await api('/api/session/start', { kind, cat, groep, ...extra });
    SESSION_CACHE = data;
    location.hash = `#/sessie/${data.id}`;
  } catch (e) { if (e.message !== 'login') toast(e.message); }
}

// Korte interactieve les van de leraar. Zonder AI: vaste uitleg.
async function showCoach(cat, intro = '') {
  STATE ||= await api('/api/state');
  const meta = STATE.skills.find((x) => x.cat === cat);
  const inSession = location.hash.startsWith('#/sessie');
  const L = { chat: [], busy: false, ready: false };
  sheet(`<div class="row between"><h2>${meta?.icon || ''} ${esc(meta?.label || '')}</h2><button class="btn ghost" data-close>Sluit</button></div>
    ${intro ? `<p>${intro}</p>` : ''}
    ${STATE.ai ? '<div id="lesson"></div>' : `<div class="card flat"><b>Zo pak je het aan</b>${tipHTML(cat)}</div>`}
    <div id="lesson-end">${!STATE.ai ? (inSession ? '<button class="btn block" data-close>Begrepen, verder!</button>' : '<button class="btn block" data-practice>Oefen dit onderdeel</button>') : ''}</div>`,
  (bg, close) => {
    const box = bg.querySelector('#lesson');
    const end = bg.querySelector('#lesson-end');
    const bindEnd = () => {
      bg.querySelector('[data-practice]')?.addEventListener('click', () => { close(); startSession('practice', cat); });
    };
    bindEnd();
    if (!box) return;
    const draw = () => {
      box.innerHTML = teacherHTML(L.chat, {
        loading: L.busy,
        quick: L.ready ? [] : ['Ik snap het nog niet 🤔', 'Geef nog een voorbeeld', 'Kan het makkelijker?'],
        placeholder: 'Typ je antwoord of vraag…',
        intro: L.chat.length ? null : 'Even een korte les, dan gaan we oefenen!',
      });
      bindTeacher(box, (msg) => send(msg));
      box.querySelector('.t-msgs')?.lastElementChild?.scrollIntoView({ block: 'nearest' });
      if (L.ready || L.chat.length >= 2) {
        end.innerHTML = inSession ? `<button class="btn ${L.ready ? 'good' : 'ghost'} block" data-close>${L.ready ? 'Ik ben er klaar voor! 🚀' : 'Verder met de sommen'}</button>`
          : `<button class="btn ${L.ready ? 'good' : 'ghost'} block" data-practice>${L.ready ? 'Ik ben er klaar voor: oefenen! 🚀' : 'Oefen dit onderdeel'}</button>`;
        bindEnd();
      }
    };
    const send = async (msg) => {
      if (L.busy) return;
      if (msg) L.chat.push({ role: 'kid', text: msg });
      L.busy = true; draw();
      try {
        const r = await api('/api/lesson', { cat, chat: L.chat });
        if (r.reply) { L.chat.push({ role: 'teacher', text: r.reply }); L.ready = r.ready; }
        else L.chat.push({ role: 'teacher', text: r.reason || tipText(cat) });
      } catch (e) { L.chat.push({ role: 'teacher', text: e.message }); }
      L.busy = false; draw();
    };
    send(null);
  });
}

// Lesplan van Max: per onderdeel niveau, aantal sommen en een woordje
function showPlan(coach, stuck = []) {
  const lesson = (stuck || []).find((c) => coach.items.some((i) => i.cat === c));
  sheet(`<div class="t-msg t" style="margin-bottom:4px"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(coach.message || 'Klaar voor vandaag?')}</div></div>
    <h3>Jouw plan voor vandaag</h3>
    <div class="plan">${coach.items.map((i) => `<div class="plan-row"><span class="ico">${i.icon}</span>
      <div><div class="row between"><b>${esc(i.label)}</b><span class="chip">${esc(i.levelName)} · ${i.count}×</span></div>
      ${i.note ? `<div class="small muted">${esc(i.note)}</div>` : ''}</div></div>`).join('')}</div>
    ${lesson ? `<button class="btn ghost block" data-lesson="${lesson}">🧑‍🏫 Eerst een korte les over ${esc(coach.items.find((i) => i.cat === lesson)?.label || '')}</button>` : ''}
    <button class="btn good block" data-close>Let's go! 🚀</button>`, (bg, close) => {
    bg.querySelector('[data-lesson]')?.addEventListener('click', (e) => { close(); showCoach(e.currentTarget.dataset.lesson); });
  });
}

// ---------- chatpaneel van de leraar ----------
function teacherHTML(chat, { loading = false, quick = [], placeholder = 'Typ je vraag of antwoord…', intro = null } = {}) {
  const name = esc(STATE?.teacher || 'Meester Max');
  const msgs = chat.map((m) => m.role === 'teacher'
    ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(m.text).replace(/\n/g, '<br>')} ${speakBtn(m.text, true)}</div></div>`
    : `<div class="t-msg k"><div class="t-bub">${esc(m.text)}</div></div>`).join('');
  const thinking = pick(['denkt even na…', 'krabt achter zijn oor…', 'zet zijn denkpet op… 🧢', 'pakt zijn krijtje…']);
  return `<div class="teacher">
    <div class="t-head">🧑‍🏫 ${name}</div>
    <div class="t-msgs">${intro ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${esc(intro)}</div></div>` : ''}${msgs}
      ${loading ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub muted"><span class="loader"></span> ${thinking}</div></div>` : ''}</div>
    ${quick.length && !loading ? `<div class="t-quick">${quick.map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
    <form class="chat-in"><input maxlength="300" placeholder="${esc(placeholder)}" enterkeyhint="send" ${loading ? 'disabled' : ''}><button class="btn ghost" ${loading ? 'disabled' : ''}>Stuur</button></form>
  </div>`;
}
function bindTeacher(box, send) {
  bindSpeak(box);
  box.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => send(b.dataset.q)));
  const form = box.querySelector('form');
  if (form) form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector('input').value.trim(); if (v) send(v); };
}

// =====================================================================
// VOORTGANG
// =====================================================================
async function renderProgress() {
  STATE = await api('/api/state');
  const s = STATE;
  if (!s.intakeDone) {
    $app.innerHTML = `<div class="card stack"><h2>Voortgang</h2><p class="muted">Doe eerst de starttoets. Daarna zie je hier waar je goed in bent en wat je nog gaat leren.</p><a class="btn" href="#/">Naar de starttoets</a></div>`;
    return;
  }
  const hist = s.history.length ? `<div class="card"><h3>Laatste dagtaken</h3><div class="hist">${s.history.map((h) => `<div><span>${h.correct}</span><i style="height:${(h.correct / h.total) * 80 + 4}px;background:var(--primary)"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div>${s.record ? `<p class="small muted" style="margin-top:6px">Jouw record: <b>${s.record}</b> goed in één dagtaak 🏅</p>` : ''}</div>` : '';
  $app.innerHTML = `<div class="stack">
    <h1>Voortgang</h1>
    ${hist}
    <div class="card"><h3>Badges</h3><div class="badges">${s.badges.map((b) => `<div class="badge ${b.earned ? 'on' : ''}" title="${esc(b.text)}"><span>${b.earned ? b.icon : '🔒'}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>
    <div class="card">${s.skills.map((x) => `<a class="skill" href="#/voortgang/${x.cat}" style="text-decoration:none;color:inherit">
      <span class="ico">${x.icon}</span>
      <div><div class="name"><span>${esc(x.label)}</span><span class="small">${trend(x.trend)} <span class="chip">${x.levelName}</span></span></div>
      <div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div>
      ${x.note ? `<div class="small" style="margin-top:4px">🧑‍🏫 ${esc(x.note)}</div>` : ''}
      <div class="small muted" style="margin-top:4px">${x.toNext != null ? `Op weg naar ${LEVEL[LEVELIDX(x.levelName) + 1]}-niveau: ${x.toNext}% (80% nodig)` : 'Groep 8-niveau: eindniveau! 🏆'}${x.struggling ? ' · <b style="color:var(--warn)">extra hulp aan</b>' : ''}</div></div></a>`).join('')}</div>
    <p class="small muted">Per onderdeel reken je op het niveau van een groep (groep 5 t/m 8). Heb je 8 van de 10 goed, dan ga je een groep omhoog. Gaat meer dan de helft fout, dan oefen je even een groep lager. Groep 8 = het eindniveau van de basisschool.</p>
  </div>`;
}
const LEVELIDX = (n) => LEVEL.indexOf(n);
const trend = (t) => (t == null || t === 0 ? '' : t > 0 ? `<span class="trend-up">▲${t}</span>` : `<span class="trend-down">▼${-t}</span>`);

async function renderCategory(cat) {
  if (!STATE) STATE = await api('/api/state');
  const x = STATE.skills.find((k) => k.cat === cat);
  if (!x) { location.hash = '#/voortgang'; return; }
  $app.innerHTML = `<div class="stack">
    <a href="#/voortgang" class="small">‹ Voortgang</a>
    <div class="card stack"><div class="row"><span class="big-emoji">${x.icon}</span><div><h2>${esc(x.label)}</h2><p class="muted small">${x.domain} · niveau ${x.levelName}</p></div></div>
    <div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div>
    <p class="small muted">${x.correct} van de ${x.attempts} sommen goed${x.trend ? ` · deze week ${x.trend > 0 ? '+' : ''}${x.trend}` : ''}</p></div>
    <div class="card flat"><b>Zo doe je het</b>${tipHTML(cat)}</div>
    ${(STATE.mnemonics?.[cat] || []).length ? `<div class="card flat"><b>🧠 Onthoud-trucs</b>${STATE.mnemonics[cat].map((m) => `<div class="trick"><b>${esc(m.kort)}</b>${m.soort === 'ezelsbrug' ? ' <span class="chip coin">ezelsbruggetje</span>' : ''}<div class="small muted">${esc(m.uitleg)}</div></div>`).join('')}</div>` : ''}
    <button class="btn block" data-start="practice" data-cat="${cat}">Oefen dit (20 sommen, zonder centen)</button>
    ${STATE.ai ? `<button class="btn ghost block" data-coach="${cat}">🧑‍🏫 Korte les van ${esc(STATE.teacher)}</button>` : ''}
  </div>`;
  bindStart();
  $app.querySelectorAll('[data-coach]').forEach((b) => (b.onclick = () => showCoach(cat)));
}

// =====================================================================
// SPAARPOT
// =====================================================================
async function renderPiggy() {
  STATE = await api('/api/state');
  const s = STATE;
  const max = Math.max(50, ...s.history.map((h) => h.points));
  $app.innerHTML = `<div class="stack">
    <h1>Spaarpot</h1>
    <div class="card coin pig"><div class="big-emoji">🐷</div><div class="amount">${euro(s.wallet.balance)}</div>
      <p class="muted small">Verdiend: ${euro(s.wallet.earned)} · Uitbetaald: ${euro(s.wallet.paid)}</p></div>
    <div class="card stack"><div class="row between"><h3>🎯 Mijn spaardoel</h3>${s.goal ? '<button class="btn ghost" data-goal>Wijzig</button>' : ''}</div>
      ${s.goal ? `<div><b style="font-size:20px">${esc(s.goal.name)}</b> <span class="muted">· ${euro(s.goal.cents)}</span></div>
        <div class="goal-bar"><i style="width:${Math.min(100, (s.wallet.balance / s.goal.cents) * 100)}%"></i></div>
        <p class="small">${s.goal.reached ? '<b>Gehaald! 🥳</b> Laat het aan papa of mama zien.' : `Nog <b>${euro(s.goal.left)}</b> te gaan.`}</p>`
      : `<p class="muted">Waar wil jij voor sparen? Een game, iets voor je fiets, een uitje? Kies een doel en zie je spaarpot vollopen.</p><button class="btn block" data-goal>Kies een spaardoel</button>`}</div>
    <div class="card stack"><h3>Zo verdien je centen</h3>
      <div class="row"><span class="chip coin">🪙 ${s.points.intake}</span><span>Starttoets: tot ${s.points.intake} cent</span></div>
      <div class="row"><span class="chip coin">🪙 ${s.points.daily}</span><span>Elke schooldag: tot ${s.points.daily} cent (${cents(s.points.daily / s.points.dailyCount)} per goede som)</span></div>
      <div class="row"><span class="chip">🪜</span><span>Met tussenstappen: de eerste ${s.points.freeGuided} keer per onderdeel gewoon centen, daarna de helft.</span></div>
      <div class="row"><span class="chip coin">🪙🪙</span><span>Kies je daarna "helemaal zelf" en is het goed? ${s.points.soloBonus} keer dubbel!</span></div>
      ${s.week?.bonus ? `<div class="row"><span class="chip coin">📅 ${s.week.bonus}</span><span>Weekbonus: alle 5 dagtaken van een week af = ${s.week.bonus} cent extra.</span></div>` : ''}
      <p class="small muted">Alleen goede antwoorden leveren centen op. 100 cent = € 1.</p></div>
    ${s.history.length ? `<div class="card"><h3>Verdiend per dag</h3><div class="hist">${s.history.map((h) => `<div><span>${h.points}</span><i style="height:${(h.points / max) * 80 + 4}px"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div></div>` : ''}
    <a href="#/ouder" class="small muted" style="text-align:center;display:block;margin-top:8px">Voor ouders 🔒</a>
  </div>`;
  $app.querySelectorAll('[data-goal]').forEach((b) => (b.onclick = editGoal));
}
function editGoal() {
  const g = STATE.goal;
  sheet(`<div class="row between"><h2>🎯 Spaardoel</h2><button class="btn ghost" data-close>Sluit</button></div>
    <form class="stack" data-goalform>
      <label class="field"><span style="font-weight:800">Waar spaar je voor?</span><input name="name" maxlength="40" placeholder="bijv. nieuwe game" value="${esc(g?.name || '')}" required></label>
      <label class="field"><span style="font-weight:800">Hoeveel kost het? (in euro)</span><input name="euros" inputmode="decimal" placeholder="bijv. 15" value="${g ? String(g.cents / 100).replace('.', ',') : ''}" required></label>
      <p class="small muted">Met alle dagtaken goed verdien je ongeveer € 2,50 per week (plus weekbonus).</p>
      <button class="btn block">Opslaan</button>
      ${g ? '<button type="button" class="btn ghost block" data-cleargoal>Doel weghalen</button>' : ''}
    </form>`, (bg, close) => {
    bg.querySelector('[data-goalform]').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/goal', { name: e.target.name.value, euros: e.target.euros.value }); close(); toast('Spaardoel opgeslagen 🎯'); renderPiggy(); }
      catch (err) { toast(err.message); }
    };
    bg.querySelector('[data-cleargoal]')?.addEventListener('click', async () => { await api('/api/goal', { clear: true }); close(); renderPiggy(); });
  });
}

// =====================================================================
// SESSIE
// =====================================================================
let SESSION_CACHE = null;
let S = null; // sessie-toestand in de browser

async function openSession(id) {
  $app.classList.add('full');
  STATE ||= await api('/api/state');
  const data = SESSION_CACHE?.id === Number(id) ? SESSION_CACHE : await api(`/api/session/${id}`);
  SESSION_CACHE = null;
  if (data.status === 'stopped') { location.hash = '#/'; return; }
  S = { data, cur: data.current, input: '', choice: null, stepInput: '', stepChoice: null, phase: 'ask', t0: Date.now(), chat: [], last: null, badges: [], stepMsg: null };
  if (!data.current) return renderSummary({ kind: data.kind, correct: data.correct, total: data.total, points: Math.round(data.points), maxPoints: data.maxPoints });
  startQuestion();
  // lesplan van Max bij de start; anders de uitlegkaart bij een onderdeel waar extra hulp aan staat
  const stuck = (data.struggling || []);
  const key = `coach-shown-${data.id}`;
  if (data.answered === 0 && !store.get(key)) {
    store.set(key, '1');
    if (data.coach) showPlan(data.coach, stuck);
    else if (stuck.length) showCoach(stuck[0], 'Hier gaan we vandaag extra mee oefenen. Lees dit even rustig door.');
  }
}


async function startQuestion() {
  const c = S.cur;
  // eerst voordoen: een uitgewerkt voorbeeld, daarna samen
  if (c.example && !S.exampleSeen?.[c.index]) return renderExample();
  S.input = ''; S.choice = null; S.stepInput = ''; S.stepChoice = null; S.phase = 'ask'; S.t0 = Date.now(); S.stepMsg = null;
  S.teacherOpen = !!(c.chat || []).length; S.talking = false;
  // leerfase: automatisch samen stap voor stap (gewone beloning)
  if (c.offer.mode === 'auto' && !c.guided) {
    try {
      const r = await api(`/api/session/${S.data.id}/guide`, { index: c.index });
      Object.assign(c, { guided: true, guideStep: r.step, guideDone: [] });
      S.autoIntro = true;
    } catch (e) { toast(e.message); }
  }
  renderQuestion();
}

function renderExample() {
  const { data, cur } = S;
  const ex = cur.example;
  const meta = (STATE?.skills || []).find((x) => x.cat === cur.question.cat);
  S.exStep = S.exStep || 0;
  const shown = ex.steps.slice(0, S.exStep);
  const all = S.exStep >= ex.steps.length;
  $app.innerHTML = `
    <div class="s-top"><button class="x" data-quit aria-label="Stoppen">✕</button>
      <div class="progress"><i style="width:${(cur.index / data.total) * 100}%"></i></div>
      <span class="small" style="font-weight:900">${cur.index + 1}/${data.total}</span></div>
    <div class="card q-card">
      <div class="row between"><span class="chip">👀 Eerst een voorbeeld · ${esc(meta?.label || '')}</span>${speakBtn(ex.text)}</div>
      <p class="small muted" style="margin-top:8px">Kijk mee hoe ${esc(STATE?.teacher || 'de meester')} deze som oplost. Daarna doen we er samen eentje.</p>
      <div class="q-text">${esc(ex.text)}</div>
      ${ex.visual ? `<div class="visual">${renderVisual(ex.visual)}</div>` : ''}
      ${ex.options ? `<div class="row" style="flex-wrap:wrap;margin-top:8px">${ex.options.map((o) => `<span class="chip">${esc(o)}</span>`).join('')}</div>` : ''}
      <ol class="steps ex-steps">${shown.map((st) => `<li>${esc(st)}</li>`).join('')}</ol>
      ${all ? `<div class="feedback ok" style="margin-top:10px"><div class="title">Antwoord: ${esc(ex.display)}</div></div>
        ${cur.mnemonic ? `<div class="trick" style="margin-top:10px"><b>🧠 ${esc(cur.mnemonic.kort)}</b><div class="small muted">${esc(cur.mnemonic.uitleg)}</div></div>` : ''}` : ''}
    </div>
    <div style="margin-top:12px">${all ? '<button class="btn good block" data-exdone>Nu samen 👉</button>' : `<button class="btn block" data-exnext>${S.exStep ? 'Volgende stap ▸' : 'Laat de eerste stap zien ▸'}</button>`}</div>`;
  $app.querySelector('[data-quit]').onclick = () => (location.hash = '#/');
  bindSpeak($app);
  $app.querySelector('[data-exnext]')?.addEventListener('click', () => { S.exStep++; renderExample(); });
  $app.querySelector('[data-exdone]')?.addEventListener('click', () => { (S.exampleSeen ||= {})[cur.index] = true; S.exStep = 0; startQuestion(); });
}

function renderQuestion() {
  const { data, cur } = S;
  const q = cur.question;
  if (S.klad?.index !== cur.index) kladReset(cur.index);
  const meta = (STATE?.skills || []).find((x) => x.cat === q.cat);
  const pct = (cur.index / data.total) * 100;
  const label = q.warmup ? '<span class="chip">⚡ Opwarmer</span>' : q.retry ? '<span class="chip good">💪 Herkansing</span>' : q.booster ? '<span class="chip good">😎 Even een makkie</span>' : q.review ? `<span class="chip">🔁 Herhaling · ${esc(meta?.label || q.cat)}</span>` : `<span class="chip">${meta?.icon || ''} ${esc(meta?.label || q.cat)} · ${LEVEL[q.level]}</span>`;
  $app.innerHTML = `
    <div class="s-top"><button class="x" data-quit aria-label="Stoppen">✕</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="small" style="font-weight:900">${cur.index + 1}/${data.total}</span></div>
    <div class="row between" style="margin:-4px 2px 10px">
      ${data.maxPoints ? `<span class="chip coin">🪙 ${cents(data.points)}</span>` : '<span class="chip">oefenen</span>'}
      ${data.streak >= 2 ? `<span class="chip streak-chip">🔥 ${data.streak} op rij</span>` : '<span></span>'}
    </div>
    <div class="card q-card">
      <div class="row between">${label}${speakBtn(q.text + (q.options ? '. Kies uit: ' + q.options.join(', ') : ''))}</div>
      <div class="q-text ${q.text.length > 90 ? 'long' : ''}">${esc(q.text)}</div>
      ${q.visual ? `<div class="visual">${renderVisual(q.visual)}</div>` : ''}
      <div id="guide"></div>
      <div id="answer-area"></div>
      ${kladHTML()}
      <div id="hints" class="hints">${(cur.hints || []).map(hintHTML).join('')}</div>
      <div id="fb"></div>
      <div id="ai-area"></div>
    </div>
    <div id="controls"></div>`;
  bindSpeak($app);
  bindKlad();
  if (cur.adapt?.readAloud && S.spokenIdx !== cur.index) { S.spokenIdx = cur.index; try { window.speechSynthesis?.cancel(); } catch {} setTimeout(() => speak(q.text), 300); }
  $app.querySelector('[data-quit]').onclick = async () => {
    if (await ask('<div class="big-emoji">🚪</div><h2 style="margin:8px 0">Even stoppen?</h2><p class="muted">Geen probleem! Je kunt later verder waar je was. De sommen lopen niet weg (ze hebben geen benen). 🦵</p>', 'Ja, stoppen', 'Nee, ik ga door')) location.hash = '#/';
  };
  if (cur.offer.mode === 'choose' && !cur.chose && !cur.guided) return drawChoice();
  drawAnswer();
  drawTeacher();
}

// "Nu moet je het zelf kunnen": kies zelf (dubbel) of met tussenstappen (half)
function drawChoice() {
  const c = S.cur, o = c.offer;
  const meta = (STATE?.skills || []).find((x) => x.cat === c.question.cat);
  const money = S.data.maxPoints > 0;
  const transition = o.transition ? `<div class="card flat stack" style="margin-top:14px">
      <div class="row"><span class="big-emoji" style="font-size:34px">🎓</span><div><b>Je hebt al 5 keer ${esc(meta?.label || '')} met tussenstappen goed gedaan!</b><p class="small muted">Nu moet je het zelf kunnen. Dit zijn de stappen die je steeds doet:</p></div></div>
      <ol class="steps">${(c.plan || []).map((a) => `<li>${esc(a.replace(/= \?$/, '').replace(/\?$/, ''))}</li>`).join('')}<li>${esc('En dan het eindantwoord.')}</li></ol>
      <p class="small muted">Doe die stappen in je hoofd of op je kladpapier.</p></div>` : '';
  $app.querySelector('#answer-area').innerHTML = `${transition}
    <div class="stack" style="margin-top:14px">
      <p style="font-weight:800">Hoe wil je deze som doen?</p>
      <button class="choice-big good" data-ch="solo"><span>💪 Helemaal zelf</span><small>${money ? (o.bonusLeft > 0 ? `🪙🪙 dubbele centen (nog ${o.bonusLeft}×)` : '🪙 gewone centen') : 'laat zien dat je het kunt'}</small></button>
      <button class="choice-big" data-ch="guided"><span>🪜 Met tussenstappen</span><small>${money ? '🪙 halve centen' : 'samen stap voor stap'}</small></button>
    </div>`;
  $app.querySelector('#controls').innerHTML = '';
  $app.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = async () => {
    try {
      const r = await api(`/api/session/${S.data.id}/guide`, { index: c.index, choice: b.dataset.ch });
      c.chose = r.chose || b.dataset.ch;
      if (r.guided) Object.assign(c, { guided: true, guideStep: r.step, guideDone: [] });
      drawAnswer();
    } catch (e) { toast(e.message); }
  }));
}

function keysFor(type) {
  const extra = type === 'fraction' ? ['/', '␣'] : type === 'time' ? [':', 'C'] : [',', 'C'];
  return [['1', '2', '3', '⌫'], ['4', '5', '6', extra[0]], ['7', '8', '9', extra[1]]];
}
function keypad(type, goLabel, goEnabled) {
  return `<div class="keypad">${keysFor(type).flat().map((k) => `<button class="key ${/[0-9]/.test(k) ? '' : 'fn'}" data-k="${k}" ${k === '␣' ? 'style="font-size:15px"' : ''}>${k === '␣' ? 'spatie' : k === 'C' ? 'wis' : k}</button>`).join('')}
    <button class="key wide" data-k="0">0</button><button class="key go wide" data-go ${goEnabled ? '' : 'disabled'}>${goLabel}</button></div>`;
}
function answerBox(value, unit, money, active = true, ph = 'jouw antwoord') {
  return `<div class="answer-box ${active ? 'active' : ''}">${money ? '<span class="unit">€</span>' : ''}${value ? esc(value) : `<span class="ph">${ph}</span>`}${active ? '<span class="caret"></span>' : ''}${unit && !money ? `<span class="unit">${esc(unit)}</span>` : ''}</div>`;
}

function drawGuide() {
  const c = S.cur;
  const box = $app.querySelector('#guide');
  if (!c.guided) { box.innerHTML = ''; return; }
  const done = (c.guideDone || []).map((d, i) => `<div class="g-step ${d.ok ? 'ok' : 'shown'}"><span class="n">${d.ok ? '✓' : '💡'}</span><div><div>${esc(d.ask.replace(/\?\s*$/, ''))}</div><b>${esc(d.display)}</b>${d.ok ? '' : ' <span class="small muted">(zo moest het)</span>'}</div></div>`).join('');
  const intro = S.autoIntro ? `<div class="hint" style="background:var(--primary-soft)">🤝 We doen deze samen, stap voor stap. ${S.data.maxPoints ? 'Je krijgt gewoon je centen als het goed is!' : ''}</div>` : '';
  let current = '';
  if (c.guideStep) {
    const st = c.guideStep;
    const msg = S.stepMsg ? `<div class="step-msg ${S.stepMsg.kind}">${esc(S.stepMsg.text)}</div>` : '';
    current = `<div class="g-step now"><span class="n">${(c.guideDone || []).length + 1}</span><div style="flex:1"><div style="font-weight:800">${esc(st.ask)}</div>
      ${st.type === 'choice' ? `<div class="choices">${st.options.map((o, i) => `<button class="choice small ${S.stepChoice === i ? 'sel' : ''}" data-sc="${i}">${esc(o)}</button>`).join('')}</div>`
        : answerBox(S.stepInput, st.unit, st.money, true, 'tussenstap')}${msg}</div></div>`;
  } else if (c.guideFinal) {
    current = `<div class="g-step now final"><span class="n">🏁</span><div><div style="font-weight:800">Nu jij: ${esc(c.guideFinal)}</div><div class="small muted">${c.question.type === 'choice' ? 'Kies hieronder het goede antwoord.' : 'Vul hieronder het eindantwoord in.'}</div></div></div>`;
  }
  box.innerHTML = `<div class="guide">${intro}${done}${current}</div>`;
  box.querySelectorAll('[data-sc]').forEach((b) => (b.onclick = () => { S.stepChoice = Number(b.dataset.sc); drawAnswer(); }));
}

function drawAnswer() {
  const c = S.cur, q = c.question;
  const area = $app.querySelector('#answer-area');
  const controls = $app.querySelector('#controls');
  if (S.phase !== 'ask') return;
  drawGuide();
  // 1) tussenstap invullen
  if (c.guided && c.guideStep) {
    const st = c.guideStep;
    // bij een keuzevraag: laat de keuzes alvast zien (nog niet aanklikbaar)
    area.innerHTML = q.type === 'choice'
      ? `<p class="small muted" style="margin-top:12px">Je kiest straks uit:</p><div class="row" style="flex-wrap:wrap">${q.options.map((o) => `<span class="chip" style="font-size:16px">${esc(o)}</span>`).join('')}</div>` : '';
    controls.innerHTML = st.type === 'choice'
      ? `<button class="btn block" data-step ${S.stepChoice == null ? 'disabled' : ''} style="margin-top:12px">Controleer stap</button>`
      : keypad(st.type, 'Controleer stap', !!S.stepInput);
    controls.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => keyPress(b.dataset.k)));
    (controls.querySelector('[data-step]') || controls.querySelector('[data-go]')).onclick = submitStep;
    return;
  }
  // 2) eindantwoord
  if (q.type === 'choice') {
    area.innerHTML = `<div class="choices">${q.options.map((o, i) => `<button class="choice ${S.choice === i ? 'sel' : ''}" data-c="${i}">${esc(o)}</button>`).join('')}</div>`;
    area.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { S.choice = Number(b.dataset.c); drawAnswer(); }));
    controls.innerHTML = `<div style="margin-top:12px"><button class="btn block" data-go ${S.choice == null ? 'disabled' : ''}>Controleer</button></div>${helpRow()}`;
  } else {
    area.innerHTML = `${answerBox(S.input, q.unit, q.money)}
      ${q.type === 'fraction' ? '<p class="small muted" style="margin-top:6px;text-align:center">Breuk: 3/4 · Gemengd getal: 2 spatie 1/2</p>' : ''}
      ${q.type === 'time' ? '<p class="small muted" style="margin-top:6px;text-align:center">Schrijf zo: 14:45</p>' : ''}`;
    controls.innerHTML = keypad(q.type, 'Controleer', !!S.input) + helpRow();
    controls.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => keyPress(b.dataset.k)));
  }
  controls.querySelector('[data-go]').onclick = submit;
  controls.querySelector('[data-hint]')?.addEventListener('click', getHint);
  controls.querySelector('[data-guide]')?.addEventListener('click', startGuide);
  controls.querySelector('[data-ask]')?.addEventListener('click', () => openTeacher());
  controls.querySelector('[data-dunno]')?.addEventListener('click', dontKnow);
}
function helpRow() {
  const c = S.cur, q = c.question, o = c.offer;
  const btns = [];
  if (!c.guided && o.mode === 'optional' && q.guideCount) {
    const cost = S.data.maxPoints ? (o.free ? '' : ' (½ centen)') : '';
    btns.push(`<button class="btn ghost" data-guide>🪜 Samen stap voor stap${cost}</button>`);
  }
  if (q.hasSteps && !q.noHelp && !c.guided) btns.push(`<button class="btn ghost" data-hint ${S.hintMore === false || (c.hints || []).length >= (c.hintCount || 99) ? 'disabled' : ''}>💡 ${(c.hints || []).length ? 'Nog een hint' : 'Hint'}</button>`);
  if (STATE?.ai && !q.noHelp) btns.push(`<button class="btn ghost" data-ask>🧑‍🏫 Vraag ${esc(STATE.teacher || 'de meester')}</button>`);
  btns.push('<button class="btn ghost" data-dunno>🤷 Weet ik niet</button>');
  return `<div class="help-row">${btns.join('')}</div>`;
}
function keyPress(k) {
  if (S.phase !== 'ask') return;
  const stepMode = S.cur.guided && S.cur.guideStep;
  let v = stepMode ? S.stepInput : S.input;
  if (k === '⌫') v = v.slice(0, -1);
  else if (k === 'C') v = '';
  else if (k === '␣') { if (v && !v.endsWith(' ') && !v.includes(' ')) v += ' '; }
  else if (v.length < 14) {
    if ((k === ',' && v.includes(',')) || (k === '/' && v.includes('/')) || (k === ':' && v.includes(':'))) return;
    v += k;
  }
  if (stepMode) { S.stepInput = v; S.stepMsg = null; } else S.input = v;
  buzz(8);
  drawAnswer();
}
document.addEventListener('keydown', (e) => {
  if (!S || !location.hash.startsWith('#/sessie') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (S.phase === 'feedback' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return next(); }
  if (S.phase !== 'ask') return;
  const c = S.cur;
  const st = c.guided && c.guideStep;
  const type = st ? st.type : c.question.type;
  if (type === 'choice') {
    const opts = st ? st.options : c.question.options, n = Number(e.key);
    if (n >= 1 && n <= opts.length) { if (st) S.stepChoice = n - 1; else S.choice = n - 1; drawAnswer(); }
    if (e.key === 'Enter') (st ? submitStep : submit)();
    return;
  }
  if (/^[0-9]$/.test(e.key)) keyPress(e.key);
  else if (e.key === ',' || e.key === '.') keyPress(',');
  else if (e.key === '/' || e.key === ':') keyPress(e.key);
  else if (e.key === ' ') { e.preventDefault(); keyPress('␣'); }
  else if (e.key === 'Backspace') keyPress('⌫');
  else if (e.key === 'Enter') (st ? submitStep : submit)();
});

async function startGuide() {
  try {
    const r = await api(`/api/session/${S.data.id}/guide`, { index: S.cur.index });
    Object.assign(S.cur, { guided: true, guideStep: r.step, guideDone: [] });
    S.autoIntro = false;
    drawAnswer();
  } catch (e) { toast(e.message); }
}
async function submitStep() {
  const st = S.cur.guideStep;
  const answer = st.type === 'choice' ? S.stepChoice : S.stepInput;
  if (answer == null || answer === '') return;
  try {
    const r = await api(`/api/session/${S.data.id}/step`, { index: S.cur.index, answer });
    S.cur.guideDone = r.done;
    if (r.correct) { buzz(20); S.stepMsg = null; S.stepInput = ''; S.stepChoice = null; S.cur.guideStep = r.next; S.cur.guideFinal = r.final; if (r.note) toast(r.note); }
    else if (r.revealed) { buzz([40, 30, 40]); S.stepMsg = null; S.stepInput = ''; S.stepChoice = null; S.cur.guideStep = r.next; S.cur.guideFinal = r.final; toast(`Geeft niks! Het was ${r.display}. We gaan verder.`); }
    else {
      buzz([40, 30, 40]); S.stepMsg = { kind: 'tip', text: `Nog niet. Tip: ${r.tip}` };
      const tried = st.type === 'choice' ? st.options[answer] : answer;
      S.stepInput = ''; S.stepChoice = null;
      drawAnswer();
      // de leraar legt precies deze stap uit
      if (STATE?.ai) { S.teacherOpen = true; talk(`Ik snap deze stap niet: ${st.ask}`, 'step', { stepGiven: tried }); }
      return;
    }
    drawAnswer();
  } catch (e) { toast(e.message); }
}

async function getHint() {
  try {
    const r = await api(`/api/session/${S.data.id}/hint`, { index: S.cur.index });
    S.cur.hints = r.hints;
    S.hintMore = r.more;
    $app.querySelector('#hints').innerHTML = (S.cur.hints || []).map(hintHTML).join('');
    drawAnswer();
  } catch (e) { toast(e.message); }
}

// Gesprek met de leraar bij deze som (wordt per som op de server bewaard)
function quickFor() {
  const answered = S.phase === 'feedback' || S.phase === 'done';
  if (answered && S.last && !S.last.correct) return ['Ik snap het nog niet 🤔', 'Heb je een ezelsbruggetje?', 'Ik snap het! 👍'];
  if (answered) return ['Waarom klopt dit?', 'Kan het ook sneller?'];
  if (S.cur.guided && S.cur.guideStep) return ['Ik snap deze stap niet', 'Geef een voorbeeld'];
  return ['Ik snap de vraag niet', 'Hoe begin ik?', 'Heb je een ezelsbruggetje?'];
}
function drawTeacher(loading = false) {
  const area = $app.querySelector('#ai-area');
  if (!area) return;
  const chat = S.cur.chat || [];
  if (!chat.length && !loading && !S.teacherOpen) { area.innerHTML = ''; return; }
  area.innerHTML = teacherHTML(chat, { loading, quick: quickFor(), intro: !chat.length && !loading ? 'Waar loop je op vast? Vertel maar, of kies hieronder.' : null });
  bindTeacher(area, (msg) => talk(msg));
  area.querySelector('.t-msgs')?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function openTeacher() { S.teacherOpen = true; drawTeacher(); }
async function talk(message, mode, extra = {}) {
  if (S.talking) return;
  S.talking = true;
  if (message) S.cur.chat = [...(S.cur.chat || []), { role: 'kid', text: message }];
  drawTeacher(true);
  try {
    const r = await api(`/api/session/${S.data.id}/chat`, { index: S.cur.index, message, mode, scratch: S.phase === 'ask' ? kladPayload() : null, ...extra });
    if (r.chat) S.cur.chat = r.chat;
    else if (r.reason) S.cur.chat = [...(S.cur.chat || []), { role: 'teacher', text: r.reason }];
  } catch (e) { S.cur.chat = [...(S.cur.chat || []), { role: 'teacher', text: e.message }]; }
  S.talking = false;
  drawTeacher();
}

// ---------- kladblok: tussenstappen tekenen (vinger/muis) of typen ----------
// Per som een leeg blaadje. Het gaat mee met je antwoord, zodat de leraar kan zien hoe je rekende.
function kladReset(index) { S.klad = { index, strokes: [], text: '', open: S.klad?.open || !!S.cur?.adapt?.showWork, typing: false }; }
function kladHTML() {
  const k = S.klad;
  return `<details class="klad" id="klad"${k.open ? ' open' : ''}>
    <summary><span>✏️ Kladblok</span><span class="small muted">${k.strokes.length || k.text ? 'je hebt al iets opgeschreven' : S.cur?.adapt?.showWork ? 'schrijf hier je tussenstappen, dan zien we samen waar het lastig wordt' : 'reken hier je tussenstappen uit'}</span></summary>
    <div class="klad-body">
      <canvas id="klad-c" aria-label="Kladblok: schrijf met je vinger"></canvas>
      <textarea id="klad-t" rows="3" placeholder="Typ je tussenstappen, bijvoorbeeld: 276 : 6 = 46"${k.typing ? '' : ' hidden'}>${esc(k.text)}</textarea>
      <div class="klad-tools">
        <button class="btn ghost sm" data-kl="undo" aria-label="Laatste streep weg">↶ Terug</button>
        <button class="btn ghost sm" data-kl="clear">🗑 Wissen</button>
        <button class="btn ghost sm" data-kl="type">${k.typing ? '✏️ Tekenen' : '⌨️ Typen'}</button>
      </div>
      ${STATE?.ai ? `<p class="small muted" style="margin-top:6px">🧑‍🏫 ${esc(STATE.teacher)} kijkt mee in je kladblok als je hulp vraagt of iets fout gaat.</p>` : ''}
    </div></details>`;
}
function kladColors() {
  const cs = getComputedStyle(document.body);
  return { ink: cs.getPropertyValue('--ink').trim() || '#222', line: cs.getPropertyValue('--line').trim() || '#ddd', bg: cs.getPropertyValue('--card').trim() || '#fff' };
}
function kladDraw() {
  const c = document.getElementById('klad-c');
  if (!c || !c.offsetWidth) return;
  const dpr = window.devicePixelRatio || 1, w = c.offsetWidth, h = c.offsetHeight;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d'), col = kladColors();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = col.bg; g.fillRect(0, 0, w, h);
  // ruitjespapier, net als een rekenschrift
  g.strokeStyle = col.line; g.lineWidth = 1;
  g.beginPath();
  for (let x = 24; x < w; x += 24) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); }
  for (let y = 24; y < h; y += 24) { g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); }
  g.stroke();
  kladStrokes(g, S.klad.strokes, w, col.ink, 1);
}
// punten worden bewaard als fractie van de breedte, zodat draaien/vergroten niets kapotmaakt
function kladStrokes(g, strokes, w, ink, scale) {
  g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 3 * scale;
  for (const s of strokes) {
    g.beginPath();
    s.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * w) : g.moveTo(x * w, y * w)));
    if (s.length === 1) g.lineTo(s[0][0] * w + 0.1, s[0][1] * w);
    g.stroke();
  }
}
function bindKlad() {
  const box = document.getElementById('klad');
  if (!box) return;
  box.addEventListener('toggle', () => { S.klad.open = box.open; if (box.open) kladDraw(); });
  const c = document.getElementById('klad-c'), t = document.getElementById('klad-t');
  let cur = null;
  const pt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width]; };
  c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); cur = [pt(e)]; S.klad.strokes.push(cur); kladDraw(); });
  c.addEventListener('pointermove', (e) => { if (!cur) return; cur.push(pt(e)); kladDraw(); });
  const end = () => { cur = null; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  t.addEventListener('input', () => { S.klad.text = t.value.slice(0, 600); });
  box.querySelectorAll("[data-kl]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.kl;
    if (k === 'undo') { S.klad.strokes.pop(); kladDraw(); }
    if (k === 'clear') { S.klad.strokes = []; S.klad.text = ''; t.value = ''; kladDraw(); }
    if (k === 'type') { S.klad.typing = !S.klad.typing; t.hidden = !S.klad.typing; b.textContent = S.klad.typing ? '✏️ Tekenen' : '⌨️ Typen'; if (S.klad.typing) t.focus(); }
  }));
  if (box.open) requestAnimationFrame(kladDraw);
}
// buiten het kladblok tikken (antwoordvak, cijfertoetsen) = klaar met typen in het kladblok
document.addEventListener('pointerdown', (e) => {
  if (document.activeElement?.id === 'klad-t' && !e.target.closest('#klad')) document.activeElement.blur();
});
window.addEventListener('resize', () => { if (document.getElementById('klad-c')) { const c = document.getElementById('klad-c'); c.width = 0; kladDraw(); } });
// Wat er naar de leraar gaat: een klein, wit plaatje met alleen de strepen (+ getypte tekst)
function kladPayload() {
  const k = S.klad;
  if (!k || k.index !== S.cur?.index || (!k.strokes.length && !k.text.trim())) return null;
  let image = null;
  if (k.strokes.length) {
    const c = document.getElementById('klad-c'), ratio = c && c.offsetWidth ? c.offsetHeight / c.offsetWidth : 0.6;
    const W = 640, H = Math.round(W * ratio), off = document.createElement('canvas');
    off.width = W; off.height = H;
    const g = off.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    kladStrokes(g, k.strokes, W, '#111', W / (c?.offsetWidth || W));
    image = off.toDataURL('image/jpeg', 0.75);
  }
  return { image, text: k.text.trim() };
}

async function dontKnow() {
  if (S.phase !== 'ask') return;
  await sendAnswer({ dontKnow: true });
}
async function submit() {
  const q = S.cur.question;
  const answer = q.type === 'choice' ? S.choice : S.input;
  if (answer == null || answer === '') return;
  // bij onderdelen waar we nog niet zien wáár het misgaat: één keer vriendelijk vragen om tussenstappen
  if (S.cur.adapt?.showWork && !kladPayload() && !(S.workAsked ||= {})[S.cur.index]) {
    S.workAsked[S.cur.index] = true;
    const write = await ask(`<div class="big-emoji">✏️</div><h2 style="margin:8px 0">Eerst even je tussenstappen?</h2><p class="muted">Schrijf in het kladblok hoe je rekent. Dan kan ${esc(STATE?.teacher || 'Max')} precies zien waar het lastig wordt, en dat scheelt jou een hoop fouten.</p>`, 'Ja, even opschrijven', 'Nee, controleer maar');
    if (write) {
      const box = document.getElementById('klad');
      if (box) { box.open = true; S.klad.open = true; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); requestAnimationFrame(kladDraw); }
      return;
    }
  }
  await sendAnswer({ answer });
}
async function sendAnswer(extra) {
  S.phase = 'checking';
  const go = $app.querySelector('[data-go]'); if (go) go.disabled = true;
  try {
    S.lastMs = Date.now() - S.t0;
    const r = await api(`/api/session/${S.data.id}/answer`, { index: S.cur.index, timeMs: S.lastMs, scratch: kladPayload(), ...extra });
    S.last = r;
    S.data.correct += r.correct ? 1 : 0;
    S.data.points = r.points;
    S.data.streak = r.streak;
    S.phase = 'feedback';
    S.badges.push(...(r.badges || []));
    showFeedback(r);
  } catch (e) {
    S.phase = 'ask'; drawAnswer(); toast(e.message);
  }
}

function showFeedback(r) {
  const q = S.cur.question;
  let title;
  if (r.correct) {
    buzz(30);
    title = r.rewardKind === 'solo-double' ? pick(PRAISE.double) : r.retry ? pick(PRAISE.retry) : r.guided ? pick(PRAISE.guided) : pick(PRAISE.solo);
    title = title.replace('{naam}', STATE?.name || 'Rekenaar');
    if (r.streak >= 3 && r.streak % 3 === 0) title += ` 🔥 ${r.streak} op rij!`;
    if (r.rewardKind === 'solo-double' || r.retry || (r.streak && r.streak % 5 === 0) || Math.random() < 0.15) confetti();
  } else {
    buzz([60, 40, 60]);
    title = r.given === 'weet ik niet' ? pick(PRAISE.dunno) : pick(PRAISE.wrong);
  }
  const rewardChip = S.data.maxPoints && r.correct
    ? `<span class="chip coin">+${cents(r.cents)}${r.rewardKind === 'solo-double' ? ' · dubbel!' : r.rewardKind === 'guided-half' ? ' · half (met hulp)' : ''}</span>` : '';
  const area = $app.querySelector('#answer-area');
  area.innerHTML = `<div class="answer-box" style="border-color:${r.correct ? 'var(--good)' : 'var(--bad)'}">${esc(r.given)}${q.unit && !q.money && r.given !== 'weet ik niet' ? `<span class="unit">${esc(q.unit)}</span>` : ''}</div>`;
  $app.querySelector('#hints').innerHTML = '';
  const nextIsRetry = r.next?.question?.retry;
  // te snel en fout? (vaker, of een bekend patroon) → rustig vragen om eerst te schatten
  const fast = !r.correct && r.given !== 'weet ik niet' && S.lastMs < 6000 && S.data.kind !== 'intake';
  if (fast) S.fastWrong = (S.fastWrong || 0) + 1;
  const slowDown = fast && (S.cur.adapt?.impulsive || S.fastWrong >= 2);
  const showSteps = !r.correct || r.hints;
  $app.querySelector('#fb').innerHTML = `<div class="feedback ${r.correct ? 'ok' : 'no'}">
    <div class="row between"><div class="title">${esc(title)}</div>${rewardChip}</div>
    ${r.correct ? (r.note ? `<p>${esc(r.note)}</p>` : '') : `<p>Het goede antwoord is <b>${esc(r.display)}</b>.${r.note ? ' ' + esc(r.note) : ''}</p>`}
    ${r.misconception ? `<div class="mis"><b>🔎 ${esc(r.misconception.label)}</b><div>👉 ${esc(r.misconception.fix)}</div></div>` : ''}
    ${!r.correct && r.review ? '<p class="small" style="margin-top:6px">🔁 Deze komt over een paar dagen nog eens terug. Dan lukt hij vast!</p>' : ''}
    ${slowDown ? `<p class="small" style="margin-top:8px;font-weight:800">🐢 Dat ging supersnel! Bij de volgende: kijk eerst wat er ongeveer uit moet komen, en reken dan rustig. Snelheid levert geen extra centen op, goed wel. 😉</p>` : ''}
    ${showSteps && !(STATE?.ai && !r.correct && S.data.kind !== 'intake') ? `<p style="margin-top:10px;font-weight:900">Zo reken je het uit:</p><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      : `<details style="margin-top:8px"><summary class="small muted">Hoe reken je dit uit?</summary><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`}
    ${nextIsRetry ? '<p class="small" style="margin-top:10px;font-weight:800">👉 Hierna krijg je een herkansing: zo\'n soort som, samen stap voor stap.</p>' : ''}
  </div>`;
  $app.querySelector('#guide').innerHTML = '';
  $app.querySelector('#controls').innerHTML = `<div class="stack" style="margin-top:12px">
    ${STATE?.ai && (r.correct || S.data.kind === 'intake') && !(S.cur.chat || []).length ? `<button class="btn ghost block" data-ask2>🧑‍🏫 ${r.correct ? 'Praat erover met' : 'Leg het me uit,'} ${esc(STATE.teacher)}</button>` : ''}
    <button class="btn ${r.correct ? 'good' : ''} block" data-next>${r.done ? 'Bekijk je resultaat' : nextIsRetry ? 'Herkansing →' : 'Volgende →'}</button></div>`;
  $app.querySelector('[data-next]').onclick = next;
  $app.querySelector('[data-ask2]')?.addEventListener('click', (e) => { e.target.remove(); if (r.correct) openTeacher(); else { S.teacherOpen = true; talk(null, 'start'); } });
  // fout? De leraar kijkt wat er misging en begint een gesprekje
  if (!r.correct && STATE?.ai && S.data.kind !== 'intake') { S.teacherOpen = true; talk(null, 'start'); }
  else drawTeacher();
  if (r.teachback) drawTeachback(r);
  $app.querySelector('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (r.surprise) setTimeout(() => showSurprise(r.surprise), r.weekBonus ? 1800 : 600);
  if (r.weekBonus) setTimeout(() => { confetti(); toast(`📅 Weekbonus! +${r.weekBonus} cent extra voor een hele week oefenen!`, 4500); }, 400);

  // momenten die er toe doen
  if (r.event === 'up') celebrateLevel(r);
  else if (r.event === 'down') sheet(`<div style="text-align:center"><div class="big-emoji">🪜</div><h2 style="margin:8px 0">Even een stapje terug</h2>
      <p>Bij <b>${esc(r.eventCat)}</b> oefenen we even op <b>${esc(r.eventLevel)}-niveau</b>. Zo bouw je het stevig op, als een huis: eerst de fundering. 🏠</p>
      <p class="muted" style="margin-top:8px">Heb je daar 8 van de 10 goed? Dan ga je weer omhoog. Je krijgt de komende sommen extra hulp. 💪</p></div>
      <button class="btn block" data-close>Oké, we gaan ervoor!</button>`);
  else if (r.easy === 'on') toast('Even een tandje terug. Ook raceauto\'s gaan de pitstraat in. 🏎️', 3500);
  else if (r.easy === 'off') toast('Je bent weer op dreef! Volle gas! 🚀', 3000);
  for (const b of r.badges || []) setTimeout(() => toast(`${b.icon} Nieuwe badge: ${b.title}!`, 3500), 600);
}
// Teach-back: "Leg eens uit hoe je het deed" (uitleggen = beter onthouden)
function drawTeachback() {
  const box = $app.querySelector('#ai-area');
  box.innerHTML = `<div class="teach">
    <div style="font-weight:900">🗣️ Jij bent nu de juf of meester!</div>
    <p class="small" style="margin:4px 0 8px">Leg in je eigen woorden uit hoe je deze som hebt uitgerekend. Wie het kan uitleggen, snapt het echt.</p>
    <form class="stack" style="gap:8px"><textarea maxlength="600" rows="3" placeholder="Eerst deed ik ..., daarna ..."></textarea>
    <div class="row"><button class="btn" style="flex:1">Stuur</button><button type="button" class="btn ghost" data-skip>Sla over</button></div></form></div>`;
  const form = box.querySelector('form');
  box.querySelector('[data-skip]').onclick = () => (box.innerHTML = '');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = form.querySelector('textarea').value.trim();
    if (text.length < 3) return toast('Schrijf eerst kort op hoe je het deed.');
    form.innerHTML = `<div><span class="loader"></span> ${esc(STATE?.teacher || 'De meester')} leest je uitleg…</div>`;
    try {
      const t = await api(`/api/session/${S.data.id}/teachback`, { index: S.cur.index, text });
      if (t.badge) { S.badges.push(t.badge); toast(`${t.badge.icon} Nieuwe badge: ${t.badge.title}!`, 3500); }
      box.innerHTML = `<div class="teach"><div class="small muted">Jouw uitleg:</div><p style="margin-bottom:8px">"${esc(text)}"</p>
        ${t.feedback ? `<div style="font-weight:900;color:var(--primary)">🧑‍🏫 ${esc(STATE?.teacher || '')}</div><div class="coach">${rich(t.feedback)}</div>`
          : `<div style="font-weight:800">Top uitgelegd! Vergelijk het met deze stappen. Deed jij het ook zo?</div><ol class="steps">${t.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`}</div>`;
    } catch (err) { box.innerHTML = `<div class="teach">${esc(err.message)}</div>`; }
  };
}

function showSurprise(reward) {
  confetti(); setTimeout(confetti, 700);
  sheet(`<div style="text-align:center"><div class="big-emoji gift">🎁</div><h2 style="margin:8px 0">Verrassing!</h2>
    <p>Omdat je deze week zo goed je best doet, krijg je:</p>
    <div class="surprise">${esc(reward)}</div>
    <p class="muted small" style="margin-top:8px">Laat dit scherm aan papa of mama zien! 📱</p></div>
    <button class="btn good block" data-close>Yes!! 🙌</button>`);
}

function celebrateLevel(r) {
  confetti();
  sheet(`<div style="text-align:center"><div class="big-emoji">⬆️</div><h2 style="margin:8px 0">Niveau omhoog!</h2>
    <p>Bij <b>${esc(r.eventCat)}</b> reken je nu op <b>${esc(r.eventLevel)}-niveau</b>.</p>
    <p class="muted" style="margin-top:8px">Je hersenen moeten nieuwe kleren kopen, de oude passen niet meer. 🧠👕</p></div>
    <button class="btn good block" data-close>Yes!</button>`);
}

function next() {
  const r = S.last;
  if (r?.done) { S.phase = 'done'; return renderSummary(r.summary); }
  S.cur = r.next;
  S.hintMore = true;
  S.autoIntro = false;
  startQuestion();
  window.scrollTo(0, 0);
}

async function renderSummary(sum) {
  const pct = sum.total ? sum.correct / sum.total : 0;
  const msg = pct >= 0.9 ? 'Super gedaan! 🏆' : pct >= 0.7 ? 'Goed bezig! 💪' : pct >= 0.5 ? 'Netjes doorgezet! 👍' : 'Knap dat je hem hebt afgemaakt! 🧗';
  if (pct >= 0.7) confetti();
  STATE = await api('/api/state');
  const highlights = [
    sum.bestStreak >= 3 ? `🔥 Langste reeks: <b>${sum.bestStreak} op rij</b>` : '',
    sum.retryOk ? `🦸 <b>${sum.retryOk}×</b> een herkansing goed` : '',
    sum.guidedOk ? `🪜 <b>${sum.guidedOk}×</b> goed met tussenstappen` : '',
    sum.record ? '📈 <b>Nieuw record!</b>' : '',
  ].filter(Boolean);
  const badges = S?.badges || [];
  $app.innerHTML = `<div class="stack">
    <div class="card done-hero"><div class="big-emoji">${pct >= 0.7 ? '🎉' : '⭐'}</div>
      <div class="score">${sum.correct}/${sum.total}</div><p class="muted">sommen goed</p>
      <h2 style="margin:10px 0">${msg}</h2>
      ${sum.maxPoints ? `<div class="coin-pop">🪙 +${sum.points} cent</div>` : '<span class="chip">Oefenronde — zonder centen</span>'}
    </div>
    ${STATE.ai ? `<div class="card" id="reflect"><div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub muted"><span class="loader"></span> ${esc(STATE.teacher)} schrijft je een berichtje…</div></div></div>` : ''}
    ${highlights.length ? `<div class="card stack">${highlights.map((h) => `<div>${h}</div>`).join('')}</div>` : ''}
    ${badges.length ? `<div class="card"><h3>Nieuwe badges</h3><div class="badges">${badges.map((b) => `<div class="badge on"><span>${b.icon}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>` : ''}
    ${sum.kind === 'intake' ? `<div class="card"><h3>Jouw uitslag</h3><p class="small muted" style="margin:4px 0 8px">Van sterk naar "hier word je beter in". Vanaf nu krijg je elke schooldag ${STATE.points.dailyCount} sommen, op jouw niveau.</p>
      ${STATE.skills.map((x, i) => `<div class="mini-skill"><span class="rank">${i + 1}</span><div><div style="font-weight:800">${x.icon} ${esc(x.label)}</div><div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div></div><span class="small muted">${x.levelName}</span></div>`).join('')}</div>`
    : sum.perCat ? `<div class="card"><h3>Per onderdeel</h3>${sum.perCat.map((p) => `<div class="mini-skill"><span class="ico">${p.icon}</span><div style="font-weight:800">${esc(p.label)}</div><span class="chip ${p.ok === p.n ? 'good' : p.ok === 0 ? 'bad' : ''}">${p.ok}/${p.n}</span></div>`).join('')}</div>` : ''}
    <div class="card coin row between"><div class="row"><span class="big-emoji" style="font-size:30px">🐷</span><b>Spaarpot</b></div><span class="money" style="font-size:22px">${euro(STATE.wallet.balance)}</span></div>
    ${mopCard()}
    <a class="btn block" href="#/">Klaar</a>
  </div>`;
  $tabs.hidden = true;
  $app.querySelector('[data-mop]')?.addEventListener('click', (e) => { const el = e.currentTarget.querySelector('.punch'); el.hidden = !el.hidden; });
  if (STATE.ai && S?.data?.id) {
    api(`/api/session/${S.data.id}/reflect`, {}).then((r) => {
      const box = $app.querySelector('#reflect');
      if (!box) return;
      if (r.text) box.innerHTML = `<div class="small muted" style="margin-bottom:6px">Berichtje van ${esc(STATE.teacher)}</div><div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(r.text)}</div></div>`;
      else box.remove();
    }).catch(() => $app.querySelector('#reflect')?.remove());
  }
}

// ---------- plaatjes bij sommen ----------
function renderVisual(v) {
  const ink = 'currentColor';
  if (v.kind === 'table') {
    return `<table>${v.headers ? `<tr>${v.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>` : ''}${v.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 && !v.headers ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</table>`;
  }
  if (v.kind === 'bar' || v.kind === 'line') {
    const W = 340, H = 210, L = 38, B = 28, T = 26, top = Math.ceil(Math.max(...v.values) / v.step) * v.step + v.step;
    const xs = (i) => L + ((W - L - 10) / v.values.length) * (i + 0.5);
    const ys = (val) => H - B - ((H - B - T) * val) / top;
    let grid = '';
    for (let g = 0; g <= top; g += v.step) grid += `<line x1="${L}" x2="${W - 6}" y1="${ys(g)}" y2="${ys(g)}" stroke="${ink}" stroke-opacity=".12"/><text x="${L - 6}" y="${ys(g) + 4}" text-anchor="end" font-size="11" fill="${ink}" opacity=".7">${g}</text>`;
    const bw = ((W - L - 10) / v.values.length) * 0.6;
    const marks = v.kind === 'bar'
      ? v.values.map((val, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(val)}" width="${bw}" height="${ys(0) - ys(val)}" rx="4" fill="var(--primary)"/>`).join('')
      : `<polyline points="${v.values.map((val, i) => `${xs(i)},${ys(val)}`).join(' ')}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round"/>${v.values.map((val, i) => `<circle cx="${xs(i)}" cy="${ys(val)}" r="4.5" fill="var(--primary)"/>`).join('')}`;
    const labels = v.labels.map((l, i) => `<text x="${xs(i)}" y="${H - 9}" text-anchor="middle" font-size="12" font-weight="700" fill="${ink}">${esc(l)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(v.title)}"><text x="${L}" y="15" font-size="13" font-weight="800" fill="${ink}">${esc(v.title)}</text>${grid}${marks}${labels}</svg>`;
  }
  if (v.kind === 'pie') {
    const colors = ['#5b3df5', '#c27c00', '#12a150', '#e5484d'];
    let a = -Math.PI / 2, paths = '', legend = '';
    const cx = 90, cy = 90, r = 80;
    v.values.forEach((val, i) => {
      const a2 = a + (val / 100) * Math.PI * 2;
      const large = a2 - a > Math.PI ? 1 : 0;
      paths += `<path d="M${cx},${cy} L${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)} Z" fill="${colors[i]}" stroke="var(--card)" stroke-width="2"/>`;
      const mid = (a + a2) / 2;
      paths += `<text x="${cx + r * 0.62 * Math.cos(mid)}" y="${cy + r * 0.62 * Math.sin(mid) + 5}" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">${val}%</text>`;
      legend += `<rect x="200" y="${30 + i * 32}" width="16" height="16" rx="4" fill="${colors[i]}"/><text x="224" y="${43 + i * 32}" font-size="15" font-weight="700" fill="${ink}">${esc(v.labels[i])}</text>`;
      a = a2;
    });
    return `<svg viewBox="0 0 340 180" role="img" aria-label="cirkeldiagram">${paths}${legend}</svg>`;
  }
  if (v.kind === 'strips') {
    const W = 320, H = 34, colors = ['#5b3df5', '#c27c00'];
    return `<svg viewBox="0 0 ${W + 60} ${v.fracs.length * (H + 14)}" role="img" aria-label="breukstroken">${v.fracs.map(([a, b], r) => {
      const y = r * (H + 14), w = W / b;
      let cells = '';
      for (let i = 0; i < b; i++) cells += `<rect x="${i * w}" y="${y}" width="${w}" height="${H}" fill="${i < a ? colors[r % 2] : 'transparent'}" fill-opacity="${i < a ? 0.75 : 0}" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5" rx="3"/>`;
      return `${cells}<text x="${W + 10}" y="${y + H / 2 + 6}" font-size="17" font-weight="900" fill="currentColor">${a}/${b}</text>`;
    }).join('')}</svg>`;
  }
  if (v.kind === 'line') {
    const W = 330, x0 = 20, x1 = W - 20, X = (val) => x0 + ((val - v.from) / (v.to - v.from || 1)) * (x1 - x0);
    const ticks = (v.ticks || []).map((t) => `<line x1="${X(t)}" x2="${X(t)}" y1="28" y2="44" stroke="currentColor" stroke-width="2"/><text x="${X(t)}" y="64" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${t}${v.unit && t === v.ticks.at(-1) ? v.unit : ''}</text>`).join('');
    const mark = v.mark != null ? `<circle cx="${X(v.mark)}" cy="36" r="7" fill="var(--bad)"/><text x="${X(v.mark)}" y="18" text-anchor="middle" font-size="13" font-weight="900" fill="var(--bad)">${v.mark}</text>` : '';
    return `<svg viewBox="0 0 ${W} 72" role="img" aria-label="getallenlijn"><line x1="${x0}" x2="${x1}" y1="36" y2="36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>${ticks}${mark}</svg>`;
  }
  if (v.kind === 'pizza') {
    const cx = 90, cy = 90, r = 78;
    let paths = '';
    for (let i = 0; i < v.parts; i++) {
      const a = -Math.PI / 2 + (i / v.parts) * Math.PI * 2, a2 = a + Math.PI * 2 / v.parts;
      const eaten = i < v.eaten;
      paths += `<path d="M${cx},${cy} L${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} A${r},${r} 0 0 1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)} Z" fill="${eaten ? 'transparent' : '#f5b100'}" stroke="${eaten ? 'var(--muted)' : '#c27c00'}" stroke-width="3" ${eaten ? 'stroke-dasharray="6 5"' : ''}/>`;
    }
    return `<svg viewBox="0 0 340 180" role="img" aria-label="pizza">${paths}<text x="200" y="80" font-size="15" font-weight="800" fill="${ink}">🍕 = over</text><text x="200" y="108" font-size="15" font-weight="800" fill="${ink}">- - = opgegeten</text></svg>`;
  }
  if (v.kind === 'grid') {
    const s = Math.min(36, 300 / v.w), W = v.w * s + 4, H = v.h * s + 4;
    let cells = '';
    for (let y = 0; y < v.h; y++) for (let x = 0; x < v.w; x++) cells += `<rect x="${2 + x * s}" y="${2 + y * s}" width="${s}" height="${s}" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="1.5"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" style="max-width:${W}px;margin:0 auto">${cells}</svg>`;
  }
  if (v.kind === 'rect' || v.kind === 'tri' || v.kind === 'lshape') {
    const W = 320, H = 190, pad = 34;
    const maxW = v.kind === 'lshape' ? v.A : v.w, maxH = v.kind === 'lshape' ? v.B : v.h;
    const k = Math.min((W - 2 * pad) / maxW, (H - 2 * pad) / maxH);
    const w = maxW * k, h = maxH * k, x0 = (W - w) / 2, y0 = (H - h) / 2;
    const style = `fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="3"`;
    const lab = (x, y, t, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="14" font-weight="800" fill="${ink}">${t}</text>`;
    if (v.kind === 'rect') return `<svg viewBox="0 0 ${W} ${H}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" ${style}/>${lab(x0 + w / 2, y0 - 8, `${v.w} ${v.unit}`)}${lab(x0 + w + 8, y0 + h / 2 + 5, `${v.h} ${v.unit}`, 'start')}</svg>`;
    if (v.kind === 'tri') {
      // driehoek met een stippel-rechthoek eromheen: zo zie je dat hij precies de helft is
      const k2 = Math.min(190 / v.w, 120 / v.h), tw = v.w * k2, th = v.h * k2, tx = 22, ty = (H - th) / 2 - 6, ax = tx + tw * 0.35, rx = tx + tw + 14;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="driehoek met basis ${v.w} en hoogte ${v.h}">
        <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" fill="none" stroke="${ink}" stroke-dasharray="5 4" opacity=".35"/>
        <polygon points="${tx},${ty + th} ${tx + tw},${ty + th} ${ax},${ty}" ${style}/>
        <line x1="${ax}" y1="${ty}" x2="${ax}" y2="${ty + th}" stroke="${ink}" stroke-dasharray="4 4" opacity=".7"/>
        <polyline points="${ax},${ty + th - 10} ${ax + 10},${ty + th - 10} ${ax + 10},${ty + th}" fill="none" stroke="${ink}" opacity=".7"/>
        <line x1="${rx}" y1="${ty}" x2="${rx}" y2="${ty + th}" stroke="${ink}" stroke-width="2"/>
        <line x1="${rx - 5}" y1="${ty}" x2="${rx + 5}" y2="${ty}" stroke="${ink}" stroke-width="2"/><line x1="${rx - 5}" y1="${ty + th}" x2="${rx + 5}" y2="${ty + th}" stroke="${ink}" stroke-width="2"/>
        ${lab(rx + 10, ty + th / 2 - 4, 'hoogte', 'start')}${lab(rx + 10, ty + th / 2 + 14, `${v.h} ${v.unit}`, 'start')}
        ${lab(tx + tw / 2, ty + th + 22, `basis ${v.w} ${v.unit}`)}</svg>`;
    }
    const a = v.a * k, b = v.b * k;
    return `<svg viewBox="0 0 ${W} ${H}"><polygon points="${x0},${y0} ${x0 + w - a},${y0} ${x0 + w - a},${y0 + b} ${x0 + w},${y0 + b} ${x0 + w},${y0 + h} ${x0},${y0 + h}" ${style}/>
      <rect x="${x0 + w - a}" y="${y0}" width="${a}" height="${b}" fill="none" stroke="${ink}" stroke-dasharray="5 4" opacity=".5"/>
      ${lab(x0 + w / 2, y0 + h + 20, `${v.A} ${v.unit}`)}${lab(x0 - 8, y0 + h / 2, `${v.B} ${v.unit}`, 'end')}${lab(x0 + w - a / 2, y0 + b / 2 + 5, `${v.a}×${v.b}`)}</svg>`;
  }
  return '';
}

// =====================================================================
// OUDERS
// =====================================================================
async function renderParent() {
  let data;
  try { data = await api('/api/parent/overview'); } catch (e) {
    if (e.status === 401) return pinScreen('Pincode voor ouders', async (pin) => { await api('/api/parent/login', { pin }); renderParent(); });
    throw e;
  }
  const accBy = Object.fromEntries(data.acc.map((a) => [a.cat, a]));
  const spark = (cat) => {
    const pts = data.snaps.filter((s) => s.cat === cat).map((s) => s.score);
    if (pts.length < 2) return '';
    const W = 90, H = 26;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${pts.map((p, i) => `${(i / (pts.length - 1)) * (W - 4) + 2},${H - 2 - (p / 100) * (H - 4)}`).join(' ')}"/></svg>`;
  };
  const kindNl = { intake: 'Starttoets', daily: 'Dagtaak', practice: 'Oefenen' };
  $app.innerHTML = `<div class="stack">
    <div class="row between"><a href="#/spaarpot" class="small">‹ Terug</a><button class="btn ghost" data-logout>Uitloggen</button></div>
    <div class="row between"><h1>Ouderoverzicht</h1><a href="#/overzicht" class="small">👨‍🏫 Alle kinderen</a></div>
    <div class="card coin stack"><div class="row between"><div><div class="small muted">Spaarpot van ${esc(data.name)}</div><div class="money" style="font-size:30px">${euro(data.wallet.balance)}</div></div><div class="small muted" style="text-align:right">verdiend ${euro(data.wallet.earned)}<br>uitbetaald ${euro(data.wallet.paid)}<br>🔥 ${data.streak} dagen op rij</div></div>
      <form class="row" data-payout><div class="field" style="flex:1"><input inputmode="decimal" placeholder="Bedrag in €, bijv. 2,50" name="amt"></div><button class="btn">Uitbetalen</button></form></div>

    <div class="card stack"><div class="row between"><h2>🧑‍🏫 ${esc(data.teacher)} (AI-leraar)</h2>${data.ai ? `<span class="chip good">${esc(data.aiProvider)}${data.aiModel ? ' · ' + esc(data.aiModel) : ''}</span>` : '<span class="chip bad">AI uit</span>'}</div>
      ${data.ai ? '' : '<p class="small">Zet <code>OPENAI_API_KEY</code> in de instellingen (.env of Railway) om de AI-leraar aan te zetten.</p>'}
      <h3>Leerlingprofiel</h3>
      <div id="profile">${profileHTML(data.profile)}</div>
      <button class="btn ghost block" data-profile ${data.ai ? '' : 'disabled'}>Profiel nu bijwerken</button>
      <h3 style="margin-top:6px">Wat ${esc(data.teacher)} onthoudt</h3>
      ${data.memory?.length ? `<ul class="small" style="margin:0 0 0 18px;padding:0">${data.memory.map((m) => `<li><span class="muted">${esc(m.d.slice(8))}-${esc(m.d.slice(5, 7))}</span> ${esc(m.n)}</li>`).join('')}</ul>` : '<p class="small muted">Nog niets. Na elke sessie en les schrijft hij korte notities.</p>'}
    </div>
    <div class="card stack"><div class="row between"><h2>AI-advies voor jou</h2></div>
      <p class="small muted">Samenvatting van waar ${esc(data.name)} staat, en wat je thuis kunt doen.</p>
      <div id="advice"></div>
      <button class="btn ghost block" data-advice ${data.ai ? '' : 'disabled'}>Maak advies</button></div>

    <div class="card"><h2>Onderdelen</h2><p class="small muted" style="margin:4px 0 6px">Niveau (opstap/basis/1F/1S) · score · laatste 14 dagen goed, waarvan met tussenstappen · trend</p>
      <table class="list"><tr><th>Onderdeel</th><th>Score</th><th>14 d</th><th></th></tr>
      ${data.skills.map((x) => `<tr><td>${x.icon} ${esc(x.label)}${x.struggling ? ' <span class="chip bad">extra hulp</span>' : ''}<div class="small muted">${x.levelName} · ${x.guidedWins}/5 leerfase${x.soloBonus ? ` · ${x.soloBonus}× zelf-bonus` : ''}</div></td><td><b>${x.score}</b> ${trend(x.trend)}</td>
        <td>${accBy[x.cat] ? `${accBy[x.cat].ok}/${accBy[x.cat].n}<div class="small muted">${accBy[x.cat].guided} met stappen · ${Math.round((accBy[x.cat].avg_ms || 0) / 1000)}s</div>` : '–'}</td><td>${spark(x.cat)}</td></tr>`).join('')}</table></div>

    <div class="card stack"><h2>🎁 Wekelijkse verrassing</h2>
      <p class="small muted">Eén keer per week, op een willekeurige dag, krijgt ${esc(data.name)} een verrassing als de dagtaak goed ging. Een bedrag met "euro" gaat automatisch in de spaarpot.</p>
      <form class="stack" data-surprise style="gap:8px">
        <label class="row"><input type="checkbox" name="enabled" ${data.surprise.cfg.enabled ? 'checked' : ''}> <span>Aan</span></label>
        <label class="field"><span class="small" style="font-weight:800">Verrassingen (één per regel)</span><textarea name="rewards" rows="4">${esc(data.surprise.cfg.rewards.join('\n'))}</textarea></label>
        <label class="field"><span class="small" style="font-weight:800">Minimaal goed in de dagtaak</span><select name="min">${[0.5, 0.6, 0.7, 0.8, 0.9].map((m) => `<option value="${m}" ${Math.abs(m - data.surprise.cfg.min) < 0.01 ? 'selected' : ''}>${m * 100}%</option>`).join('')}</select></label>
        <button class="btn ghost">Opslaan</button>
      </form>
      ${data.surprise.list.length ? `<table class="list">${data.surprise.list.map((x, i) => `<tr><td>${esc(x.date.slice(8))}-${esc(x.date.slice(5, 7))}</td><td>${esc(x.reward)}</td><td style="text-align:right">${x.delivered ? '✅' : `<button class="btn ghost" data-delivered="${i}" style="min-height:34px;padding:0 10px">Gegeven</button>`}</td></tr>`).join('')}</table>` : '<p class="small muted">Nog geen verrassingen gegeven.</p>'}
    </div>

    <div class="card stack"><h2>🔧 Hoe leert ${esc(data.name)}? <span class="small muted">(onder de motorkap)</span></h2>
      ${signalsHTML(data.signals, data.teacher)}</div>

    <div class="card stack"><h2>🔎 Denkfouten & herhaling</h2>
      <p class="small">🔁 Foutenschrift: <b>${data.reviews?.open || 0}</b> sommen staan klaar om te herhalen, <b>${data.reviews?.done || 0}</b> zijn inmiddels geleerd.</p>
      ${data.misconceptions?.length ? `<table class="list">${data.misconceptions.map((m) => `<tr><td>${esc(m.misconception)}</td><td style="text-align:right"><b>${m.n}×</b></td></tr>`).join('')}</table>` : '<p class="small muted">Nog geen bekende denkfouten gezien (laatste 30 dagen).</p>'}
      ${data.scratchNotes?.length ? `<p style="font-weight:900;margin-top:6px">✏️ Wat ${esc(STATE?.teacher || 'de leraar')} in het kladblok zag</p>
        <table class="list">${data.scratchNotes.map((n) => `<tr><td><div class="small">${esc(n.text)} → <b>${esc(n.given)}</b> ${n.correct ? '✅' : '❌'}</div><div>${esc(n.scratch_note)}</div></td></tr>`).join('')}</table>` : ''}
    </div>

    <div class="card"><h2>Badges</h2><div class="badges">${data.badges.map((b) => `<div class="badge ${b.earned ? 'on' : ''}" title="${esc(b.text)}"><span>${b.earned ? b.icon : '🔒'}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>

    <div class="card"><h2>Recente fouten</h2>${data.recentWrong.length ? `<table class="list"><tr><th>Som</th><th>Gaf</th><th>Goed</th></tr>${data.recentWrong.map((w) => `<tr><td><span class="small muted">${esc(w.label)}</span><br>${esc(w.text)}</td><td>${esc(w.given)}</td><td>${esc(w.display)}</td></tr>`).join('')}</table>` : '<p class="muted">Nog geen fouten.</p>'}</div>

    <div class="card"><h2>Sessies</h2><table class="list"><tr><th>Dag</th><th>Soort</th><th>Goed</th><th>Cent</th><th>Tijd</th></tr>
      ${data.sessions.map((s) => `<tr><td>${s.day.slice(8)}-${s.day.slice(5, 7)}</td><td>${kindNl[s.kind]}${s.status === 'active' ? ' <span class="chip">bezig</span>' : ''}</td><td>${s.correct}/${s.total}</td><td>${s.points}</td><td>${s.secs ? Math.round(s.secs / 60) + ' min' : ''}</td></tr>`).join('')}</table></div>

    <div class="card"><h2>Spaarpot-historie</h2><table class="list">${data.ledger.map((l) => `<tr><td>${new Date(l.created_at).toLocaleDateString('nl-NL')}</td><td>${esc(l.note || '')}</td><td style="text-align:right;color:${l.cents < 0 ? 'var(--bad)' : 'var(--good)'}"><b>${l.cents > 0 ? '+' : ''}${l.cents}</b></td></tr>`).join('')}</table></div>

    <div class="card stack"><h2>Instellingen</h2>
      <form class="row" data-name><div class="field" style="flex:1"><input name="name" value="${esc(data.name)}" maxlength="30"></div><button class="btn ghost">Naam opslaan</button></form>
      <button class="btn ghost block" data-otherkid>👤 Ander kind bekijken</button>
      <button class="btn ghost block" data-reset="intake">Starttoets opnieuw laten doen</button>
      <button class="btn ghost block" data-reset="all" style="color:var(--bad)">Alles wissen (ook spaarpot)</button>
      <button class="btn ghost block" data-delkid style="color:var(--bad)">Profiel van ${esc(data.name)} helemaal verwijderen</button></div>
  </div>`;

  $app.querySelector('[data-profile]').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = 'Bezig…';
    try { const r = await api('/api/parent/profile', {}); $app.querySelector('#profile').innerHTML = profileHTML(r.profile); toast('Profiel bijgewerkt ✓'); }
    catch (err) { toast(err.message); }
    e.target.disabled = false; e.target.textContent = 'Profiel nu bijwerken';
  };
  $app.querySelector('[data-otherkid]').onclick = () => switchKid();
  $app.querySelector('[data-surprise]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await api('/api/parent/surprise', { enabled: f.enabled.checked, rewards: f.rewards.value.split('\n'), min: Number(f.min.value) });
    toast('Opgeslagen ✓');
  };
  $app.querySelectorAll('[data-delivered]').forEach((b) => (b.onclick = async () => { await api('/api/parent/surprise/delivered', { index: Number(b.dataset.delivered) }); renderParent(); }));
  $app.querySelector('[data-delkid]').onclick = async () => {
    if (!(await ask(`<h2 style="margin-bottom:8px">Profiel van ${esc(data.name)} verwijderen?</h2><p>Alles van dit kind gaat weg: niveaus, spaarpot, badges en wat ${esc(data.teacher)} onthoudt. Dit kan niet ongedaan worden.</p>`, 'Ja, verwijderen', 'Annuleren', true))) return;
    await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
    toast('Profiel verwijderd'); switchKid();
  };
  $app.querySelector('[data-logout]').onclick = async () => { await api('/api/parent/logout', {}); location.hash = '#/'; };
  $app.querySelector('[data-payout]').onsubmit = async (e) => {
    e.preventDefault();
    const amt = Math.round(parseFloat(e.target.amt.value.replace(',', '.')) * 100);
    if (!(amt > 0)) return toast('Vul een bedrag in');
    if (!(await ask(`<h2>${euro(amt)} uitbetalen?</h2>`, 'Ja, uitbetalen', 'Annuleren'))) return;
    try { await api('/api/parent/payout', { cents: amt }); toast('Uitbetaald ✓'); renderParent(); } catch (err) { toast(err.message); }
  };
  $app.querySelector('[data-advice]').onclick = async (e) => {
    const box = $app.querySelector('#advice');
    e.target.disabled = true;
    box.innerHTML = '<div class="ai-box"><span class="loader"></span> Advies maken…</div>';
    try {
      const r = await api('/api/parent/advice', {});
      box.innerHTML = `<div class="ai-box">${r.text ? rich(r.text) : esc(r.reason)}</div>`;
    } catch (err) { box.innerHTML = `<div class="ai-box">${esc(err.message)}</div>`; }
    e.target.disabled = false;
  };
  $app.querySelector('[data-name]').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/parent/settings', { name: e.target.name.value.trim() });
    STATE = null;
    toast('Opgeslagen ✓');
  };
  $app.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = async () => {
    const what = b.dataset.reset;
    const ok = await ask(`<h2 style="margin-bottom:8px">Zeker weten?</h2><p>${what === 'all' ? 'Alles wordt gewist, ook de spaarpot en badges. Dit kan niet ongedaan worden.' : 'De starttoets en alle niveaus worden opnieuw bepaald. De spaarpot blijft.'}</p>`, what === 'all' ? 'Ja, alles wissen' : 'Ja, opnieuw', 'Annuleren', true);
    if (!ok) return;
    await api('/api/parent/reset', { what, confirm: 'RESET' });
    toast('Gedaan ✓'); renderParent();
  }));
}

// "Hoe leert hij?" — signalen onder de motorkap. Alleen in het ouder-/leerkrachtscherm, nooit voor het kind.
function signalsHTML(sig, teacher = 'Max') {
  if (!sig?.signals?.length) return '<p class="small muted">Nog geen gegevens.</p>';
  const CH = { 'let op': '<span class="chip bad">let op</span>', ok: '<span class="chip good">ok</span>', onbekend: '<span class="chip">nog te weinig data</span>', info: '<span class="chip">info</span>' };
  const order = { 'let op': 0, info: 1, ok: 2, onbekend: 3 };
  const list = [...sig.signals].sort((a, b) => order[a.status] - order[b.status]);
  return `<div class="stack" style="gap:8px">${list.map((s) => `<div class="card flat" style="padding:10px 12px;${s.status === 'onbekend' ? 'opacity:.6' : ''}">
      <div class="row between"><b>${esc(s.title)}</b>${CH[s.status] || ''}</div>
      ${s.status !== 'onbekend' && s.status !== 'ok' ? `<p class="small" style="margin-top:4px">${esc(s.text)}</p>` : ''}
      ${s.evidence ? `<p class="small muted" style="margin-top:4px">🔍 ${esc(s.evidence)}</p>` : ''}
      ${s.action && s.status === 'let op' ? `<p class="small" style="margin-top:4px">⚙️ <b>Wat de app en ${esc(teacher)} doen:</b> ${esc(s.action)}</p>` : ''}</div>`).join('')}
    <p class="small muted">Gebaseerd op ${sig.n} sommen (laatste 30 dagen). Bewust geen "leerstijl"-labels zoals visueel of auditief: onderzoek laat zien dat lesgeven naar zo'n stijl niet beter werkt. Wél: wat aantoonbaar helpt, per onderwerp. Het kind ziet dit niet.</p></div>`;
}

function profileHTML(p) {
  if (!p) return '<p class="small muted">Nog leeg. Na een paar sessies analyseert de AI-leraar automatisch welke denkfouten er gemaakt worden en wat helpt.</p>';
  const ST = { nieuw: '🆕 nieuw', 'mee bezig': '🔧 mee bezig', 'gaat beter': '📈 gaat beter', opgelost: '✅ opgelost' };
  return `${p.samenvatting ? `<p>${esc(p.samenvatting)}</p>` : ''}
    ${p.sterk?.length ? `<p class="small" style="margin-top:8px"><b>💪 Sterk:</b> ${p.sterk.map(esc).join(' · ')}</p>` : ''}
    ${(p.zwakke_punten || []).map((z) => `<div class="card flat" style="padding:12px;margin-top:8px;${z.status === 'opgelost' ? 'opacity:.65' : ''}">
      <div class="row between"><b>${esc(z.onderdeel)}</b><span class="chip ${z.prioriteit === 'hoog' && z.status !== 'opgelost' ? 'bad' : ''}">${esc(ST[z.status] || z.status || '')}</span></div>
      <p class="small" style="margin-top:4px">${esc(z.punt)}</p>
      ${z.bewijs ? `<p class="small muted" style="margin-top:4px">🔍 ${esc(z.bewijs)}</p>` : ''}
      ${z.wat_helpt ? `<p class="small" style="margin-top:4px"><b>Helpt:</b> ${esc(z.wat_helpt)}</p>` : ''}</div>`).join('')}
    ${p.leerstijl ? `<p class="small" style="margin-top:8px"><b>Leerstijl:</b> ${esc(p.leerstijl)}</p>` : ''}
    ${(p.onderdelen || []).map((o) => `<div class="card flat" style="padding:12px;margin-top:8px"><div class="row between"><b>${esc(o.onderdeel)}</b><span class="chip ${o.prioriteit === 'hoog' ? 'bad' : ''}">${esc(o.prioriteit || '')}</span></div>
      ${(o.denkfouten || []).length ? `<ul class="small" style="margin:6px 0 0 18px;padding:0">${o.denkfouten.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${o.wat_helpt ? `<p class="small" style="margin-top:6px"><b>Helpt:</b> ${esc(o.wat_helpt)}</p>` : ''}</div>`).join('')}
    ${p.aanpak_tips?.length ? `<p class="small" style="margin-top:8px"><b>Aanpak:</b> ${p.aanpak_tips.map(esc).join(' · ')}</p>` : ''}
    ${p.updated_at ? `<p class="small muted" style="margin-top:6px">Bijgewerkt: ${new Date(p.updated_at).toLocaleString('nl-NL')}</p>` : ''}`;
}

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
route();
