// Curriculum per kind: Nederland ('nl') of Suid-Afrika ('za', KABV, Afrikaans).
// De rest van de app (motor, beloning, signalen) gebruikt deze namen en merkt niet welk curriculum het is:
// het kind van het huidige verzoek (kidStore) bepaalt welk pakket antwoordt.
import { currentCur } from './db.js';
import * as NLgen from './generators.js';
import * as NLmis from './misconceptions.js';
import * as NLmne from './mnemonics.js';
import * as NLdid from './didactiek.js';
import * as ZAgen from './za/generators.js';
import * as ZAmne from './za/mnemonics.js';
import * as ZAdid from './za/didactiek.js';

const PACKS = {
  nl: {
    id: 'nl', lang: 'nl',
    LEVEL_NAMES: NLgen.LEVEL_NAMES, CATEGORIES: NLgen.CATEGORIES, CAT_IDS: NLgen.CAT_IDS, catById: NLgen.catById,
    startLevel: NLgen.startLevelForGroep, gradeLabel: (g) => `groep ${g}`, gradeRange: [3, 8], gradeWord: 'groep',
    generate: NLgen.generate, generateLike: NLgen.generateLike, hintsFor: NLgen.hintsFor,
    detectMisconception: NLmis.detectMisconception,
    MNEMONICS: NLmne.MNEMONICS, mnemonicsFor: NLmne.mnemonicsFor, mnemonicText: NLmne.mnemonicText,
    DIDACTIEK: NLdid.DIDACTIEK, didactiekText: NLdid.didactiekText, hintAanpak: NLdid.hintAanpak, ALGEMEEN: NLdid.ALGEMEEN,
    warmupCats: ['vermenigvuldigen', 'delen'],
  },
  // Suid-Afrika (KABV, Afrikaans): eie kategorieë, metodes en notasie; dieselfde motor
  za: {
    id: 'za', lang: 'af',
    LEVEL_NAMES: ZAgen.LEVEL_NAMES, CATEGORIES: ZAgen.CATEGORIES, CAT_IDS: ZAgen.CAT_IDS, catById: ZAgen.catById,
    startLevel: ZAgen.startLevelForGraad, gradeLabel: (g) => `graad ${g}`, gradeRange: [3, 7], gradeWord: 'graad',
    generate: ZAgen.generate, generateLike: ZAgen.generateLike, hintsFor: ZAgen.hintsFor,
    detectMisconception: NLmis.detectMisconception, // werk op q.wrong, taalonafhanklik
    MNEMONICS: ZAmne.MNEMONICS, mnemonicsFor: ZAmne.mnemonicsFor, mnemonicText: ZAmne.mnemonicText,
    DIDACTIEK: ZAdid.DIDACTIEK, didactiekText: ZAdid.didactiekText, hintAanpak: ZAdid.hintAanpak, ALGEMEEN: ZAdid.ALGEMEEN,
    warmupCats: ['vermenigvuldig', 'deling'],
  },
};
export function registerPack(id, pack) { PACKS[id] = pack; }
export const pack = (id = currentCur()) => PACKS[id] || PACKS.nl;
export const hasPack = (id) => !!PACKS[id];

// Objecten/arrays die altijd het pakket van het huidige kind volgen (zodat bestaande code ongewijzigd blijft)
const live = (key, empty) => new Proxy(empty, {
  get: (_, p) => { const v = pack()[key]; const x = v[p]; return typeof x === 'function' && Array.isArray(v) ? x.bind(v) : x; },
  has: (_, p) => p in pack()[key],
  ownKeys: () => Reflect.ownKeys(pack()[key]),
  getOwnPropertyDescriptor: (_, p) => ({ ...Reflect.getOwnPropertyDescriptor(pack()[key], p), configurable: true }),
});
export const LEVEL_NAMES = live('LEVEL_NAMES', []);
export const CATEGORIES = live('CATEGORIES', []);
export const CAT_IDS = live('CAT_IDS', []);
export const catById = live('catById', {});
export const MNEMONICS = live('MNEMONICS', {});
export const DIDACTIEK = live('DIDACTIEK', {});
export const ALGEMEEN = live('ALGEMEEN', {});

export const startLevelForGroep = (g) => pack().startLevel(g);
export const generate = (...a) => pack().generate(...a);
export const generateLike = (...a) => pack().generateLike(...a);
export const hintsFor = (...a) => pack().hintsFor(...a);
export const detectMisconception = (...a) => pack().detectMisconception(...a);
export const mnemonicsFor = (...a) => pack().mnemonicsFor(...a);
export const mnemonicText = (...a) => pack().mnemonicText(...a);
export const didactiekText = (...a) => pack().didactiekText(...a);
export const hintAanpak = (...a) => pack().hintAanpak(...a);
export const warmupCats = () => pack().warmupCats;

// Taalonafhankelijk (zelfde voor beide curricula)
export { checkAnswer, publicQuestion, publicStep } from './generators.js';
