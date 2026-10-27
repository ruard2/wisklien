// Rekenmethodes: hoe de school van het kind rekenen aanleert (Malmberg, een andere methode, KABV …).
//
// De app heeft één basis: de sjablonen (src/generators.js), de uitlegkaarten (src/uitleg/) en het didactisch handboek
// (src/didactiek.js). Een methode legt daaroverheen vast wat bij díe school anders is:
//   - routes:    welke rekenroute een soort som gebruikt (bijv. 1500 : 30 met de kleine som of met nullen wegstrepen)
//   - uit:       soorten sommen die de methode niet gebruikt (die maakt de app dan niet)
//   - kaarten:   uitlegkaarten die anders zijn (per sjabloon; vervangen naam, aanpak, model, valkuilen, concreter …)
//   - didactiek: per onderdeel wat anders is (kern, modellen, woorden, de aanpak per niveau/groep, fouten, vermijd)
//   - taal:      woorden van de methode (extra schoolwoorden, woorden die in deze methode wél gewoon zijn) en
//                vervangingen in alle teksten (bijv. "tijdbalk" → "tijdlijn")
//   - max:       een extra regel voor Max over deze methode
// Alles wat een methode niet noemt, komt uit de basis. Zo kost een nieuwe methode alleen de verschillen.
//
// Welke methode? Per kind (kolom kids.methode, in te stellen door ouder/leerkracht), anders METHODE_NL / METHODE_AF
// uit de omgeving, anders de standaard per taal hieronder.
import { kidStore } from '../db.js';
import MALMBERG from './malmberg.js';
import ALGEMEEN from './algemeen.js';
import KABV from './kabv.js';

export const METHODES = Object.fromEntries([MALMBERG, ALGEMEEN, KABV].map((m) => [m.id, m]));
const STANDAARD_PER_TAAL = { nl: 'malmberg', af: 'kabv' };

export const standaardMethode = (lang = 'nl') => {
  const env = lang === 'af' ? process.env.METHODE_AF : process.env.METHODE_NL;
  return METHODES[env]?.lang === lang ? env : STANDAARD_PER_TAAL[lang] || 'malmberg';
};
export function methodeId(lang) {
  const st = kidStore.getStore();
  const l = lang || st?.lang || 'nl';
  const m = st?.methode;
  return m && METHODES[m]?.lang === l ? m : standaardMethode(l);
}
export const methode = (lang) => METHODES[methodeId(lang)];
export const methodesVoor = (lang) => Object.values(METHODES).filter((m) => m.lang === lang).map((m) => ({ id: m.id, naam: m.naam, beschrijving: m.beschrijving }));

// De rekenroute voor een soort som (std = de route als de methode niets zegt)
export const route = (sleutel, std) => methode()?.routes?.[sleutel] ?? std;
// Maakt de methode deze soort som niet?
export const nietInMethode = (tpl) => !!tpl && (methode()?.uit || []).includes(tpl);

// Vervangingen van woorden (in alle teksten van sommen, kaarten en didactiek): [[van, naar], …]
export function vervang(tekst, m = methode()) {
  if (typeof tekst !== 'string' || !m?.taal?.vervang?.length) return tekst;
  let t = tekst;
  for (const [van, naar] of m.taal.vervang) t = t.replace(new RegExp(`\\b${van}`, 'g'), naar).replace(new RegExp(`\\b${van[0].toUpperCase()}${van.slice(1)}`, 'g'), naar[0].toUpperCase() + naar.slice(1));
  return t;
}
export function vervangDiep(x, m = methode()) {
  if (!m?.taal?.vervang?.length || x == null) return x;
  if (typeof x === 'string') return vervang(x, m);
  if (Array.isArray(x)) return x.map((y) => vervangDiep(y, m));
  if (typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, vervangDiep(v, m)]));
  return x;
}
