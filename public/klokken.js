// Realistische klokken voor tijd-sommen en voor de uitleg van Max (SVG, geen afbeeldingen nodig).
// Analoog: wandklok, wekker (met belletjes), horloge. Digitaal: wekkerradio (rode 7-segment-cijfers),
// oven/magnetron (groen), telefoon (vergrendelscherm), vertrekbord (trein).
// Echte klokken hebben altijd een witte wijzerplaat, ook in donkere modus.
(function () {
  const parseHM = (s) => { const m = String(s ?? '').match(/(\d{1,2})[:.](\d{2})/); return m ? [Number(m[1]), Number(m[2])] : null; };
  const pad = (n) => String(n).padStart(2, '0');
  let uid = 0;

  // ---------- analoge wijzerplaat (middelpunt cx,cy; straal r) ----------
  function face(cx, cy, r, h, m, { numbers = true, rimFill, rimStroke = '#111', faceFill = '#fbfaf5', id }) {
    const tick = (i) => {
      const a = (i * 6 - 90) * Math.PI / 180, big = i % 5 === 0;
      const r1 = r * 0.95, r2 = r * (big ? 0.84 : 0.9);
      return `<line x1="${cx + Math.cos(a) * r1}" y1="${cy + Math.sin(a) * r1}" x2="${cx + Math.cos(a) * r2}" y2="${cy + Math.sin(a) * r2}" stroke="#222" stroke-width="${big ? r * 0.035 : r * 0.015}" stroke-linecap="round"/>`;
    };
    const num = (i) => {
      const a = (i * 30 - 90) * Math.PI / 180, rr = r * 0.7;
      return `<text x="${cx + Math.cos(a) * rr}" y="${cy + Math.sin(a) * rr}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${r * 0.2}" fill="#1b1b1b">${i || 12}</text>`;
    };
    // uurwijzer schuift mee met de minuten (zoals op een echte klok)
    const hourDeg = ((h % 12) + m / 60) * 30, minDeg = m * 6;
    const hand = (deg, len, width, tail, fill) => {
      const w = width / 2;
      return `<g transform="rotate(${deg} ${cx} ${cy})"><path d="M ${cx - w} ${cy + tail} L ${cx - w * 0.75} ${cy - len + w} Q ${cx} ${cy - len - w} ${cx + w * 0.75} ${cy - len + w} L ${cx + w} ${cy + tail} Z" fill="${fill}"/></g>`;
    };
    return `
      <defs>
        <radialGradient id="glass${id}" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <radialGradient id="dial${id}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${faceFill}"/><stop offset="1" stop-color="#e9e6dc"/></radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r * 1.1}" fill="${rimFill}" stroke="${rimStroke}" stroke-width="${r * 0.03}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dial${id})" stroke="#00000033" stroke-width="${r * 0.02}"/>
      ${Array.from({ length: 60 }, (_, i) => tick(i)).join('')}
      ${numbers ? Array.from({ length: 12 }, (_, i) => num(i)).join('') : ''}
      ${hand(hourDeg, r * 0.5, r * 0.085, r * 0.12, '#151515')}
      ${hand(minDeg, r * 0.8, r * 0.055, r * 0.14, '#151515')}
      <circle cx="${cx}" cy="${cy}" r="${r * 0.065}" fill="#151515"/><circle cx="${cx}" cy="${cy}" r="${r * 0.025}" fill="#9a9a9a"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glass${id})"/>`;
  }

  // ---------- analoog: wandklok, wekker, horloge ----------
  function analog(time, look = 'wall', label = '') {
    const hm = parseHM(time);
    if (!hm) return '';
    const [h, m] = hm, id = ++uid;
    const cap = label ? `<text x="100" y="${look === 'alarm' ? 252 : 222}" text-anchor="middle" font-size="16" font-weight="800" fill="currentColor">${label}</text>` : '';
    if (look === 'alarm') {
      // klassieke wekker: rode kast, twee belletjes, hamertje, pootjes
      // belletjes zitten schuin bovenop de kast (op "10" en "2"), hamertje ertussen
      const bell = (x, y, rot) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M ${x - 25} ${y + 6} A 25 25 0 0 1 ${x + 25} ${y + 6} Z" fill="url(#metal${id})" stroke="#666" stroke-width="1.5"/><rect x="${x - 3}" y="${y - 24}" width="6" height="8" rx="2" fill="#777"/></g>`;
      return `<svg viewBox="0 0 200 ${label ? 262 : 240}" role="img" aria-label="wekker ${pad(h)}:${pad(m)}">
        <defs><linearGradient id="metal${id}" x1="0" x2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".5" stop-color="#b9bcc2"/><stop offset="1" stop-color="#eceff2"/></linearGradient>
        <linearGradient id="red${id}" x1="0" x2="1"><stop offset="0" stop-color="#e2463e"/><stop offset=".55" stop-color="#c9231b"/><stop offset="1" stop-color="#8f140f"/></linearGradient></defs>
        <path d="M 66 210 L 52 234 M 134 210 L 148 234" stroke="#5a5a5a" stroke-width="9" stroke-linecap="round"/>
        <path d="M 72 64 Q 100 40 128 64" fill="none" stroke="#777" stroke-width="6" stroke-linecap="round"/>
        ${bell(56, 72, -38)}${bell(144, 72, 38)}
        <rect x="97" y="52" width="6" height="18" rx="2" fill="#888"/>
        ${face(100, 138, 72, h, m, { rimFill: `url(#red${id})`, rimStroke: '#6d0f0b', id })}
        ${cap}</svg>`;
    }
    if (look === 'watch') {
      return `<svg viewBox="0 0 200 ${label ? 232 : 210}" role="img" aria-label="horloge ${pad(h)}:${pad(m)}">
        <defs><linearGradient id="strap${id}" x1="0" x2="1"><stop offset="0" stop-color="#6b4226"/><stop offset=".5" stop-color="#8a5a36"/><stop offset="1" stop-color="#5a361f"/></linearGradient>
        <linearGradient id="steel${id}" x1="0" x2="1"><stop offset="0" stop-color="#d9dde2"/><stop offset=".5" stop-color="#8d939b"/><stop offset="1" stop-color="#e6e9ec"/></linearGradient></defs>
        <rect x="68" y="0" width="64" height="60" rx="8" fill="url(#strap${id})"/><rect x="68" y="150" width="64" height="60" rx="8" fill="url(#strap${id})"/>
        <rect x="174" y="98" width="10" height="14" rx="3" fill="url(#steel${id})"/>
        ${face(100, 105, 64, h, m, { rimFill: `url(#steel${id})`, rimStroke: '#6f747b', id })}
        ${cap}</svg>`;
    }
    // wandklok (zoals in de klas): zwarte rand
    return `<svg viewBox="0 0 200 ${label ? 230 : 200}" role="img" aria-label="klok ${pad(h)}:${pad(m)}">
      <defs><linearGradient id="rim${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a4a"/><stop offset=".5" stop-color="#1c1c1c"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient></defs>
      ${face(100, 100, 86, h, m, { rimFill: `url(#rim${id})`, id })}
      ${cap}</svg>`;
  }

  // ---------- 7-segment-cijfers (wekkerradio, oven) ----------
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': '' };
  function digit(ch, x, y, w, h, on, off) {
    // 7 afgeronde balkjes, binnen het eigen vakje; uit = heel zwak zichtbaar (zoals op een echt display)
    const t = w * 0.19, half = h / 2, lit = SEG[ch] ?? '';
    const col = (k) => (lit.includes(k) ? on : off);
    const H = (k, yy) => `<rect x="${x + t * 0.9}" y="${yy - t / 2}" width="${w - t * 1.8}" height="${t}" rx="${t / 2}" fill="${col(k)}"/>`;
    const V = (k, xx, yy) => `<rect x="${xx}" y="${yy + t * 0.7}" width="${t}" height="${half - t * 1.4}" rx="${t / 2}" fill="${col(k)}"/>`;
    return `${H('a', y + t / 2)}${H('g', y + half)}${H('d', y + h - t / 2)}${V('f', x, y)}${V('b', x + w - t, y)}${V('e', x, y + half)}${V('c', x + w - t, y + half)}`;
  }
  // tijd gecentreerd rond cx: 4 cijfers met dubbele punt
  function segTime(h, m, cx, y, dw, dh, on, off, glow) {
    const str = `${h < 10 ? ' ' : Math.floor(h / 10)}${h % 10}${pad(m)}`;
    const gap = dw * 0.35, colon = dw * 0.6, total = 4 * dw + 2 * gap + colon;
    let out = '', x = cx - total / 2;
    for (let i = 0; i < 4; i++) {
      out += digit(str[i], x, y, dw, dh, on, off);
      x += dw;
      if (i === 1) { out += `<circle cx="${x + colon / 2}" cy="${y + dh * 0.3}" r="${dw * 0.085}" fill="${on}"/><circle cx="${x + colon / 2}" cy="${y + dh * 0.7}" r="${dw * 0.085}" fill="${on}"/>`; x += colon; }
      else if (i < 3) x += gap;
    }
    return `<g ${glow ? `style="filter:drop-shadow(0 0 2px ${on})"` : ''}>${out}</g>`;
  }

  // ---------- digitaal: wekkerradio, oven/magnetron, telefoon ----------
  function digital(time, look = 'alarm', label = '') {
    const hm = parseHM(time);
    if (!hm) return '';
    const [h, m] = hm, id = ++uid;
    const cap = label ? `<text x="160" y="${look === 'phone' ? 344 : 176}" text-anchor="middle" font-size="16" font-weight="800" fill="currentColor">${label}</text>` : '';
    if (look === 'phone') {
      const d = new Date();
      const dag = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'][d.getDay()];
      return `<svg viewBox="0 0 320 ${label ? 352 : 330}" role="img" aria-label="telefoon ${pad(h)}:${pad(m)}">
        <defs><linearGradient id="wall${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b5bdb"/><stop offset=".55" stop-color="#7048e8"/><stop offset="1" stop-color="#e64980"/></linearGradient></defs>
        <rect x="80" y="4" width="160" height="320" rx="26" fill="#111"/><rect x="88" y="12" width="144" height="304" rx="20" fill="url(#wall${id})"/>
        <rect x="136" y="18" width="48" height="10" rx="5" fill="#111"/>
        <text x="160" y="78" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#fff" opacity=".9">${dag}</text>
        <text x="160" y="130" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="300" fill="#fff">${pad(h)}:${pad(m)}</text>
        <rect x="128" y="300" width="64" height="5" rx="2.5" fill="#fff" opacity=".8"/>${cap}</svg>`;
    }
    if (look === 'oven') {
      return `<svg viewBox="0 0 320 ${label ? 184 : 160}" role="img" aria-label="oven ${pad(h)}:${pad(m)}">
        <defs><linearGradient id="steel${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e6ea"/><stop offset=".5" stop-color="#b6bbc2"/><stop offset="1" stop-color="#d4d8dd"/></linearGradient></defs>
        <rect x="4" y="10" width="312" height="140" rx="10" fill="url(#steel${id})" stroke="#8a9098"/>
        <rect x="70" y="34" width="180" height="92" rx="8" fill="#0b0f0c" stroke="#333"/>
        ${segTime(h, m, 160, 48, 30, 64, '#46e08b', '#0c1a10', true)}
        <circle cx="36" cy="80" r="20" fill="#2b2f33" stroke="#999" stroke-width="3"/><line x1="36" y1="80" x2="36" y2="64" stroke="#ddd" stroke-width="4" stroke-linecap="round"/>
        <circle cx="284" cy="80" r="20" fill="#2b2f33" stroke="#999" stroke-width="3"/><line x1="284" y1="80" x2="298" y2="72" stroke="#ddd" stroke-width="4" stroke-linecap="round"/>${cap}</svg>`;
    }
    // wekkerradio: zwarte kast, rode cijfers
    return `<svg viewBox="0 0 320 ${label ? 184 : 160}" role="img" aria-label="digitale wekker ${pad(h)}:${pad(m)}">
      <defs><linearGradient id="box${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d44"/><stop offset="1" stop-color="#15171b"/></linearGradient></defs>
      <rect x="10" y="12" width="300" height="130" rx="22" fill="url(#box${id})" stroke="#000"/>
      <rect x="30" y="30" width="260" height="94" rx="10" fill="#0a0303" stroke="#2a2a2a"/>
      ${segTime(h, m, 160, 42, 42, 70, '#ff3b30', '#1e0605', true)}
      <text x="276" y="118" text-anchor="end" font-family="Arial" font-size="10" fill="#ff3b30" opacity=".8">AL</text>
      <rect x="40" y="142" width="36" height="8" rx="3" fill="#111"/><rect x="244" y="142" width="36" height="8" rx="3" fill="#111"/>${cap}</svg>`;
  }

  // ---------- vertrekbord (trein/bus) ----------
  function board(rows, title = 'Vertrek', heads = ['Tijd', 'Naar', 'Spoor']) {
    const r = (rows || []).slice(0, 4);
    const line = (x, y, txt, color = '#fff', size = 17, weight = 700) => `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${txt}</text>`;
    return `<svg viewBox="0 0 340 ${70 + r.length * 34}" role="img" aria-label="vertrekbord">
      <rect x="2" y="2" width="336" height="${66 + r.length * 34}" rx="10" fill="#0d2a6b" stroke="#061638" stroke-width="3"/>
      <rect x="2" y="2" width="336" height="36" rx="10" fill="#f2c200"/><rect x="2" y="26" width="336" height="12" fill="#f2c200"/>
      ${line(16, 27, title, '#0d2a6b', 18, 900)}
      ${line(16, 62, heads[0], '#9fb6e6', 13)}${line(86, 62, heads[1], '#9fb6e6', 13)}${line(290, 62, heads[2], '#9fb6e6', 13)}
      ${r.map((x, i) => `${line(16, 92 + i * 34, (parseHM(x.time) ? `${pad(parseHM(x.time)[0])}:${pad(parseHM(x.time)[1])}` : x.time), '#ffd84d')}${line(86, 92 + i * 34, x.to)}${line(302, 92 + i * 34, x.track || '')}`).join('')}</svg>`;
  }

  // Meerdere klokken naast elkaar (bijv. begin en eind)
  function row(items) {
    return `<div class="clock-row">${items.map((it) => `<div>${it.digital ? digital(it.time, it.look, it.label) : analog(it.time, it.look, it.label)}</div>`).join('')}</div>`;
  }

  window.KLOK = { analog, digital, board, row, parseHM };
})();
