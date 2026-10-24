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
  const L = [`UITLEGKAART voor deze soort som ("${k.naam}") — dit gaat vóór alles; de app (stappenplan en tussenstappen) gebruikt precies deze aanpak:`];
  if (k.aanpak?.length) L.push(`Aanpak (in deze volgorde):\n${k.aanpak.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`);
  if (k.model) L.push(`Model/plaatje dat je gebruikt: ${k.model}`);
  if (k.woorden) L.push(`Woorden: ${k.woorden}`);
  if (k.valkuilen?.length) L.push(`Typische fouten bij deze som en wat helpt:\n${k.valkuilen.map((v) => `  - ${v}`).join('\n')}`);
  if (k.concreter) L.push(`Snapt het kind het niet: ${k.concreter}`);
  if (k.niet?.length) L.push(`Doe NIET:\n${k.niet.map((v) => `  - ${v}`).join('\n')}`);
  return L.join('\n');
}
