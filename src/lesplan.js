// De uitleg-les per onderdeel, gestuurd door de app (zoals een instructie op school: voorkennis, voordoen, samen, zelf,
// terugkijken). De app kiest de soort som en maakt alle sommen zelf (met de stappen en tussenstappen van de app), kijkt de
// antwoorden van het kind na en beslist wat er in elke beurt gebeurt. Max verwoordt die beurt alleen (src/ai.js, lesBeurt);
// zonder AI, of als zijn bericht niet klopt, zegt de app het zelf (vasteTekst). Zo rekent Max in de les nooit zelf.
//
// De staat staat per kind en onderdeel in de instellingen (les:<onderdeel>) en bevat de sommen mét antwoorden; het kind
// krijgt alleen de tekst te zien.
import { generate, generateTpl } from './curriculum.js';
import { checkAnswer } from './generators.js';
import { isZelfde, WEET_NIET } from './stapgesprek.js';
import { voorkennisSjablonen } from './methodes/index.js';
import { kaartVoor, doelVoor } from './uitleg/index.js';
import { pick } from './util.js';

// Een plaatje dat je in woorden kunt zeggen (de les is alleen tekst): een rechthoek of rooster.
function inWoorden(q) {
  if (!q?.visual) return q;
  const v = q.visual;
  if (v.kind === 'grid') return { ...q, visual: null, text: `${q.text} (Het is een rechthoek van ${v.w} hokjes breed en ${v.h} hokjes hoog.)` };
  if (v.kind === 'rect') return { ...q, visual: null, text: `${q.text} (Een rechthoek van ${v.w} ${v.unit || ''} bij ${v.h} ${v.unit || ''}.)`.replace(/\s+\./g, '.').replace(/\s{2,}/g, ' ') };
  return q;
}
// Een som voor de les: liefst van deze soort, zonder plaatje (de les is alleen tekst) en met tussenstappen.
function lesSom(tpl, cat, level, { metStappen = true } = {}) {
  for (let k = 0; k < 12; k++) {
    const q = inWoorden((tpl && generateTpl(tpl)) || (cat ? generate(cat, level) : null));
    if (q && !q.visual && (!metStappen || q.guide?.length)) return q;
  }
  // soorten zonder tussenstappen: dan een som zonder tussenstappen (samen = de hele som met een tip)
  if (metStappen) for (let k = 0; k < 6; k++) { const q = inWoorden((tpl && generateTpl(tpl)) || (cat ? generate(cat, level) : null)); if (q && !q.visual) return q; }
  return null;
}
// Welke soort som de les behandelt: de soort waar het kind het laatst fout ging (als die zonder plaatje kan), anders een
// soort van zijn niveau.
export function kiesLesSoort(cat, level, recenteFout = null) {
  const kan = (t) => !!lesSom(t, cat, level);
  if (recenteFout && kan(recenteFout)) return recenteFout;
  // eerst het eigen niveau, dan een niveau hoger of lager (sommige niveaus hebben alleen sommen met een plaatje)
  for (const lv of [level, level + 1, level - 1].filter((x) => x >= 0 && x <= 3)) {
    for (let k = 0; k < 25; k++) { const q = inWoorden(generate(cat, lv)); if (q && !q.visual && q.guide?.length) return q.tpl; }
  }
  for (const lv of [level, level + 1, level - 1].filter((x) => x >= 0 && x <= 3)) for (let k = 0; k < 25; k++) { const q = generate(cat, lv); if (q && !q.visual) return q.tpl; }
  return null;
}

export function maakLes({ cat, level, tpl }) {
  const vb = lesSom(tpl, cat, level), samen = lesSom(tpl, cat, level), z1 = lesSom(tpl, cat, level, { metStappen: false }), z2 = lesSom(tpl, cat, level, { metStappen: false });
  if (!vb || !samen || !z1 || !z2) return null;
  const vkTpl = voorkennisSjablonen(tpl)[0];
  const vkSom = vkTpl ? lesSom(vkTpl, null, null, { metStappen: false }) : null;
  // voorkennis: de eerste tussenstap van een voorkennissom (een kleine, makkelijke vraag), of die som zelf
  const vk = vkSom ? (vkSom.guide?.[0] ? { ...vkSom.guide[0], som: vkSom.text } : { ask: vraagTekst(vkSom), type: vkSom.type, answer: vkSom.answer, display: vkSom.display, options: vkSom.options, tip: vkSom.steps?.[0] || '' }) : null;
  return { cat, level, tpl, fase: 'start', vk, vb, samen, zelf: [z1, z2], i: 0, k: 0, pogingen: 0, naZelf: false, goedTotaal: 0 };
}

const vraagTekst = (q) => (q.type === 'choice' ? `${q.text} (Kies: ${q.options.join(' / ')})` : q.text);
// Klopt wat het kind zegt? goed / fout / leeg (weet het niet of geen antwoord)
export function beoordeel(stap, tekst) {
  const t = String(tekst ?? '').trim();
  if (!t || WEET_NIET.test(t)) return 'leeg';
  if (stap.type === 'choice') {
    const i = stap.options.findIndex((o) => isZelfde(t, o));
    if (i < 0) return /\d/.test(t) ? 'fout' : 'leeg';
    return checkAnswer(stap, String(i)).correct ? 'goed' : 'fout';
  }
  if (checkAnswer(stap, t).correct) return 'goed';
  if (isZelfde(t, stap.display)) return 'goed';
  return /\d/.test(t) ? 'fout' : 'leeg';
}

// Eén beurt van de les. kindTekst = het laatste bericht van het kind (leeg bij de start).
// Geeft { les (nieuwe staat), beurt: { soort, reactie, vraag, voorbeeld, verboden, klaar } }.
export function lesStap(les0, kindTekst) {
  const les = structuredClone(les0);
  const kaart = kaartVoor('nl', les.tpl);
  const beurt = { soort: 'vraag', reactie: null, vraag: null, voorbeeld: null, verboden: [], klaar: false, doel: doelVoor('nl', les.tpl), aanpak: kaart?.aanpak || [] };
  const vraag = (stap, bijSom = stap.som || null, nieuw = false) => { beurt.vraag = { ask: stap.ask, display: stap.display, tip: stap.tip || '', som: bijSom, nieuw }; beurt.verboden = [stap.display]; };
  const zelfVraag = (q) => { beurt.vraag = { ask: vraagTekst(q), display: q.display, tip: '', som: null, zelf: true }; beurt.verboden = [q.display]; };
  const samenStart = () => {
    les.fase = 'samen'; les.i = 0; les.pogingen = 0;
    if (les.samen.guide?.length) vraag(les.samen.guide[0], les.samen.text, true);
    else vraag({ ask: 'Wat is het antwoord?', display: les.samen.display, tip: les.samen.steps?.[0] || '' }, vraagTekst(les.samen), true);
  };
  const naarZelf = () => { les.fase = 'zelf'; les.pogingen = 0; if (les.k >= 2) return naarTerug(); zelfVraag(les.zelf[les.k]); };
  const naarTerug = () => { les.fase = 'terugkijken'; beurt.soort = 'terugkijken'; beurt.vraag = { ask: 'Hoe pak je zo\'n som aan? Zeg het in je eigen woorden.', display: null, tip: '' }; };
  const voordoen = () => { les.fase = 'voordoen'; beurt.soort = 'voordoen'; beurt.voorbeeld = { som: les.vb.text, stappen: les.vb.steps, uitkomst: les.vb.display }; beurt.vraag = { ask: 'Zullen we er nu samen één doen?', display: null, tip: '' }; };
  const fout = (stap, verder) => {
    // eerste keer fout of geen antwoord: een tip en dezelfde vraag; tweede keer: de app zegt het antwoord en gaat verder
    if (les.pogingen === 0) { les.pogingen = 1; beurt.reactie = { soort: 'tip', tip: stap.tip || '' }; return false; }
    les.pogingen = 0; beurt.reactie = { soort: 'zeg', antwoord: stap.display }; verder(); return true;
  };

  if (les.fase === 'start') {
    beurt.reactie = { soort: 'start' };
    if (les.vk) { les.fase = 'voorkennis'; vraag(les.vk, les.vk.som || null, true); } else voordoen();
    return { les, beurt };
  }
  if (les.fase === 'voorkennis') {
    const r = beoordeel(les.vk, kindTekst);
    if (r === 'goed') { beurt.reactie = { soort: 'goed' }; voordoen(); }
    else if (!fout(les.vk, voordoen)) vraag(les.vk);
    return { les, beurt };
  }
  if (les.fase === 'voordoen') { beurt.reactie = { soort: 'door' }; samenStart(); return { les, beurt }; }
  if (les.fase === 'samen') {
    const q = les.samen, slot = les.i >= q.guide.length;
    const stap = slot ? { ask: q.guideFinal ? `${q.guideFinal}. Wat is het antwoord van de som?` : 'Wat is het antwoord van de som?', type: q.type, answer: q.answer, display: q.display, options: q.options, tip: 'Kijk naar je tussenstappen: wat moet je er nog mee doen?' } : q.guide[les.i];
    const verder = () => {
      if (slot) { les.k += les.naZelf ? 1 : 0; les.naZelf = false; return naarZelf(); }
      les.i++;
      if (les.i < q.guide.length) vraag(q.guide[les.i], q.text);
      else vraag({ ask: q.guideFinal ? `${q.guideFinal}. Wat is het antwoord van de som?` : 'Wat is het antwoord van de som?', display: q.display, tip: 'Kijk naar je tussenstappen: wat moet je er nog mee doen?' }, q.text);
    };
    const r = beoordeel(stap, kindTekst);
    if (r === 'goed') { beurt.reactie = { soort: 'goed' }; les.pogingen = 0; verder(); }
    else if (!fout(stap, verder)) vraag(stap, q.text);
    return { les, beurt };
  }
  if (les.fase === 'zelf') {
    const q = les.zelf[les.k];
    const r = beoordeel(q, kindTekst);
    if (r === 'goed') { beurt.reactie = { soort: 'goed' }; les.goedTotaal++; les.k++; naarZelf(); return { les, beurt }; }
    // fout bij een zelf-som: die som samen, stap voor stap (heeft hij geen tussenstappen, dan zegt de app het antwoord)
    if (q.guide?.length) { beurt.reactie = { soort: 'samen_na_fout' }; les.samen = q; les.naZelf = true; samenStart(); return { les, beurt }; }
    if (!fout({ ...q, tip: q.steps?.[0] || '' }, () => { les.k++; naarZelf(); })) zelfVraag(q);
    return { les, beurt };
  }
  if (les.fase === 'terugkijken') {
    les.fase = 'klaar'; beurt.soort = 'afsluiten'; beurt.reactie = { soort: 'door' }; beurt.vraag = null; beurt.klaar = true;
    return { les, beurt };
  }
  beurt.soort = 'afsluiten'; beurt.klaar = true; beurt.vraag = null;
  return { les, beurt };
}

const kop = (t) => String(t || '').replace(/\s*=\s*\??\s*$/, '');
// De beurt in vaste woorden (zonder AI, of als Max' bericht niet klopt). Kort en kindvriendelijk.
export function vasteTekst(beurt, name = '') {
  const delen = [];
  const r = beurt.reactie || {};
  if (r.soort === 'start') delen.push(`Hoi${name ? ` ${name}` : ''}! ${beurt.doel ? `We gaan dit leren: ${beurt.doel.replace(/^Ik kan /, 'je kunt straks ').replace(/^Ik weet /, 'je weet straks ')}` : 'We gaan samen oefenen.'}${beurt.soort === 'vraag' ? ' Eerst even opwarmen.' : ''}`);
  if (r.soort === 'goed') delen.push(pick(['Goed zo!', 'Klopt!', 'Precies!', 'Helemaal goed.']));
  if (r.soort === 'tip') delen.push(`Nog niet helemaal.${r.tip ? ` Tip: ${r.tip}` : ''}`);
  if (r.soort === 'zeg') delen.push(`Het is ${r.antwoord}. Kijk er nog eens naar; we gaan verder.`);
  if (r.soort === 'samen_na_fout') delen.push('Nog niet goed. Die doen we samen, stap voor stap.');
  if (beurt.soort === 'voordoen' && beurt.voorbeeld) delen.push(`${/[?]/.test(beurt.voorbeeld.som) ? `Kijk mee bij deze som: ${beurt.voorbeeld.som}` : `Kijk mee hoe ik ${kop(beurt.voorbeeld.som)} uitreken.`} ${beurt.voorbeeld.stappen.map((x) => (/[.!?:]$/.test(x.trim()) ? x.trim() : `${x.trim()}.`)).join(' ')}`);
  if (beurt.soort === 'afsluiten') delen.push(`Goed gedaan! Zo pak je het aan: ${beurt.aanpak.slice(0, 3).join(' ')} Je bent klaar om te oefenen.`);
  if (beurt.vraag) delen.push(beurt.vraag.zelf ? `Nu helemaal zelf: ${beurt.vraag.ask}` : beurt.vraag.nieuw && beurt.vraag.som ? `${r.soort === 'door' || r.soort === 'samen_na_fout' ? 'Samen: ' : ''}${kop(beurt.vraag.som)}${/[?.!]$/.test(kop(beurt.vraag.som)) ? '' : '.'} ${beurt.vraag.ask}` : beurt.vraag.ask);
  return delen.join(' ').replace(/\s+/g, ' ').trim();
}
