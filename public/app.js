// Rekenapp groep 8 — één pagina, geen build-stap.
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const $toast = document.getElementById('toast');

// ---------- hulpjes ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const euro = (cents) => '€ ' + (cents / 100).toFixed(2).replace('.', ',');
const cents = (c) => (Math.round(c * 10) / 10).toString().replace('.', ',') + ' cent';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const LEVEL = ['opstap', 'basis', '1F', '1S'];
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
  if (!res.ok) { const e = new Error(data.error || 'Er ging iets mis'); e.status = res.status; e.data = data; throw e; }
  return data;
}

// Korte vaste uitleg per onderdeel (werkt ook zonder AI)
const TIPS = {
  optellen: 'Splits het tweede getal: 486 + 37 = 486 + 30 + 7. Bij aftrekken mag je ook "rijgen": 7203 − 2648 = 7203 − 2000 − 600 − 40 − 8.',
  vermenigvuldigen: 'Splits het lastige getal: 24 × 36 = 20 × 36 + 4 × 36 = 720 + 144 = 864. Tafel vergeten? 7 × 8 = 5 × 8 + 2 × 8 = 40 + 16.',
  delen: 'Kolomsgewijs delen = happen. Haal steeds een grote hap eraf: 864 : 6 → 100 × 6 = 600, 40 × 6 = 240, 4 × 6 = 24. Samen 144.',
  kommagetallen: 'Zet de komma\'s onder elkaar en vul aan met nullen: 3,5 = 3,50. Bij × en : eerst schatten, dan zonder komma rekenen, dan de komma terugzetten.',
  getalbegrip: 'Afronden: kijk naar het cijfer rechts van de plek waarop je afrondt. 5 of meer = omhoog. Kommagetallen vergelijken: maak ze even lang (0,4 = 0,400).',
  breuken: 'Noemer = in hoeveel stukken, teller = hoeveel stukken je hebt. Gelijknamig maken: 1/3 + 1/4 = 4/12 + 3/12 = 7/12. "3/4 van 20": eerst 1/4 = 5, dan × 3 = 15.',
  procenten: 'Begin met 10% (deel door 10) of 1% (deel door 100). 15% = 10% + 5%. 25% = 1/4, 50% = 1/2, 20% = 1/5.',
  verhoudingen: 'Maak een verhoudingstabel. Ga eerst naar 1 (per stuk, per persoon), dan naar wat gevraagd wordt.',
  schaal: '1 : 25 000 betekent: 1 cm op de kaart is 25 000 cm echt. Van cm naar m: : 100. Van m naar km: : 1000.',
  metriek: 'Gebruik de trap: km – hm – dam – m – dm – cm – mm. Elke stap omlaag × 10. Bij m² × 100, bij m³ × 1000. 1 liter = 1 dm³.',
  oppervlakte: 'Omtrek = rondom (optellen). Oppervlakte = lengte × breedte (m²). Inhoud = lengte × breedte × hoogte (m³ of liter).',
  tijd: '1 uur = 60 minuten. Tel eerst door naar een heel uur. Snelheid: km per uur. In een half uur ga je de helft zo ver.',
  grafieken: 'Lees eerst de titel en wat er op de assen staat. Gemiddelde = alles optellen en delen door hoeveel getallen het zijn.',
};

// Groei-mindset: prijs de aanpak en de inzet, niet "slim zijn".
const PRAISE = {
  solo: ['Goed zo!', 'Knap uitgerekend!', 'Yes! Jouw aanpak werkt. 🎯', 'Netjes gedaan!', 'Helemaal goed!', 'Sterk gerekend! 💪'],
  guided: ['Samen gelukt! Je deed alle stappen zelf. 🤝', 'Goed zo! Stap voor stap werkt.', 'Top! Zo bouw je het op.'],
  retry: ['Kijk eens! Eerst fout, nu goed. Zo leer je! 🦸', 'Comeback! Nu snap je hem. 💪'],
  double: ['Helemaal zelf én goed — dubbele centen! 🪙🪙', 'Zelf gedaan, dubbel verdiend! 🎯'],
  wrong: ['Nog niet goed — en dat is oké. Hiervan leer je.', 'Bijna! Kijk even hoe het werkt.', 'Fout is niet erg: nu weet je wat je moet oefenen.'],
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
    location.hash = '#/';
  } catch (e) {
    if (e.message !== 'login') { $app.innerHTML = `<div class="card"><h2>Oeps</h2><p class="muted">${esc(e.message)}</p><br><button class="btn" onclick="location.reload()">Opnieuw</button></div>`; }
  }
}
function setTab(name) {
  $tabs.hidden = name === 'sessie' || name === 'ouder';
  for (const a of $tabs.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === name);
}
window.addEventListener('hashchange', route);

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
      <p>${s.intakeActive ? 'Je bent al begonnen. Ga verder waar je was!' : 'Eerst kijken wat je al kunt. 39 sommen uit alle onderdelen. Gaat het goed, dan worden ze moeilijker; gaat het fout, dan makkelijker. Je kunt tussendoor stoppen.'}</p></div>
      <div class="row"><span class="chip coin">🪙 tot ${s.points.intake} cent</span></div>
      <button class="btn light block" data-start="intake">${s.intakeActive ? 'Verder met de starttoets' : 'Start de starttoets'}</button>
      <p class="small muted">Weet je iets niet? Geen probleem, druk op "Weet ik niet". Dan weten wij wat we gaan oefenen.</p></div>`;
  } else if (!s.today.schoolDay) {
    main = `<div class="card hero stack"><div class="big-emoji">🌴</div>
      <div><div class="task-title">Weekend!</div><p>Geen dagtaak vandaag. Maandag weer ${s.points.dailyCount} sommen voor ${s.points.daily} cent.</p></div>
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
      <button class="btn light block" data-start="practice">Extra oefenen</button><p class="small muted">Extra oefenen levert geen centen op, maar maakt je wel sterker.</p></div>`;
  }

  const stuck = s.intakeDone ? s.skills.filter((x) => x.struggling) : [];
  const coach = stuck.length ? `<div class="card stack"><div class="row"><span class="big-emoji" style="font-size:32px">🧑‍🏫</span>
      <div><h3>Even opfrissen</h3><p class="small muted">Hier gaan we extra mee aan de slag. Lees de uitleg en oefen dan.</p></div></div>
      ${stuck.slice(0, 3).map((x) => `<button class="btn ghost block" data-coach="${x.cat}">${x.icon} ${esc(x.label)}</button>`).join('')}</div>` : '';

  const earned = s.badges.filter((b) => b.earned);
  const badgesCard = earned.length ? `<a href="#/voortgang" class="card row between" style="text-decoration:none;color:inherit"><div><div class="small muted">Badges</div><div style="font-size:26px;letter-spacing:2px">${earned.slice(-8).map((b) => b.icon).join('')}</div></div><span class="muted">${earned.length}/${s.badges.length} ›</span></a>` : '';

  const top = s.intakeDone ? `<div class="card"><div class="row between"><h3>Sterk 💪</h3><a href="#/voortgang" class="small">Alles</a></div>
      ${s.skills.slice(0, 3).map(mini).join('')}
      <h3 style="margin-top:12px">Hier word je beter in 🌱</h3>${s.skills.slice(-3).reverse().map(mini).join('')}</div>` : '';

  $app.innerHTML = `<div class="stack">
    <div class="hello"><h1>Hoi ${esc(s.name)} 👋</h1>${s.streak ? `<div class="streak" title="Schooldagen op rij">🔥 ${s.streak}</div>` : ''}</div>
    ${main}
    <a href="#/spaarpot" class="card coin row between" style="text-decoration:none;color:inherit"><div class="row"><span class="big-emoji" style="font-size:34px">🐷</span><div><div class="small muted">In je spaarpot</div><div class="money" style="font-size:24px">${euro(s.wallet.balance)}</div></div></div><span class="muted">›</span></a>
    ${coach}${badgesCard}${top}
  </div>`;
  bindStart();
  $app.querySelectorAll('[data-coach]').forEach((b) => (b.onclick = () => showCoach(b.dataset.coach)));
}
const sc = (score) => (score >= 85 ? 3 : score >= 60 ? 2 : score >= 35 ? 1 : 0);
function mini(x) {
  return `<div class="mini-skill"><span class="ico">${x.icon}</span><div><div style="font-weight:800">${esc(x.label)}</div><div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div></div><span class="small muted">${x.levelName}</span></div>`;
}
function bindStart() {
  $app.querySelectorAll('[data-start]').forEach((b) => (b.onclick = () => startSession(b.dataset.start, b.dataset.cat)));
}
async function startSession(kind, cat) {
  try {
    const data = await api('/api/session/start', { kind, cat });
    SESSION_CACHE = data;
    location.hash = `#/sessie/${data.id}`;
  } catch (e) { if (e.message !== 'login') toast(e.message); }
}

async function showCoach(cat, intro = '') {
  STATE ||= await api('/api/state');
  const meta = STATE.skills.find((x) => x.cat === cat);
  sheet(`<div class="row between"><h2>${meta?.icon || ''} ${esc(meta?.label || '')}</h2><button class="btn ghost" data-close>Sluit</button></div>
    ${intro ? `<p>${intro}</p>` : ''}
    <div class="card flat"><b>Zo pak je het aan</b><p style="margin-top:4px">${esc(TIPS[cat] || '')}</p></div>
    ${STATE.ai ? '<div id="coach-ai" class="ai-box"><div class="who">🧑‍🏫 Rekenmaatje</div><span class="loader"></span> uitleg maken…</div>' : ''}
    ${location.hash.startsWith('#/sessie') ? '<button class="btn block" data-close>Begrepen, verder!</button>' : '<button class="btn block" data-practice>Oefen dit onderdeel</button>'}`,
  async (bg, close) => {
    bg.querySelector('[data-practice]')?.addEventListener('click', () => { close(); startSession('practice', cat); });
    if (!STATE.ai) return;
    try {
      const r = await api(`/api/coach/${cat}`);
      const box = bg.querySelector('#coach-ai');
      if (r.text) box.innerHTML = `<div class="who">🧑‍🏫 Rekenmaatje</div><div class="coach">${rich(r.text)}</div>`;
      else box.remove();
    } catch { bg.querySelector('#coach-ai')?.remove(); }
  });
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
      <div class="small muted" style="margin-top:4px">${x.toNext != null ? `Op weg naar ${LEVEL[LEVELIDX(x.levelName) + 1]}: ${x.toNext}% (80% nodig)` : 'Hoogste niveau! 🏆'}${x.struggling ? ' · <b style="color:var(--warn)">extra hulp aan</b>' : ''}</div></div></a>`).join('')}</div>
    <p class="small muted">Niveaus: <b>opstap</b> = groep 5/6, <b>basis</b> = groep 6/7, <b>1F</b> = wat iedereen eind groep 8 moet kunnen, <b>1S</b> = streefniveau. Gaat meer dan de helft fout, dan ga je een stapje terug. Heb je 8 van de 10 goed, dan ga je een stapje omhoog.</p>
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
    <div class="card flat"><b>Zo doe je het</b><p style="margin-top:4px">${esc(TIPS[cat])}</p></div>
    <button class="btn block" data-start="practice" data-cat="${cat}">Oefen dit (10 sommen, zonder centen)</button>
    ${STATE.ai ? `<button class="btn ghost block" data-coach="${cat}">🧑‍🏫 Uitleg van Rekenmaatje</button>` : ''}
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
    <div class="card stack"><h3>Zo verdien je centen</h3>
      <div class="row"><span class="chip coin">🪙 ${s.points.intake}</span><span>Starttoets: tot ${s.points.intake} cent</span></div>
      <div class="row"><span class="chip coin">🪙 ${s.points.daily}</span><span>Elke schooldag: tot ${s.points.daily} cent (${cents(s.points.daily / s.points.dailyCount)} per goede som)</span></div>
      <div class="row"><span class="chip">🪜</span><span>Met tussenstappen: de eerste ${s.points.freeGuided} keer per onderdeel gewoon centen, daarna de helft.</span></div>
      <div class="row"><span class="chip coin">🪙🪙</span><span>Kies je daarna "helemaal zelf" en is het goed? ${s.points.soloBonus} keer dubbel!</span></div>
      <p class="small muted">Alleen goede antwoorden leveren centen op. 100 cent = € 1.</p></div>
    ${s.history.length ? `<div class="card"><h3>Verdiend per dag</h3><div class="hist">${s.history.map((h) => `<div><span>${h.points}</span><i style="height:${(h.points / max) * 80 + 4}px"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div></div>` : ''}
    <a href="#/ouder" class="small muted" style="text-align:center;display:block;margin-top:8px">Voor ouders 🔒</a>
  </div>`;
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
  S = { data, cur: data.current, input: '', choice: null, stepInput: '', stepChoice: null, phase: 'ask', t0: Date.now(), chat: [], last: null, badges: [], stepMsg: null };
  if (!data.current) return renderSummary({ kind: data.kind, correct: data.correct, total: data.total, points: Math.round(data.points), maxPoints: data.maxPoints });
  startQuestion();
  // uitlegkaart vooraf bij een onderdeel waar extra hulp aan staat
  const stuck = (data.struggling || []);
  const key = `coach-shown-${data.id}`;
  if (stuck.length && data.answered === 0 && !store.get(key)) { store.set(key, '1'); showCoach(stuck[0], 'Hier gaan we vandaag extra mee oefenen. Lees dit even rustig door.'); }
}


async function startQuestion() {
  const c = S.cur;
  S.input = ''; S.choice = null; S.stepInput = ''; S.stepChoice = null; S.phase = 'ask'; S.t0 = Date.now(); S.chat = []; S.stepMsg = null;
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

function renderQuestion() {
  const { data, cur } = S;
  const q = cur.question;
  const meta = (STATE?.skills || []).find((x) => x.cat === q.cat);
  const pct = (cur.index / data.total) * 100;
  const label = q.retry ? '<span class="chip good">💪 Herkansing</span>' : `<span class="chip">${meta?.icon || ''} ${esc(meta?.label || q.cat)} · ${LEVEL[q.level]}</span>`;
  $app.innerHTML = `
    <div class="s-top"><button class="x" data-quit aria-label="Stoppen">✕</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="small" style="font-weight:900">${cur.index + 1}/${data.total}</span></div>
    <div class="row between" style="margin:-4px 2px 10px">
      ${data.maxPoints ? `<span class="chip coin">🪙 ${cents(data.points)}</span>` : '<span class="chip">oefenen</span>'}
      ${data.streak >= 2 ? `<span class="chip streak-chip">🔥 ${data.streak} op rij</span>` : '<span></span>'}
    </div>
    <div class="card q-card">
      <div class="row between">${label}</div>
      <div class="q-text ${q.text.length > 90 ? 'long' : ''}">${esc(q.text)}</div>
      ${q.visual ? `<div class="visual">${renderVisual(q.visual)}</div>` : ''}
      <div id="guide"></div>
      <div id="answer-area"></div>
      <div id="hints" class="hints">${(cur.hints || []).map((h) => `<div class="hint">💡 ${esc(h)}</div>`).join('')}</div>
      <div id="ai-area"></div>
      <div id="fb"></div>
    </div>
    <div id="controls"></div>`;
  $app.querySelector('[data-quit]').onclick = () => {
    if (confirm('Wil je stoppen? Je kunt later verder waar je was.')) location.hash = '#/';
  };
  if (cur.offer.mode === 'choose' && !cur.chose && !cur.guided) return drawChoice();
  drawAnswer();
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
  controls.querySelector('[data-ask]')?.addEventListener('click', () => askAI(false));
  controls.querySelector('[data-dunno]')?.addEventListener('click', dontKnow);
}
function helpRow() {
  const c = S.cur, q = c.question, o = c.offer;
  const btns = [];
  if (!c.guided && o.mode === 'optional' && q.guideCount) {
    const cost = S.data.maxPoints ? (o.free ? '' : ' (½ centen)') : '';
    btns.push(`<button class="btn ghost" data-guide>🪜 Samen stap voor stap${cost}</button>`);
  }
  if (q.hasSteps && !q.noHelp && !c.guided) btns.push(`<button class="btn ghost" data-hint ${S.hintMore === false ? 'disabled' : ''}>💡 ${(c.hints || []).length ? 'Nog een hint' : 'Hint'}</button>`);
  if (STATE?.ai && !q.noHelp) btns.push('<button class="btn ghost" data-ask>🧑‍🏫 Rekenmaatje</button>');
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
  if (!S || !location.hash.startsWith('#/sessie') || e.target.tagName === 'INPUT') return;
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
    else { buzz([40, 30, 40]); S.stepMsg = { kind: 'tip', text: `Nog niet. Tip: ${r.tip}` }; S.stepInput = ''; S.stepChoice = null; }
    drawAnswer();
  } catch (e) { toast(e.message); }
}

async function getHint() {
  try {
    const r = await api(`/api/session/${S.data.id}/hint`, { index: S.cur.index });
    S.cur.hints = r.hints;
    S.hintMore = r.more;
    $app.querySelector('#hints').innerHTML = (S.cur.hints || []).map((h) => `<div class="hint">💡 ${esc(h)}</div>`).join('');
    drawAnswer();
  } catch (e) { toast(e.message); }
}

async function askAI(answered) {
  const area = $app.querySelector('#ai-area');
  area.innerHTML = `<div class="ai-box"><div class="who">🧑‍🏫 Rekenmaatje</div><span class="loader"></span> even denken…</div>`;
  try {
    const r = await api(`/api/session/${S.data.id}/explain`, { index: S.cur.index, chat: S.chat });
    if (!r.text) { area.innerHTML = `<div class="ai-box">${esc(r.reason || 'Rekenmaatje is er nu even niet.')}</div>`; return; }
    S.chat.push({ role: 'ai', text: r.text });
    drawChat(answered);
  } catch (e) { area.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
}
function drawChat(answered) {
  const area = $app.querySelector('#ai-area');
  area.innerHTML = S.chat.map((m) => m.role === 'ai'
    ? `<div class="ai-box"><div class="who">🧑‍🏫 Rekenmaatje</div>${rich(m.text)}</div>`
    : `<div class="ai-box" style="border-color:var(--line)"><div class="who" style="color:var(--muted)">Jij</div>${esc(m.text)}</div>`).join('')
    + `<form class="chat-in"><input maxlength="300" placeholder="Snap je iets niet? Vraag het…" enterkeyhint="send"><button class="btn ghost">Vraag</button></form>`;
  const form = area.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = form.querySelector('input').value.trim();
    if (!v) return;
    S.chat.push({ role: 'kid', text: v });
    await askAI(answered);
  };
}

async function dontKnow() {
  if (S.phase !== 'ask') return;
  await sendAnswer({ dontKnow: true });
}
async function submit() {
  const q = S.cur.question;
  const answer = q.type === 'choice' ? S.choice : S.input;
  if (answer == null || answer === '') return;
  await sendAnswer({ answer });
}
async function sendAnswer(extra) {
  S.phase = 'checking';
  const go = $app.querySelector('[data-go]'); if (go) go.disabled = true;
  try {
    const r = await api(`/api/session/${S.data.id}/answer`, { index: S.cur.index, timeMs: Date.now() - S.t0, ...extra });
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
    if (r.streak >= 3 && r.streak % 3 === 0) title += ` 🔥 ${r.streak} op rij!`;
    if (r.rewardKind === 'solo-double' || r.retry || (r.streak && r.streak % 5 === 0) || Math.random() < 0.15) confetti();
  } else {
    buzz([60, 40, 60]);
    title = pick(PRAISE.wrong);
  }
  const rewardChip = S.data.maxPoints && r.correct
    ? `<span class="chip coin">+${cents(r.cents)}${r.rewardKind === 'solo-double' ? ' · dubbel!' : r.rewardKind === 'guided-half' ? ' · half (met hulp)' : ''}</span>` : '';
  const area = $app.querySelector('#answer-area');
  area.innerHTML = `<div class="answer-box" style="border-color:${r.correct ? 'var(--good)' : 'var(--bad)'}">${esc(r.given)}${q.unit && !q.money && r.given !== 'weet ik niet' ? `<span class="unit">${esc(q.unit)}</span>` : ''}</div>`;
  $app.querySelector('#hints').innerHTML = '';
  const nextIsRetry = r.next?.question?.retry;
  const showSteps = !r.correct || r.hints;
  $app.querySelector('#fb').innerHTML = `<div class="feedback ${r.correct ? 'ok' : 'no'}">
    <div class="row between"><div class="title">${esc(title)}</div>${rewardChip}</div>
    ${r.correct ? (r.note ? `<p>${esc(r.note)}</p>` : '') : `<p>Het goede antwoord is <b>${esc(r.display)}</b>.${r.note ? ' ' + esc(r.note) : ''}</p>`}
    ${showSteps ? `<p style="margin-top:10px;font-weight:900">Zo reken je het uit:</p><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      : `<details style="margin-top:8px"><summary class="small muted">Hoe reken je dit uit?</summary><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`}
    ${nextIsRetry ? '<p class="small" style="margin-top:10px;font-weight:800">👉 Hierna krijg je een herkansing: zo\'n soort som, samen stap voor stap.</p>' : ''}
  </div>`;
  $app.querySelector('#guide').innerHTML = '';
  S.chat = [];
  $app.querySelector('#ai-area').innerHTML = '';
  $app.querySelector('#controls').innerHTML = `<div class="stack" style="margin-top:12px">
    ${!r.correct && STATE?.ai && S.data.kind !== 'intake' ? '<button class="btn ghost block" data-explain>🧑‍🏫 Leg het anders uit</button>' : ''}
    <button class="btn ${r.correct ? 'good' : ''} block" data-next>${r.done ? 'Bekijk je resultaat' : nextIsRetry ? 'Herkansing →' : 'Volgende →'}</button></div>`;
  $app.querySelector('[data-next]').onclick = next;
  $app.querySelector('[data-explain]')?.addEventListener('click', (e) => { e.target.remove(); askAI(true); });
  $app.querySelector('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // momenten die er toe doen
  if (r.event === 'up') celebrateLevel(r);
  else if (r.event === 'down') sheet(`<div style="text-align:center"><div class="big-emoji">🪜</div><h2 style="margin:8px 0">Even een stapje terug</h2>
      <p>Bij <b>${esc(r.eventCat)}</b> gaan we verder op niveau <b>${esc(r.eventLevel)}</b>. Zo bouw je het stevig op.</p>
      <p class="muted" style="margin-top:8px">Heb je daar 8 van de 10 goed? Dan ga je weer omhoog. Je krijgt de komende sommen extra hulp. 💪</p></div>
      <button class="btn block" data-close>Oké, we gaan ervoor!</button>`);
  else if (r.easy === 'on') toast('Even rustig aan: de volgende sommen zijn wat makkelijker. 💪', 3500);
  else if (r.easy === 'off') toast('Je bent weer op dreef! 🚀', 3000);
  for (const b of r.badges || []) setTimeout(() => toast(`${b.icon} Nieuwe badge: ${b.title}!`, 3500), 600);
}
function celebrateLevel(r) {
  confetti();
  sheet(`<div style="text-align:center"><div class="big-emoji">⬆️</div><h2 style="margin:8px 0">Niveau omhoog!</h2>
    <p>Bij <b>${esc(r.eventCat)}</b> ga je naar niveau <b>${esc(r.eventLevel)}</b>.</p>
    <p class="muted" style="margin-top:8px">Dat heb je verdiend door te blijven oefenen. 🌱→🌳</p></div>
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
    ${highlights.length ? `<div class="card stack">${highlights.map((h) => `<div>${h}</div>`).join('')}</div>` : ''}
    ${badges.length ? `<div class="card"><h3>Nieuwe badges</h3><div class="badges">${badges.map((b) => `<div class="badge on"><span>${b.icon}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>` : ''}
    ${sum.kind === 'intake' ? `<div class="card"><h3>Jouw uitslag</h3><p class="small muted" style="margin:4px 0 8px">Van sterk naar "hier word je beter in". Vanaf nu krijg je elke schooldag ${STATE.points.dailyCount} sommen, op jouw niveau.</p>
      ${STATE.skills.map((x, i) => `<div class="mini-skill"><span class="rank">${i + 1}</span><div><div style="font-weight:800">${x.icon} ${esc(x.label)}</div><div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div></div><span class="small muted">${x.levelName}</span></div>`).join('')}</div>`
    : sum.perCat ? `<div class="card"><h3>Per onderdeel</h3>${sum.perCat.map((p) => `<div class="mini-skill"><span class="ico">${p.icon}</span><div style="font-weight:800">${esc(p.label)}</div><span class="chip ${p.ok === p.n ? 'good' : p.ok === 0 ? 'bad' : ''}">${p.ok}/${p.n}</span></div>`).join('')}</div>` : ''}
    <div class="card coin row between"><div class="row"><span class="big-emoji" style="font-size:30px">🐷</span><b>Spaarpot</b></div><span class="money" style="font-size:22px">${euro(STATE.wallet.balance)}</span></div>
    <a class="btn block" href="#/">Klaar</a>
  </div>`;
  $tabs.hidden = true;
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
    if (v.kind === 'tri') return `<svg viewBox="0 0 ${W} ${H}"><polygon points="${x0},${y0 + h} ${x0 + w},${y0 + h} ${x0 + w * 0.35},${y0}" ${style}/><line x1="${x0 + w * 0.35}" y1="${y0}" x2="${x0 + w * 0.35}" y2="${y0 + h}" stroke="${ink}" stroke-dasharray="5 4" opacity=".6"/>${lab(x0 + w / 2, y0 + h + 20, `basis ${v.w} ${v.unit}`)}${lab(x0 + w * 0.35 + 8, y0 + h / 2, `hoogte ${v.h} ${v.unit}`, 'start')}</svg>`;
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
    <h1>Ouderoverzicht</h1>
    <div class="card coin stack"><div class="row between"><div><div class="small muted">Spaarpot van ${esc(data.name)}</div><div class="money" style="font-size:30px">${euro(data.wallet.balance)}</div></div><div class="small muted" style="text-align:right">verdiend ${euro(data.wallet.earned)}<br>uitbetaald ${euro(data.wallet.paid)}<br>🔥 ${data.streak} dagen op rij</div></div>
      <form class="row" data-payout><div class="field" style="flex:1"><input inputmode="decimal" placeholder="Bedrag in €, bijv. 2,50" name="amt"></div><button class="btn">Uitbetalen</button></form></div>

    <div class="card stack"><div class="row between"><h2>AI-advies</h2>${data.ai ? '' : '<span class="chip bad">AI uit</span>'}</div>
      <p class="small muted">Samenvatting van waar ${esc(data.name)} staat, en wat je thuis kunt doen.</p>
      <div id="advice"></div>
      <button class="btn ghost block" data-advice ${data.ai ? '' : 'disabled'}>Maak advies</button></div>

    <div class="card"><h2>Onderdelen</h2><p class="small muted" style="margin:4px 0 6px">Niveau (opstap/basis/1F/1S) · score · laatste 14 dagen goed, waarvan met tussenstappen · trend</p>
      <table class="list"><tr><th>Onderdeel</th><th>Score</th><th>14 d</th><th></th></tr>
      ${data.skills.map((x) => `<tr><td>${x.icon} ${esc(x.label)}${x.struggling ? ' <span class="chip bad">extra hulp</span>' : ''}<div class="small muted">${x.levelName} · ${x.guidedWins}/5 leerfase${x.soloBonus ? ` · ${x.soloBonus}× zelf-bonus` : ''}</div></td><td><b>${x.score}</b> ${trend(x.trend)}</td>
        <td>${accBy[x.cat] ? `${accBy[x.cat].ok}/${accBy[x.cat].n}<div class="small muted">${accBy[x.cat].guided} met stappen · ${Math.round((accBy[x.cat].avg_ms || 0) / 1000)}s</div>` : '–'}</td><td>${spark(x.cat)}</td></tr>`).join('')}</table></div>

    <div class="card"><h2>Badges</h2><div class="badges">${data.badges.map((b) => `<div class="badge ${b.earned ? 'on' : ''}" title="${esc(b.text)}"><span>${b.earned ? b.icon : '🔒'}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>

    <div class="card"><h2>Recente fouten</h2>${data.recentWrong.length ? `<table class="list"><tr><th>Som</th><th>Gaf</th><th>Goed</th></tr>${data.recentWrong.map((w) => `<tr><td><span class="small muted">${esc(w.label)}</span><br>${esc(w.text)}</td><td>${esc(w.given)}</td><td>${esc(w.display)}</td></tr>`).join('')}</table>` : '<p class="muted">Nog geen fouten.</p>'}</div>

    <div class="card"><h2>Sessies</h2><table class="list"><tr><th>Dag</th><th>Soort</th><th>Goed</th><th>Cent</th><th>Tijd</th></tr>
      ${data.sessions.map((s) => `<tr><td>${s.day.slice(8)}-${s.day.slice(5, 7)}</td><td>${kindNl[s.kind]}${s.status === 'active' ? ' <span class="chip">bezig</span>' : ''}</td><td>${s.correct}/${s.total}</td><td>${s.points}</td><td>${s.secs ? Math.round(s.secs / 60) + ' min' : ''}</td></tr>`).join('')}</table></div>

    <div class="card"><h2>Spaarpot-historie</h2><table class="list">${data.ledger.map((l) => `<tr><td>${new Date(l.created_at).toLocaleDateString('nl-NL')}</td><td>${esc(l.note || '')}</td><td style="text-align:right;color:${l.cents < 0 ? 'var(--bad)' : 'var(--good)'}"><b>${l.cents > 0 ? '+' : ''}${l.cents}</b></td></tr>`).join('')}</table></div>

    <div class="card stack"><h2>Instellingen</h2>
      <form class="row" data-name><div class="field" style="flex:1"><input name="name" value="${esc(data.name)}" maxlength="30"></div><button class="btn ghost">Naam opslaan</button></form>
      <button class="btn ghost block" data-reset="intake">Starttoets opnieuw laten doen</button>
      <button class="btn ghost block" data-reset="all" style="color:var(--bad)">Alles wissen (ook spaarpot)</button></div>
  </div>`;

  $app.querySelector('[data-logout]').onclick = async () => { await api('/api/parent/logout', {}); location.hash = '#/'; };
  $app.querySelector('[data-payout]').onsubmit = async (e) => {
    e.preventDefault();
    const amt = Math.round(parseFloat(e.target.amt.value.replace(',', '.')) * 100);
    if (!(amt > 0)) return toast('Vul een bedrag in');
    if (!confirm(`${euro(amt)} uitbetalen?`)) return;
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
    toast('Opgeslagen ✓');
  };
  $app.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = async () => {
    const what = b.dataset.reset;
    const typed = prompt(what === 'all' ? 'Alles wordt gewist, ook de spaarpot en badges. Typ RESET om door te gaan.' : 'De starttoets en alle niveaus worden opnieuw bepaald (spaarpot blijft). Typ RESET om door te gaan.');
    if (typed !== 'RESET') return;
    await api('/api/parent/reset', { what, confirm: 'RESET' });
    toast('Gedaan ✓'); renderParent();
  }));
}

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
route();
