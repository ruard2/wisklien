// Uitlegkaarten per sjabloon (soort som), per taal. Bron van waarheid voor HOE een soort som wordt uitgelegd:
// Max krijgt de kaart van de som mee, en de vaste uitleg (stappenplan, tussenstappen) volgt dezelfde aanpak.
// Nederlands: zoals Nederlandse methodes het aanleren (o.a. De wereld in getallen, Pluspunt, Rekenrijk, Getal & Ruimte Junior).
// Afrikaans: zoals Suid-Afrikaanse skole volgens KABV/CAPS en die DBE-werkboeke dit leer.
import { KAARTEN as NL } from './nl.js';
import { KAARTEN as AF } from './af.js';

const BY = { nl: NL, af: AF };
export const kaartVoor = (lang, tpl) => (tpl ? BY[lang === 'af' ? 'af' : 'nl'][tpl] || null : null);
export const alleKaarten = (lang) => BY[lang === 'af' ? 'af' : 'nl'];

// Tekst voor Max (in de context van een gesprek over deze som)
export function kaartTekst(lang, tpl) {
  const k = kaartVoor(lang, tpl);
  if (!k) return '';
  // Opschriften in de taal van het kind: Max neemt woorden uit de kaart over (meetlat AF #5: Nederlandse woorden in Afrikaans).
  const T = lang === 'af'
    ? { kop: `VERDUIDELIKKAART vir hierdie soort som ("${k.naam}") — dit gaan voor alles; die app (stapplan en tussenstappe) gebruik presies hierdie aanpak. Die kaart geld vir alle somme van hierdie soort: reken altyd met die getalle van HIERDIE som. ’n Getal op die kaart is net ’n vaste feit (1 uur = 60 minute) of ’n kleiner voorbeeld ("bv. …").`, aanpak: 'Aanpak (in hierdie volgorde)', model: 'Model/prentjie wat jy gebruik', woorden: 'Woorde', valkuilen: 'Tipiese foute by hierdie som en wat help', concreter: 'Verstaan die kind dit nie', niet: 'Moenie' }
    : { kop: `UITLEGKAART voor deze soort som ("${k.naam}") — dit gaat vóór alles; de app (stappenplan en tussenstappen) gebruikt precies deze aanpak. De kaart geldt voor alle sommen van deze soort: reken altijd met de getallen van DEZE som. Een getal op de kaart is alleen een vast feit (1 uur = 60 minuten) of een kleiner voorbeeld ("bijv. …").`, aanpak: 'Aanpak (in deze volgorde)', model: 'Model/plaatje dat je gebruikt', woorden: 'Woorden', valkuilen: 'Typische fouten bij deze som en wat helpt', concreter: 'Snapt het kind het niet', niet: 'Doe NIET' };
  const L = [T.kop];
  if (k.aanpak?.length) L.push(`${T.aanpak}:\n${k.aanpak.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`);
  if (k.model) L.push(`${T.model}: ${k.model}`);
  if (k.woorden) L.push(`${T.woorden}: ${k.woorden}`);
  if (k.valkuilen?.length) L.push(`${T.valkuilen}:\n${k.valkuilen.map((v) => `  - ${v}`).join('\n')}`);
  if (k.concreter) L.push(`${T.concreter}: ${k.concreter}`);
  if (k.niet?.length) L.push(`${T.niet}:\n${k.niet.map((v) => `  - ${v}`).join('\n')}`);
  return L.join('\n');
}
