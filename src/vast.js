// Vaste beurten: momenten in het gesprek waarop de app zelf al precies weet wat Max moet zeggen, omdat de regels in de
// prompt het letterlijk voorschrijven. Dan vragen we het niet aan de AI (kost geld en tijd, en kan alleen maar afwijken).
//  1. Opening na een fout mét herkende denkfout: de denkfout + wat helpt + de eerste tussenstap als vraag.
//  2. Opening na een fout zónder herkende denkfout: "x klopt nog niet. Hoe kwam je daarop?" (zo staat het in de regels).
//     Met een kladblok erbij niet: dan kijkt Max echt naar de uitwerking.
//  3. (Vast bij een tussenstap: het makkelijker voorbeeld vraagt Max zelf, met de brug erbij; zie meetlat #17/#18.)
//  4. Het kind rekent dat voorbeeld van Max goed uit: bevestigen en terug naar de echte stap.
//  5. ("Hoe begin ik?" blijft bij Max.)
//  6. "Ik snap het! 👍" na de uitleg: kort compliment.
// Alles wat niet in die vormen past (een eigen vraag of uitleg van het kind, het kladblok, een fout antwoord op het
// voorbeeld) gaat gewoon naar Max. Elke vaste beurt gaat door dezelfde verklap-controle als een AI-beurt.
import { makkelijker } from './tips.js';
import { verklaptAntwoord } from './kwaliteit.js';

const kies = (lijst, sleutel) => lijst[[...String(sleutel)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % lijst.length];
const getal = (s) => { const m = String(s || '').match(/-?\d+(?:[.,]\d+)?/g); return m && m.length === 1 ? Number(m[0].replace(',', '.')) : null; };
const vraagVan = (st) => { const a = String(st.ask).replace(/\s+—.*$/, '').trim(); return a.includes('?') ? a : a.replace(/([^.!:])$/, '$1?'); };
// onzichtbaar label voor het gespreksplan na een fout: de vraag die we stellen met het juiste antwoord (src/foutgesprek.js)
const label = (st) => `[VB: ${String(st.ask).replace(/\s+—.*$/, '').replace(/\s*=\s*\?.*$/, '').trim()} = ${st.display}]`;
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
      const t = veilig(`${kies(Z(['Bijna!', 'Goed geprobeerd!', 'Kijk even mee.'], ['Amper!', 'Goed probeer!', 'Kyk saam met my.']), q.text)} ${misconception.label} ${misconception.fix || ''}${eerste}`.replace(/\s+/g, ' ').trim());
      return t && g0 ? `${t}\n${label(g0)}` : t;
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
    if (g0) { const t = veilig(Z(`Geeft niks, we doen het samen. Begin zo: ${vraagVan(g0)}`, `Toemaar, ons doen dit saam. Begin so: ${vraagVan(g0)}`)); return t ? `${t}\n${label(g0)}` : t; }
    return null;
  }

  // 3 + 4: vast bij een tussenstap
  if (phase === 'step' && step) {
    const v = makkelijker(step.ask, step.answer, [q.answer]);
    if (!v) return null;
    const vorig = leraar.at(-1)?.text || '';
    // Het voorbeeld zelf vragen laten we aan Max: meetlat #17/#18 gaf een kaal vast voorbeeld 3,5 tegen 4,1–4,3 voor Max,
    // omdat Max er de aanpak van de stap en de brug naar de echte stap bij zet. De app geeft Max het voorbeeld wel mee.
    if (!vorig.includes(v.som)) return null;
    if (getal(laatste) != null && getal(laatste) === Number(v.uitkomst))
      return veilig(Z(`Ja, precies! De echte stap gaat net zo: ${vraagVan(step)}`, `Ja, presies! Die regte stap werk net so: ${vraagVan(step)}`));
    return null;
  }

  // "Hoe begin ik?" blijft bij Max (meetlat #17: vast 4,64 tegen Max 4,88; het kind ziet de eerste tussenstap al als hint).

  // 6: "Ik snap het! 👍"
  if (leraar.length && isKnop(laatste, 'Ik snap het!', 'Ek verstaan dit!'))
    return Z('Top! 💪 Dan lukt het je de volgende keer vast zelf.', 'Puik! 💪 Dan kry jy dit volgende keer self reg.');
  return null;
}
