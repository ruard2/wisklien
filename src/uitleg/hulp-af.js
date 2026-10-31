// Herstelplan vir ’n Afrikaanse KABV-verduidelikkaart.
// Die fout, model en konkrete terugstap kom direk uit die kaart; die metode verander
// nie wanneer die getalle kleiner gemaak word nie.

const eersteFout = (kaart) => {
  const v = kaart?.valkuilen?.[0];
  if (!v) return 'By watter stap van die kaart het die kind vasgehaak? Laat die kind daardie stap hardop wys.';
  const [fout, hulp] = String(v).split('→').map((x) => x.trim());
  return hulp ? `${fout} Vra of help dan: ${hulp}` : fout;
};

export function hulpUitKaart(kaart) {
  if (!kaart) return null;
  return {
    eerst: eersteFout(kaart),
    materiaal: kaart.model || kaart.concreter || 'Gebruik die KABV-model op die kaart en laat die kind elke stap wys.',
    klein: `Gebruik presies dieselfde aanpak met kleiner, ronde getalle; doen net een stap op ’n slag.${kaart.concreter ? ` ${kaart.concreter}` : ''}`,
  };
}

