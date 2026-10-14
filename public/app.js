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
  grafieken: 'Lees eerst de titel en wat er op de assen staat. Gemiddelde = alles optellen en delen door hoeveel getallen het zijn. Getallenrij: kijk wat er steeds bij komt of keer gaat. Combinaties: keer elkaar (3 shirts × 4 broeken = 12).',
  meetkunde: 'Een rechte hoek is 90°, een kwartslag ook. Driehoek: hoeken samen 180°, vierhoek 360°. Kompas rechtsom: noord – oost – zuid – west ("Nooit Oost Zonder Wafels").',
};

// Groei-mindset: prijs de aanpak en de inzet, niet "slim zijn".
const PRAISE = {
  solo: ['Goed zo!', 'Knap uitgerekend!', 'Yes! Jouw aanpak werkt. 🎯', 'Netjes gedaan!', 'Helemaal goed!', 'Sterk gerekend! 💪',
    'Zo snel? Ben jij stiekem een rekenmachine? 🤖', 'Die som had geen schijn van kans. 🥊', 'Je brein draait overuren. Respect! 🧠', 'Boem! Raak. 🎯', 'Professor {naam} heeft gesproken. 🎓'],
  guided: ['Samen gelukt! Je deed alle stappen zelf. 🤝', 'Goed zo! Stap voor stap werkt.', 'Top! Zo bouw je het op.', 'Stapje voor stapje naar de top. 🧗'],
  retry: ['Kijk eens! Eerst fout, nu goed. Zo leer je! 🦸', 'Comeback! Nu snap je hem. 💪', 'Revanche genomen op die som! 😤'],
  double: ['Helemaal zelf én goed — dubbele centen! 🪙🪙', 'Zelf gedaan, dubbel verdiend! 🎯', 'Kassa! Dubbel zo rijk. 💰'],
  wrong: ['Nog niet goed — en dat is oké. Hiervan leer je.', 'Bijna! Kijk even hoe het werkt.', 'Fout is niet erg: nu weet je wat je moet oefenen.',
    'Oeps! Die som was even stiekem. Zo zit hij in elkaar:', 'Je rekenhersenen waren nog aan het opwarmen. 🥶 Kijk:', 'Deze ging even mis, de volgende pakken we! 💪'],
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
      <p>${s.intakeActive ? 'Je bent al begonnen. Ga verder waar je was!' : 'Eerst kijken wat je al kunt. 40 sommen uit alle onderdelen. We beginnen een groep lager dan jouw groep. Gaat het goed, dan worden ze moeilijker; gaat het fout, dan makkelijker. Je kunt tussendoor stoppen.'}</p></div>
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
async function startSession(kind, cat) {
  try {
    let groep;
    if (kind === 'intake' && !STATE?.intakeActive) {
      groep = await askGroep();
      if (!groep) return;
    }
    const data = await api('/api/session/start', { kind, cat, groep });
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
    ${STATE.ai ? '<div id="lesson"></div>' : `<div class="card flat"><b>Zo pak je het aan</b><p style="margin-top:4px">${esc(TIPS[cat] || '')}</p></div>`}
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
        else L.chat.push({ role: 'teacher', text: r.reason || TIPS[cat] });
      } catch (e) { L.chat.push({ role: 'teacher', text: e.message }); }
      L.busy = false; draw();
    };
    send(null);
  });
}

// ---------- chatpaneel van de leraar ----------
function teacherHTML(chat, { loading = false, quick = [], placeholder = 'Typ je vraag of antwoord…', intro = null } = {}) {
  const name = esc(STATE?.teacher || 'Meester Max');
  const msgs = chat.map((m) => m.role === 'teacher'
    ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(m.text).replace(/\n/g, '<br>')}</div></div>`
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
    <div class="card flat"><b>Zo doe je het</b><p style="margin-top:4px">${esc(TIPS[cat])}</p></div>
    <button class="btn block" data-start="practice" data-cat="${cat}">Oefen dit (10 sommen, zonder centen)</button>
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
  // uitlegkaart vooraf bij een onderdeel waar extra hulp aan staat
  const stuck = (data.struggling || []);
  const key = `coach-shown-${data.id}`;
  if (stuck.length && data.answered === 0 && !store.get(key)) { store.set(key, '1'); showCoach(stuck[0], 'Hier gaan we vandaag extra mee oefenen. Lees dit even rustig door.'); }
}


async function startQuestion() {
  const c = S.cur;
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

function renderQuestion() {
  const { data, cur } = S;
  const q = cur.question;
  const meta = (STATE?.skills || []).find((x) => x.cat === q.cat);
  const pct = (cur.index / data.total) * 100;
  const label = q.retry ? '<span class="chip good">💪 Herkansing</span>' : q.booster ? '<span class="chip good">😎 Even een makkie</span>' : `<span class="chip">${meta?.icon || ''} ${esc(meta?.label || q.cat)} · ${LEVEL[q.level]}</span>`;
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
      <div id="fb"></div>
      <div id="ai-area"></div>
    </div>
    <div id="controls"></div>`;
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
    $app.querySelector('#hints').innerHTML = (S.cur.hints || []).map((h) => `<div class="hint">💡 ${esc(h)}</div>`).join('');
    drawAnswer();
  } catch (e) { toast(e.message); }
}

// Gesprek met de leraar bij deze som (wordt per som op de server bewaard)
function quickFor() {
  const answered = S.phase === 'feedback' || S.phase === 'done';
  if (answered && S.last && !S.last.correct) return ['Ik snap het nog niet 🤔', 'Geef een voorbeeld', 'Ik snap het! 👍'];
  if (answered) return ['Waarom klopt dit?', 'Kan het ook sneller?'];
  if (S.cur.guided && S.cur.guideStep) return ['Ik snap deze stap niet', 'Geef een voorbeeld'];
  return ['Ik snap de vraag niet', 'Hoe begin ik?', 'Geef een tip'];
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
    const r = await api(`/api/session/${S.data.id}/chat`, { index: S.cur.index, message, mode, ...extra });
    if (r.chat) S.cur.chat = r.chat;
    else if (r.reason) S.cur.chat = [...(S.cur.chat || []), { role: 'teacher', text: r.reason }];
  } catch (e) { S.cur.chat = [...(S.cur.chat || []), { role: 'teacher', text: e.message }]; }
  S.talking = false;
  drawTeacher();
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
    title = title.replace('{naam}', STATE?.name || 'Rekenaar');
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
    ${showSteps && !(STATE?.ai && !r.correct && S.data.kind !== 'intake') ? `<p style="margin-top:10px;font-weight:900">Zo reken je het uit:</p><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      : `<details style="margin-top:8px"><summary class="small muted">Hoe reken je dit uit?</summary><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`}
    ${nextIsRetry ? '<p class="small" style="margin-top:10px;font-weight:800">👉 Hierna krijg je een herkansing: zo\'n soort som, samen stap voor stap.</p>' : ''}
  </div>`;
  $app.querySelector('#guide').innerHTML = '';
  $app.querySelector('#controls').innerHTML = `<div class="stack" style="margin-top:12px">
    ${r.correct && STATE?.ai && S.data.kind !== 'intake' && !(S.cur.chat || []).length ? `<button class="btn ghost block" data-ask2>🧑‍🏫 Praat erover met ${esc(STATE.teacher)}</button>` : ''}
    <button class="btn ${r.correct ? 'good' : ''} block" data-next>${r.done ? 'Bekijk je resultaat' : nextIsRetry ? 'Herkansing →' : 'Volgende →'}</button></div>`;
  $app.querySelector('[data-next]').onclick = next;
  $app.querySelector('[data-ask2]')?.addEventListener('click', (e) => { e.target.remove(); openTeacher(); });
  // fout? De leraar kijkt wat er misging en begint een gesprekje
  if (!r.correct && STATE?.ai && S.data.kind !== 'intake') { S.teacherOpen = true; talk(null, 'start'); }
  else drawTeacher();
  if (r.teachback) drawTeachback(r);
  $app.querySelector('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

function profileHTML(p) {
  if (!p) return '<p class="small muted">Nog leeg. Na een paar sessies analyseert de AI-leraar automatisch welke denkfouten er gemaakt worden en wat helpt.</p>';
  return `${p.samenvatting ? `<p>${esc(p.samenvatting)}</p>` : ''}
    ${(p.onderdelen || []).map((o) => `<div class="card flat" style="padding:12px;margin-top:8px"><div class="row between"><b>${esc(o.onderdeel)}</b><span class="chip ${o.prioriteit === 'hoog' ? 'bad' : ''}">${esc(o.prioriteit || '')}</span></div>
      ${(o.denkfouten || []).length ? `<ul class="small" style="margin:6px 0 0 18px;padding:0">${o.denkfouten.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${o.wat_helpt ? `<p class="small" style="margin-top:6px"><b>Helpt:</b> ${esc(o.wat_helpt)}</p>` : ''}</div>`).join('')}
    ${p.aanpak_tips?.length ? `<p class="small" style="margin-top:8px"><b>Aanpak:</b> ${p.aanpak_tips.map(esc).join(' · ')}</p>` : ''}
    ${p.updated_at ? `<p class="small muted" style="margin-top:6px">Bijgewerkt: ${new Date(p.updated_at).toLocaleString('nl-NL')}</p>` : ''}`;
}

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
route();
