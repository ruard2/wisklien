// Suid-Afrika: KABV/CAPS en die DBE-werkboeke.
import * as HOERSKOOL_LEERPAD from '../za/leerpad.js';

export default {
  id: 'kabv',
  lang: 'af',
  naam: 'KABV (DBE-werkboeke)',
  beskrywing: 'Suid-Afrikaanse KABV/CAPS soos die DBE-werkboeke dit leer.',
  beschrijving: 'Suid-Afrikaanse KABV/CAPS soos die DBE-werkboeke dit leer.',
  routes: {},
  uit: [],
  kaarten: {},
  taal: {},
  max: '',
  didactiek: {},
  // Graad 8–12 gebruik ’n afsonderlike leerpadmotor met een nagegaanbare
  // vraagopwekker per leerknop (src/za/hoerskool-generators.js).
  hoerskoolLeerpad: HOERSKOOL_LEERPAD,
};
