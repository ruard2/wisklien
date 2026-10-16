// Rekenapp groep 8 — één pagina, geen build-stap.
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const $toast = document.getElementById('toast');

// ---------- hulpjes ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => withModels(esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));
// geld: euro/cent in Nederland, rand/sent in Suid-Afrika (zelfde bedragen, andere munt)
const ZAR = () => STATE?.currency === 'ZAR';
const euro = (cents) => (ZAR() ? 'R' : '€ ') + (cents / 100).toFixed(2).replace('.', ',');
const cents = (c) => (Math.round(c * 10) / 10).toString().replace('.', ',') + (ZAR() ? ' sent' : ' cent');
const CENT = () => (ZAR() ? 'sent' : 'cent');
async function loadState() { STATE = await api('/api/state'); setLang(STATE.kid?.lang); return STATE; }
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const LEVELS = () => STATE?.levelNames || ['groep 5', 'groep 6', 'groep 7', 'groep 8'];
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
function ask(html, yes = t('Ja'), no = t('Nee'), danger = false) {
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
const ORD_AF = { 2: 'halwes', 3: 'derdes', 4: 'vierdes', 5: 'vyfdes', 6: 'sesdes', 7: 'sewendes', 8: 'agtstes', 9: 'negendes', 10: 'tiendes', 11: 'elfdes', 12: 'twaalfdes', 20: 'twintigstes', 100: 'honderdstes' };
// Afrikaans uitspreken (Suid-Afrika: × = maal, ÷ = gedeel deur, R = rand)
function speakableAF(s) {
  return String(s)
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/(\d{1,2}):(\d{2})/g, (m, h, mi) => `${h} uur ${mi === '00' ? '' : mi}`)
    .replace(/(\d+) 1\/2\b/g, '$1 en ’n half')
    .replace(/(\d+) (\d+)\/(\d+)/g, (m, w, a, b) => `${w} en ${a} ${ORD_AF[b] || b + 'stes'}`)
    .replace(/\b1\/2\b/g, '’n half')
    .replace(/(\d+)\/(\d+)/g, (m, a, b) => `${a} ${ORD_AF[b] || b + 'stes'}`)
    .replace(/R\s?(\d+),(\d\d)/g, (m, e, c) => (c === '00' ? `${e} rand` : `${e} rand ${Number(c)}`))
    .replace(/R\s?(\d+)/g, '$1 rand')
    .replace(/(\d),(\d)/g, '$1 komma $2')
    .replace(/×/g, ' maal ').replace(/÷/g, ' gedeel deur ').replace(/ : /g, ' gedeel deur ').replace(/−/g, ' min ').replace(/\+/g, ' plus ').replace(/=/g, ' is ')
    .replace(/%/g, ' persent').replace(/°C/g, ' grade').replace(/°/g, ' grade')
    .replace(/\b(km|dm|cm|mm|m)([²³])/g, (x, u, p) => ` ${p === '²' ? 'vierkante' : 'kubieke'} ${UNIT[u]}`)
    .replace(/\.\.\./g, ' hoeveel ').replace(/…/g, ' ');
}
function speakable(t) {
  if (LANG === 'af') return speakableAF(t);
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
    if (!synth) return toast(t('Voorlezen werkt niet op dit apparaat.'));
    if (synth.speaking) { synth.cancel(); return; }
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = LANG === 'af' ? 'af-ZA' : 'nl-NL'; u.rate = 0.92;
    const voices = synth.getVoices();
    const v = (LANG === 'af' && voices.find((x) => x.lang?.toLowerCase().startsWith('af'))) || voices.find((x) => x.lang?.toLowerCase().startsWith('nl'));
    if (v) u.voice = v;
    synth.speak(u);
  } catch { toast(t('Voorlezen lukt nu niet.')); }
}
const speakBtn = (text, small = false) => `<button class="speak ${small ? 'sm' : ''}" data-speak="${esc(text)}" aria-label="${t('Voorlezen')}">🔊</button>`;
function bindSpeak(root) { root.querySelectorAll('[data-speak]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.speak); })); }
const hintHTML = (h) => `<div class="hint">💡 ${esc(h).replace(/\n/g, '<br>')}</div>`;

// ---------- humor ----------
// Bestaande rekenmoppen (verzameld door de ouder uit Nederlandse moppenverzamelingen). [vraag, clou]
const MOPPEN = [
  ["Meester: 'Als ik vier eieren leg en jij legt er drie bij, hoeveel zijn het er dan?'", "Jantje: 'Vier, meester. Ik kan helemaal geen eieren leggen!' 🥚"],
  ["Meester: 'Als je vijf appels in je ene hand hebt en zes in je andere, wat heb je dan?'", "Jantje: 'Ontzettend grote handen!' 🙌"],
  ["Meester: 'Twee konijnen plus twee konijnen, hoeveel zijn dat?' Jantje: 'Vijf!' Meester: 'Hoe kom je daarbij?'", "Jantje: 'Ik heb er thuis al eentje.' 🐇"],
  ["Meester: 'Je hebt tien chocolaatjes en ik vraag er vijf. Hoeveel heb je er nog?'", "Jantje: 'Tien!' 🍫"],
  ["Meester: 'Waarom heb je alle antwoorden twee keer opgeschreven?'", "Jantje: 'U zei dat ik alles dubbel moest controleren!' ✌️"],
  ['Waarom maakt Jantje zijn keersommen op de grond?', 'Omdat de meester gezegd heeft dat hij geen tafels mag gebruiken. 🪑'],
  ["Meester: 'Als je je boterham in vier stukken snijdt, heb je dan meer eten?'", "Jantje: 'Nee, alleen meer kruimels.' 🥪"],
  ["Meester: 'Als je vier appels hebt en er twee weggeeft, hoeveel heb je dan nog?'", "Jantje: 'Geen, want ik lust geen appels.' 🍎"],
  ['Wat zegt de nul tegen de acht?', "'Mooie riem!' 😎"],
  ['Waarom is een rekenboek zo verdrietig?', 'Het heeft zoveel problemen. 📚'],
  ['Wat zei de rekenmachine tegen de leerling?', "'Je kunt op me rekenen!' 🧮"],
  ['Waarom kan een rechte lijn niet liegen?', 'Omdat hij altijd recht is. 📏'],
  ['Waarom vertelt een breuk nooit het hele verhaal?', 'Omdat hij maar een deel vertelt. 🍕'],
  ['Wat zei het vierkant tegen de cirkel?', "'Jij draait ook altijd overal omheen!' ⭕"],
  ['Waarom heeft de kalender zo weinig toekomst?', 'Zijn dagen zijn geteld. 📅'],
  ['Waarom zijn twee evenwijdige lijnen zo verdrietig?', 'Omdat ze elkaar nooit zullen ontmoeten. 😢'],
  ['Waarom is een breuk naar de dokter gegaan?', 'Om zich te laten vereenvoudigen. 🩺'],
  ['Waarom is het is-gelijkteken zo bescheiden?', 'Omdat het zich niet groter of kleiner voelt dan een ander. ⚖️'],
  ['Waarom is een minteken jaloers op een plusteken?', 'Omdat de plus er altijd iets bij krijgt. ➕'],
  ['Wat zegt een plus tegen een min die aan zichzelf twijfelt?', "'Blijf positief!' 😊"],
  ['Waarom gaan getallen graag naar een feestje?', 'Om samen op te tellen. 🎉'],
  ['Wat is het enige waar je altijd op kunt tellen?', 'Je tien vingers. 🖐️'],
];
// Afrikaans: dieselfde bestaande grappe, net dié wat in Afrikaans ook werk
const MOPPEN_AF = [
  ["Meneer: 'As ek vier eiers lê en jy lê drie by, hoeveel is daar dan?'", "Jannie: 'Vier, Meneer. Ek kan mos nie eiers lê nie!' 🥚"],
  ["Meneer: 'As jy vyf appels in die een hand het en ses in die ander, wat het jy dan?'", "Jannie: 'Baie groot hande!' 🙌"],
  ["Meneer: 'Twee hasies plus twee hasies, hoeveel is dit?' Jannie: 'Vyf!' Meneer: 'Hoe kry jy dit?'", "Jannie: 'Ek het al een by die huis.' 🐇"],
  ["Meneer: 'Jy het tien sjokolades en ek vra vir vyf. Hoeveel het jy oor?'", "Jannie: 'Tien!' 🍫"],
  ["Meneer: 'Hoekom het jy al die antwoorde twee keer neergeskryf?'", "Jannie: 'Meneer het gesê ek moet alles dubbel kontroleer!' ✌️"],
  ['Hoekom doen Jannie sy maalsomme op die vloer?', 'Omdat Meneer gesê het hy mag nie tafels gebruik nie. 🪑'],
  ["Meneer: 'As jy jou toebroodjie in vier stukke sny, het jy dan meer kos?'", "Jannie: 'Nee, net meer krummels.' 🥪"],
  ["Meneer: 'As jy vier appels het en twee weggee, hoeveel het jy dan oor?'", "Jannie: 'Niks nie, want ek hou nie van appels nie.' 🍎"],
  ['Wat sê die nul vir die agt?', "'Mooi belt!' 😎"],
  ['Hoekom is ’n wiskundeboek so hartseer?', 'Dit het soveel probleme. 📚'],
  ['Wat het die sakrekenaar vir die leerder gesê?', "'Jy kan op my reken!' 🧮"],
  ['Hoekom kan ’n reguit lyn nie lieg nie?', 'Omdat hy altyd reguit is. 📏'],
  ['Hoekom vertel ’n breuk nooit die hele storie nie?', 'Omdat hy net ’n deel vertel. 🍕'],
  ['Wat het die vierkant vir die sirkel gesê?', "'Jy draai ook altyd oral om!' ⭕"],
  ['Hoekom het die kalender so min toekoms?', 'Sy dae is getel. 📅'],
  ['Hoekom is twee ewewydige lyne so hartseer?', 'Omdat hulle mekaar nooit sal ontmoet nie. 😢'],
  ['Hoekom is ’n breuk dokter toe?', 'Om vereenvoudig te word. 🩺'],
  ['Wat sê ’n plus vir ’n min wat aan homself twyfel?', "'Bly positief!' 😊"],
  ['Waarop kan jy altyd tel?', 'Jou tien vingers. 🖐️'],
];
// "Mop van de dag": elke dag een andere, maar dezelfde de hele dag
const mop = () => { const m = L(MOPPEN, MOPPEN_AF); const d = Math.floor((Date.now() + 2 * 36e5) / 864e5); return m[d % m.length]; };
const SUBLINES = ['Klaar om de sommen te laten zien wie de baas is?', 'Je hersenen staan te springen om te rekenen. 🧠💪', 'Vandaag wordt een rekenmooie dag.', 'De sommen staan al te trillen van angst. 😱', 'Even je rekenspieren opwarmen?'];
const SUBLINES_AF = ['Gereed om ’n paar somme ’n les te leer?', 'Jou brein het lus vir ’n oefensessie. 🧠💪', 'Vandag word ’n lekker wiskundedag.', 'Die somme bewe al van vrees. 😱', 'Kom ons maak jou wiskundespiere warm!'];

// Elke aanvraag heeft een tijdslimiet: nooit eindeloos wachten (vooral als de AI traag is).
// Aanvragen waarbij Max moet nadenken krijgen langer.
const SLOW = /\/(chat|lesson|reflect|teachback|advice|profile)\b/;
async function api(path, body) {
  const ctl = new AbortController();
  const ms = SLOW.test(path) ? 90000 : /\/session\/start/.test(path) ? 45000 : 25000;
  const timer = setTimeout(() => ctl.abort(), ms);
  let res;
  try {
    res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal: ctl.signal,
    });
  } catch (e) {
    const er = new Error(e.name === 'AbortError' ? t('Dat duurt te lang. Probeer het nog eens.') : t('Geen verbinding. Controleer je internet en probeer het nog eens.'));
    er.status = 0; er.network = true;
    throw er;
  } finally { clearTimeout(timer); }
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && data.error === 'login') { renderLogin(); throw new Error('login'); }
  if (res.status === 401 && data.error === 'kid') { renderWho(); throw new Error('login'); }
  if (!res.ok) { const e = new Error(data.error || t('Er ging iets mis')); e.status = res.status; e.data = data; throw e; }
  return data;
}

// Korte vaste uitleg per onderdeel (werkt ook zonder AI)
// "Zo pak je het aan": uit het didactisch handboek (server), op het niveau waarop het kind nu oefent.
// Overal dezelfde aanpak als in de hints, tussenstappen en bij Max.
function tipText(cat) {
  const a = STATE?.aanpak?.[cat];
  return a ? `${a.stappen.join(' ')} ${t('Bijvoorbeeld:')} ${a.voorbeeld}` : '';
}
function tipHTML(cat) {
  const a = STATE?.aanpak?.[cat];
  if (!a) return '';
  return `<p class="small muted" style="margin-top:4px">${esc(a.kern)}</p><ol class="steps" style="margin-top:6px">${a.stappen.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><p class="small" style="margin-top:6px"><b>${t('Voorbeeld:')}</b> ${esc(a.voorbeeld)}</p>`;
}

// Groei-mindset: prijs de aanpak en de inzet, niet "slim zijn".
const PRAISE = {
  solo: ['Goed zo!', 'Knap uitgerekend!', 'Ja! Jouw aanpak werkt. 🎯', 'Netjes gedaan!', 'Helemaal goed!', 'Sterk gerekend! 💪',
    'Zo snel? Ben jij stiekem een rekenmachine? 🤖', 'Die som had geen schijn van kans. 🥊', 'Je brein draait overuren. Petje af! 🧠', 'Boem! Raak. 🎯', 'Professor {naam} heeft gesproken. 🎓'],
  guided: ['Samen gelukt! Je deed alle stappen zelf. 🤝', 'Goed zo! Stap voor stap werkt.', 'Mooi! Zo bouw je het op.', 'Stapje voor stapje naar de top. 🧗'],
  retry: ['Kijk eens! Eerst fout, nu goed. Zo leer je! 🦸', 'Herkansing gelukt! Nu snap je hem. 💪', 'Revanche genomen op die som! 😤'],
  double: ['Helemaal zelf én goed — dubbele centen! 🪙🪙', 'Zelf gedaan, dubbel verdiend! 🎯', 'Kassa! Dubbel zo rijk. 💰'],
  wrong: ['Nog niet goed, en dat geeft niks. Hiervan leer je.', 'Fout is niet erg: nu weet je wat je moet oefenen.',
    'Oeps! Die som was even stiekem. Zo zit hij in elkaar:', 'Je rekenhersenen waren nog aan het opwarmen. 🥶 Kijk:', 'Deze ging even mis, de volgende pakken we! 💪'],
  dunno: ['Knap dat je het eerlijk zegt! Dan leren we hem nu.', 'Weet je het niet? Prima, daar zijn we voor. 🙂', 'Goed dat je het zegt. Kijk even mee:'],
};

const PRAISE_AF = {
  solo: ['Mooi so!', 'Slim uitgewerk!', 'Ja! Jou metode werk. 🎯', 'Netjies gedoen!', 'Heeltemal reg!', 'Sterk gewerk! 💪',
    'So vinnig? Is jy stiekem ’n sakrekenaar? 🤖', 'Daai som het geen kans gestaan nie. 🥊', 'Jou brein werk oortyd. Respek! 🧠', 'Boem! Raak. 🎯', 'Professor {naam} het gepraat. 🎓'],
  guided: ['Saam reggekry! Jy het al die stappe self gedoen. 🤝', 'Mooi so! Stap vir stap werk.', 'Top! So bou jy dit op.', 'Treetjie vir treetjie na bo. 🧗'],
  retry: ['Kyk net! Eers verkeerd, nou reg. So leer jy! 🦸', 'Comeback! Nou snap jy dit. 💪', 'Wraak geneem op daai som! 😤'],
  double: ['Heeltemal self én reg — dubbel sente! 🪙🪙', 'Self gedoen, dubbel verdien! 🎯', 'Kaching! Dubbel so ryk. 💰'],
  wrong: ['Nog nie reg nie — en dis oukei. Hiervan leer jy.', 'Verkeerd is nie erg nie: nou weet jy wat om te oefen.',
    'Oeps! Daai som was skelm. So werk dit:', 'Jou wiskundebrein was nog besig om op te warm. 🥶 Kyk:', 'Die een het skeefgeloop, die volgende vat ons! 💪'],
  dunno: ['Eerlik gesê, slim van jou! Dan leer ons dit nou.', 'Weet jy dit nie? Reg so, daarvoor is ons hier. 🙂', 'Goed dat jy dit sê. Kyk saam:'],
};
const praise = () => L(PRAISE, PRAISE_AF);

let STATE = null;

// ---------- router ----------
async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  $app.classList.remove('full');
  setTab(parts[0] || 'home');
  if (parts[0] === 'overzicht') setLang(store.get('ov-lang') || 'nl'); else if (STATE?.kid) setLang(STATE.kid.lang);
  try {
    if (!parts.length) return await renderHome();
    if (parts[0] === 'voortgang') return parts[1] ? await renderCategory(parts[1]) : await renderProgress();
    if (parts[0] === 'spaarpot') return await renderPiggy();
    if (parts[0] === 'sessie') return await openSession(parts[1]);
    if (parts[0] === 'ouder') return await renderParent();
    if (parts[0] === 'overzicht') return await renderOverview();
    location.hash = '#/';
  } catch (e) {
    if (e.message !== 'login') showError(e);
  }
}
// Foutscherm: nooit een leeg of vastgelopen scherm, altijd "opnieuw" of "naar start"
function showError(e) {
  $tabs.hidden = false;
  $app.classList.remove('full');
  $app.innerHTML = `<div class="card stack" style="margin-top:6vh;text-align:center"><div class="big-emoji">🙈</div><h2>${t('Oeps')}</h2>
    <p class="muted">${esc(e?.message || t('Er ging iets mis'))}</p>
    <button class="btn block" data-retry>${t('Opnieuw')}</button><button class="btn ghost block" data-home>${t('Naar het begin')}</button></div>`;
  $app.querySelector('[data-retry]').onclick = () => { STATE = null; route(); };
  $app.querySelector('[data-home]').onclick = () => { STATE = null; if (location.hash === '#/' || !location.hash) route(); else location.hash = '#/'; };
}
// Onverwachte fouten in de app: melden en doorgaan in plaats van vastlopen
window.addEventListener('unhandledrejection', (ev) => {
  const m = ev.reason?.message;
  if (m === 'login') return;
  console.error(ev.reason);
  try { toast(m || t('Er ging iets mis')); } catch {}
});
window.addEventListener('error', (ev) => { console.error(ev.error || ev.message); });
function setTab(name) {
  $tabs.hidden = name === 'sessie' || name === 'ouder' || name === 'overzicht';
  for (const a of $tabs.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === name);
}
window.addEventListener('hashchange', route);

// ---------- overzicht voor ouder/leerkracht: alle kinderen ----------
async function renderOverview() {
  let data;
  try { data = await api('/api/parent/all'); } catch (e) {
    if (e.status === 401) return pwScreen('Ouderwachtwoord · Ouerwagwoord', 'Ouder of leerkracht · Ouer of onderwyser', async (pw) => { await api('/api/parent/login', { password: pw }); renderOverview(); });
    throw e;
  }
  const ago = (tm) => {
    if (!tm) return t('nog nooit');
    const d = Math.floor((Date.now() - new Date(tm)) / 864e5);
    return d <= 0 ? t('vandaag') : d === 1 ? t('gisteren') : t('{n} dagen geleden', { n: d });
  };
  const LVof = (k) => (k.country === 'ZA' ? ['g4', 'g5', 'g6', 'g7'] : ['g5', 'g6', 'g7', 'g8']);
  const TR = { vooruit: '↗', achteruit: '↘', gelijk: '→' };
  const ST = { nieuw: '🆕', 'mee bezig': '🔧', 'gaat beter': '📈', opgelost: '✅' };
  const kidCard = (k) => {
    const p = k.profile || {};
    const open = (p.zwakke_punten || []).filter((z) => z.status !== 'opgelost');
    const fixed = (p.zwakke_punten || []).filter((z) => z.status === 'opgelost');
    const weakest = [...k.stats].filter((s) => s.n).sort((a, b) => a.score - b.score).slice(0, 3);
    return `<div class="card stack ov-kid">
      <div class="row between"><div class="row"><span class="big-emoji" style="font-size:34px">${esc(k.avatar)}</span><div><h2 style="margin:0">${esc(k.name)}</h2>
        <div class="small muted">${t('laatst geoefend: {d}', { d: ago(k.lastActive) })}${k.intakeDone ? '' : ` · ${t('starttoets nog niet af')}`}${k.lang === 'af' ? ' · 🇿🇦 Afrikaans' : ''}</div></div></div>
        <button class="btn ghost sm" data-open="${k.id}">${t('Details ›')}</button></div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <span class="chip">📅 ${t('deze week: {n} sommen', { n: k.week.n })}${k.week.pct != null ? ` · ${t('{p}% goed', { p: k.week.pct })}` : ''}</span>
        <span class="chip">✅ ${t('{n} sessies', { n: k.sessions7 })}</span><span class="chip">🔥 ${k.streak} ${k.streak === 1 ? t('dag') : t('dagen')}</span>
        <span class="chip coin">🪙 ${(k.country === 'ZA' ? 'R' : '€ ') + (k.wallet.balance / 100).toFixed(2).replace('.', ',')}</span>${k.reviewsOpen ? `<span class="chip">🔁 ${t('{n} te herhalen', { n: k.reviewsOpen })}</span>` : ''}
      </div>
      ${p.samenvatting ? `<p>${esc(p.samenvatting)}</p>` : `<p class="small muted">${data.ai ? t('Nog geen profiel: dat komt na de eerste sommen.') : t('AI staat uit: geen profiel.')}</p>`}
      ${open.length ? `<div><b>${t('Werkt aan')}</b><ul class="ov-list">${open.slice(0, 5).map((z) => `<li><span title="${esc(z.status || '')}">${ST[z.status] || '•'}</span> <b>${esc(z.onderdeel)}</b>: ${esc(z.punt)}${z.bewijs ? `<div class="small muted">${esc(z.bewijs)}</div>` : ''}</li>`).join('')}</ul></div>` : ''}
      ${p.sterk?.length ? `<p class="small"><b>💪 ${t('Sterk:')}</b> ${p.sterk.map(esc).join(' · ')}</p>` : ''}
      ${fixed.length ? `<p class="small"><b>✅ ${t('Opgelost:')}</b> ${fixed.map((z) => esc(z.punt)).join(' · ')}</p>` : ''}
      ${(k.signals?.signals || []).some((s) => s.status === 'let op') ? `<div><b>🔧 ${t('Hoe leert {n}', { n: esc(k.name) })}</b><ul class="ov-list">${k.signals.signals.filter((s) => s.status === 'let op').map((s) => `<li>⚠️ <b>${esc(s.title)}</b><div class="small muted">${esc(s.evidence)}</div></li>`).join('')}</ul></div>` : ''}
      <details><summary class="small" style="font-weight:800;cursor:pointer">${t('Hoe leert {n}: alle signalen', { n: esc(k.name) })}</summary>${signalsHTML(k.signals, k.teacher || data.teacher)}</details>
      <details><summary class="small" style="font-weight:800;cursor:pointer">${t('Niveau per onderdeel')}</summary>
        <table class="list ov-levels">${k.stats.map((s) => `<tr><td>${esc(data.cats.find((c) => c.id === s.cat)?.icon || '')} ${esc(s.label)}</td>
          <td><span class="lv lv${s.levelIdx}">${LVof(k)[s.levelIdx]}</span></td><td class="small">${s.n ? `${s.pct14 ?? s.pct}%` : '–'}</td><td class="small" title="${esc(s.trend)}">${TR[s.trend] || ''}</td></tr>`).join('')}</table>
        <p class="small muted">${k.country === 'ZA' ? t('g4–g7 = op welk graadniveau er nu geoefend wordt · % goed (laatste 14 dagen) · pijl = trend') : t('g5–g8 = op welk groepsniveau er nu geoefend wordt · % goed (laatste 14 dagen) · pijl = trend')}</p></details>
      ${(k.misconceptions.length || k.scratchNotes.length || k.memory.length) ? `<details><summary class="small" style="font-weight:800;cursor:pointer">${t('Denkfouten, kladblaadje en wat {m} onthoudt', { m: esc(k.teacher || data.teacher) })}</summary>
        ${k.misconceptions.length ? `<p class="small" style="margin-top:6px"><b>${t('Denkfouten (30 dagen):')}</b> ${k.misconceptions.map((m) => `${esc(m.misconception)} (${m.n}×)`).join(' · ')}</p>` : ''}
        ${k.scratchNotes.map((n) => `<p class="small" style="margin-top:6px">✏️ ${esc(n.text)} → <b>${esc(n.given)}</b> ${n.correct ? '✅' : '❌'}<br><span class="muted">${esc(n.scratch_note)}</span></p>`).join('')}
        ${k.memory.length ? `<ul class="ov-list small">${k.memory.map((m) => `<li>${esc(m.n)} <span class="muted">(${esc(m.d)})</span></li>`).join('')}</ul>` : ''}</details>` : ''}
      ${!open.length && weakest.length && k.intakeDone ? `<p class="small"><b>${t('Zwakste onderdelen nu:')}</b> ${weakest.map((s) => esc(s.label)).join(', ')}</p>` : ''}
    </div>`;
  };
  $app.innerHTML = `<div class="stack">
    <div class="row between"><a href="#/" class="small">‹ ${t('Terug')}</a><div class="row" style="gap:6px"><div class="seg" style="gap:4px">${[['nl', 'NL'], ['af', 'AF']].map(([l, n]) => `<button type="button" class="${LANG === l ? 'sel' : ''}" data-ovlang="${l}" style="min-width:0;padding:6px 10px">${n}</button>`).join('')}</div><button class="btn ghost sm" data-logout>${t('Uitloggen')}</button></div></div>
    <h1>👨‍🏫 ${t('Overzicht')}</h1>
    <p class="muted small">${t('Alle kinderen op één plek. De AI houdt zelf het profiel bij en de onderdelen waar een kind moeite mee heeft (na elke sessie en elke 10 sommen). Namen gaan nooit naar de AI: die ziet alleen een schuilnaam.')}</p>
    ${data.kids.length ? data.kids.map(kidCard).join('') : `<div class="card"><p>${t('Nog geen kinderen.')}</p></div>`}
  </div>`;
  $app.querySelectorAll('[data-open]').forEach((b) => (b.onclick = async () => { await api('/api/kids/select', { id: Number(b.dataset.open) }); STATE = null; location.hash = '#/ouder'; }));
  $app.querySelectorAll('[data-ovlang]').forEach((b) => (b.onclick = () => { store.set('ov-lang', b.dataset.ovlang); setLang(b.dataset.ovlang); renderOverview(); }));
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
    // Nederland: E T H D …, t h d. Suid-Afrika: E T H D …, t h d (ene, tiene, honderde, duisende; tiendes, honderdstes)
    const H = ['E', 'T', 'H', 'D', 'TD', 'HD', 'M'];
    const HN = L({ E: 'eenheden', T: 'tientallen', H: 'honderdtallen', D: 'duizendtallen', TD: 'tienduizendtallen', HD: 'honderdduizendtallen', M: 'miljoenen' },
      { E: 'ene', T: 'tiene', H: 'honderde', D: 'duisende', TD: 'tienduisende', HD: 'honderdduisende', M: 'miljoene' });
    const D = ['t', 'h', 'd'], DN = L({ t: 'tienden', h: 'honderdsten', d: 'duizendsten' }, { t: 'tiendes', h: 'honderdstes', d: 'duisendstes' });
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
    return `<svg viewBox="0 0 ${cols * s + 4} ${rows * s + 4}" class="m-svg" style="max-width:${cols * s + 4}px">${cells}</svg><div class="m-leg">${t('{r} rijen van {c} hokjes', { r: rows, c: cols })}</div>`;
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
    // echte wandklok (of wekker/horloge als Max dat erbij zet: [[klok: 7:45 | wekker]])
    if (window.KLOK) { const look = /wekker/i.test(arg) ? 'alarm' : /horloge/i.test(arg) ? 'watch' : 'wall'; return `<div class="clock">${KLOK.analog(`${m[1]}:${m[2]}`, look)}</div>`; }
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
  setLang('nl');
  const { kids, avatars } = await api('/api/kids');
  let avatar = avatars[kids.length % avatars.length];
  // nog geen taal bekend: dit scherm is tweetalig (Nederlands · Afrikaans)
  const prof = { country: 'NL', lang: 'nl', grade: '', age: '' };
  const FLAG = { NL: '🇳🇱', ZA: '🇿🇦' };
  const gradeOpts = () => (prof.country === 'ZA' ? [3, 4, 5, 6, 7] : [3, 4, 5, 6, 7, 8]);
  const af = () => prof.lang === 'af';
  const draw = (err = '', showNew = !kids.length) => {
    $app.innerHTML = `<div class="stack" style="margin-top:6vh">
      <div style="text-align:center"><div class="big-emoji">👋</div><h1 style="margin-top:6px">Wie ben jij? <span class="muted" style="font-size:.7em">· Wie is jy?</span></h1>
        <p class="muted">${kids.length ? 'Tik op je naam · Tik op jou naam' : 'Welkom! · Welkom!'}</p></div>
      ${kids.length ? `<div class="who-grid">${kids.map((k) => `<button class="who-kid" data-kid="${k.id}"><span>${esc(k.avatar)}</span><b>${esc(k.name)}</b>${k.country === 'ZA' ? '<small>🇿🇦</small>' : ''}</button>`).join('')}</div>` : ''}
      ${showNew ? `<form class="card stack" data-new>
          <h3>${af() ? 'Maak jou profiel' : 'Maak je profiel'}</h3>
          <div><div style="font-weight:800;margin-bottom:6px">Land</div>
            <div class="seg">${['NL', 'ZA'].map((c) => `<button type="button" class="${prof.country === c ? 'sel' : ''}" data-country="${c}">${FLAG[c]} ${c === 'NL' ? 'Nederland' : 'Suid-Afrika'}</button>`).join('')}</div></div>
          <div><div style="font-weight:800;margin-bottom:6px">${af() ? 'Taal' : 'Taal'}</div>
            <div class="seg">${[['nl', 'Nederlands'], ['af', 'Afrikaans']].map(([l, n]) => `<button type="button" class="${prof.lang === l ? 'sel' : ''}" data-lang="${l}">${n}</button>`).join('')}</div></div>
          <label class="field"><span style="font-weight:800">${af() ? 'Jou naam' : 'Je naam'}</span><input name="name" maxlength="30" placeholder="${af() ? 'bv. Christo' : 'bijv. Christo'}" autocomplete="off" required></label>
          <div class="row" style="gap:10px;align-items:flex-end">
            <label class="field" style="flex:1"><span style="font-weight:800">${prof.country === 'ZA' ? 'Graad' : 'Groep'}</span>
              <select name="grade" required><option value="">${af() ? 'Kies…' : 'Kies…'}</option>${gradeOpts().map((g) => `<option value="${g}" ${String(prof.grade) === String(g) ? 'selected' : ''}>${prof.country === 'ZA' ? 'Graad' : 'Groep'} ${g}</option>`).join('')}</select></label>
            <label class="field" style="flex:1"><span style="font-weight:800">${af() ? 'Ouderdom' : 'Leeftijd'}</span>
              <select name="age" required><option value="">${af() ? 'Kies…' : 'Kies…'}</option>${[7, 8, 9, 10, 11, 12, 13, 14, 15].map((a) => `<option value="${a}" ${String(prof.age) === String(a) ? 'selected' : ''}>${a} ${af() ? 'jaar' : 'jaar'}</option>`).join('')}</select></label>
          </div>
          <div><div style="font-weight:800;margin-bottom:6px">${af() ? 'Kies ’n prentjie' : 'Kies een plaatje'}</div>
          <div class="avatar-pick">${avatars.map((a) => `<button type="button" class="${a === avatar ? 'sel' : ''}" data-av="${a}">${a}</button>`).join('')}</div></div>
          <p class="small" style="color:var(--bad);min-height:18px">${esc(err)}</p>
          <button class="btn block">${af() ? 'Begin! 🚀' : 'Start! 🚀'}</button>
        </form>` : '<button class="btn ghost block" data-shownew>➕ Ik ben nieuw · Ek is nuut</button>'}
      <a href="#/overzicht" class="small muted" style="text-align:center;margin-top:10px">👨‍🏫 Ouder of leerkracht? · Ouer of onderwyser? → overzicht</a>
    </div>`;
    $app.querySelectorAll('[data-kid]').forEach((b) => (b.onclick = async () => { await api('/api/kids/select', { id: Number(b.dataset.kid) }); location.hash = '#/'; route(); }));
    $app.querySelector('[data-shownew]')?.addEventListener('click', () => draw('', true));
    // land/taal kiezen tekent het formulier opnieuw (graad/groep en taal van de labels passen zich aan); naam blijft staan
    const keep = () => { const f = $app.querySelector('[data-new]'); if (f) { prof.name = f.name.value; prof.grade = f.grade.value; prof.age = f.age.value; } };
    const redraw = () => { draw('', true); const f = $app.querySelector('[data-new]'); if (f && prof.name) f.name.value = prof.name; };
    $app.querySelectorAll('[data-country]').forEach((b) => (b.onclick = () => { keep(); prof.country = b.dataset.country; prof.lang = prof.country === 'ZA' ? 'af' : 'nl'; if (!gradeOpts().includes(Number(prof.grade))) prof.grade = ''; redraw(); }));
    $app.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => { keep(); prof.lang = b.dataset.lang; redraw(); }));
    $app.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => { avatar = b.dataset.av; $app.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('sel', x === b)); }));
    const form = $app.querySelector('[data-new]');
    if (form) {
      form.querySelector('input').focus();
      form.onsubmit = (e) => {
        e.preventDefault();
        keep();
        if (String(prof.name || '').trim().length < 2) return draw(af() ? 'Wat is jou naam? (minstens 2 letters)' : 'Hoe heet je? (minstens 2 letters)', true);
        parentSetup();
      };
    }
  };
  // Stap 2: voor de ouders (alles optioneel; later aan te passen in het ouderscherm, achter het wachtwoord)
  const parentSetup = (err = '') => {
    const za = prof.country === 'ZA', tr = (nl, a) => (af() ? a : nl);
    const cfg = { dailyCents: 50, intakeCents: 100, weekBonusCents: 25, dailyCount: 20, days: [1, 2, 3, 4, 5], ...(prof.setup || {}) };
    $app.innerHTML = `<form class="stack" style="margin-top:3vh" data-setup>
      <div style="text-align:center"><div class="big-emoji">👨‍👩‍👧</div><h1 style="margin-top:6px">${tr('Voor papa of mama', 'Vir pa of ma')}</h1>
        <p class="muted">${tr(`Stel samen in hoe ${esc(prof.name)} beloond wordt. Alles is optioneel en later te veranderen in het ouderscherm (achter je wachtwoord).`, `Stel saam in hoe ${esc(prof.name)} beloon word. Alles is opsioneel en later te verander in die ouerskerm (agter jou wagwoord).`)}</p></div>
      <div class="card stack"><h3>🪙 ${tr('Beloning en weekplan', 'Beloning en weekplan')}</h3>${rewardFields(cfg, { tr, za, af: af() })}</div>
      <div class="card stack"><h3>🎁 ${tr('Verrassingen en cadeautjes', 'Verrassings en geskenkies')}</h3>
        <p class="small muted">${tr('Eén keer per week, op een willekeurige dag, als de dagtaak goed ging. Een bedrag ("1 euro", "R10") gaat vanzelf in de spaarpot; de rest geef je zelf.', 'Een keer per week, op ’n lukrake dag, as die dagtaak goed gegaan het. ’n Bedrag ("R10", "1 euro") gaan vanself in die spaarvarkie; die res gee jy self.')}</p>
        <label class="row"><input type="checkbox" name="surprise" ${prof.surpriseOn === false ? '' : 'checked'}> <span>${tr('Aan', 'Aan')}</span></label>
        <label class="field"><span class="small" style="font-weight:800">${tr('Eén per regel', 'Een per reël')}</span><textarea name="rewards" rows="4">${esc((prof.rewards || DEFAULT_SURPRISES(af(), za)).join('\n'))}</textarea></label></div>
      <div class="card stack"><h3>🔒 ${tr('Ouderwachtwoord', 'Ouerwagwoord')}</h3>
        <p class="small muted">${tr('Beschermt het ouderscherm: beloning, uitbetalen en instellingen. Minstens 4 tekens. Leeg laten mag (dan geldt de pincode van de beheerder).', 'Beskerm die ouerskerm: beloning, uitbetaal en instellings. Minstens 4 tekens. Leeg laat mag (dan geld die PIN-kode van die beheerder).')}</p>
        <input type="password" name="pw" autocomplete="new-password" placeholder="${tr('wachtwoord', 'wagwoord')}">
        <input type="password" name="pw2" autocomplete="new-password" placeholder="${tr('nog een keer', 'nog ’n keer')}"></div>
      <div class="card stack"><h3>📊 ${tr('Help de app verbeteren', 'Help om die app te verbeter')}</h3>
        <p class="small muted">${tr('Antwoorden en gesprekken met de AI-leraar worden zonder naam bewaard (met een schuilnaam), zodat we de uitleg kunnen verbeteren. Later uit te zetten in het ouderscherm.', 'Antwoorde en gesprekke met die KI-onderwyser word sonder naam gestoor (met ’n skuilnaam), sodat ons die verduidelikings kan verbeter. Later af te skakel in die ouerskerm.')}</p>
        <label class="row"><input type="checkbox" name="research" ${prof.research === false ? '' : 'checked'}> <span>${tr('Meehelpen (aanbevolen)', 'Help (aanbeveel)')}</span></label></div>
      <p class="small" style="color:var(--bad);min-height:18px;text-align:center">${esc(err)}</p>
      <button class="btn block">${tr('Opslaan en beginnen 🚀', 'Stoor en begin 🚀')}</button>
      <button type="button" class="btn ghost block" data-skip>${tr('Overslaan (standaard gebruiken)', 'Slaan oor (gebruik die standaard)')}</button>
      <button type="button" class="btn ghost block" data-back>‹ ${tr('Terug', 'Terug')}</button>
    </form>`;
    const f = $app.querySelector('[data-setup]');
    const get = bindRewardFields(f, cfg, { tr, za });
    const create = async (setup) => {
      try {
        await api('/api/kids', { name: prof.name, avatar, country: prof.country, lang: prof.lang, grade: prof.grade, age: prof.age, setup });
        location.hash = '#/'; route();
      } catch (er) { if (/naam|name|heet|groep|graad|oud|land/i.test(er.message)) draw(er.message, true); else parentSetup(er.message); }
    };
    f.onsubmit = (e) => {
      e.preventDefault();
      let r;
      try { r = get(); } catch (er) { return parentSetup(er.message); }
      prof.setup = r; prof.surpriseOn = f.surprise.checked; prof.research = f.research.checked; prof.rewards = f.rewards.value.split('\n').map((x) => x.trim()).filter(Boolean);
      if (f.pw.value && f.pw.value.length < 4) return parentSetup(tr('Het wachtwoord moet minstens 4 tekens hebben.', 'Die wagwoord moet minstens 4 tekens hê.'));
      if (f.pw.value !== f.pw2.value) return parentSetup(tr('De twee wachtwoorden zijn niet hetzelfde.', 'Die twee wagwoorde is nie dieselfde nie.'));
      create({ ...r, password: f.pw.value || undefined, surprise: { enabled: f.surprise.checked, rewards: prof.rewards }, research: f.research.checked });
    };
    f.querySelector('[data-skip]').onclick = () => create(f.research.checked ? null : { research: false });
    f.querySelector('[data-back]').onclick = () => { draw('', true); const ff = $app.querySelector('[data-new]'); if (ff) ff.name.value = prof.name || ''; };
  };
  draw();
}
async function switchKid() {
  await api('/api/kids/leave', {});
  STATE = null;
  renderWho();
}

// ---------- beloning & weekplan (eerste keer instellen én ouderscherm) ----------
// tr(nl, af) kiest de taal; bij het aanmaken is de taal nog niet ingesteld, daarom geen t() hier.
const WEEKDAYS = { nl: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'], af: ['So', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa'] };
const money2 = (c) => (c / 100).toFixed(2).replace('.', ',');
const parseMoney = (v) => { const x = String(v || '').replace(/[R€\s]/g, '').replace(',', '.'); if (x === '') return 0; const n = Number(x); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN; };
const DEFAULT_SURPRISES = (af, za) => (af
  ? ['🍬 ’n Ekstra lekkertjie', '🎮 ’n Halfuur ekstra speeltyd', za ? '💶 R10 ekstra' : '💶 1 euro ekstra', '🎁 ’n Klein geskenkie']
  : ['🍬 Een extra snoepje', '🎮 Een half uur extra gametijd', za ? '💶 R10 extra' : '💶 1 euro extra', '🎁 Een klein cadeautje']);
function rewardFields(cfg, { tr, za, af, counts = [10, 15, 20, 25, 30] }) {
  const sym = za ? 'R' : '€';
  const money = (name, label, c, help) => `<label class="field"><span style="font-weight:800">${label}</span>
    <div class="money-in"><span>${sym}</span><input name="${name}" inputmode="decimal" value="${money2(c)}" autocomplete="off"></div>${help ? `<span class="small muted">${help}</span>` : ''}</label>`;
  return `${money('daily', tr('Beloning per afgemaakte dagtaak', 'Beloning per voltooide dagtaak'), cfg.dailyCents, tr('Voor de moeite: als de dagtaak af is, hoeveel goed of fout er ook was. Afgeraffelde sommen komen terug, dus snel klikken loont niet. 0 = zonder geld (dan alleen badges en verrassingen).', 'Vir die moeite: as die dagtaak klaar is, maak nie saak hoeveel reg of verkeerd nie. Somme wat afgeraffel word, kom terug, so vinnig klik help nie. 0 = sonder geld (dan net kentekens en verrassings).'))}
    <div class="row" style="gap:10px;align-items:flex-start">
      <div style="flex:1">${money('intake', tr('Starttoets af', 'Begintoets klaar'), cfg.intakeCents)}</div>
      <div style="flex:1">${money('week', tr('Weekbonus', 'Weekbonus'), cfg.weekBonusCents)}</div></div>
    <label class="field"><span style="font-weight:800">${tr('Sommen per dagtaak', 'Somme per dagtaak')}</span>
      <select name="count">${counts.map((n) => `<option value="${n}" ${n === cfg.dailyCount ? 'selected' : ''}>${n} ${tr('sommen', 'somme')} (± ${n} min)</option>`).join('')}</select></label>
    <div><div style="font-weight:800;margin-bottom:6px">${tr('Op welke dagen is er een dagtaak?', 'Op watter dae is daar ’n dagtaak?')}</div>
      <div class="seg days">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button type="button" class="${cfg.days.includes(d) ? 'sel' : ''}" data-day="${d}">${WEEKDAYS[af ? 'af' : 'nl'][d]}</button>`).join('')}</div></div>
    <p class="small" style="font-weight:800" data-perweek></p>
    <label class="field"><span style="font-weight:800">${tr('Cadeau als je kind een eigen oefendoel haalt (optioneel)', 'Geskenk as jou kind ’n eie oefendoel haal (opsioneel)')}</span>
      <input name="goalGift" maxlength="60" value="${esc(cfg.goalGift || '')}" placeholder="${tr('bijv. 🍦 een ijsje samen halen', 'bv. 🍦 saam ’n roomys gaan koop')}" autocomplete="off">
      <span class="small muted">${tr('Kinderen kiezen zelf een onderwerp en doel. Oefenen levert geen geld op; het doel halen geeft eer, een feestje en dit cadeau.', 'Kinders kies self ’n onderwerp en doel. Oefen verdien nie geld nie; die doel haal gee eer, ’n partytjie en hierdie geskenk.')}</span></label>`;
}
// Koppelt de knoppen; geeft een functie terug die de ingevulde waarden ophaalt (of een foutmelding gooit).
function bindRewardFields(root, cfg, { tr, za }) {
  const days = new Set(cfg.days);
  const sym = (c) => (za ? 'R' : '€ ') + money2(c);
  const read = () => ({ dailyCents: parseMoney(root.querySelector('[name=daily]').value), intakeCents: parseMoney(root.querySelector('[name=intake]').value),
    weekBonusCents: parseMoney(root.querySelector('[name=week]').value), dailyCount: Number(root.querySelector('[name=count]').value), days: [...days],
    goalGift: root.querySelector('[name=goalGift]')?.value ?? '' });
  const upd = () => {
    const r = read(), el = root.querySelector('[data-perweek]');
    if (!el) return;
    el.textContent = !days.size ? tr('Kies minstens één dag.', 'Kies minstens een dag.')
      : tr(`= ${r.dailyCount * days.size} sommen per week (${days.size} ${days.size === 1 ? 'dag' : 'dagen'})`, `= ${r.dailyCount * days.size} somme per week (${days.size} ${days.size === 1 ? 'dag' : 'dae'})`)
        + (r.dailyCents > 0 && !Number.isNaN(r.dailyCents) ? tr(`, samen max. ${sym(r.dailyCents * days.size + (r.weekBonusCents || 0))} per week.`, `, saam maks. ${sym(r.dailyCents * days.size + (r.weekBonusCents || 0))} per week.`) : '.');
  };
  root.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => { const d = Number(b.dataset.day); days.has(d) ? days.delete(d) : days.add(d); b.classList.toggle('sel', days.has(d)); upd(); }));
  root.querySelectorAll('[name=daily],[name=intake],[name=week],[name=count]').forEach((x) => x.addEventListener('input', upd));
  upd();
  return () => {
    const r = read();
    if ([r.dailyCents, r.intakeCents, r.weekBonusCents].some((v) => Number.isNaN(v))) throw new Error(tr('Vul bedragen in als getal, bijv. 0,50.', 'Vul bedrae in as ’n getal, bv. 0,50.'));
    if (!r.days.length) throw new Error(tr('Kies minstens één dag.', 'Kies minstens een dag.'));
    return r;
  };
}
// Wachtwoordscherm voor ouders (tekst, geen cijfertoetsen: het mag ook een woord zijn)
function pwScreen(title, hint, onDone) {
  const draw = (err = '') => {
    $app.innerHTML = `<div class="stack" style="margin-top:8vh"><form class="card stack" style="text-align:center" data-pw>
      <div class="big-emoji">🔒</div><h2 style="margin-top:8px">${esc(title)}</h2>
      <input type="password" name="pw" autocomplete="current-password" style="text-align:center;font-size:20px" required>
      <p class="small muted">${esc(hint)}</p>
      <p class="small" style="color:var(--bad);min-height:20px">${esc(err)}</p>
      <button class="btn block">OK</button></form></div>`;
    const f = $app.querySelector('[data-pw]');
    f.pw.focus();
    f.onsubmit = async (e) => { e.preventDefault(); try { await onDone(f.pw.value); } catch (er) { draw(er.message); } };
  };
  draw();
}

// ---------- login (alleen als APP_PIN aan staat) ----------
function renderLogin() {
  $tabs.hidden = true;
  pinScreen(t('Hoi! Wat is je pincode?'), async (pin) => { await api('/api/login', { pin }); route(); });
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
  await loadState();
  const s = STATE;
  const d = s.today.daily;
  let main = '';
  if (!s.intakeDone) {
    main = `<div class="card hero stack">
      <div class="big-emoji">🚀</div>
      <div><div class="task-title">${t('Starttoets')}</div>
      <p>${s.intakeActive ? t('Je bent al begonnen. Ga verder waar je was!') : t('Eerst kijken wat je al kunt: {n} sommen uit alle onderdelen (ongeveer een kwartiertje). Daarna leert de app je steeds beter kennen en krijg je sommen die bij jou passen. Je kunt tussendoor stoppen.', { n: s.points.intakeCount })}</p></div>
      ${s.points.intake > 0 ? `<div class="row"><span class="chip coin">🪙 ${t('{n} {c} als je hem afmaakt', { n: s.points.intake, c: CENT() })}</span></div>` : ''}
      <button class="btn light block" data-start="intake">${s.intakeActive ? t('Verder met de starttoets') : t('Start de starttoets')}</button>
      <p class="small muted">${t('Weet je iets niet? Geen probleem, druk op "Weet ik niet". Dan weten wij wat we gaan oefenen.')}</p></div>`;
  } else if (!s.today.schoolDay) {
    main = `<div class="card hero stack"><div class="big-emoji">🌴</div>
      <div><div class="task-title">${t('Vrij!')}</div><p>${s.points.daily > 0 ? t('Geen dagtaak vandaag. {d} weer {n} sommen voor {p} {c}.', { d: s.today.nextDay || '', n: s.points.dailyCount, p: s.points.daily, c: CENT() }) : t('Geen dagtaak vandaag. {d} weer {n} sommen.', { d: s.today.nextDay || '', n: s.points.dailyCount })}</p></div>
      ${aheadBtn(s)}
      <button class="btn light block" data-start="practice">${t('Toch even oefenen')}</button></div>`;
  } else if (!d || d.status === 'active') {
    main = `<div class="card hero stack"><div class="big-emoji">✏️</div>
      <div><div class="task-title">${t('Dagtaak')}</div><p>${d ? t('Je hebt er al {a} van de {n} gedaan. Ga verder!', { a: d.answered, n: d.total }) : t('{n} sommen, vooral van onderdelen waar je nog beter in kunt worden.', { n: s.points.dailyCount })}</p></div>
      <div class="row">${s.points.daily > 0 ? `<span class="chip coin">🪙 ${t('{n} {c} als je hem afmaakt', { n: s.points.daily, c: CENT() })}</span>` : ''}<span class="chip" style="background:rgba(255,255,255,.2);color:inherit">± ${s.points.dailyCount} min</span></div>
      ${d ? `<div class="progress light"><i style="width:${(d.answered / d.total) * 100}%"></i></div>` : ''}
      <p class="small" style="opacity:.85">🐢 ${t('Rustig werken is sneller klaar: sommen die je afraffelt, komen aan het eind terug.')}</p>
      <button class="btn light block" data-start="daily">${d ? t('Verder') : t('Start dagtaak')}</button></div>`;
  } else {
    main = `<div class="card hero stack"><div class="big-emoji">🎉</div>
      <div><div class="task-title">${t('Dagtaak klaar!')}</div><p>${t('{a} van de {n} goed — je verdiende <b>{p} {c}</b>.', { a: d.correct, n: d.total, p: d.points, c: CENT() })}</p></div>
      ${aheadBtn(s)}
      <button class="btn ${s.ahead && s.ahead.status !== 'done' ? 'ghost-light' : 'light'} block" data-start="practice">${t('Extra oefenen (zonder centen)')}</button></div>`;
  }

  const stuck = s.intakeDone ? s.skills.filter((x) => x.struggling) : [];
  const coach = stuck.length ? `<div class="card stack"><div class="row"><span class="big-emoji" style="font-size:32px">🧑‍🏫</span>
      <div><h3>${s.ai ? t('Even opfrissen met {m}', { m: esc(s.teacher) }) : t('Even opfrissen')}</h3><p class="small muted">${s.ai ? t('Een korte les: uitleg, een voorbeeld en een paar vragen. Daarna oefenen.') : t('Hier gaan we extra mee aan de slag. Lees de uitleg en oefen dan.')}</p></div></div>
      ${stuck.slice(0, 3).map((x) => `<button class="btn ghost block" data-coach="${x.cat}">${x.icon} ${s.ai ? t('Les: ') : ''}${esc(x.label)}</button>`).join('')}</div>` : '';

  const earned = s.badges.filter((b) => b.earned);
  const badgesCard = earned.length ? `<a href="#/voortgang" class="card row between" style="text-decoration:none;color:inherit"><div><div class="small muted">${t('Badges')}</div><div style="font-size:26px;letter-spacing:2px">${earned.slice(-8).map((b) => b.icon).join('')}</div></div><span class="muted">${earned.length}/${s.badges.length} ›</span></a>` : '';

  const top = s.intakeDone ? `<div class="card maxnote">${maxHead(`<a href="#/voortgang" class="small">${t('Alles')} ›</a>`)}<div class="maxnote-body" data-kidnote></div></div>` : '';

  $app.innerHTML = `<div class="stack">
    <div class="hello"><div><h1>${t('Hoi')} ${esc(s.name)} ${esc(s.kid?.avatar || '👋')}</h1><p class="muted small" style="margin-top:2px">${pick(L(SUBLINES, SUBLINES_AF))}</p></div>
      <div class="row" style="gap:6px">${s.streak ? `<div class="streak" title="${t('Schooldagen op rij')}">🔥 ${s.streak}</div>` : ''}<button class="switch-kid" data-switch title="${t('Ander kind')}">👤</button></div></div>
    ${main}
    ${piggyCard(s)}
    ${s.intakeDone ? weekCard(s) : ''}
    ${s.intakeDone ? goalsCard(s) : ''}
    ${coach}${badgesCard}${top}
    ${mopCard()}
  </div>`;
  bindStart();
  bindGoals();
  loadKidNote($app.querySelector('[data-kidnote]'));
  $app.querySelector('[data-switch]').onclick = async () => { if (await ask(`<div class="big-emoji">👤</div><h2>${t('Ben jij niet {n}?', { n: esc(s.name) })}</h2><p class="muted">${t('Dan kies je je eigen naam.')}</p>`, t('Ander kind kiezen'), t('Ik ben het wel'))) switchKid(); };
  $app.querySelector('[data-mop]')?.addEventListener('click', (e) => { const el = e.currentTarget.querySelector('.punch'); el.hidden = !el.hidden; });
  $app.querySelectorAll('[data-coach]').forEach((b) => (b.onclick = () => showCoach(b.dataset.coach)));
}
const DAG = (dow) => WEEKDAYS[LANG === 'af' ? 'af' : 'nl'][dow];

// ---------- zelf oefenen: kies een onderwerp en (als je wilt) een doel ----------
// Doelen zonder groepen/graden: "een stapje beter" of "er een kei in worden". Het kind ziet voetstapjes.
const steps = (g) => `<span class="steps-trail" title="${g.done}/${g.total}">${Array.from({ length: g.total }, (_, i) => `<span class="${i < g.done ? 'on' : ''}">👣</span>`).join('')}<span class="flag">${g.kind === 'kei' ? '🏆' : '⭐'}</span></span>`;
const goalText = (g) => (g.kind === 'kei' ? t('Er een kei in worden') : t('Een stapje beter worden'));
function goalsCard(s) {
  const goals = s.goals || [];
  return `<div class="card stack"><div class="row between"><h3>🎯 ${t('Zelf oefenen')}</h3><span class="small muted">${t('zo vaak je wilt')}</span></div>
    ${goals.map((g) => `<div class="goal-row"><div><div style="font-weight:800">${g.icon} ${esc(g.label)}</div><div class="small muted">${goalText(g)}</div>${steps(g)}</div>
      <button class="btn ghost" data-train="${g.cat}">${t('Verder')}</button></div>`).join('')}
    <button class="btn ghost block" data-pick>${goals.length ? t('Ander onderwerp kiezen') : t('Kies een onderwerp')}</button></div>`;
}
function bindGoals(root = $app) {
  root.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = pickTopic));
  root.querySelectorAll('[data-train]').forEach((b) => (b.onclick = () => startSession('practice', b.dataset.train, { fresh: true })));
}
function pickTopic() {
  sheet(`<div class="row between"><h2>🎯 ${t('Waar wil je mee oefenen?')}</h2><button class="btn ghost" data-close>${t('Sluiten')}</button></div>
    <div class="topic-grid">${(STATE.skills || []).map((x) => `<button class="topic" data-topic="${x.cat}"><span>${x.icon}</span>${esc(x.label)}</button>`).join('')}</div>`, (bg, close) => {
    bg.querySelectorAll('[data-topic]').forEach((b) => (b.onclick = () => { close(); chooseGoal(b.dataset.topic); }));
  });
}
function chooseGoal(cat) {
  const x = (STATE.skills || []).find((k) => k.cat === cat);
  const cur = (STATE.goals || []).find((g) => g.cat === cat);
  const gift = STATE.goalGift;
  sheet(`<div class="row between"><h2>${x?.icon || ''} ${esc(x?.label || '')}</h2><button class="btn ghost" data-close>${t('Sluiten')}</button></div>
    <p style="font-weight:800">${t('Wat wil je bereiken?')}</p>
    ${cur ? `<p class="small muted">${t('Je doel nu: {d}', { d: goalText(cur) })} ${steps(cur)}</p>` : ''}
    <div class="stack">
      <button class="choice-big" data-goal="oefen"><span>🌱 ${t('Gewoon even oefenen')}</span><small>${t('10 sommen, zonder doel')}</small></button>
      <button class="choice-big good" data-goal="stap"><span>⭐ ${t('Een stapje beter worden')}</span><small>${t('oefen tot je een stapje verder bent')}</small></button>
      <button class="choice-big" data-goal="kei"><span>🏆 ${t('Er een kei in worden')}</span><small>${t('dat kost even tijd: oefen zo vaak je wilt')}</small></button>
    </div>
    ${gift ? `<p class="small" style="margin-top:10px">🎁 ${t('Haal je een doel? Dan heeft papa of mama een cadeau voor je: {g}', { g: esc(gift) })}</p>` : ''}
    <p class="small muted" style="margin-top:6px">${t('Oefenen gaat in rondes van 10 sommen. Na elke ronde kun je doorgaan of stoppen.')}</p>`, (bg, close) => {
    bg.querySelectorAll('[data-goal]').forEach((b) => (b.onclick = () => { close(); startSession('practice', cat, { goal: b.dataset.goal, fresh: true }); }));
  });
}
function celebrateGoal(g) {
  confetti();
  setTimeout(confetti, 700);
  sheet(`<div style="text-align:center"><div class="big-emoji">🏅</div><h2 style="margin:8px 0">${t('Doel bereikt!')}</h2>
    <p>${g.kind === 'kei' ? t('Je bent een kei in <b>{o}</b>! Dat heb je helemaal zelf bereikt.', { o: esc(g.label) }) : t('Je bent een stapje beter in <b>{o}</b>! Dat heb je helemaal zelf bereikt.', { o: esc(g.label) })}</p>
    ${g.gift ? `<div class="card coin" style="margin-top:10px">🎁 ${t('Vraag papa of mama om je cadeau: <b>{g}</b>', { g: esc(g.gift) })}</div>` : ''}
    <p class="muted" style="margin-top:8px">${t('Laat dit scherm aan papa of mama zien! 📱')}</p></div>
    <button class="btn good block" data-close>${t('Ja!! 🙌')}</button>`);
}

// Voortgang voor het kind: alleen de woorden van Max (waar je goed in bent, waar we nog mee oefenen, een
// aanmoediging). Balken, scores en niveaus zijn alleen voor de ouder (ouderscherm).
const andList = (arr) => (arr.length <= 1 ? arr[0] || '' : `${arr.slice(0, -1).join(', ')} ${t('en')} ${arr.at(-1)}`);
function kidNoteText(v) {
  if (v.text) return v.text;
  const g = v.strong.map((x) => x.label.toLowerCase()), p = v.practice.map((x) => x.label.toLowerCase());
  return [g.length ? t('Je bent goed in {a}. Daar mag je trots op zijn!', { a: andList(g) }) : t('Je bent goed bezig: elke som maakt je sterker.'),
    p.length ? t('We gaan nog samen oefenen met {b}. Stap voor stap wordt dat ook makkelijker.', { b: andList(p) }) : '', '💪'].filter(Boolean).join(' ');
}
function kidNoteHTML(v) {
  const chips = (arr) => `<div class="kid-chips">${arr.map((x) => `<a class="kid-chip" href="#/voortgang/${x.cat}"><span>${x.icon}</span>${esc(x.label)}</a>`).join('')}</div>`;
  return `<div class="maxnote-bubble">${rich(kidNoteText(v)).replace(/\n/g, '<br>')}</div>
    ${v.strong.length ? `<div class="kid-sec good"><div class="kid-sec-h">${t('Hier ben je goed in 💪')}</div>${chips(v.strong)}</div>` : ''}
    ${v.practice.length ? `<div class="kid-sec grow"><div class="kid-sec-h">${t('Hier gaan we nog mee oefenen 🌱')}</div>${chips(v.practice)}</div>` : ''}`;
}
// kop van de kaart "Max zegt": ronde avatar met naam, optioneel een link rechts
const maxHead = (link = '') => `<div class="maxnote-head"><span class="max-av">🧑‍🏫</span><div style="flex:1"><div class="maxnote-name">${esc(STATE?.teacher || 'Meester Max')}</div></div>${link}</div>`;
async function loadKidNote(el) {
  if (!el) return;
  el.innerHTML = `<div class="maxnote-bubble muted"><span class="loader"></span></div>`;
  try { el.innerHTML = kidNoteHTML(await api('/api/kid/voortgang')); } catch { el.innerHTML = ''; }
}
function aheadBtn(s) {
  const a = s.ahead;
  if (!a) return '';
  if (a.status === 'done') return `<p class="small">✅ ${t('De dagtaak van {d} is ook al klaar. Lekker bezig!', { d: esc(a.name) })}</p>`;
  if (a.status === 'active') return `<button class="btn light block" data-ahead>⏩ ${t('Verder met {d}', { d: esc(a.name) })} (${a.answered}/${s.points.dailyCount})</button>`;
  return `<button class="btn light block" data-ahead>⏩ ${t('Werk vooruit: maak {d} alvast', { d: esc(a.name) })}</button>`;
}
function mopCard() {
  const [vraag, clou] = mop();
  return `<button class="card mop" data-mop style="text-align:left;width:100%"><div class="small muted">😂 ${t('Rekenmop van de dag (tik voor het antwoord)')}</div><div style="font-weight:800;margin-top:4px">${esc(vraag)}</div><div class="punch" hidden>${esc(clou)}</div></button>`;
}
function piggyCard(s) {
  const g = s.goal;
  if (!g) return `<a href="#/spaarpot" class="card coin row between" style="text-decoration:none;color:inherit"><div class="row"><span class="big-emoji" style="font-size:34px">🐷</span><div><div class="small muted">${t('In je spaarpot')}</div><div class="money" style="font-size:24px">${euro(s.wallet.balance)}</div></div></div><span class="small" style="font-weight:800;color:var(--primary)">🎯 ${t('Kies een doel ›')}</span></a>`;
  const pct = Math.min(100, (s.wallet.balance / g.cents) * 100);
  return `<a href="#/spaarpot" class="card coin stack" style="text-decoration:none;color:inherit;gap:8px">
    <div class="row between"><div class="row"><span class="big-emoji" style="font-size:30px">${g.reached ? '🎉' : '🎯'}</span><div><div class="small muted">${t('Ik spaar voor')}</div><b style="font-size:18px">${esc(g.name)}</b></div></div><div style="text-align:right"><div class="money" style="font-size:20px">${euro(s.wallet.balance)}</div><div class="small muted">${t('van {b}', { b: euro(g.cents) })}</div></div></div>
    <div class="goal-bar"><i style="width:${pct}%"></i></div>
    <div class="small" style="font-weight:800">${g.reached ? t('Doel gehaald! Laat het aan papa of mama zien. 🥳') : (STATE?.points?.daily > 0 ? t('Nog {b} — dat is ongeveer {n} dagtaken.', { b: euro(g.left), n: Math.ceil(g.left / Math.max(1, STATE.points.daily * 0.8)) }) : t('Nog {b} te gaan.', { b: euro(g.left) }).replace(/<\/?b>/g, ''))}</div></a>`;
}
function weekCard(s) {
  const w = s.week;
  if (!w || !w.bonus) return '';
  return `<div class="card row between"><div><div style="font-weight:900">📅 ${t('Weekbonus +{n} {c}', { n: w.bonus, c: CENT() })}</div><div class="small muted">${w.given ? t('Gehaald deze week! 🎉') : t('Maak alle {n} dagtaken van deze week af.', { n: w.days.length })}</div></div>
    <div class="week">${w.days.map((d, i) => `<span class="${d.done ? 'on' : ''} ${d.today ? 'today' : ''}" title="${d.day}">${d.done ? '✓' : DAG(d.dow ?? i + 1)}</span>`).join('')}</div></div>`;
}
const sc = (score) => (score >= 85 ? 3 : score >= 60 ? 2 : score >= 35 ? 1 : 0);
function bindStart() {
  $app.querySelectorAll('[data-start]').forEach((b) => (b.onclick = () => startSession(b.dataset.start, b.dataset.cat)));
  $app.querySelectorAll('[data-ahead]').forEach((b) => (b.onclick = () => startSession('daily', null, { ahead: true })));
}
function askGroep() {
  return new Promise((resolve) => {
    const za = STATE?.gradeWord === 'graad';
    sheet(`<div style="text-align:center"><div class="big-emoji">🎒</div><h2 style="margin:8px 0">${za ? t('In welke graad zit je?') : t('In welke groep zit je?')}</h2>
      <p class="muted">${t('We beginnen lekker rustig. Gaat het goed? Dan worden de sommen vanzelf moeilijker. 🚀')}</p></div>
      <div class="groep-pick">${(za ? [3, 4, 5, 6, 7] : [4, 5, 6, 7, 8]).map((g) => `<button class="choice" data-g="${g}">${g}</button>`).join('')}</div>
      <button class="btn ghost block" data-close>${t('Toch niet')}</button>`, (bg, close) => {
      bg.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { close(); resolve(Number(b.dataset.g)); }));
      bg.querySelector('[data-close]').addEventListener('click', () => resolve(null));
    });
  });
}
async function startSession(kind, cat, extra = {}) {
  const btn = document.activeElement;
  const busy = STATE?.ai && (kind === 'daily' || (kind === 'practice' && !cat));
  if (busy && btn?.classList?.contains('btn')) { btn.disabled = true; btn.innerHTML = `<span class="loader"></span> ${t('{m} maakt je lesplan…', { m: esc(STATE.teacher) })}`; }
  try {
    let groep;
    if (kind === 'intake' && !STATE?.intakeActive) {
      groep = STATE?.kid?.grade || await askGroep();
      if (!groep) return;
    }
    const data = await api('/api/session/start', { kind, cat, groep, ...extra });
    SESSION_CACHE = data;
    location.hash = `#/sessie/${data.id}`;
  } catch (e) {
    if (e.message === 'login') return;
    toast(e.message);
    if (busy && btn?.isConnected) route(); // knop weer bruikbaar maken
  }
}

// Korte interactieve les van de leraar. Zonder AI: vaste uitleg.
async function showCoach(cat, intro = '') {
  if (!STATE) await loadState();
  const meta = STATE.skills.find((x) => x.cat === cat);
  const inSession = location.hash.startsWith('#/sessie');
  const Lz = { chat: [], busy: false, ready: false };
  sheet(`<div class="row between"><h2>${meta?.icon || ''} ${esc(meta?.label || '')}</h2><button class="btn ghost" data-close>${t('Sluiten')}</button></div>
    ${intro ? `<p>${intro}</p>` : ''}
    ${STATE.ai ? '<div id="lesson"></div>' : `<div class="card flat"><b>${t('Zo pak je het aan')}</b>${tipHTML(cat)}</div>`}
    <div id="lesson-end">${!STATE.ai ? (inSession ? `<button class="btn block" data-close>${t('Snap ik, verder!')}</button>` : `<button class="btn block" data-practice>${t('Oefen dit onderdeel')}</button>`) : ''}</div>`,
  (bg, close) => {
    const box = bg.querySelector('#lesson');
    const end = bg.querySelector('#lesson-end');
    const bindEnd = () => {
      bg.querySelector('[data-practice]')?.addEventListener('click', () => { close(); startSession('practice', cat); });
    };
    bindEnd();
    if (!box) return;
    const draw = () => {
      box.innerHTML = teacherHTML(Lz.chat, {
        loading: Lz.busy,
        quick: Lz.ready ? [] : [t('Ik snap het nog niet 🤔'), t('Geef nog een voorbeeld'), t('Kan het makkelijker?')],
        placeholder: t('Typ je antwoord of vraag…'),
        intro: Lz.chat.length ? null : t('Even een korte les, dan gaan we oefenen!'),
        feedback: true,
      });
      bindTeacher(box, (msg) => send(msg), { ctx: () => ({ kind: 'lesson', cat }), chat: Lz.chat, redraw: draw });
      box.querySelector('.t-msgs')?.lastElementChild?.scrollIntoView({ block: 'nearest' });
      if (Lz.ready || Lz.chat.length >= 2) {
        end.innerHTML = inSession ? `<button class="btn ${Lz.ready ? 'good' : 'ghost'} block" data-close>${Lz.ready ? t('Ik ben er klaar voor! 🚀') : t('Verder met de sommen')}</button>`
          : `<button class="btn ${Lz.ready ? 'good' : 'ghost'} block" data-practice>${Lz.ready ? t('Ik ben klaar om te oefenen! 🚀') : t('Oefen dit onderdeel')}</button>`;
        bindEnd();
      }
    };
    const send = async (msg) => {
      if (Lz.busy) return;
      if (msg) Lz.chat.push({ role: 'kid', text: msg });
      Lz.busy = true; draw();
      try {
        const r = await api('/api/lesson', { cat, chat: Lz.chat });
        if (r.reply) { Lz.chat.push({ role: 'teacher', text: r.reply }); Lz.ready = r.ready; }
        else Lz.chat.push({ role: 'teacher', text: r.reason || tipText(cat) });
      } catch (e) { Lz.chat.push({ role: 'teacher', text: e.message }); }
      Lz.busy = false; draw();
    };
    send(null);
  });
}

// Lesplan van Max: per onderdeel niveau, aantal sommen en een woordje
function showPlan(coach, stuck = []) {
  const lesson = (stuck || []).find((c) => coach.items.some((i) => i.cat === c));
  sheet(`<div class="t-msg t" style="margin-bottom:4px"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(coach.message || t('Klaar voor vandaag?'))}</div></div>
    <h3>${t('Jouw plan voor vandaag')}</h3>
    <div class="plan">${coach.items.map((i) => `<div class="plan-row"><span class="ico">${i.icon}</span>
      <div><div class="row between"><b>${esc(i.label)}</b><span class="chip">${i.count}×</span></div>
      ${i.note ? `<div class="small muted">${esc(i.note)}</div>` : ''}</div></div>`).join('')}</div>
    ${lesson ? `<button class="btn ghost block" data-lesson="${lesson}">🧑‍🏫 ${t('Eerst een korte les over {o}', { o: esc(coach.items.find((i) => i.cat === lesson)?.label || '') })}</button>` : ''}
    <button class="btn good block" data-close>${t("Aan de slag! 🚀")}</button>`, (bg, close) => {
    bg.querySelector('[data-lesson]')?.addEventListener('click', (e) => { close(); showCoach(e.currentTarget.dataset.lesson); });
  });
}

// ---------- feedback op een uitleg (helpt de AI-leraar verbeteren) ----------
const FB = new Map(); // per uitleg: { done } of { ask } (blijft staan na hertekenen)
const FB_REASONS = () => [t('Snap ik niet'), t('Te lang'), t('Klopt niet'), t('Te makkelijk')];
function fbHTML(i, text) {
  const f = FB.get(text);
  if (f?.done) return `<div class="fb small muted">${t('Bedankt! 🙏')}</div>`;
  if (f?.ask) return `<div class="fb fb-ask" data-fbask="${i}"><span class="small muted">${t('Wat ging er mis?')}</span>
    <div class="fb">${FB_REASONS().map((r) => `<button type="button" class="chip ${f.sel?.has(r) ? 'sel' : ''}" data-fbr="${i}" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <div class="fb-own"><input maxlength="300" placeholder="${t('Vertel het in je eigen woorden…')}" value="${esc(f.text || '')}" enterkeyhint="send"><button type="button" class="btn ghost" data-fbsend="${i}">${t('Stuur')}</button></div></div>`;
  return `<div class="fb"><button type="button" class="fb-b" data-fbv="up" data-fbi="${i}" title="${t('Dit hielp')}">👍</button><button type="button" class="fb-b" data-fbv="down" data-fbi="${i}" title="${t('Dit hielp niet')}">👎</button></div>`;
}
const sendFb = (ctx, message, vote, reason) => api('/api/feedback', { vote, reason, message, ctx }).catch(() => {});

// ---------- chatpaneel van de leraar ----------
function teacherHTML(chat, { loading = false, quick = [], placeholder = t('Typ je vraag of antwoord…'), intro = null, feedback = false } = {}) {
  const name = esc(STATE?.teacher || 'Meester Max');
  const msgs = chat.map((m, i) => m.role === 'teacher'
    ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(m.text).replace(/\n/g, '<br>')} ${speakBtn(m.text, true)}${feedback && m.text ? fbHTML(i, m.text) : ''}</div></div>`
    : `<div class="t-msg k"><div class="t-bub">${esc(m.text)}</div></div>`).join('');
  const thinking = pick(L(['denkt even na…', 'krabt achter zijn oor…', 'zet zijn denkpet op… 🧢', 'pakt zijn krijtje…'], ['dink gou…', 'krap agter sy oor…', 'sit sy dinkpet op… 🧢', 'tel sy krytjie op…']));
  return `<div class="teacher">
    <div class="t-head">🧑‍🏫 ${name}</div>
    <div class="t-msgs">${intro ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${esc(intro)}</div></div>` : ''}${msgs}
      ${loading ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub muted"><span class="loader"></span> ${thinking}</div></div>` : ''}</div>
    ${quick.length && !loading ? `<div class="t-quick">${quick.map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
    <form class="chat-in"><input maxlength="300" placeholder="${esc(placeholder)}" enterkeyhint="send" ${loading ? 'disabled' : ''}><button class="btn ghost" ${loading ? 'disabled' : ''}>${t('Stuur')}</button></form>
  </div>`;
}
function bindTeacher(box, send, fb = null) {
  bindSpeak(box);
  // fb = { ctx, chat, redraw }: duimpjes koppelen
  if (fb) {
    box.querySelectorAll('[data-fbv]').forEach((b) => (b.onclick = () => {
      const m = fb.chat[Number(b.dataset.fbi)];
      if (!m) return;
      sendFb(fb.ctx(), m.text, b.dataset.fbv);
      FB.set(m.text, b.dataset.fbv === 'up' ? { done: true } : { ask: true });
      fb.redraw();
    }));
    // redenen aantikken (meer mag), en/of in eigen woorden vertellen; "Stuur" verstuurt alles
    box.querySelectorAll('[data-fbr]').forEach((b) => (b.onclick = () => {
      const m = fb.chat[Number(b.dataset.fbr)];
      const f = m && FB.get(m.text);
      if (!f) return;
      f.sel ||= new Set();
      f.sel.has(b.dataset.r) ? f.sel.delete(b.dataset.r) : f.sel.add(b.dataset.r);
      b.classList.toggle('sel', f.sel.has(b.dataset.r));
    }));
    box.querySelectorAll('[data-fbask]').forEach((el) => {
      const m = fb.chat[Number(el.dataset.fbask)];
      const f = m && FB.get(m.text);
      if (!f) return;
      const input = el.querySelector('input');
      input.oninput = () => { f.text = input.value; };
      const go = () => {
        const reason = [...(f.sel || [])].join(', '), text = input.value.trim();
        if (!reason && !text) { input.focus(); return; }
        api('/api/feedback', { reason, text, message: m.text, ctx: fb.ctx() }).catch(() => {});
        FB.set(m.text, { done: true });
        fb.redraw();
      };
      el.querySelector('[data-fbsend]').onclick = go;
      input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
    });
  }
  box.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => send(b.dataset.q)));
  const form = box.querySelector('form');
  if (form) form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector('input').value.trim(); if (v) send(v); };
}

// =====================================================================
// VOORTGANG
// =====================================================================
async function renderProgress() {
  await loadState();
  const s = STATE;
  if (!s.intakeDone) {
    $app.innerHTML = `<div class="card stack"><h2>${t('Voortgang')}</h2><p class="muted">${t('Doe eerst de starttoets. Daarna zie je hier waar je goed in bent en wat je nog gaat leren.')}</p><a class="btn" href="#/">${t('Naar de starttoets')}</a></div>`;
    return;
  }
  const hist = s.history.length ? `<div class="card"><h3>${t('Laatste dagtaken')}</h3><div class="hist">${s.history.slice(-7).map((h) => `<div><span>${h.correct}</span><i style="height:${(h.correct / h.total) * 80 + 4}px;background:var(--primary)"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div>${s.record ? `<p class="small muted" style="margin-top:6px">${t('Jouw record: <b>{n}</b> goed in één dagtaak 🏅', { n: s.record })}</p>` : ''}</div>` : '';
  $app.innerHTML = `<div class="stack">
    <h1>${t('Voortgang')}</h1>
    ${hist}
    <div class="card"><h3>${t('Badges')}</h3><div class="badges">${s.badges.map((b) => `<div class="badge ${b.earned ? 'on' : ''}" title="${esc(b.text)}"><span>${b.earned ? b.icon : '🔒'}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>
    <div class="card maxnote">${maxHead()}<div class="maxnote-body" data-kidnote></div></div>
    <div class="card"><h3>${t('Alle onderdelen')}</h3><p class="small muted" style="margin:4px 0 6px">${t('Tik op een onderdeel voor uitleg en om te oefenen.')}</p>
      ${s.skills.map((x) => `<a class="skill" href="#/voortgang/${x.cat}" style="text-decoration:none;color:inherit">
      <span class="ico">${x.icon}</span>
      <div><div class="name"><span>${esc(x.label)}</span><span class="small muted">›</span></div>
      ${x.note ? `<div class="small" style="margin-top:4px">🧑‍🏫 ${esc(x.note)}</div>` : ''}</div></a>`).join('')}</div>
  </div>`;
  loadKidNote($app.querySelector('[data-kidnote]'));
}
const LEVELIDX = (n) => LEVELS().indexOf(n);
// (na het tekenen van Voortgang) Max' berichtje laden
const trend = (t) => (t == null || t === 0 ? '' : t > 0 ? `<span class="trend-up">▲${t}</span>` : `<span class="trend-down">▼${-t}</span>`);

async function renderCategory(cat) {
  if (!STATE) await loadState();
  const x = STATE.skills.find((k) => k.cat === cat);
  if (!x) { location.hash = '#/voortgang'; return; }
  $app.innerHTML = `<div class="stack">
    <a href="#/voortgang" class="small">‹ ${t('Voortgang')}</a>
    <div class="card stack"><div class="row"><span class="big-emoji">${x.icon}</span><div><h2>${esc(x.label)}</h2><p class="muted small">${x.domain}</p></div></div>
    ${x.note ? `<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${esc(x.note)}</div></div>` : ''}</div>
    <div class="card flat"><b>${t('Zo doe je het')}</b>${tipHTML(cat)}</div>
    ${(STATE.mnemonics?.[cat] || []).length ? `<div class="card flat"><b>🧠 ${t('Onthoud-trucs')}</b>${STATE.mnemonics[cat].map((m) => `<div class="trick"><b>${esc(m.kort)}</b>${m.soort === 'ezelsbrug' ? ` <span class="chip coin">${t('ezelsbruggetje')}</span>` : ''}<div class="small muted">${esc(m.uitleg)}</div></div>`).join('')}</div>` : ''}
    ${(STATE.goals || []).find((g) => g.cat === cat) ? `<div class="card flat">🎯 <b>${goalText(STATE.goals.find((g) => g.cat === cat))}</b> ${steps(STATE.goals.find((g) => g.cat === cat))}</div>` : ''}
    <button class="btn block" data-goalpick="${cat}">🎯 ${t('Oefenen met dit onderwerp')}</button>
    ${STATE.ai ? `<button class="btn ghost block" data-coach="${cat}">🧑‍🏫 ${t('Korte les van {m}', { m: esc(STATE.teacher) })}</button>` : ''}
  </div>`;
  bindStart();
  $app.querySelectorAll('[data-coach]').forEach((b) => (b.onclick = () => showCoach(cat)));
  $app.querySelector('[data-goalpick]')?.addEventListener('click', () => chooseGoal(cat));
}

// =====================================================================
// SPAARPOT
// =====================================================================
async function renderPiggy() {
  await loadState();
  const s = STATE;
  const max = Math.max(50, ...s.history.map((h) => h.points));
  $app.innerHTML = `<div class="stack">
    <h1>${t('Spaarpot')}</h1>
    <div class="card coin pig"><div class="big-emoji">🐷</div><div class="amount">${euro(s.wallet.balance)}</div>
      <p class="muted small">${t('Verdiend: {a} · Uitbetaald: {b}', { a: euro(s.wallet.earned), b: euro(s.wallet.paid) })}</p></div>
    <div class="card stack"><div class="row between"><h3>🎯 ${t('Mijn spaardoel')}</h3>${s.goal ? `<button class="btn ghost" data-goal>${t('Wijzig')}</button>` : ''}</div>
      ${s.goal ? `<div><b style="font-size:20px">${esc(s.goal.name)}</b> <span class="muted">· ${euro(s.goal.cents)}</span></div>
        <div class="goal-bar"><i style="width:${Math.min(100, (s.wallet.balance / s.goal.cents) * 100)}%"></i></div>
        <p class="small">${s.goal.reached ? t('<b>Gehaald! 🥳</b> Laat het aan papa of mama zien.') : t('Nog <b>{b}</b> te gaan.', { b: euro(s.goal.left) })}</p>`
      : `<p class="muted">${t('Waar wil jij voor sparen? Een game, iets voor je fiets, een uitje? Kies een doel en zie je spaarpot vollopen.')}</p><button class="btn block" data-goal>${t('Kies een spaardoel')}</button>`}</div>
    <div class="card stack"><h3>${t('Zo verdien je centen')}</h3>
      <div class="row"><span class="chip coin">🪙 ${s.points.intake}</span><span>${t('Starttoets af: {n} {c}', { n: s.points.intake, c: CENT() })}</span></div>
      <div class="row"><span class="chip coin">🪙 ${s.points.daily}</span><span>${t('Elke dagtaak af: {n} {c}. Hoeveel goed of fout maakt niet uit: het gaat om je moeite.', { n: s.points.daily, c: CENT() })}</span></div>
      <div class="row"><span class="chip">🪜</span><span>${t('Tussenstappen, hints en {m} om hulp vragen mag altijd. Dat kost niets!', { m: esc(s.teacher) })}</span></div>
      <div class="row"><span class="chip">🐢</span><span>${t('Sommen die je afraffelt, komen aan het eind van de dagtaak terug.')}</span></div>
      ${s.week?.bonus ? `<div class="row"><span class="chip coin">📅 ${s.week.bonus}</span><span>${t('Maak alle {d} dagtaken van de week af en krijg {n} {c} extra.', { d: s.week.days.length, n: s.week.bonus, c: CENT() })}</span></div>` : ''}
      <p class="small muted">${ZAR() ? t('100 sent = R1.') : t('100 cent = € 1.')}</p></div>
    ${s.history.length ? `<div class="card"><h3>${t('Verdiend per dag')}</h3><div class="hist">${s.history.slice(-7).map((h) => `<div><span>${h.points}</span><i style="height:${(h.points / max) * 80 + 4}px"></i><span>${h.day.slice(8)}/${h.day.slice(5, 7)}</span></div>`).join('')}</div></div>` : ''}
    <a href="#/ouder" class="small muted" style="text-align:center;display:block;margin-top:8px">${t('Voor ouders 🔒')}</a>
  </div>`;
  $app.querySelectorAll('[data-goal]').forEach((b) => (b.onclick = editGoal));
}
function editGoal() {
  const g = STATE.goal;
  sheet(`<div class="row between"><h2>🎯 ${t('Spaardoel')}</h2><button class="btn ghost" data-close>${t('Sluiten')}</button></div>
    <form class="stack" data-goalform>
      <label class="field"><span style="font-weight:800">${t('Waar spaar je voor?')}</span><input name="name" maxlength="40" placeholder="${t('bijv. nieuwe game')}" value="${esc(g?.name || '')}" required></label>
      <label class="field"><span style="font-weight:800">${ZAR() ? t('Hoeveel kost het? (in rand)') : t('Hoeveel kost het? (in euro)')}</span><input name="euros" inputmode="decimal" placeholder="${t('bijv. 15')}" value="${g ? String(g.cents / 100).replace('.', ',') : ''}" required></label>
      <p class="small muted">${t('Als je alle dagtaken goed maakt, verdien je ongeveer {b} per week (plus weekbonus).', { b: euro((STATE?.points?.daily ?? 50) * (STATE?.points?.daysPerWeek ?? 5)) })}</p>
      <button class="btn block">${t('Opslaan')}</button>
      ${g ? `<button type="button" class="btn ghost block" data-cleargoal>${t('Doel weghalen')}</button>` : ''}
    </form>`, (bg, close) => {
    bg.querySelector('[data-goalform]').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/goal', { name: e.target.name.value, euros: e.target.euros.value }); close(); toast(t('Spaardoel opgeslagen 🎯')); renderPiggy(); }
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
  if (!STATE) await loadState(); else setLang(STATE.kid?.lang);
  const data = SESSION_CACHE?.id === Number(id) ? SESSION_CACHE : await api(`/api/session/${id}`);
  SESSION_CACHE = null;
  if (data.status === 'stopped') { location.hash = '#/'; return; }
  S = { data, cur: data.current, input: '', choice: null, stepInput: '', stepChoice: null, phase: 'ask', t0: Date.now(), chat: [], last: null, badges: [], stepMsg: null };
  if (!data.current) return renderSummary({ kind: data.kind, correct: data.correct, total: data.total, points: Math.round(data.points), maxPoints: data.maxPoints });
  startQuestion();
  // lesplan van Max bij de start; anders de uitlegkaart bij een onderdeel waar extra hulp aan staat
  // zelf een onderwerp gekozen? dan alleen een les over dát onderwerp (niet over iets anders)
  const stuck = (data.struggling || []).filter((c) => !data.focus || c === data.focus);
  const key = `coach-shown-${data.id}`;
  if (data.answered === 0 && !store.get(key)) {
    store.set(key, '1');
    if (data.coach) showPlan(data.coach, stuck);
    else if (stuck.length) showCoach(stuck[0], t('Hier gaan we vandaag extra mee oefenen. Lees dit even rustig door.'));
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
    <div class="s-top"><button class="x" data-quit aria-label="${t('Stoppen')}">✕</button>
      <div class="progress"><i style="width:${(cur.index / data.total) * 100}%"></i></div>
      <span class="small" style="font-weight:900">${cur.index + 1}/${data.total}</span></div>
    <div class="card q-card">
      <div class="row between"><span class="chip">👀 ${t('Eerst een voorbeeld')} · ${esc(meta?.label || '')}</span>${speakBtn(ex.text)}</div>
      <p class="small muted" style="margin-top:8px">${t('Kijk mee hoe {m} deze som oplost. Daarna doen we er samen eentje.', { m: esc(STATE?.teacher || 'de meester') })}</p>
      <div class="q-text">${esc(ex.text)}</div>
      ${ex.visual ? `<div class="visual">${renderVisual(ex.visual)}</div>` : ''}
      ${ex.options ? `<div class="row" style="flex-wrap:wrap;margin-top:8px">${ex.options.map((o) => `<span class="chip">${esc(o)}</span>`).join('')}</div>` : ''}
      <ol class="steps ex-steps">${shown.map((st) => `<li>${esc(st)}</li>`).join('')}</ol>
      ${all ? `<div class="feedback ok" style="margin-top:10px"><div class="title">${t('Antwoord:')} ${esc(ex.display)}</div></div>
        ${cur.mnemonic ? `<div class="trick" style="margin-top:10px"><b>🧠 ${esc(cur.mnemonic.kort)}</b><div class="small muted">${esc(cur.mnemonic.uitleg)}</div></div>` : ''}` : ''}
    </div>
    <div style="margin-top:12px">${all ? `<button class="btn good block" data-exdone>${t('Nu samen 👉')}</button>` : `<button class="btn block" data-exnext>${S.exStep ? t('Volgende stap ▸') : t('Laat de eerste stap zien ▸')}</button>`}</div>`;
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
  const label = q.redo ? `<span class="chip">🔁 ${t('Nog een keer, rustig')}</span>` : q.warmup ? `<span class="chip">⚡ ${t('Opwarmer')}</span>` : q.retry ? `<span class="chip good">💪 ${t('Herkansing')}</span>` : q.booster ? `<span class="chip good">😎 ${t('Even een makkie')}</span>` : q.review ? `<span class="chip">🔁 ${t('Herhaling')} · ${esc(meta?.label || q.cat)}</span>` : `<span class="chip">${meta?.icon || ''} ${esc(meta?.label || q.cat)}</span>`;
  $app.innerHTML = `
    <div class="s-top"><button class="x" data-quit aria-label="${t('Stoppen')}">✕</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="small" style="font-weight:900">${cur.index + 1}/${data.total}</span></div>
    <div class="row between" style="margin:-4px 2px 10px">
      ${data.maxPoints ? `<span class="chip coin" title="${t('{n} {c} als je hem afmaakt', { n: Math.round(data.maxPoints), c: CENT() })}">🪙 ${Math.round(data.maxPoints)} ${CENT()} ${t('als hij af is')}</span>` : `<span class="chip">${t('oefenen')}</span>`}
      ${data.streak >= 2 ? `<span class="chip streak-chip">🔥 ${t('{n} op rij', { n: data.streak })}</span>` : '<span></span>'}
    </div>
    <div class="card q-card">
      <div class="row between">${label}${speakBtn(q.text + (q.options ? '. ' + t('Kies uit:') + ' ' + q.options.join(', ') : ''))}</div>
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
    if (await ask(`<div class="big-emoji">🚪</div><h2 style="margin:8px 0">${t('Even stoppen?')}</h2><p class="muted">${t('Geen probleem! Je kunt later verder waar je was. De sommen lopen niet weg (ze hebben geen benen). 🦵')}</p>`, t('Ja, stoppen'), t('Nee, ik ga door'))) location.hash = '#/';
  };
  if (cur.offer.mode === 'choose' && !cur.chose && !cur.guided) return drawChoice();
  drawAnswer();
  drawTeacher();
}

// "Nu moet je het zelf kunnen": kies zelf (dubbel) of met tussenstappen (half)
function drawChoice() {
  const c = S.cur, o = c.offer;
  const meta = (STATE?.skills || []).find((x) => x.cat === c.question.cat);
  const transition = o.transition ? `<div class="card flat stack" style="margin-top:14px">
      <div class="row"><span class="big-emoji" style="font-size:34px">🎓</span><div><b>${t('Je hebt {o} al 5 keer goed gedaan met tussenstappen!', { o: esc(meta?.label || '') })}</b><p class="small muted">${t('Nu ga je het zelf proberen. Dit zijn de stappen die je steeds doet:')}</p></div></div>
      <ol class="steps">${(c.plan || []).map((a) => `<li>${esc(a.replace(/= \?$/, '').replace(/\?$/, ''))}</li>`).join('')}<li>${esc(t('En daarna schrijf je het antwoord op.'))}</li></ol>
      <p class="small muted">${t('Doe die stappen in je hoofd of op je kladblaadje.')}</p></div>` : '';
  $app.querySelector('#answer-area').innerHTML = `${transition}
    <div class="stack" style="margin-top:14px">
      <p style="font-weight:800">${t('Hoe wil je deze som doen?')}</p>
      <button class="choice-big good" data-ch="solo"><span>💪 ${t('Helemaal zelf')}</span><small>${t('laat zien dat je het kunt')}</small></button>
      <button class="choice-big" data-ch="guided"><span>🪜 ${t('Met tussenstappen')}</span><small>${t('samen stap voor stap')}</small></button>
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
  return `<div class="keypad">${keysFor(type).flat().map((k) => `<button class="key ${/[0-9]/.test(k) ? '' : 'fn'}" data-k="${k}" ${k === '␣' ? 'style="font-size:15px"' : ''}>${k === '␣' ? t('spatie') : k === 'C' ? t('wis') : k}</button>`).join('')}
    <button class="key wide" data-k="0">0</button><button class="key go wide" data-go ${goEnabled ? '' : 'disabled'}>${goLabel}</button></div>`;
}
function answerBox(value, unit, money, active = true, ph = t('jouw antwoord')) {
  return `<div class="answer-box ${active ? 'active' : ''}">${money ? `<span class="unit">${ZAR() ? 'R' : '€'}</span>` : ''}${value ? esc(value) : `<span class="ph">${ph}</span>`}${active ? '<span class="caret"></span>' : ''}${unit && !money ? `<span class="unit">${esc(unit)}</span>` : ''}</div>`;
}

function drawGuide() {
  const c = S.cur;
  const box = $app.querySelector('#guide');
  if (!c.guided) { box.innerHTML = ''; return; }
  const done = (c.guideDone || []).map((d, i) => `<div class="g-step ${d.ok ? 'ok' : 'shown'}"><span class="n">${d.ok ? '✓' : '💡'}</span><div><div>${esc(d.ask.replace(/\?\s*$/, ''))}</div><b>${esc(d.display)}</b>${d.ok ? '' : ` <span class="small muted">${t('(zo moest het)')}</span>`}</div></div>`).join('');
  const intro = S.autoIntro ? `<div class="hint" style="background:var(--primary-soft)">🤝 ${t('We doen deze samen, stap voor stap.')} ${S.data.maxPoints ? t('Je krijgt gewoon je centen als het goed is!') : ''}</div>` : '';
  let current = '';
  if (c.guideStep) {
    const st = c.guideStep;
    const msg = S.stepMsg ? `<div class="step-msg ${S.stepMsg.kind}">${esc(S.stepMsg.text)}</div>` : '';
    current = `<div class="g-step now"><span class="n">${(c.guideDone || []).length + 1}</span><div style="flex:1"><div style="font-weight:800">${esc(st.ask)}</div>
      ${st.type === 'choice' ? `<div class="choices">${st.options.map((o, i) => `<button class="choice small ${S.stepChoice === i ? 'sel' : ''}" data-sc="${i}">${esc(o)}</button>`).join('')}</div>`
        : answerBox(S.stepInput, st.unit, st.money, true, t('tussenstap'))}${msg}</div></div>`;
  } else if (c.guideFinal) {
    current = `<div class="g-step now final"><span class="n">🏁</span><div><div style="font-weight:800">${t('Nu jij:')} ${esc(c.guideFinal)}</div><div class="small muted">${c.question.type === 'choice' ? t('Kies hieronder het goede antwoord.') : t('Vul hieronder het eindantwoord in.')}</div></div></div>`;
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
      ? `<p class="small muted" style="margin-top:12px">${t('Je kiest straks uit:')}</p><div class="row" style="flex-wrap:wrap">${q.options.map((o) => `<span class="chip" style="font-size:16px">${esc(o)}</span>`).join('')}</div>` : '';
    controls.innerHTML = st.type === 'choice'
      ? `<button class="btn block" data-step ${S.stepChoice == null ? 'disabled' : ''} style="margin-top:12px">${t('Controleer de stap')}</button>`
      : keypad(st.type, t('Controleer de stap'), !!S.stepInput);
    controls.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => keyPress(b.dataset.k)));
    (controls.querySelector('[data-step]') || controls.querySelector('[data-go]')).onclick = submitStep;
    return;
  }
  // 2) eindantwoord
  if (q.type === 'choice') {
    area.innerHTML = `<div class="choices">${q.options.map((o, i) => `<button class="choice ${S.choice === i ? 'sel' : ''}" data-c="${i}">${esc(o)}</button>`).join('')}</div>`;
    area.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { S.choice = Number(b.dataset.c); drawAnswer(); }));
    controls.innerHTML = `<div style="margin-top:12px"><button class="btn block" data-go ${S.choice == null ? 'disabled' : ''}>${t('Controleer')}</button></div>${helpRow()}`;
  } else {
    area.innerHTML = `${answerBox(S.input, q.unit, q.money)}
      ${q.type === 'fraction' ? `<p class="small muted" style="margin-top:6px;text-align:center">${t('Breuk: 3/4 · Gemengd getal: 2 spatie 1/2')}</p>` : ''}
      ${q.type === 'time' ? `<p class="small muted" style="margin-top:6px;text-align:center">${t('Schrijf zo: 14:45')}</p>` : ''}`;
    controls.innerHTML = keypad(q.type, t('Controleer'), !!S.input) + helpRow();
    controls.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => keyPress(b.dataset.k)));
  }
  controls.querySelector('[data-go]').onclick = submit;
  thinkPause(controls.querySelector('[data-go]'));
  controls.querySelector('[data-hint]')?.addEventListener('click', getHint);
  controls.querySelector('[data-guide]')?.addEventListener('click', startGuide);
  controls.querySelector('[data-ask]')?.addEventListener('click', () => openTeacher());
  controls.querySelector('[data-dunno]')?.addEventListener('click', dontKnow);
}
// Na afraffelen: de knop werkt pas na een paar seconden, met aftellen (eerst rustig lezen)
function thinkPause(btn) {
  const secs = S.cur?.adapt?.pause || 0;
  if (!btn || !secs) return;
  const until = (S.pauseUntil ||= { idx: S.cur.index, t: Date.now() + secs * 1000 }).idx === S.cur.index ? S.pauseUntil.t : (S.pauseUntil = { idx: S.cur.index, t: Date.now() + secs * 1000 }).t;
  const label = btn.innerHTML;
  const tick = () => {
    if (!btn.isConnected) return;
    const left = Math.ceil((until - Date.now()) / 1000);
    if (left <= 0) { btn.innerHTML = label; btn.dataset.wait = ''; if (btn.dataset.ok !== '0') btn.disabled = false; return; }
    btn.disabled = true; btn.dataset.wait = '1';
    btn.innerHTML = `🐢 ${t('Eerst rustig lezen…')} ${left}`;
    setTimeout(tick, 250);
  };
  btn.dataset.ok = btn.disabled ? '0' : '1';
  tick();
}
function helpRow() {
  const c = S.cur, q = c.question, o = c.offer;
  const btns = [];
  if (!c.guided && o.mode === 'optional' && q.guideCount) {
    const cost = S.data.maxPoints ? (o.free ? '' : ` ${t('(½ centen)')}`) : '';
    btns.push(`<button class="btn ghost" data-guide>🪜 ${t('Samen stap voor stap')}${cost}</button>`);
  }
  if (q.hasSteps && !q.noHelp && !c.guided) btns.push(`<button class="btn ghost" data-hint ${S.hintMore === false || (c.hints || []).length >= (c.hintCount || 99) ? 'disabled' : ''}>💡 ${(c.hints || []).length ? t('Nog een hint') : t('Hint')}</button>`);
  if (STATE?.ai && !q.noHelp) btns.push(`<button class="btn ghost" data-ask>🧑‍🏫 ${t('Vraag {m}', { m: esc(STATE.teacher || 'de meester') })}</button>`);
  btns.push(`<button class="btn ghost" data-dunno>🤷 ${t('Weet ik niet')}</button>`);
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
    else if (r.revealed) { buzz([40, 30, 40]); S.stepMsg = null; S.stepInput = ''; S.stepChoice = null; S.cur.guideStep = r.next; S.cur.guideFinal = r.final; toast(t('Geeft niks! Het was {d}. We gaan verder.', { d: r.display })); }
    else {
      buzz([40, 30, 40]); S.stepMsg = { kind: 'tip', text: t('Nog niet. Tip: {x}', { x: r.tip }) };
      const tried = st.type === 'choice' ? st.options[answer] : answer;
      S.stepInput = ''; S.stepChoice = null;
      drawAnswer();
      // de leraar legt precies deze stap uit
      if (STATE?.ai) { S.teacherOpen = true; talk(t('Ik snap deze stap niet: {s}', { s: st.ask }), 'step', { stepGiven: tried }); }
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
  if (answered && S.last && !S.last.correct) return [t('Ik snap het nog niet 🤔'), t('Heb je een ezelsbruggetje?'), t('Ik snap het! 👍')];
  if (answered) return [t('Waarom klopt dit?'), t('Kan het ook sneller?')];
  if (S.cur.guided && S.cur.guideStep) return [t('Ik snap deze stap niet'), t('Geef een voorbeeld')];
  return [t('Ik snap de som niet'), t('Hoe begin ik?'), t('Heb je een ezelsbruggetje?')];
}
function drawTeacher(loading = false) {
  const area = $app.querySelector('#ai-area');
  if (!area) return;
  const chat = S.cur.chat || [];
  if (!chat.length && !loading && !S.teacherOpen) { area.innerHTML = ''; return; }
  area.innerHTML = teacherHTML(chat, { loading, quick: quickFor(), intro: !chat.length && !loading ? t('Waar loop je op vast? Vertel maar, of kies hieronder.') : null, feedback: true });
  bindTeacher(area, (msg) => talk(msg), { ctx: () => ({ kind: 'chat', cat: S.cur?.question?.cat || S.cur?.cat, session: S.data?.id, question: S.cur?.question?.text }), chat, redraw: () => drawTeacher() });
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
    <summary><span>✏️ ${t('Kladblaadje')}</span><span class="small muted">${k.strokes.length || k.text ? t('je hebt al iets opgeschreven') : S.cur?.adapt?.showWork ? t('schrijf hier je tussenstappen, dan zien we samen waar het lastig wordt') : t('reken hier je tussenstappen uit')}</span></summary>
    <div class="klad-body">
      <canvas id="klad-c" aria-label="${t('Kladblaadje: schrijf met je vinger')}"></canvas>
      <textarea id="klad-t" rows="3" placeholder="${ZAR() ? t('Tik jou stappe, byvoorbeeld: 276 ÷ 6 = 46') : 'Typ je tussenstappen, bijvoorbeeld: 276 : 6 = 46'}"${k.typing ? '' : ' hidden'}>${esc(k.text)}</textarea>
      <div class="klad-tools">
        <button class="btn ghost sm" data-kl="undo" aria-label="${t('Laatste streep wissen')}">↶ ${t('Terug')}</button>
        <button class="btn ghost sm" data-kl="clear">🗑 ${t('Wissen')}</button>
        <button class="btn ghost sm" data-kl="type">${k.typing ? `✏️ ${t('Tekenen')}` : `⌨️ ${t('Typen')}`}</button>
      </div>
      ${STATE?.ai ? `<p class="small muted" style="margin-top:6px">🧑‍🏫 ${t('{m} kijkt mee op je kladblaadje als je hulp vraagt of iets fout gaat.', { m: esc(STATE.teacher) })}</p>` : ''}
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
    if (k === 'type') { S.klad.typing = !S.klad.typing; t.hidden = !S.klad.typing; b.textContent = S.klad.typing ? `✏️ ${t('Tekenen')}` : `⌨️ ${t('Typen')}`; if (S.klad.typing) t.focus(); }
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
    const write = await ask(`<div class="big-emoji">✏️</div><h2 style="margin:8px 0">${t('Eerst even je tussenstappen?')}</h2><p class="muted">${t('Schrijf op het kladblaadje hoe je rekent. Dan kan {m} precies zien waar het lastig wordt, en dat scheelt jou een hoop fouten.', { m: esc(STATE?.teacher || 'Max') })}</p>`, t('Ja, even opschrijven'), t('Nee, controleer maar'));
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
    const P = praise();
    title = r.rewardKind === 'solo-double' ? pick(P.double) : r.retry ? pick(P.retry) : r.guided ? pick(P.guided) : pick(P.solo);
    title = title.replace('{naam}', STATE?.name || 'Rekenaar');
    if (r.streak >= 3 && r.streak % 3 === 0) title += ` 🔥 ${t('{n} op rij!', { n: r.streak })}`;
    if (r.rewardKind === 'solo-double' || r.retry || (r.streak && r.streak % 5 === 0) || Math.random() < 0.15) confetti();
  } else {
    buzz([60, 40, 60]);
    title = r.dontKnow || r.given === 'weet ik niet' ? pick(praise().dunno) : pick(praise().wrong);
  }
  const rewardChip = r.redo ? `<span class="chip">🔁 ${t('komt terug')}</span>` : '';
  const area = $app.querySelector('#answer-area');
  area.innerHTML = `<div class="answer-box" style="border-color:${r.correct ? 'var(--good)' : 'var(--bad)'}">${esc(r.given)}${q.unit && !q.money && !r.dontKnow && r.given !== 'weet ik niet' ? `<span class="unit">${esc(q.unit)}</span>` : ''}</div>`;
  $app.querySelector('#hints').innerHTML = '';
  const nextIsRetry = r.next?.question?.retry;
  // te snel en fout? (vaker, of een bekend patroon) → rustig vragen om eerst te schatten
  const fast = !r.correct && !r.dontKnow && r.given !== 'weet ik niet' && S.lastMs < 6000 && S.data.kind !== 'intake';
  if (fast) S.fastWrong = (S.fastWrong || 0) + 1;
  const slowDown = fast && (S.cur.adapt?.impulsive || S.fastWrong >= 2);
  const showSteps = !r.correct || r.hints;
  $app.querySelector('#fb').innerHTML = `<div class="feedback ${r.correct ? 'ok' : 'no'}">
    <div class="row between"><div class="title">${esc(title)}</div>${rewardChip}</div>
    ${r.correct ? (r.note ? `<p>${esc(r.note)}</p>` : '') : `<p>${t('Het goede antwoord is <b>{d}</b>.', { d: esc(r.display) })}${r.note ? ' ' + esc(r.note) : ''}</p>`}
    ${r.misconception ? `<div class="mis"><b>🔎 ${esc(r.misconception.label)}</b><div>👉 ${esc(r.misconception.fix)}</div></div>` : ''}
    ${!r.correct && r.review ? `<p class="small" style="margin-top:6px">🔁 ${t('Deze komt over een paar dagen nog eens terug. Dan lukt hij vast!')}</p>` : ''}
    ${r.redo ? `<p class="small" style="margin-top:8px;font-weight:800">🔁 ${t('Deze ging wel heel snel. Hij komt aan het eind van de dagtaak terug, dan doe je hem rustig.')}</p>`
      : slowDown ? `<p class="small" style="margin-top:8px;font-weight:800">🐢 ${t('Dat ging supersnel! Bij de volgende som: lees hem eerst rustig en kijk wat er ongeveer uit moet komen.')}</p>` : ''}
    ${showSteps && !(STATE?.ai && !r.correct && S.data.kind !== 'intake') ? `<p style="margin-top:10px;font-weight:900">${t('Zo reken je het uit:')}</p><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      : `<details style="margin-top:8px"><summary class="small muted">${t('Hoe reken je dit uit?')}</summary><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`}
    ${nextIsRetry ? `<p class="small" style="margin-top:10px;font-weight:800">👉 ${t("Daarna krijg je nog een kans: een som van dezelfde soort, samen stap voor stap.")}</p>` : ''}
  </div>`;
  $app.querySelector('#guide').innerHTML = '';
  $app.querySelector('#controls').innerHTML = `<div class="stack" style="margin-top:12px">
    ${STATE?.ai && (r.correct || S.data.kind === 'intake') && !(S.cur.chat || []).length ? `<button class="btn ghost block" data-ask2>🧑‍🏫 ${r.correct ? t('Praat erover met {m}', { m: esc(STATE.teacher) }) : t('Leg het me uit, {m}', { m: esc(STATE.teacher) })}</button>` : ''}
    <button class="btn ${r.correct ? 'good' : ''} block" data-next>${r.done ? t('Bekijk je resultaat') : nextIsRetry ? t('Herkansing →') : t('Volgende →')}</button></div>`;
  $app.querySelector('[data-next]').onclick = next;
  $app.querySelector('[data-ask2]')?.addEventListener('click', (e) => { e.target.remove(); if (r.correct) openTeacher(); else { S.teacherOpen = true; talk(null, 'start'); } });
  // fout? De leraar kijkt wat er misging en begint een gesprekje
  if (!r.correct && STATE?.ai && S.data.kind !== 'intake') { S.teacherOpen = true; talk(null, 'start'); }
  else drawTeacher();
  if (r.teachback) drawTeachback(r);
  $app.querySelector('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (r.surprise) setTimeout(() => showSurprise(r.surprise), r.weekBonus ? 1800 : 600);
  if (r.weekBonus) setTimeout(() => { confetti(); toast(`📅 ${t('Weekbonus! +{n} {c} extra voor een hele week oefenen!', { n: r.weekBonus, c: CENT() })}`, 4500); }, 400);

  // momenten die er toe doen
  if (r.rushWarn) setTimeout(() => sheet(`<div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${t('Ho, rustig aan! 🐢 Een paar sommen gingen zo snel dat je ze niet goed gelezen kunt hebben. Die komen aan het eind terug. Lees de volgende som eerst hardop, en reken dan pas. Rustig werken is sneller klaar!')}</div></div>
    <button class="btn block" data-close>${t('Oké, rustig aan')}</button>`), 500);
  if (r.goalReached) setTimeout(() => celebrateGoal(r.goalReached), 400);
  else if (r.event === 'up') celebrateLevel(r);
  else if (r.event === 'down') sheet(`<div style="text-align:center"><div class="big-emoji">🪜</div><h2 style="margin:8px 0">${t('Even een stapje terug')}</h2>
      <p>${t('Bij <b>{o}</b> oefenen we even met wat makkelijkere sommen. Zo bouw je het stevig op, als een huis: eerst de fundering. 🏠', { o: esc(r.eventCat) })}</p>
      <p class="muted" style="margin-top:8px">${t('Gaat het goed? Dan worden de sommen vanzelf weer moeilijker. Je krijgt de komende sommen extra hulp. 💪')}</p></div>
      <button class="btn block" data-close>${t('Oké, we gaan ervoor!')}</button>`);
  else if (r.easy === 'on') toast(t("Even een tandje terug. Ook raceauto's gaan de pitstraat in. 🏎️"), 3500);
  else if (r.easy === 'off') toast(t('Je bent weer op dreef! Vol gas! 🚀'), 3000);
  for (const b of r.badges || []) setTimeout(() => toast(`${b.icon} ${t('Nieuwe badge: {b}!', { b: b.title })}`, 3500), 600);
}
// Teach-back: "Leg eens uit hoe je het deed" (uitleggen = beter onthouden)
function drawTeachback() {
  const box = $app.querySelector('#ai-area');
  box.innerHTML = `<div class="teach">
    <div style="font-weight:900">🗣️ ${t('Jij bent nu de juf of meester!')}</div>
    <p class="small" style="margin:4px 0 8px">${t('Leg in je eigen woorden uit hoe je deze som hebt uitgerekend. Wie het kan uitleggen, snapt het echt.')}</p>
    <form class="stack" style="gap:8px"><textarea maxlength="600" rows="3" placeholder="${t('Eerst deed ik ..., daarna ...')}"></textarea>
    <div class="row"><button class="btn" style="flex:1">${t('Stuur')}</button><button type="button" class="btn ghost" data-skip>${t('Sla over')}</button></div></form></div>`;
  const form = box.querySelector('form');
  box.querySelector('[data-skip]').onclick = () => (box.innerHTML = '');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = form.querySelector('textarea').value.trim();
    if (text.length < 3) return toast(t('Schrijf eerst kort op hoe je hebt gerekend.'));
    form.innerHTML = `<div><span class="loader"></span> ${t('{m} leest je uitleg…', { m: esc(STATE?.teacher || 'De meester') })}</div>`;
    try {
      const tb = await api(`/api/session/${S.data.id}/teachback`, { index: S.cur.index, text });
      if (tb.badge) { S.badges.push(tb.badge); toast(`${tb.badge.icon} ${t('Nieuwe badge: {b}!', { b: tb.badge.title })}`, 3500); }
      box.innerHTML = `<div class="teach"><div class="small muted">${t('Jouw uitleg:')}</div><p style="margin-bottom:8px">"${esc(text)}"</p>
        ${tb.feedback ? `<div style="font-weight:900;color:var(--primary)">🧑‍🏫 ${esc(STATE?.teacher || '')}</div><div class="coach">${rich(tb.feedback)}</div>`
          : `<div style="font-weight:800">${t('Goed uitgelegd! Vergelijk het met deze stappen. Deed jij het ook zo?')}</div><ol class="steps">${tb.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`}</div>`;
    } catch (err) { box.innerHTML = `<div class="teach">${esc(err.message)}</div>`; }
  };
}

function showSurprise(reward) {
  confetti(); setTimeout(confetti, 700);
  sheet(`<div style="text-align:center"><div class="big-emoji gift">🎁</div><h2 style="margin:8px 0">${t('Verrassing!')}</h2>
    <p>${t('Omdat je deze week zo goed je best hebt gedaan, krijg je:')}</p>
    <div class="surprise">${esc(reward)}</div>
    <p class="muted small" style="margin-top:8px">${t('Laat dit scherm aan papa of mama zien! 📱')}</p></div>
    <button class="btn good block" data-close>${t('Ja!! 🙌')}</button>`);
}

function celebrateLevel(r) {
  confetti();
  sheet(`<div style="text-align:center"><div class="big-emoji">⬆️</div><h2 style="margin:8px 0">${t('Niveau omhoog!')}</h2>
    <p>${t('Bij <b>{o}</b> krijg je nu moeilijkere sommen. Knap!', { o: esc(r.eventCat) })}</p>
    <p class="muted" style="margin-top:8px">${t('Je hersenen moeten nieuwe kleren kopen, de oude passen niet meer. 🧠👕')}</p></div>
    <button class="btn good block" data-close>${t('Ja!')}</button>`);
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
  const msg = pct >= 0.9 ? t('Super gedaan! 🏆') : pct >= 0.7 ? t('Goed bezig! 💪') : pct >= 0.5 ? t('Netjes doorgezet! 👍') : t('Knap dat je hem hebt afgemaakt! 🧗');
  if (pct >= 0.7) confetti();
  await loadState();
  const highlights = [
    sum.bestStreak >= 3 ? `🔥 ${t('Langste reeks: <b>{n} op rij</b>', { n: sum.bestStreak })}` : '',
    sum.retryOk ? `🦸 ${t('<b>{n}×</b> een herkansing goed', { n: sum.retryOk })}` : '',
    sum.guidedOk ? `🪜 ${t('<b>{n}×</b> goed met tussenstappen', { n: sum.guidedOk })}` : '',
    sum.record ? `📈 <b>${t('Nieuw record!')}</b>` : '',
  ].filter(Boolean);
  const badges = S?.badges || [];
  $app.innerHTML = `<div class="stack">
    <div class="card done-hero"><div class="big-emoji">${pct >= 0.7 ? '🎉' : '⭐'}</div>
      <div class="score">${sum.correct}/${sum.total}</div><p class="muted">${t('sommen goed')}</p>
      <h2 style="margin:10px 0">${msg}</h2>
      ${sum.maxPoints ? `<div class="coin-pop">🪙 +${sum.points} ${CENT()}</div>` : `<span class="chip">${t('Oefenronde — zonder centen')}</span>`}
    </div>
    ${STATE.ai ? `<div class="card" id="reflect"><div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub muted"><span class="loader"></span> ${t('{m} schrijft je een berichtje…', { m: esc(STATE.teacher) })}</div></div></div>` : ''}
    ${highlights.length ? `<div class="card stack">${highlights.map((h) => `<div>${h}</div>`).join('')}</div>` : ''}
    ${badges.length ? `<div class="card"><h3>${t('Nieuwe badges')}</h3><div class="badges">${badges.map((b) => `<div class="badge on"><span>${b.icon}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>` : ''}
    ${sum.kind === 'intake' ? `<div class="card stack"><h3>${t('Jouw uitslag')}</h3><p class="small muted">${t('Vanaf nu krijg je bij elke dagtaak {n} sommen die bij jou passen.', { n: STATE.points.dailyCount })}</p><div class="maxnote-body" data-kidnote></div></div>`
    : sum.perCat ? `<div class="card"><h3>${t('Per onderdeel')}</h3>${sum.perCat.map((p) => `<div class="mini-skill"><span class="ico">${p.icon}</span><div style="font-weight:800">${esc(p.label)}</div><span class="chip ${p.ok === p.n ? 'good' : p.ok === 0 ? 'bad' : ''}">${p.ok}/${p.n}</span></div>`).join('')}</div>` : ''}
    <div class="card coin row between"><div class="row"><span class="big-emoji" style="font-size:30px">🐷</span><b>${t('Spaarpot')}</b></div><span class="money" style="font-size:22px">${euro(STATE.wallet.balance)}</span></div>
    ${sum.kind === 'practice' && sum.perCat?.length === 1 ? (() => { const p = sum.perCat[0], g = (STATE.goals || []).find((x) => x.cat === p.cat);
      return `<div class="card stack">${g ? `<div>🎯 <b>${goalText(g)}</b>: ${esc(p.label)} ${steps(g)}</div>` : ''}<button class="btn good block" data-again="${p.cat}">💪 ${t('Nog 10 sommen {o}', { o: esc(p.label.toLowerCase()) })}</button></div>`; })() : ''}
    ${mopCard()}
    <a class="btn block" href="#/">${t('Klaar')}</a>
  </div>`;
  $tabs.hidden = true;
  $app.querySelector('[data-again]')?.addEventListener('click', (e) => startSession('practice', e.currentTarget.dataset.again, { fresh: true }));
  $app.querySelector('[data-mop]')?.addEventListener('click', (e) => { const el = e.currentTarget.querySelector('.punch'); el.hidden = !el.hidden; });
  loadKidNote($app.querySelector('[data-kidnote]'));
  if (STATE.ai && S?.data?.id) {
    api(`/api/session/${S.data.id}/reflect`, {}).then((r) => {
      const box = $app.querySelector('#reflect');
      if (!box) return;
      if (r.text) box.innerHTML = `<div class="small muted" style="margin-bottom:6px">${t('Berichtje van {m}', { m: esc(STATE.teacher) })}</div><div class="t-msg t"><span class="t-av">🧑‍🏫</span><div class="t-bub">${rich(r.text)}</div></div>`;
      else box.remove();
    }).catch(() => $app.querySelector('#reflect')?.remove());
  }
}

// ---------- plaatjes bij sommen ----------
// Een plaatje mag een som nooit laten vastlopen: lukt tekenen niet, dan de som zonder plaatje.
function renderVisual(v) {
  try { return drawVisual(v) || ''; } catch (e) { console.error('[plaatje]', v?.kind, e); return ''; }
}
function drawVisual(v) {
  if (!v || typeof v !== 'object') return '';
  // echte klokken (wandklok, wekker, horloge), digitale displays en een vertrekbord (public/klokken.js)
  if (window.KLOK) {
    if (v.kind === 'clock') return `<div class="clock">${KLOK.analog(v.time, v.look, esc(v.label || ''))}</div>`;
    if (v.kind === 'digital') return `<div class="clock digi">${KLOK.digital(v.time, v.look, esc(v.label || ''))}</div>`;
    if (v.kind === 'clocks') return KLOK.row((v.items || []).map((it) => ({ ...it, label: esc(it.label || '') })));
    if (v.kind === 'board') return `<div class="clock digi">${KLOK.board((v.rows || []).map((r) => ({ time: esc(r.time), to: esc(r.to), track: esc(r.track || '') })), esc(v.title || t('Vertrek')), [t('Tijd'), t('Naar'), t('Spoor')])}</div>`;
  }
  const ink = 'currentColor';
  if (v.kind === 'table') {
    return `<table>${v.headers ? `<tr>${v.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>` : ''}${v.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 && !v.headers ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</table>`;
  }
  // grafiek (staaf of lijn) heeft waarden; een getallenlijn ('line' met from/to) niet
  if ((v.kind === 'bar' || v.kind === 'line') && Array.isArray(v.values) && v.values.length) {
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
    return `<svg viewBox="0 0 340 180" role="img" aria-label="pizza">${paths}<text x="200" y="80" font-size="15" font-weight="800" fill="${ink}">🍕 = ${t('over')}</text><text x="200" y="108" font-size="15" font-weight="800" fill="${ink}">- - = ${t('opgegeten')}</text></svg>`;
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
        ${lab(rx + 10, ty + th / 2 - 4, t('hoogte'), 'start')}${lab(rx + 10, ty + th / 2 + 14, `${v.h} ${v.unit}`, 'start')}
        ${lab(tx + tw / 2, ty + th + 22, `${t('basis')} ${v.w} ${v.unit}`)}</svg>`;
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
    if (e.status === 401) return pwScreen(t('Ouderwachtwoord'), t('Het wachtwoord dat is gekozen bij het aanmaken van het profiel (of de pincode van de beheerder).'), async (pw) => { await api('/api/parent/login', { password: pw }); renderParent(); });
    throw e;
  }
  setLang(data.lang);
  if (!STATE) STATE = { currency: data.country === 'ZA' ? 'ZAR' : 'EUR', kid: { lang: data.lang } };
  const accBy = Object.fromEntries(data.acc.map((a) => [a.cat, a]));
  const spark = (cat) => {
    const pts = data.snaps.filter((s) => s.cat === cat).map((s) => s.score);
    if (pts.length < 2) return '';
    const W = 90, H = 26;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${pts.map((p, i) => `${(i / (pts.length - 1)) * (W - 4) + 2},${H - 2 - (p / 100) * (H - 4)}`).join(' ')}"/></svg>`;
  };
  const kindNl = { intake: t('Starttoets'), daily: t('Dagtaak'), practice: t('Oefenen') };
  $app.innerHTML = `<div class="stack">
    <div class="row between"><a href="#/spaarpot" class="small">‹ ${t('Terug')}</a><button class="btn ghost" data-logout>${t('Uitloggen')}</button></div>
    <div class="row between"><h1>${t('Ouderoverzicht')}</h1><a href="#/overzicht" class="small">👨‍🏫 ${t('Alle kinderen')}</a></div>
    <div class="card coin stack"><div class="row between"><div><div class="small muted">${t('Spaarpot van {n}', { n: esc(data.name) })}</div><div class="money" style="font-size:30px">${euro(data.wallet.balance)}</div></div><div class="small muted" style="text-align:right">${t('verdiend')} ${euro(data.wallet.earned)}<br>${t('uitbetaald')} ${euro(data.wallet.paid)}<br>🔥 ${t('{n} dagen op rij', { n: data.streak })}</div></div>
      <form class="row" data-payout><div class="field" style="flex:1"><input inputmode="decimal" placeholder="${ZAR() ? t('Bedrag in rand, bv. 2,50') : 'Bedrag in €, bijv. 2,50'}" name="amt"></div><button class="btn">${t('Uitbetalen')}</button></form></div>

    <div class="card stack"><div class="row between"><h2>🧑‍🏫 ${esc(data.teacher)} (${t('AI-leraar')})</h2>${data.ai ? `<span class="chip good">${esc(data.aiProvider)}${data.aiModel ? ' · ' + esc(data.aiModel) : ''}</span>` : `<span class="chip bad">${t('AI uit')}</span>`}</div>
      ${data.ai ? '' : `<p class="small">${t('Zet <code>OPENAI_API_KEY</code> in de instellingen (.env of Railway) om de AI-leraar aan te zetten.')}</p>`}
      <h3>${t('Leerlingprofiel')}</h3>
      <div id="profile">${profileHTML(data.profile)}</div>
      <button class="btn ghost block" data-profile ${data.ai ? '' : 'disabled'}>${t('Profiel bijwerken')}</button>
      <h3 style="margin-top:6px">${t('Wat {m} onthoudt', { m: esc(data.teacher) })}</h3>
      ${data.memory?.length ? `<ul class="small" style="margin:0 0 0 18px;padding:0">${data.memory.map((m) => `<li><span class="muted">${esc(m.d.slice(8))}-${esc(m.d.slice(5, 7))}</span> ${esc(m.n)}</li>`).join('')}</ul>` : `<p class="small muted">${t('Nog niets. Na elke sessie en les schrijft hij korte notities.')}</p>`}
    </div>
    <div class="card stack"><div class="row between"><h2>${t('AI-advies voor jou')}</h2></div>
      <p class="small muted">${t('Samenvatting van de voortgang van {n} en wat je thuis kunt doen.', { n: esc(data.name) })}</p>
      <div id="advice"></div>
      <button class="btn ghost block" data-advice ${data.ai ? '' : 'disabled'}>${t('Maak advies')}</button></div>

    <div class="card"><h2>${t('Onderdelen')}</h2><p class="small muted" style="margin:4px 0 6px">${t('Niveau · score · laatste 14 dagen goed, waarvan met tussenstappen · trend')}</p>
      <p class="small indicatie">ℹ️ ${t('Dit is een indicatie, alleen voor ouders: gebaseerd op de sommen in deze app. Het is geen toets van school en zegt niet precies op welk niveau je kind rekent. Je kind ziet deze balken en niveaus niet, alleen de aanmoediging van {m}.', { m: esc(data.teacher) })}</p>
      <table class="list"><tr><th>${t('Onderdeel')}</th><th>${t('Score')}</th><th>14 d</th><th></th></tr>
      ${data.skills.map((x) => `<tr><td>${x.icon} ${esc(x.label)}${x.struggling ? ` <span class="chip bad">${t('extra hulp')}</span>` : ''}<div class="bar s${sc(x.score)}" style="margin:4px 0"><i style="width:${Math.max(4, x.score)}%"></i></div><div class="small muted">${t('ongeveer {l}-niveau', { l: x.levelName })} · ${t('{n}/5 leerfase', { n: x.guidedWins })}${x.soloBonus ? ` · ${t('{n}× zelf-bonus', { n: x.soloBonus })}` : ''}</div></td><td><b>${x.score}</b> ${trend(x.trend)}</td>
        <td>${accBy[x.cat] ? `${accBy[x.cat].ok}/${accBy[x.cat].n}<div class="small muted">${t('{n} met stappen', { n: accBy[x.cat].guided })} · ${Math.round((accBy[x.cat].avg_ms || 0) / 1000)}s</div>` : '–'}</td><td>${spark(x.cat)}</td></tr>`).join('')}</table></div>

    <form class="card stack" data-rewards><h2>🪙 ${t('Beloning en weekplan')}</h2>
      ${rewardFields(data.rewards, { tr: (nl, a) => (LANG === 'af' ? a : nl), za: data.country === 'ZA', af: LANG === 'af', counts: data.dailyCounts })}
      <p class="small muted">${t('Geldt vanaf de volgende dagtaak.')}</p>
      <button class="btn ghost block">${t('Opslaan')}</button></form>
    <form class="card stack" data-password><h2>🔒 ${t('Ouderwachtwoord')}</h2>
      <p class="small muted">${data.hasPassword ? t('Er is een eigen wachtwoord ingesteld. Hier kun je het veranderen.') : t('Nog geen eigen wachtwoord: je opent het ouderscherm met de pincode van de beheerder. Stel hier een eigen wachtwoord in.')}</p>
      <input type="password" name="pw" autocomplete="new-password" placeholder="${t('nieuw wachtwoord (minstens 4 tekens)')}">
      <input type="password" name="pw2" autocomplete="new-password" placeholder="${t('nog een keer')}">
      <button class="btn ghost block">${t('Wachtwoord opslaan')}</button>
      ${data.hasPassword ? `<button type="button" class="btn ghost block" data-pwclear>${t('Eigen wachtwoord weghalen')}</button>` : ''}</form>

    <form class="card stack" data-research><h2>📊 ${t('Help de app verbeteren')}</h2>
      <p class="small muted">${t('Antwoorden en gesprekken met {m} worden zonder je naam, maar onder een schuilnaam, bewaard. Zo kunnen de makers de uitleg verbeteren. Je kunt dit uitzetten.', { m: esc(data.teacher) })}</p>
      <label class="row"><input type="checkbox" name="on" ${data.research ? 'checked' : ''}> <span>${t('Meehelpen (aanbevolen)')}</span></label>
      <label class="field"><span class="small" style="font-weight:800">${t('Feedback voor de makers: wat valt je op? Wat gaat er mis? Wat kan beter?')}</span><textarea name="text" rows="3" maxlength="3000"></textarea></label>
      <button class="btn ghost block">${t('Versturen')}</button></form>

    <div class="card stack"><h2>🏅 ${t('Eigen oefendoelen')}</h2>
      ${(data.goals || []).length ? `<p class="small">${t('Bezig met:')} ${data.goals.map((g) => `${g.icon} ${esc(g.label)} (${goalText(g).toLowerCase()}, ${g.done}/${g.total})`).join(' · ')}</p>` : `<p class="small muted">${t('Nog geen eigen doel gekozen.')}</p>`}
      ${(data.goalLog || []).length ? `<table class="list">${data.goalLog.map((x, i) => `<tr><td>${esc(x.date.slice(8))}-${esc(x.date.slice(5, 7))}</td><td>🏅 ${esc(x.label)}${x.gift ? `<div class="small muted">🎁 ${esc(x.gift)}</div>` : ''}</td><td style="text-align:right">${x.given ? '✅' : `<button class="btn ghost" data-goalgiven="${i}" style="min-height:34px;padding:0 10px">${t('Gegeven')}</button>`}</td></tr>`).join('')}</table>` : ''}</div>

    <div class="card stack"><h2>🎁 ${t('Wekelijkse verrassing')}</h2>
      <p class="small muted">${t('Eén keer per week, op een willekeurige dag, krijgt {n} een verrassing als de dagtaak goed is gegaan. Een bedrag met "euro" of "rand" gaat automatisch in de spaarpot.', { n: esc(data.name) })}</p>
      <form class="stack" data-surprise style="gap:8px">
        <label class="row"><input type="checkbox" name="enabled" ${data.surprise.cfg.enabled ? 'checked' : ''}> <span>${t('Aan')}</span></label>
        <label class="field"><span class="small" style="font-weight:800">${t('Verrassingen (één per regel)')}</span><textarea name="rewards" rows="4">${esc(data.surprise.cfg.rewards.join('\n'))}</textarea></label>
        <label class="field"><span class="small" style="font-weight:800">${t('Minimaal percentage goed in de dagtaak')}</span><select name="min">${[0.5, 0.6, 0.7, 0.8, 0.9].map((m) => `<option value="${m}" ${Math.abs(m - data.surprise.cfg.min) < 0.01 ? 'selected' : ''}>${m * 100}%</option>`).join('')}</select></label>
        <button class="btn ghost">${t('Opslaan')}</button>
      </form>
      ${data.surprise.list.length ? `<table class="list">${data.surprise.list.map((x, i) => `<tr><td>${esc(x.date.slice(8))}-${esc(x.date.slice(5, 7))}</td><td>${esc(x.reward)}</td><td style="text-align:right">${x.delivered ? '✅' : `<button class="btn ghost" data-delivered="${i}" style="min-height:34px;padding:0 10px">${t('Gegeven')}</button>`}</td></tr>`).join('')}</table>` : `<p class="small muted">${t('Nog geen verrassingen uitgedeeld.')}</p>`}
    </div>

    <div class="card stack"><h2>🔧 ${t('Hoe leert {n}?', { n: esc(data.name) })} <span class="small muted">${t('(onder de motorkap)')}</span></h2>
      ${signalsHTML(data.signals, data.teacher)}</div>

    <div class="card stack"><h2>🔎 ${t('Denkfouten & herhaling')}</h2>
      <p class="small">🔁 ${t('Foutenschrift: <b>{a}</b> sommen staan klaar om te herhalen, <b>{b}</b> zijn inmiddels onder de knie.', { a: data.reviews?.open || 0, b: data.reviews?.done || 0 })}</p>
      ${data.misconceptions?.length ? `<table class="list">${data.misconceptions.map((m) => `<tr><td>${esc(m.misconception)}</td><td style="text-align:right"><b>${m.n}×</b></td></tr>`).join('')}</table>` : `<p class="small muted">${t('Nog geen bekende denkfouten gezien (laatste 30 dagen).')}</p>`}
      ${data.scratchNotes?.length ? `<p style="font-weight:900;margin-top:6px">✏️ ${t('Wat {m} op het kladblaadje zag', { m: esc(data.teacher) })}</p>
        <table class="list">${data.scratchNotes.map((n) => `<tr><td><div class="small">${esc(n.text)} → <b>${esc(n.given)}</b> ${n.correct ? '✅' : '❌'}</div><div>${esc(n.scratch_note)}</div></td></tr>`).join('')}</table>` : ''}
    </div>

    <div class="card"><h2>${t('Badges')}</h2><div class="badges">${data.badges.map((b) => `<div class="badge ${b.earned ? 'on' : ''}" title="${esc(b.text)}"><span>${b.earned ? b.icon : '🔒'}</span><small>${esc(b.title)}</small></div>`).join('')}</div></div>

    <div class="card"><h2>${t('Recente fouten')}</h2>${data.recentWrong.length ? `<table class="list"><tr><th>${t('Som')}</th><th>${t('Antwoord')}</th><th>${t('Goed')}</th></tr>${data.recentWrong.map((w) => `<tr><td><span class="small muted">${esc(w.label)}</span><br>${esc(w.text)}</td><td>${esc(w.given)}</td><td>${esc(w.display)}</td></tr>`).join('')}</table>` : `<p class="muted">${t('Nog geen fouten.')}</p>`}</div>

    <div class="card"><h2>${t('Sessies')}</h2><table class="list"><tr><th>${t('Dag')}</th><th>${t('Soort')}</th><th>${t('Goed')}</th><th>${CENT()}</th><th>${t('Tijd')}</th></tr>
      ${data.sessions.map((s) => `<tr><td>${s.day.slice(8)}-${s.day.slice(5, 7)}</td><td>${kindNl[s.kind]}${s.status === 'active' ? ` <span class="chip">${t('bezig')}</span>` : ''}</td><td>${s.correct}/${s.total}${s.kind === 'daily' ? `<div class="small ${s.rushes ? '' : 'muted'}">${s.rushes ? `🐢 ${t('{n}× gehaast', { n: s.rushes })}` : `✅ ${t('rustig')}`}</div>` : ''}</td><td>${s.points}</td><td>${s.secs ? Math.round(s.secs / 60) + ' min' : ''}</td></tr>`).join('')}</table></div>

    <div class="card"><h2>${t('Geschiedenis van de spaarpot')}</h2><table class="list">${data.ledger.map((l) => `<tr><td>${new Date(l.created_at).toLocaleDateString(LANG === 'af' ? 'af-ZA' : 'nl-NL')}</td><td>${esc(l.note || '')}</td><td style="text-align:right;color:${l.cents < 0 ? 'var(--bad)' : 'var(--good)'}"><b>${l.cents > 0 ? '+' : ''}${l.cents}</b></td></tr>`).join('')}</table></div>

    <div class="card stack"><h2>${t('Instellingen')}</h2>
      <form class="row" data-name><div class="field" style="flex:1"><input name="name" value="${esc(data.name)}" maxlength="30"></div><button class="btn ghost">${t('Naam opslaan')}</button></form>
      <form class="stack" data-kidprofile style="gap:8px">
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <label class="field" style="flex:1"><span class="small" style="font-weight:800">${t('Land')}</span><select name="country">${[['NL', '🇳🇱 Nederland'], ['ZA', '🇿🇦 Suid-Afrika']].map(([v, n]) => `<option value="${v}" ${data.country === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field" style="flex:1"><span class="small" style="font-weight:800">${t('Taal')}</span><select name="lang">${[['nl', 'Nederlands'], ['af', 'Afrikaans']].map(([v, n]) => `<option value="${v}" ${data.lang === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field" style="flex:1"><span class="small" style="font-weight:800">${data.country === 'ZA' ? t('Graad') : t('Groep')}</span><input name="grade" inputmode="numeric" value="${data.grade ?? ''}"></label>
          <label class="field" style="flex:1"><span class="small" style="font-weight:800">${t('Leeftijd')}</span><input name="age" inputmode="numeric" value="${data.age ?? ''}"></label>
        </div>
        <p class="small muted">${t('Let op: bij een andere taal hoort ook een ander lesprogramma (Nederlands = Nederlandse basisschool, Afrikaans = Suid-Afrikaanse KABV). Doe daarna de starttoets opnieuw.')}</p>
        <button class="btn ghost">${t('Profiel opslaan')}</button></form>
      <button class="btn ghost block" data-otherkid>👤 ${t('Ander kind bekijken')}</button>
      <button class="btn ghost block" data-reset="intake">${t('Starttoets opnieuw laten doen')}</button>
      <button class="btn ghost block" data-reset="all" style="color:var(--bad)">${t('Alles wissen (ook de spaarpot)')}</button>
      <button class="btn ghost block" data-delkid style="color:var(--bad)">${t('Profiel van {n} helemaal verwijderen', { n: esc(data.name) })}</button></div>
  </div>`;

  $app.querySelector('[data-profile]').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = t('Bezig…');
    try { const r = await api('/api/parent/profile', {}); $app.querySelector('#profile').innerHTML = profileHTML(r.profile); toast(t('Profiel bijgewerkt ✓')); }
    catch (err) { toast(err.message); }
    e.target.disabled = false; e.target.textContent = t('Profiel bijwerken');
  };
  $app.querySelector('[data-otherkid]').onclick = () => switchKid();
  {
    const tr = (nl, a) => (LANG === 'af' ? a : nl);
    const f = $app.querySelector('[data-rewards]');
    const get = bindRewardFields(f, data.rewards, { tr, za: data.country === 'ZA' });
    f.onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/parent/rewards', get()); STATE = null; toast(t('Opgeslagen ✓')); } catch (er) { toast(er.message); }
    };
    const p = $app.querySelector('[data-password]');
    p.onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/parent/password', { password: p.pw.value, password2: p.pw2.value }); toast(t('Wachtwoord opgeslagen ✓')); renderParent(); } catch (er) { toast(er.message); }
    };
    p.querySelector('[data-pwclear]')?.addEventListener('click', async () => {
      if (!(await ask(`<div class="big-emoji">🔓</div><h2>${t('Eigen wachtwoord verwijderen?')}</h2><p class="muted">${t('Daarna kun je het ouderscherm weer openen met de pincode van de beheerder.')}</p>`, t('Verwijderen'), t('Annuleren')))) return;
      await api('/api/parent/password', { password: '' }); toast(t('Verwijderd')); renderParent();
    });
  }
  {
    const r = $app.querySelector('[data-research]');
    r.on.onchange = async () => { await api('/api/parent/research', { on: r.on.checked }).catch((er) => toast(er.message)); toast(t('Opgeslagen ✓')); };
    r.onsubmit = async (e) => {
      e.preventDefault();
      if (!r.text.value.trim()) return;
      try { await api('/api/parent/feedback', { text: r.text.value }); r.text.value = ''; toast(t('Bedankt voor je feedback! 🙏')); } catch (er) { toast(er.message); }
    };
  }
  $app.querySelector('[data-surprise]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await api('/api/parent/surprise', { enabled: f.enabled.checked, rewards: f.rewards.value.split('\n'), min: Number(f.min.value) });
    toast(t('Opgeslagen ✓'));
  };
  $app.querySelector('[data-kidprofile]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try { await api('/api/parent/kidprofile', { country: f.country.value, lang: f.lang.value, grade: f.grade.value, age: f.age.value }); STATE = null; toast(t('Opgeslagen ✓')); renderParent(); }
    catch (err) { toast(err.message); }
  };
  $app.querySelectorAll('[data-delivered]').forEach((b) => (b.onclick = async () => { await api('/api/parent/surprise/delivered', { index: Number(b.dataset.delivered) }); renderParent(); }));
  $app.querySelectorAll('[data-goalgiven]').forEach((b) => (b.onclick = async () => { await api('/api/parent/goal-given', { index: Number(b.dataset.goalgiven) }); renderParent(); }));
  $app.querySelector('[data-delkid]').onclick = async () => {
    if (!(await ask(`<h2 style="margin-bottom:8px">${t('Profiel van {n} verwijderen?', { n: esc(data.name) })}</h2><p>${t('Alles van dit kind gaat weg: niveaus, spaarpot, badges en alle gegevens die {m} heeft onthouden. Dit kun je niet ongedaan maken.', { m: esc(data.teacher) })}</p>`, t('Ja, verwijderen'), t('Annuleren'), true))) return;
    await api('/api/parent/delete-kid', { confirm: 'VERWIJDER' });
    toast(t('Profiel verwijderd')); switchKid();
  };
  $app.querySelector('[data-logout]').onclick = async () => { await api('/api/parent/logout', {}); location.hash = '#/'; };
  $app.querySelector('[data-payout]').onsubmit = async (e) => {
    e.preventDefault();
    const amt = Math.round(parseFloat(e.target.amt.value.replace(',', '.')) * 100);
    if (!(amt > 0)) return toast(t('Vul een bedrag in'));
    if (!(await ask(`<h2>${t('{b} uitbetalen?', { b: euro(amt) })}</h2>`, t('Ja, uitbetalen'), t('Annuleren')))) return;
    try { await api('/api/parent/payout', { cents: amt }); toast(t('Uitbetaald ✓')); renderParent(); } catch (err) { toast(err.message); }
  };
  $app.querySelector('[data-advice]').onclick = async (e) => {
    const box = $app.querySelector('#advice');
    e.target.disabled = true;
    box.innerHTML = `<div class="ai-box"><span class="loader"></span> ${t('Advies maken…')}</div>`;
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
    toast(t('Opgeslagen ✓'));
  };
  $app.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = async () => {
    const what = b.dataset.reset;
    const ok = await ask(`<h2 style="margin-bottom:8px">${t('Zeker weten?')}</h2><p>${what === 'all' ? t('Alles wordt gewist, ook de spaarpot en badges. Dit kan niet ongedaan worden.') : t('De starttoets wordt opnieuw afgenomen en de niveaus worden opnieuw bepaald. De spaarpot blijft.')}</p>`, what === 'all' ? t('Ja, alles wissen') : t('Ja, opnieuw'), t('Annuleren'), true);
    if (!ok) return;
    await api('/api/parent/reset', { what, confirm: 'RESET' });
    toast(t('Gedaan ✓')); renderParent();
  }));
}

// "Hoe leert hij?" — signalen onder de motorkap. Alleen in het ouder-/leerkrachtscherm, nooit voor het kind.
function signalsHTML(sig, teacher = 'Max') {
  if (!sig?.signals?.length) return `<p class="small muted">${t('Nog geen gegevens.')}</p>`;
  const CH = { 'let op': `<span class="chip bad">${t('let op')}</span>`, ok: '<span class="chip good">ok</span>', onbekend: `<span class="chip">${t('nog te weinig gegevens')}</span>`, info: '<span class="chip">info</span>' };
  const order = { 'let op': 0, info: 1, ok: 2, onbekend: 3 };
  const list = [...sig.signals].sort((a, b) => order[a.status] - order[b.status]);
  return `<div class="stack" style="gap:8px">${list.map((s) => `<div class="card flat" style="padding:10px 12px;${s.status === 'onbekend' ? 'opacity:.6' : ''}">
      <div class="row between"><b>${esc(s.title)}</b>${CH[s.status] || ''}</div>
      ${s.status !== 'onbekend' && s.status !== 'ok' ? `<p class="small" style="margin-top:4px">${esc(s.text)}</p>` : ''}
      ${s.evidence ? `<p class="small muted" style="margin-top:4px">🔍 ${esc(s.evidence)}</p>` : ''}
      ${s.action && s.status === 'let op' ? `<p class="small" style="margin-top:4px">⚙️ <b>${t('Wat de app doet en wat {m} doet:', { m: esc(teacher) })}</b> ${esc(s.action)}</p>` : ''}</div>`).join('')}
    <p class="small muted">${t('Gebaseerd op {n} sommen van de afgelopen 30 dagen. Bewust geen labels voor leerstijlen zoals visueel of auditief: onderzoek laat zien dat lesgeven volgens zo\'n stijl niet beter werkt. Wel: per onderwerp wat aantoonbaar helpt. Het kind ziet dit niet.', { n: sig.n })}</p></div>`;
}

function profileHTML(p) {
  if (!p) return `<p class="small muted">${t('Nog geen gegevens. Na een paar sessies analyseert de AI-leraar automatisch welke denkfouten het kind maakt en wat helpt.')}</p>`;
  const ST = { nieuw: `🆕 ${t('nieuw')}`, 'mee bezig': `🔧 ${t('mee bezig')}`, 'gaat beter': `📈 ${t('gaat beter')}`, opgelost: `✅ ${t('opgelost')}` };
  return `${p.samenvatting ? `<p>${esc(p.samenvatting)}</p>` : ''}
    ${p.sterk?.length ? `<p class="small" style="margin-top:8px"><b>💪 ${t('Sterk:')}</b> ${p.sterk.map(esc).join(' · ')}</p>` : ''}
    ${(p.zwakke_punten || []).map((z) => `<div class="card flat" style="padding:12px;margin-top:8px;${z.status === 'opgelost' ? 'opacity:.65' : ''}">
      <div class="row between"><b>${esc(z.onderdeel)}</b><span class="chip ${z.prioriteit === 'hoog' && z.status !== 'opgelost' ? 'bad' : ''}">${esc(ST[z.status] || z.status || '')}</span></div>
      <p class="small" style="margin-top:4px">${esc(z.punt)}</p>
      ${z.bewijs ? `<p class="small muted" style="margin-top:4px">🔍 ${esc(z.bewijs)}</p>` : ''}
      ${z.wat_helpt ? `<p class="small" style="margin-top:4px"><b>${t('Helpt:')}</b> ${esc(z.wat_helpt)}</p>` : ''}</div>`).join('')}
    ${p.leerstijl ? `<p class="small" style="margin-top:8px"><b>${t('Leerstijl:')}</b> ${esc(p.leerstijl)}</p>` : ''}
    ${(p.onderdelen || []).map((o) => `<div class="card flat" style="padding:12px;margin-top:8px"><div class="row between"><b>${esc(o.onderdeel)}</b><span class="chip ${o.prioriteit === 'hoog' ? 'bad' : ''}">${esc(o.prioriteit || '')}</span></div>
      ${(o.denkfouten || []).length ? `<ul class="small" style="margin:6px 0 0 18px;padding:0">${o.denkfouten.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${o.wat_helpt ? `<p class="small" style="margin-top:6px"><b>Helpt:</b> ${esc(o.wat_helpt)}</p>` : ''}</div>`).join('')}
    ${p.aanpak_tips?.length ? `<p class="small" style="margin-top:8px"><b>${t('Aanpak:')}</b> ${p.aanpak_tips.map(esc).join(' · ')}</p>` : ''}
    ${p.updated_at ? `<p class="small muted" style="margin-top:6px">${t('Bijgewerkt:')} ${new Date(p.updated_at).toLocaleString(LANG === 'af' ? 'af-ZA' : 'nl-NL')}</p>` : ''}`;
}

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
route();
