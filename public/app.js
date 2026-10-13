// Rekenapp groep 8 — één pagina, geen build-stap.
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const $toast = document.getElementById('toast');

// ---------- hulpjes ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const euro = (cents) => '€ ' + (cents / 100).toFixed(2).replace('.', ',');
const cents = (c) => (Math.round(c * 10) / 10).toString().replace('.', ',') + ' cent';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
function toast(msg, ms = 2600) {
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
  optellen: 'Splits het tweede getal: 486 + 37 = 486 + 30 + 7. Bij aftrekken mag je ook "aanvullen": van 1 850 naar 2 000 is 150, dan nog verder.',
  vermenigvuldigen: 'Splits het lastige getal: 24 × 36 = 20 × 36 + 4 × 36 = 720 + 144 = 864. Schat eerst: ongeveer 25 × 36 = 900.',
  delen: 'Kolomsgewijs delen = happen. Haal steeds een grote hap eraf: 864 : 6 → 100 × 6 = 600, 40 × 6 = 240, 4 × 6 = 24. Samen 144.',
  kommagetallen: 'Zet de komma\'s onder elkaar en vul aan met nullen: 3,5 = 3,50. Bij × en : eerst schatten, dan zonder komma rekenen, dan de komma terugzetten.',
  getalbegrip: 'Afronden: kijk naar het cijfer rechts van de plek waarop je afrondt. 5 of meer = omhoog. Kommagetallen vergelijken: maak ze even lang (0,4 = 0,400).',
  breuken: 'Gelijknamig maken: zoek een noemer waar beide noemers in passen. 1/3 + 1/4 = 4/12 + 3/12 = 7/12. "3/4 van 20": eerst 1/4 = 5, dan × 3 = 15.',
  procenten: 'Begin met 10% (deel door 10) of 1% (deel door 100). 15% = 10% + 5%. 25% = 1/4, 50% = 1/2, 20% = 1/5.',
  verhoudingen: 'Maak een verhoudingstabel. Ga eerst naar 1 (per stuk, per persoon), dan naar wat gevraagd wordt.',
  schaal: '1 : 25 000 betekent: 1 cm op de kaart is 25 000 cm echt. Van cm naar m: : 100. Van m naar km: : 1000.',
  metriek: 'Gebruik de trap: km – hm – dam – m – dm – cm – mm. Elke stap omlaag × 10. Bij m² × 100, bij m³ × 1000. 1 liter = 1 dm³.',
  oppervlakte: 'Omtrek = rondom (optellen). Oppervlakte = lengte × breedte (m²). Inhoud = lengte × breedte × hoogte (m³ of liter).',
  tijd: '1 uur = 60 minuten. Tel eerst door naar een heel uur. Snelheid: km per uur. In een half uur ga je de helft zo ver.',
  grafieken: 'Lees eerst de titel en wat er op de assen staat. Gemiddelde = alles optellen en delen door hoeveel getallen het zijn.',
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
  const inSession = name === 'sessie' || name === 'ouder';
  $tabs.hidden = inSession;
  for (const a of $tabs.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === name);
}
window.addEventListener('hashchange', route);

// ---------- login (alleen als APP_PIN aan staat) ----------
function renderLogin() {
  $tabs.hidden = true;
  pinScreen('Hoi! Wat is je pincode?', async (pin) => {
    await api('/api/login', { pin });
    route();
  });
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
      <p>${s.intakeActive ? 'Je bent al begonnen. Ga verder waar je was!' : `Eerst kijken wat je al goed kunt. 39 sommen uit alle onderdelen van groep 8. Rustig aan: je kunt tussendoor stoppen.`}</p></div>
      <div class="row"><span class="chip coin">🪙 tot ${s.points.intake} cent te verdienen</span></div>
      <button class="btn light block" data-start="intake">${s.intakeActive ? 'Verder met de starttoets' : 'Start de starttoets'}</button>
      <p class="small muted">Je krijgt alleen centen voor sommen die goed zijn. Gebruik kladpapier!</p></div>`;
  } else if (!s.today.schoolDay) {
    main = `<div class="card hero stack"><div class="big-emoji">🌴</div>
      <div><div class="task-title">Weekend!</div><p>Geen dagtaak vandaag. Maandag weer ${s.points.dailyCount} sommen voor ${s.points.daily} cent.</p></div>
      <button class="btn light block" data-start="practice">Toch even oefenen (10 sommen)</button></div>`;
  } else if (!d || d.status === 'active') {
    main = `<div class="card hero stack"><div class="big-emoji">✏️</div>
      <div><div class="task-title">Dagtaak</div><p>${d ? 'Ga verder waar je gebleven was.' : `${s.points.dailyCount} sommen, vooral van onderdelen waar je nog beter in kunt worden.`}</p></div>
      <div class="row"><span class="chip coin">🪙 tot ${s.points.daily} cent</span><span class="chip" style="background:rgba(255,255,255,.2);color:inherit">± 20 minuten</span></div>
      <button class="btn light block" data-start="daily">${d ? 'Verder' : 'Start dagtaak'}</button></div>`;
  } else {
    main = `<div class="card hero stack"><div class="big-emoji">🎉</div>
      <div><div class="task-title">Dagtaak klaar!</div><p>${d.correct} van de ${d.total} goed — je verdiende <b>${d.points} cent</b>.</p></div>
      <button class="btn light block" data-start="practice">Extra oefenen</button><p class="small muted">Extra oefenen levert geen centen op, maar maakt je wel sterker.</p></div>`;
  }

  const stuck = s.intakeDone ? s.skills.filter((x) => x.struggling) : [];
  const coach = stuck.length ? `<div class="card stack"><div class="row"><span class="big-emoji" style="font-size:32px">🧑‍🏫</span>
      <div><h3>Rekenmaatje helpt je</h3><p class="small muted">Dit vind je nog lastig. Lees de uitleg en oefen dan.</p></div></div>
      ${stuck.slice(0, 3).map((x) => `<button class="btn ghost block" data-coach="${x.cat}">${x.icon} Uitleg: ${esc(x.label)}</button>`).join('')}</div>` : '';

  const top = s.intakeDone ? `<div class="card"><div class="row between"><h3>Sterk 💪</h3><a href="#/voortgang" class="small">Alles</a></div>
      ${s.skills.slice(0, 3).map(mini).join('')}
      <h3 style="margin-top:12px">Nog oefenen 🎯</h3>${s.skills.slice(-3).reverse().map(mini).join('')}</div>` : '';

  $app.innerHTML = `<div class="stack">
    <div class="hello"><h1>Hoi ${esc(s.name)} 👋</h1>${s.streak ? `<div class="streak" title="Dagen op rij">🔥 ${s.streak}</div>` : ''}</div>
    ${main}
    <a href="#/spaarpot" class="card coin row between" style="text-decoration:none;color:inherit"><div class="row"><span class="big-emoji" style="font-size:34px">🐷</span><div><div class="small muted">In je spaarpot</div><div class="money" style="font-size:24px">${euro(s.wallet.balance)}</div></div></div><span class="muted">›</span></a>
    ${coach}${top}
  </div>`;
  bindStart();
  $app.querySelectorAll('[data-coach]').forEach((b) => (b.onclick = () => showCoach(b.dataset.coach)));
}
const level = (l) => ['', 'basis', '1F', '1S'][l];
const sc = (score) => (score >= 85 ? 3 : score >= 60 ? 2 : score >= 35 ? 1 : 0);
function mini(x) {
  return `<div class="mini-skill"><span class="ico">${x.icon}</span><div><div style="font-weight:800">${esc(x.label)}</div><div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div></div><span class="small muted">${x.tag}</span></div>`;
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

async function showCoach(cat) {
  const meta = STATE?.skills.find((x) => x.cat === cat);
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet stack"><div class="row between"><h2>${meta?.icon || ''} ${esc(meta?.label || '')}</h2><button class="btn ghost" data-close>Sluit</button></div>
    <div class="card flat"><b>Snelle tip</b><p style="margin-top:4px">${esc(TIPS[cat] || '')}</p></div>
    <div id="coach-ai" class="ai-box"><div class="who">🧑‍🏫 Rekenmaatje</div><span class="loader"></span> uitleg maken…</div>
    <button class="btn block" data-practice>Oefen dit onderdeel (10 sommen)</button></div>`;
  document.body.appendChild(bg);
  bg.onclick = (e) => { if (e.target === bg || e.target.dataset.close != null) bg.remove(); };
  bg.querySelector('[data-practice]').onclick = () => { bg.remove(); startSession('practice', cat); };
  try {
    const r = await api(`/api/coach/${cat}`);
    const box = bg.querySelector('#coach-ai');
    if (r.text) box.innerHTML = `<div class="who">🧑‍🏫 Rekenmaatje</div><div class="coach">${rich(r.text)}</div>`;
    else box.remove();
  } catch { bg.querySelector('#coach-ai')?.remove(); }
}

// =====================================================================
// VOORTGANG
// =====================================================================
async function renderProgress() {
  STATE = await api('/api/state');
  const s = STATE;
  if (!s.intakeDone) {
    $app.innerHTML = `<div class="card stack"><h2>Voortgang</h2><p class="muted">Doe eerst de starttoets. Daarna zie je hier waar je goed in bent en wat je nog moet oefenen.</p><a class="btn" href="#/">Naar de starttoets</a></div>`;
    return;
  }
  const hist = s.history.length ? `<div class="card"><h3>Laatste dagtaken</h3><div class="hist">${s.history.map((h) => `<div><span>${h.correct}</span><i style="height:${(h.correct / h.total) * 80 + 4}px;background:var(--primary)"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div></div>` : '';
  $app.innerHTML = `<div class="stack">
    <h1>Voortgang</h1>
    <p class="muted">Van sterk naar nog-oefenen. Tik op een onderdeel om het te oefenen.</p>
    ${hist}
    <div class="card">${s.skills.map((x, i) => `<a class="skill" href="#/voortgang/${x.cat}" style="text-decoration:none;color:inherit">
      <span class="ico">${x.icon}</span>
      <div><div class="name"><span>${esc(x.label)}</span><span class="small">${trend(x.trend)} <span class="muted">${x.tag}</span></span></div>
      <div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div>
      <div class="small muted" style="margin-top:4px">${x.domain} · niveau ${level(x.level)}${x.struggling ? ' · <b style="color:var(--bad)">extra hulp</b>' : ''}</div></div></a>`).join('')}</div>
    <p class="small muted">Niveaus: <b>basis</b> = stof van groep 6/7, <b>1F</b> = wat iedereen eind groep 8 moet kunnen, <b>1S</b> = streefniveau (havo/vwo).</p>
  </div>`;
}
const trend = (t) => (t == null || t === 0 ? '' : t > 0 ? `<span class="trend-up">▲${t}</span>` : `<span class="trend-down">▼${-t}</span>`);

async function renderCategory(cat) {
  if (!STATE) STATE = await api('/api/state');
  const x = STATE.skills.find((k) => k.cat === cat);
  if (!x) { location.hash = '#/voortgang'; return; }
  $app.innerHTML = `<div class="stack">
    <a href="#/voortgang" class="small">‹ Voortgang</a>
    <div class="card stack"><div class="row"><span class="big-emoji">${x.icon}</span><div><h2>${esc(x.label)}</h2><p class="muted small">${x.domain} · niveau ${level(x.level)}</p></div></div>
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
    <div class="card stack"><h3>Hoe verdien je centen?</h3>
      <div class="row"><span class="chip coin">🪙 ${s.points.intake}</span><span>Starttoets: tot ${s.points.intake} cent</span></div>
      <div class="row"><span class="chip coin">🪙 ${s.points.daily}</span><span>Elke schooldag: tot ${s.points.daily} cent</span></div>
      <p class="small muted">Je krijgt centen voor elke som die goed is. 20 van de 20 goed = ${s.points.daily} cent. 100 cent = € 1.</p></div>
    ${s.history.length ? `<div class="card"><h3>Verdiend per dag</h3><div class="hist">${s.history.map((h) => `<div><span>${h.points}</span><i style="height:${(h.points / max) * 80 + 4}px"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div></div>` : ''}
    <a href="#/ouder" class="small muted" style="text-align:center;display:block;margin-top:8px">Voor ouders 🔒</a>
  </div>`;
}

// =====================================================================
// SESSIE
// =====================================================================
let SESSION_CACHE = null;
let S = null;

async function openSession(id) {
  $app.classList.add('full');
  STATE ||= await api('/api/state');
  const data = SESSION_CACHE?.id === Number(id) ? SESSION_CACHE : await api(`/api/session/${id}`);
  SESSION_CACHE = null;
  S = { data, idx: data.results.length, input: '', choice: null, hints: [], hintMore: true, phase: 'ask', t0: Date.now(), chat: [], last: null };
  if (data.status === 'done' || S.idx >= data.total) return renderSummary({ correct: data.correct, total: data.total, points: Math.round(data.pointsSoFar), maxPoints: data.maxPoints });
  renderQuestion();
  // uitlegkaart vooraf als er een categorie bij zit waar hij op vastloopt
  const stuck = (data.struggling || []).filter((c) => data.questions.slice(S.idx).some((q) => q.cat === c));
  const key = `coach-shown-${data.id}`;
  if (stuck.length && S.idx === 0 && !store.get(key)) { store.set(key, '1'); showCoach(stuck[0]); }
}

function renderQuestion() {
  const { data, idx } = S;
  const q = data.questions[idx];
  const meta = (STATE?.skills || []).find((x) => x.cat === q.cat);
  const pct = (idx / data.total) * 100;
  const isLong = q.text.length > 90;
  $app.innerHTML = `
    <div class="s-top"><button class="x" data-quit aria-label="Stoppen">✕</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="small" style="font-weight:900">${idx + 1}/${data.total}</span></div>
    <div class="card q-card">
      <div class="row between"><span class="chip">${meta?.icon || ''} ${esc(meta?.label || q.cat)} · ${level(q.level)}</span>
      ${data.maxPoints ? `<span class="chip coin">🪙 ${cents(data.pointsSoFar)}</span>` : `<span class="chip">oefenen</span>`}</div>
      <div class="q-text ${isLong ? 'long' : ''}">${esc(q.text)}</div>
      ${q.visual ? `<div class="visual">${renderVisual(q.visual)}</div>` : ''}
      <div id="answer-area"></div>
      <div id="hints" class="hints">${S.hints.map((h) => `<div class="hint">💡 ${esc(h)}</div>`).join('')}</div>
      <div id="ai-area"></div>
      <div id="fb"></div>
    </div>
    <div id="controls"></div>`;
  $app.querySelector('[data-quit]').onclick = () => {
    if (confirm('Wil je stoppen? Je kunt later verder waar je was.')) location.hash = '#/';
  };
  drawAnswer();
}

function keysFor(type) {
  const extra = type === 'fraction' ? ['/', '␣'] : type === 'time' ? [':', 'C'] : [',', 'C'];
  return [['1', '2', '3', '⌫'], ['4', '5', '6', extra[0]], ['7', '8', '9', extra[1]]];
}
function drawAnswer() {
  const q = S.data.questions[S.idx];
  const area = $app.querySelector('#answer-area');
  const controls = $app.querySelector('#controls');
  if (S.phase !== 'ask') return;
  if (q.type === 'choice') {
    area.innerHTML = `<div class="choices">${q.options.map((o, i) => `<button class="choice ${S.choice === i ? 'sel' : ''}" data-c="${i}">${esc(o)}</button>`).join('')}</div>`;
    area.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { S.choice = Number(b.dataset.c); drawAnswer(); }));
    controls.innerHTML = `${helpRow(q)}<div style="margin-top:12px"><button class="btn block" data-go ${S.choice == null ? 'disabled' : ''}>Controleer</button></div>`;
  } else {
    const shown = S.input ? esc(S.input) : '';
    area.innerHTML = `<div class="answer-box active">${q.type === 'number' && q.money ? '<span class="unit">€</span>' : ''}${shown || '<span class="ph">jouw antwoord</span>'}<span class="caret"></span>${q.unit && !q.money ? `<span class="unit">${esc(q.unit)}</span>` : ''}</div>
      ${q.type === 'fraction' ? '<p class="small muted" style="margin-top:6px;text-align:center">Breuk: 3/4 · Gemengd getal: 2 spatie 1/2</p>' : ''}
      ${q.type === 'time' ? '<p class="small muted" style="margin-top:6px;text-align:center">Schrijf zo: 14:45</p>' : ''}`;
    controls.innerHTML = `<div class="keypad">${keysFor(q.type).flat().map((k) => `<button class="key ${/[0-9]/.test(k) ? '' : 'fn'}" data-k="${k}" ${k === '␣' ? 'style="font-size:15px"' : ''}>${k === '␣' ? 'spatie' : k === 'C' ? 'wis' : k}</button>`).join('')}
      <button class="key wide" data-k="0">0</button><button class="key go wide" data-go ${S.input ? '' : 'disabled'}>Controleer</button></div>${helpRow(q)}`;
    controls.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => keyPress(b.dataset.k)));
  }
  controls.querySelector('[data-go]').onclick = submit;
  controls.querySelector('[data-hint]')?.addEventListener('click', getHint);
  controls.querySelector('[data-ask]')?.addEventListener('click', () => askAI(false));
}
function helpRow(q) {
  return `<div class="help-row">
    ${q.hasSteps ? `<button class="btn ghost" data-hint ${S.hintMore ? '' : 'disabled'}>💡 ${S.hints.length ? 'Volgende stap' : 'Hint'}</button>` : ''}
    ${STATE?.ai ? '<button class="btn ghost" data-ask>🧑‍🏫 Vraag Rekenmaatje</button>' : ''}</div>`;
}
function keyPress(k) {
  if (S.phase !== 'ask') return;
  if (k === '⌫') S.input = S.input.slice(0, -1);
  else if (k === 'C') S.input = '';
  else if (k === '␣') { if (S.input && !S.input.endsWith(' ') && !S.input.includes(' ')) S.input += ' '; }
  else if (S.input.length < 14) {
    if ((k === ',' && S.input.includes(',')) || (k === '/' && S.input.includes('/')) || (k === ':' && S.input.includes(':'))) return;
    S.input += k;
  }
  buzz(8);
  drawAnswer();
}
document.addEventListener('keydown', (e) => {
  if (!S || S.phase === 'done' || !location.hash.startsWith('#/sessie')) return;
  if (e.target.tagName === 'INPUT') return;
  if (S.phase === 'feedback' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return next(); }
  if (S.phase !== 'ask') return;
  const q = S.data.questions[S.idx];
  if (q.type === 'choice') {
    const n = Number(e.key);
    if (n >= 1 && n <= q.options.length) { S.choice = n - 1; drawAnswer(); }
    if (e.key === 'Enter' && S.choice != null) submit();
    return;
  }
  if (/^[0-9]$/.test(e.key)) keyPress(e.key);
  else if (e.key === ',' || e.key === '.') keyPress(',');
  else if (e.key === '/' || e.key === ':') keyPress(e.key);
  else if (e.key === ' ') { e.preventDefault(); keyPress('␣'); }
  else if (e.key === 'Backspace') keyPress('⌫');
  else if (e.key === 'Enter' && S.input) submit();
});

async function getHint() {
  try {
    const r = await api(`/api/session/${S.data.id}/hint`, { index: S.idx });
    if (r.hint) S.hints = r.hints;
    S.hintMore = r.more;
    $app.querySelector('#hints').innerHTML = S.hints.map((h) => `<div class="hint">💡 ${esc(h)}</div>`).join('');
    drawAnswer();
  } catch (e) { toast(e.message); }
}

async function askAI(answered) {
  const area = $app.querySelector('#ai-area');
  area.innerHTML = `<div class="ai-box"><div class="who">🧑‍🏫 Rekenmaatje</div><span class="loader"></span> even denken…</div>`;
  try {
    const r = await api(`/api/session/${S.data.id}/explain`, { index: S.idx, chat: S.chat });
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

async function submit() {
  const q = S.data.questions[S.idx];
  const answer = q.type === 'choice' ? S.choice : S.input;
  if (answer == null || answer === '') return;
  S.phase = 'checking';
  const go = $app.querySelector('[data-go]'); if (go) go.disabled = true;
  try {
    const r = await api(`/api/session/${S.data.id}/answer`, { index: S.idx, answer, timeMs: Date.now() - S.t0 });
    S.last = r;
    S.data.results.push(r);
    S.data.correct += r.correct ? 1 : 0;
    if (r.pointsSoFar != null) S.data.pointsSoFar = r.pointsSoFar;
    S.phase = 'feedback';
    showFeedback(r);
    if (r.event === 'up') toast(`⬆️ Knap! Je gaat een niveau omhoog bij ${r.eventCat}!`, 3500);
  } catch (e) {
    S.phase = 'ask'; drawAnswer(); toast(e.message);
  }
}

function showFeedback(r) {
  const q = S.data.questions[S.idx];
  if (r.correct) { buzz(30); if (Math.random() < 0.25) confetti(); } else buzz([60, 40, 60]);
  const praise = ['Goed zo!', 'Top!', 'Helemaal goed!', 'Knap gedaan!', 'Yes! 🎯', 'Netjes!'];
  const area = $app.querySelector('#answer-area');
  area.innerHTML = `<div class="answer-box" style="border-color:${r.correct ? 'var(--good)' : 'var(--bad)'}">${esc(r.given)}${q.unit && !q.money ? `<span class="unit">${esc(q.unit)}</span>` : ''}</div>`;
  $app.querySelector('#hints').innerHTML = '';
  $app.querySelector('#fb').innerHTML = `<div class="feedback ${r.correct ? 'ok' : 'no'}">
    <div class="title">${r.correct ? praise[Math.floor(Math.random() * praise.length)] : 'Helaas, niet goed'}</div>
    ${r.correct ? (r.note ? `<p>${esc(r.note)}</p>` : '') : `<p>Het goede antwoord is <b>${esc(r.display)}</b>.${r.note ? ' ' + esc(r.note) : ''}</p>`}
    ${!r.correct || r.hints ? `<p style="margin-top:10px;font-weight:900">Zo reken je het uit:</p><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : `<details style="margin-top:8px"><summary class="small muted">Hoe reken je dit uit?</summary><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`}
  </div>`;
  S.chat = [];
  $app.querySelector('#ai-area').innerHTML = '';
  const last = S.idx + 1 >= S.data.total;
  $app.querySelector('#controls').innerHTML = `<div class="stack" style="margin-top:12px">
    ${!r.correct && STATE?.ai ? '<button class="btn ghost block" data-explain>🧑‍🏫 Leg het anders uit</button>' : ''}
    <button class="btn ${r.correct ? 'good' : ''} block" data-next>${last ? 'Bekijk je resultaat' : 'Volgende →'}</button></div>`;
  $app.querySelector('[data-next]').onclick = next;
  $app.querySelector('[data-explain]')?.addEventListener('click', (e) => { e.target.remove(); askAI(true); });
  $app.querySelector('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function next() {
  const r = S.last;
  if (r?.done) { S.phase = 'done'; return renderSummary(r.summary); }
  S.idx++; S.input = ''; S.choice = null; S.hints = []; S.hintMore = true; S.phase = 'ask'; S.t0 = Date.now(); S.chat = [];
  renderQuestion();
  window.scrollTo(0, 0);
}

async function renderSummary(sum) {
  const kind = S?.data.kind;
  const pct = sum.total ? sum.correct / sum.total : 0;
  const msg = pct >= 0.9 ? 'Super gedaan! 🏆' : pct >= 0.7 ? 'Goed bezig! 💪' : pct >= 0.5 ? 'Netjes doorgezet! 👍' : 'Knap dat je het hebt afgemaakt! 🌱';
  if (pct >= 0.7) confetti();
  STATE = await api('/api/state');
  $app.innerHTML = `<div class="stack">
    <div class="card done-hero"><div class="big-emoji">${pct >= 0.7 ? '🎉' : '⭐'}</div>
      <div class="score">${sum.correct}/${sum.total}</div><p class="muted">sommen goed</p>
      <h2 style="margin:10px 0">${msg}</h2>
      ${sum.maxPoints ? `<div class="coin-pop">🪙 +${sum.points} cent</div>` : '<span class="chip">Oefenronde — zonder centen</span>'}
    </div>
    ${kind === 'intake' ? `<div class="card"><h3>Jouw uitslag</h3><p class="small muted" style="margin:4px 0 8px">Van sterk naar nog-oefenen. Vanaf nu krijg je elke schooldag ${STATE.points.dailyCount} sommen, vooral van de onderdelen onderaan.</p>
      ${STATE.skills.map((x, i) => `<div class="mini-skill"><span class="rank">${i + 1}</span><div><div style="font-weight:800">${x.icon} ${esc(x.label)}</div><div class="bar s${sc(x.score)}"><i style="width:${Math.max(4, x.score)}%"></i></div></div><span class="small muted">${x.tag}</span></div>`).join('')}</div>`
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
    const colors = ['#5b3df5', '#f5b100', '#12a150', '#e5484d'];
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
    if (e.status === 401) {
      return pinScreen('Pincode voor ouders', async (pin) => { await api('/api/parent/login', { pin }); renderParent(); });
    }
    throw e;
  }
  const byCat = Object.fromEntries(data.categories.map((c) => [c.id, c]));
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

    <div class="card"><h2>Onderdelen</h2><p class="small muted" style="margin:4px 0 6px">Score 0–100 · niveau basis/1F/1S · laatste 14 dagen goed · trend</p>
      <table class="list"><tr><th>Onderdeel</th><th>Score</th><th>14 d</th><th></th></tr>
      ${data.skills.map((x) => `<tr><td>${x.icon} ${esc(x.label)}${x.struggling ? ' <span class="chip bad">vast</span>' : ''}<div class="small muted">${level(x.level)} · ${x.domain}</div></td><td><b>${x.score}</b> ${trend(x.trend)}</td>
        <td>${accBy[x.cat] ? `${accBy[x.cat].ok}/${accBy[x.cat].n}<div class="small muted">${Math.round((accBy[x.cat].avg_ms || 0) / 1000)}s · ${accBy[x.cat].hints} hints</div>` : '–'}</td><td>${spark(x.cat)}</td></tr>`).join('')}</table></div>

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
    const typed = prompt(what === 'all' ? 'Alles wordt gewist, ook de spaarpot. Typ RESET om door te gaan.' : 'De starttoets en alle niveaus worden opnieuw bepaald (spaarpot blijft). Typ RESET om door te gaan.');
    if (typed !== 'RESET') return;
    await api('/api/parent/reset', { what, confirm: 'RESET' });
    toast('Gedaan ✓'); renderParent();
  }));
}

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
route();
