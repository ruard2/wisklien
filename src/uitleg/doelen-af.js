// Lesdoel en bemeesteringshek vir die Afrikaanse KABV-kaarte.
//
// Die inhoudelike metode bly die handgeskrewe kaart in af.js. Hierdie laag maak die
// kaart se naam net kindgerig en voeg die vaste bemeesteringsvereiste by wat Max en
// die lesmotor nodig het. Daar word dus geen nuwe rekenmetode hier uitgedink nie.

const kleinBegin = (s) => String(s || '').replace(/^./u, (c) => c.toLocaleLowerCase('af-ZA'));

export function doelUitKaart(kaart) {
  if (!kaart?.naam) return null;
  return {
    ik: `Ek kan ${kleinBegin(kaart.naam).replace(/[.]$/, '')}.`,
    klaar: 'die kind los ’n nuwe som van hierdie soort korrek sonder wenke op, kies die kaart se aanpak self en verduidelik die stappe in volgorde',
  };
}

