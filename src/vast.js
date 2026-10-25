// Vaste beurten: momenten in het gesprek waarop de app zelf al precies weet wat Max moet zeggen, omdat de regels in de
// prompt het letterlijk voorschrijven. Dan vragen we het niet aan de AI (kost geld en tijd, en kan alleen maar afwijken).
//  1. Opening na een fout mét herkende denkfout: de denkfout + wat helpt + de eerste tussenstap als vraag.
//  2. Opening na een fout zónder herkende denkfout: "x klopt nog niet. Hoe kwam je daarop?" (zo staat het in de regels).
//     Met een kladblok erbij niet: dan kijkt Max echt naar de uitwerking.
//  3. Vast bij een tussenstap en de app heeft een nagerekend makkelijker voorbeeld: dat voorbeeld vragen.
//  4. Het kind rekent dat voorbeeld goed uit: bevestigen en terug naar de echte stap.
//  5. "Hoe begin ik?" vóór het antwoord: de eerste tussenstap (die de app zelf ook laat invullen).
//  6. "Ik snap het! 👍" na de uitleg: kort compliment.
// Alles wat niet in die vormen past (een eigen vraag of uitleg van het kind, het kladblok, een fout antwoord op het
// voorbeeld) gaat gewoon naar Max. Elke vaste beurt gaat door dezelfde verklap-controle als een AI-beurt.
import { makkelijker } from './tips.js';
import { verklaptAntwoord } from './kwaliteit.js';

const kies = (lijst, sleutel) => lijst[[...String(sleutel)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % lijst.length];
const getal = (s) => { const m = String(s || '').match(/-?\d+(?:[.,]\d+)?/g); return m && m.length === 1 ? Number(m[0].replace(',', '.')) : null; };
const vraagVan = (st) => { const a = String(st.ask).replace(/\s+—.*$/, '').trim(); return a.includes('?') ? a : a.replace(/([^.!:])$/, '$1?'); };
const isKnop = (tekst, ...knoppen) => knoppen.some((k) => String(tekst || '').trim().toLowerCase().startsWith(k.toLowerCase()));

export function vasteBeurt({ question: q, phase, given, chat = [], step, misconception, scratch, af = false }) {
  const Z = (nl, a) => (af ? a : nl);
  const leraar = chat.filter((m) => m.role === 'teacher');
  const kind = chat.filter((m) => m.role !== 'teacher');
  const laatste = chat.at(-1)?.role !== 'teacher' ? chat.at(-1)?.text || '' : '';
  const g0 = (q.guide || []).find((s) => s.type !== 'choice');
  const metKlad = !!(scratch?.text || scratch?.image);
  const veilig = (t) => (t && !verklaptAntwoord(t, q.display, { som: q.text, kind: kind.map((m) => m.text).join(' \n ') }) ? t : null);

  // 1 + 2: opening na een fout (de app opent het gesprek zelf, zonder bericht van het kind)
  if (phase === 'wrong' && !leraar.length && !kind.length && !metKlad) {
    const gg = String(given ?? '').trim();
    if (misconception?.label) {
      const eerste = g0 ? Z(` Begin zo: ${vraagVan(g0)}`, ` Begin so: ${vraagVan(g0)}`) : Z(' Probeer het nog eens!', ' Probeer weer!');
      return veilig(`${kies(Z(['Bijna!', 'Goed geprobeerd!', 'Kijk even mee.'], ['Amper!', 'Goed probeer!', 'Kyk saam met my.']), q.text)} ${misconception.label} ${misconception.fix || ''}${eerste}`.replace(/\s+/g, ' ').trim());
    }
    if (gg && !/^\?+$/.test(gg)) return veilig(kies(Z([
      `${gg} klopt nog niet. Hoe heb je het uitgerekend? Vertel maar wat je deed.`,
      `Hmm, ${gg} is het nog niet. Hoe kwam je op ${gg}?`,
      `Nog niet goed, maar we zoeken het samen uit. Hoe kwam je op ${gg}?`,
    ], [
      `${gg} is nog nie reg nie. Hoe het jy dit uitgereken? Vertel my wat jy gedoen het.`,
      `Hmm, ${gg} is dit nog nie. Hoe het jy by ${gg} uitgekom?`,
      `Nog nie reg nie, maar ons sal dit saam uitwerk. Hoe het jy by ${gg} uitgekom?`,
    ]), q.text));
    if (g0) return veilig(Z(`Geeft niks, we doen het samen. Begin zo: ${vraagVan(g0)}`, `Toemaar, ons doen dit saam. Begin so: ${vraagVan(g0)}`));
    return null;
  }

  // 3 + 4: vast bij een tussenstap
  if (phase === 'step' && step) {
    const v = makkelijker(step.ask, step.answer, [q.answer]);
    if (!v) return null;
    const som = v.vraag || v.som.includes('?') ? v.som : `${v.som} = ?`;
    const vorig = leraar.at(-1)?.text || '';
    if (!vorig.includes(v.som)) {
      if (laatste && !isKnop(laatste, 'Ik snap deze stap niet', 'Geef een voorbeeld', 'Ek verstaan nie hierdie stap nie', 'Gee ’n voorbeeld', "Gee 'n voorbeeld")) return null;
      return veilig(Z(`Geen zorgen! We maken het eerst makkelijker. Reken deze eens uit: ${som}`, `Moenie worry nie! Ons maak dit eers makliker. Reken hierdie een uit: ${som}`));
    }
    if (getal(laatste) != null && getal(laatste) === Number(v.uitkomst))
      return veilig(Z(`Ja, precies! De echte stap gaat net zo: ${vraagVan(step)}`, `Ja, presies! Die regte stap werk net so: ${vraagVan(step)}`));
    return null;
  }

  // 5: "Hoe begin ik?" vóór het antwoord
  if (phase === 'before' && g0 && kind.length === 1 && !leraar.length && isKnop(laatste, 'Hoe begin ik', 'Hoe begin ek'))
    return veilig(`${Z('Begin zo:', 'Begin so:')} ${vraagVan(g0)}${g0.tip ? ` ${Z('Tip:', 'Wenk:')} ${g0.tip}` : ''}`);

  // 6: "Ik snap het! 👍"
  if (leraar.length && isKnop(laatste, 'Ik snap het!', 'Ek verstaan dit!'))
    return Z('Top! 💪 Dan lukt het je de volgende keer vast zelf.', 'Puik! 💪 Dan kry jy dit volgende keer self reg.');
  return null;
}
