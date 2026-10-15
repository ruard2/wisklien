// Alle t('…')-teksten uit de app halen en controleren of er een Afrikaanse vertaling is.
//   node scripts/i18n-keys.mjs          → lijst van ontbrekende vertalingen (exit 1 als er iets ontbreekt)
//   node scripts/i18n-keys.mjs --list   → alle teksten als JSON
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const keys = new Set();
const re = /\bt\((['"])((?:\\.|(?!\1).)*)\1/g;
let m;
while ((m = re.exec(src))) keys.add(m[2].replace(/\\(['"\\])/g, '$1'));
const i18n = fs.readFileSync(new URL('../public/i18n.js', import.meta.url), 'utf8');
const AF = new Function(i18n.replace(/^let LANG.*$/m, '').replace(/document\./g, '({}).') + '; return AF;')();
const missing = [...keys].filter((k) => AF[k] == null);
if (process.argv[2] === '--list') { console.log(JSON.stringify([...keys])); process.exit(0); }
console.log(`${keys.size} teksten, ${missing.length} zonder Afrikaans`);
for (const k of missing) console.log(' -', k);
process.exit(missing.length ? 1 : 0);
