// Uitlegkaarten per sjabloon (soort som), per taal. Bron van waarheid voor HOE een soort som wordt uitgelegd:
// Max krijgt de kaart van de som mee, en de vaste uitleg (stappenplan, tussenstappen) volgt dezelfde aanpak.
// Nederlands: zoals Nederlandse methodes het aanleren (o.a. De wereld in getallen, Pluspunt, Rekenrijk, Getal & Ruimte Junior).
// Afrikaans: zoals Suid-Afrikaanse skole volgens KABV/CAPS en die DBE-werkboeke dit leer.
import { KAARTEN as NL } from './nl.js';
import { KAARTEN as AF } from './af.js';

import { readFileSync, existsSync } from 'node:fs';
import { methode, vervangDiep } from '../methodes/index.js';
import { hulpVoor } from './hulp-nl.js';

// Verbeterde kaarten uit de Kaartcheck (/audit → Kaartcheck → scripts/neem-kaarten-over.mjs). Ze vervangen naam, aanpak,
// model, valkuilen en concreter van de handgeschreven kaart; woorden en "niet doen" blijven van de handgeschreven kaart.
const laad = (lang) => { const f = new URL(`./kaartcheck-${lang}.json`, import.meta.url); try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).kaarten || {} : {}; } catch { return {}; } };
const samen = (basis, extra) => Object.fromEntries(Object.entries(basis).map(([id, k]) => [id, extra[id] ? { ...k, ...Object.fromEntries(Object.entries(extra[id]).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length))) } : k]));
const BY = { nl: samen(NL, laad('nl')), af: samen(AF, laad('af')) };
// De rekenmethode van het kind (src/methodes/) kan kaarten vervangen (andere route) en woorden vervangen (tijdbalk → tijdlijn).
const metMethode = (lang, tpl, k) => {
  const m = methode(lang === 'af' ? 'af' : 'nl'), x = m?.kaarten?.[tpl];
  if (!k && !x) return null;
  return vervangDiep(x ? { ...(k || {}), ...x } : k, m);
};
// Kaarten die de methode vastlegt (eigenKaarten) komen uit de handgeschreven kaart, niet uit de Kaartcheck.
const basisKaart = (lang, tpl) => {
  const L = lang === 'af' ? 'af' : 'nl';
  return (methode(L)?.eigenKaarten || []).includes(tpl) ? (L === 'af' ? AF : NL)[tpl] || null : BY[L][tpl] || null;
};
export const kaartVoor = (lang, tpl) => (tpl ? metMethode(lang, tpl, basisKaart(lang, tpl)) : null);
export const alleKaarten = (lang) => Object.fromEntries(Object.keys(BY[lang === 'af' ? 'af' : 'nl']).map((id) => [id, kaartVoor(lang, id)]));
export const handKaarten = (lang) => (lang === 'af' ? AF : NL);

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
  // Hulpplan bij vastlopen (src/uitleg/hulp-nl.js; meetlat #37): wat je eerst nagaat, welk materiaal, welk kleiner voorbeeld
  const h = lang === 'nl' ? hulpVoor(tpl) : null;
  if (h) L.push(`HULPPLAN BIJ VASTLOPEN (methode; gebruik dit als het kind het niet snapt, en houd dezelfde route):\n  - Ga eerst na: ${h.eerst}\n  - Materiaal/model: ${h.materiaal}\n  - Kleiner voorbeeld (zelfde route, kleinere getallen): ${h.klein}`);
  // Leerlijn van de methode (src/methodes/wig-leerlijn.js): groep, blok, basisstrategie en voorkennis van deze soort som
  const ll = lang === 'nl' ? methode('nl')?.leerlijn : null;
  if (ll?.leerlijnTekst) { const t = ll.leerlijnTekst(tpl); if (t) L.push(`${t} (Alleen voor jou: noem groep of blok niet tegen het kind.)`); }
  return L.join('\n');
}
