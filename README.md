# Rekenen groep 8 — met Meester Max

Webapp die op de telefoon werkt als een echte app (PWA). Eerst een starttoets, daarna elke schooldag 20 sommen die zich aanpassen aan wat nog lastig is. Centen sparen voor goede antwoorden, AI-hulp ("Rekenmaatje") als hij vastloopt.

## Waar het op gebaseerd is

- **Referentieniveaus rekenen** (Commissie Meijerink): eind groep 8 hoort een kind **1F** te beheersen (fundamenteel), **1S** is het streefniveau richting havo/vwo. Landelijk doel: 85% haalt 1F, 65% haalt 1S.
- **Vier domeinen** zoals in de doorstroomtoets (Cito/IEP/Route 8 enz.): *Getallen*, *Verhoudingen*, *Meten & meetkunde*, *Verbanden*.
- **Leerlijn groep 8** van de gangbare methodes (o.a. Pluspunt 4): ongelijknamige breuken, breuk × breuk, delen door een breuk, kommagetallen × en : (komma plaatsen via schatten), kolomsgewijs/cijferend vermenigvuldigen (22 × 64), kolomsgewijs delen ("happen", 5819 : 23), procenten en korting, schaal 1 : xx, maten omrekenen (ook m², m³, liter), inhoud van een balk, tijd/snelheid, grafieken aflezen en gemiddelde.
- Uitleg gebruikt de strategieën uit die methodes: verhoudingstabel, splitsen, happen, de "maten-trap", 10%/1% eerst, gelijknamig maken.

### 13 onderdelen × 4 niveaus

| Domein | Onderdelen |
|---|---|
| Getallen | Optellen & aftrekken · Vermenigvuldigen · Delen · Kommagetallen · Grote getallen & afronden |
| Verhoudingen | Breuken · Procenten · Verhoudingen · Schaal |
| Meten & meetkunde | Maten omrekenen · Omtrek, oppervlakte & inhoud · Tijd & snelheid |
| Verbanden | Tabellen & grafieken |

Niveaus per onderdeel, als groep: **groep 5** · **groep 6** · **groep 7** (bevat de meeste 1F-stof: breuken, procenten, schaal) · **groep 8** (eindniveau, 1F/1S zoals in de doorstroomtoets). Alle sommen worden gegenereerd, met een stappenplan én invulbare tussenstappen (96% van de sommen). `npm test` controleert per onderdeel en niveau duizenden sommen, inclusief elke tussenstap.

## Hoe het werkt

1. **Starttoets (adaptief)**: eerst "In welke groep zit je?". Dan 21 sommen (elk onderdeel één, plus 7 extra waar het meest te leren valt), beginnend **één groep lager** (groep 8 → groep 7-niveau): goed → moeilijker, fout → makkelijker. Geen hulp (eerlijk meten), wel een "Weet ik niet"-knop. Daarna **inregelen**: het niveau is nog een schatting, dus de eerste 8 sommen per onderdeel stellen sneller bij (3× zelf goed op rij → omhoog, 2× fout op rij → omlaag) en elk onderdeel komt de eerste dagen even langs.
2. **Dagtaak** (ma–vr): 20 sommen. Zwakke onderdelen krijgen meer sommen, sterke minder. Elke volgende som wordt pas gemaakt na het vorige antwoord, zodat de app live bijstuurt.
3. **Niveau per onderdeel**:
   - Meer dan de helft fout (laatste 6, min. 4) → **een niveau lager** + extra hulp (tussenstappen staan klaar).
   - Pas weer **omhoog bij 80%** (laatste 10, min. 8). Goed mét hulp telt als half.
4. **Altijd succeservaringen**:
   - Na een fout: **herkansing** — zelfde soort som, nieuwe getallen, samen stap voor stap.
   - Twee keer fout op rij: een **opsteker** uit zijn sterkste onderdeel.
   - Gaat het slecht (minder dan de helft van de laatste 4): **rustig-aan-modus**, sommen een niveau lager met hulp, tot hij 3 op rij goed heeft.
   - Een zware sessie eindigt altijd met een som die lukt.
5. **Tussenstappen ("samen stap voor stap")**: hij rekent elke tussenstap zelf uit. Fout → tip; nog eens fout → we laten zien hoe het moet en gaan door. Daarna het eindantwoord.
6. **Rekenmaatje (AI)**: "Leg het anders uit", doorvragen, en uitlegkaarten bij onderdelen waar extra hulp aan staat.

### Leren dat blijft hangen
- **Denkfouten herkennen (ook zonder AI)**: bij veelvoorkomende fouten (breuken boven én onder opgeteld, uur = 100 minuten, korting i.p.v. nieuwe prijs, omtrek/oppervlakte verwisseld, komma verkeerd, lenen vergeten, …) ziet het kind meteen wat er misging en wat helpt. Max krijgt de denkfout ook door; het ouderscherm toont welke denkfouten vaak voorkomen.
- **Foutenschrift (gespreid herhalen)**: elke fout komt na 1, 3 en 7 dagen terug als vergelijkbare som (Leitner-systeem); fout → weer na 1 dag. Max. 5 herhalingen per dagtaak.
- **Voordoen → samen → zelf**: bij een nieuw niveau of een zwak onderdeel eerst een uitgewerkt voorbeeld (stap voor stap), daarna samen met tussenstappen, daarna zelf. Max. 2 per sessie.
- **Ezelsbruggetjes** (`src/mnemonics.js`): gangbare Nederlandse ezelsbruggetjes (Kan Het Dametje Met De Centimeter Meten, Nooit Oorlog Zonder Wapens, tafel-van-9-trucs, …) plus eenvoudige geheugensteuntjes. In hints, voorbeelden, bij Voortgang en Max gebruikt ze waar het helpt.
- **Voorlezen** 🔊 (gratis, browser-spraak) en plaatjes: breukstroken en getallenlijn.
- **Kladblok** ✏️: uitvouwbaar ruitjesblaadje onder elke som; schrijven met de vinger of typen. Het gaat mee met het antwoord: Max kijkt (via OpenAI vision) naar de uitwerking, wijst aan wáár het misging, en een korte analyse ("aanpak / fout / denkfout") gaat naar het leerlingprofiel en het ouderscherm. Alleen de laatste 60 kladblaadjes worden bewaard.
- **Uitleg in kindertaal**: moeilijke woorden (noemer, gelijknamig, omtrek, …) worden één keer per som uitgelegd; kommasommen via "doe alsof de komma er niet is, en zet hem daarna terug" in plaats van schatten met ≈.

### Beloning
- Centen, 100 cent = € 1. **Alleen voor goede antwoorden.**
- Starttoets: tot **100 cent**. Dagtaak: tot **50 cent** per schooldag (2,5 cent per goede som). Oefenen/weekend: geen centen.
- **Tussenstappen** (per onderdeel):
  - De eerste **5 keer** goed met tussenstappen: gewone beloning (leerfase, gaat vanzelf aan als het nodig is).
  - Daarna een **"Nu moet je het zelf kunnen"**-moment, met de stappen die hij steeds deed op een rij.
  - Vanaf dan **kiest Christo zelf**: *met tussenstappen* = halve beloning, *helemaal zelf* = **dubbele beloning** (de eerste 5 keer, daarna gewoon).
- **Vooruitwerken**: na de dagtaak (of in het weekend) kan de dagtaak van de volgende schooldag alvast gedaan worden (max. 1 dag vooruit), met gewone beloning.
- **Wekelijkse verrassing**: één keer per week op een willekeurige dag, als de dagtaak goed ging (standaard ≥ 70%): bijv. extra snoepje, half uur gametijd, 1 euro (gaat automatisch in de spaarpot) of klein cadeautje. Lijst en drempel in te stellen in het ouderscherm; daar vink je ook af wat gegeven is.
- Ouder ziet saldo en boekt uitbetalingen af in het ouderscherm (Spaarpot → "Voor ouders", pincode).

### Motivatie
- Humor: rekenmop van de dag, grappige complimenten en troostzinnen, gekke sommen (meester Bram eet de rest van het snoep op), Rekenmaatje maakt af en toe een grapje.
- Reeks goed op rij in de sessie (🔥), schooldagen op rij, persoonlijk record.
- 16 badges: eerste dagtaak, 3/5/10 dagen op rij, 5/10 op rij goed, niveau omhoog, opstap gehaald, sterk, comeback (herkansing goed), zelf gedaan, foutloos, record, doorzetter, stappenmeester.
- Feedback prijst aanpak en inzet (groei-mindset), fouten worden als leermoment gebracht.
- Niveau omhoog = feestje; niveau omlaag = rustig uitgelegd ("stapje terug om het stevig op te bouwen, bij 8/10 weer omhoog").

### Ouderscherm
Saldo + uitbetalen, score/niveau/trend per onderdeel (incl. leerfase-teller en hoeveel met tussenstappen), badges, recente fouten (wat hij invulde vs. goed), sessies met tijd, AI-advies ("wat kan ik thuis doen"), naam wijzigen, starttoets opnieuw.

## Lokaal draaien (zonder Docker)

```bash
npm install
cp .env.example .env      # en vul in
npm run db                # terminal 1: lokale Postgres (embedded)
npm run dev               # terminal 2: http://localhost:3000
```

## Online zetten (Railway)

1. Push naar GitHub, maak in Railway een project "Deploy from GitHub repo".
2. Voeg een **PostgreSQL**-database toe; zet bij de app `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
3. Zet de variabelen: `PARENT_PIN`, `SESSION_SECRET` (lang, willekeurig), `NODE_ENV=production`, optioneel `APP_PIN`, `CHILD_NAME`, `ANTHROPIC_API_KEY`.
4. Railway start met `npm start`. Er is geen build-stap nodig (de frontend is gewoon `public/`).
5. Op de telefoon: open de URL → iPhone: Safari → Deel → *Zet op beginscherm*; Android: Chrome → *App installeren*.

## Didactiek: één aanpak, zoals op Nederlandse scholen
`src/didactiek.js` is het didactisch handboek en de enige bron voor hoe iets wordt uitgelegd. Hints, tussenstappen,
voorbeelden, "Zo doe je het" en Meester Max volgen allemaal dezelfde aanpak en dezelfde woorden.

- **Bronnen**: TAL-leerlijnen/SLO-tussendoelen (Freudenthal Instituut), het handelingsmodel en de drieslag uit het
  Protocol ERWD (Van Groenestijn e.a., 2011), de UU-kwaliteitskaarten breuken en procenten, directe instructie (IGDI).
- **Per onderwerp**: kern (wat moet het kind snappen), voorkennis, modellen, schoolwoorden met uitleg, per groep-niveau
  (5 t/m 8) één vaste aanpak in stappen + voorbeeld, typische fouten met wat helpt, controle, en wat je níet doet.
- **Handelingsmodel**: eerst betekenis (geld, meten), dan een model (getallenlijn, strook, positieschema,
  verhoudingstabel), dan de kale som. Lukt het niet: één niveau concreter, daarna terugkoppelen naar de som.
- **Schatten** (= met ronde getallen ongeveer uitrekenen) is een controle achteraf, nooit een onuitgelegde eerste stap.
  Alleen bij kommagetal × kommagetal (groep 8) om de komma te plaatsen, en dan altijd uitgelegd en met keuzes.
- **Procenten** via de ankers 50% / 25% / 10% / 5% en de strook; de 1%-regel pas als het niet anders kan.
- **Kommagetallen** via geld en het positieschema: 27,6 : 6 = € 27,60 eerlijk verdelen (eerst euro's, dan centen);
  × 10 = het getal wordt 10 keer zo groot (elk cijfer schuift één plek).
- **Lessen van Max** volgen een instructie zoals op school: voorkennis → betekenis (met plaatje) → voordoen →
  samen → zelf → in eigen woorden terugzeggen. Elk bericht eindigt met één vraag.
- **Plaatjes in de uitleg**: Max kan tekenen zoals de juf op het bord — positieschema, strook, procentenstrook,
  getallenlijn, sprongen, verhoudingstabel, hokjes, rechthoek/driehoek, klok en tijdlijn.

## Meester Max — de AI-leraar (OpenAI)
- Zet `OPENAI_API_KEY` in `.env` (of in Railway). De app kiest zelf het beste beschikbare model (standaard `gpt-6-luna`, reserve `gpt-5.5`); overschrijven met `OPENAI_MODEL`. Zonder sleutel werkt alles met de ingebouwde uitleg. Reserve-optie: `ANTHROPIC_API_KEY` (Claude).
- **Na een fout** kijkt Max wat er misging en begint een gesprekje: één vraag tegelijk, het kind doet zoveel mogelijk zelf, na twee pogingen doet hij het voor.
- **Chat bij elke som** (vóór het antwoord: helpen zonder voorzeggen), met snelknoppen.
- **Vast bij een tussenstap** → Max legt precies die stap uit.
- **Korte interactieve les** bij onderdelen waar extra hulp nodig is (uitleg → voorbeeld → controlevragen).
- **Past zich aan**: frustratie → geruststellen en kleiner stapje; snel en goed → sneller; werkt iets 2× niet → heel andere uitleg.
- **Lesplan per dag (differentiatie)**: Max bepaalt per onderdeel op welk groepsniveau er vandaag geoefend wordt (bijv. breuken groep 5, optellen groep 8; max. 1 stap afwijking van de cijfers als vangnet), hoeveel sommen (veel bij wat lastig is, weinig bij wat goed gaat) en schrijft per onderdeel een compliment of aanmoediging. Het plan wordt na elke sessie alvast gemaakt, dus de dagtaak start direct. Zonder AI: vaste regels.
- **Geen vaktaal** zonder uitleg: "het getal onder de streep (de noemer)". Ook alle sommen, hints en stappen gebruiken deze kindertaal.
- **Onthoudt en bouwt voort**: na elke sessie/les schrijft Max korte notities (wat nu lukt, waar het vastliep, wat hielp, interesses) en gebruikt die in volgende gesprekken.
- **Leerlingdossier** (bijgewerkt na elke sessie én elke 10 sommen): samenvatting, sterke kanten, **zwakke punten met bewijs en status** (🆕 nieuw → 🔧 mee bezig → 📈 gaat beter → ✅ opgelost), leerstijl en tips. Gebaseerd op cijfers per onderdeel (niveau, % goed, trend), herkende denkfouten, kladblok-analyses, de notities en de laatste 60 sommen. Oude zwakke punten worden niet vergeten maar afgevinkt als ze opgelost zijn.
- **Privacy**: de AI ziet nooit de echte naam. Op de server heet het kind "Christo"; naar OpenAI gaat een vaste schuilnaam (`Leerling-1234`) die in het antwoord weer wordt teruggezet. Verder een anoniem `safety_identifier` (hash) en `store: false`. Let op: wat een kind zelf in de chat typt (bijv. een achternaam) gaat wel mee.
- Na elke sessie een persoonlijk berichtje van Max. `AI_DAILY_LIMIT` (standaard 400 per kind per dag) begrenst de kosten.

## Hoe leert hij? (onder de motorkap, alleen voor ouder/leerkracht)
Bewust **geen leerstijl-labels** ("visueel", "auditief"): onderzoek (Pashler e.a., 2008) laat zien dat lesgeven naar zo'n voorkeursstijl niet beter werkt. Wél gemeten (`src/signals.js`, zonder AI, uit de pogingen van de laatste 30 dagen) en elk met een vaste aanpassing:

| Signaal | Hoe herkend | Wat er stil gebeurt |
|---|---|---|
| Te snel (impulsief) | ≥ 30% van de fouten binnen 6 s | na een snelle fout: "kijk eerst wat er ongeveer uit moet komen"; Max laat eerst schatten |
| Tafels/basissommen niet geautomatiseerd | goed maar > 12 s per basissom | Max plant korte tafelrondjes (geen extra uitleg) |
| Lang bezig en dan fout | ≥ 30% van de fouten na > 90 s | kleinere stappen, kladblok |
| Werkgeheugen | lange sommen (4+ stappen) ≥ 25 punten slechter dan korte | Max knipt in kleinere stapjes, tussenresultaten opschrijven |
| Lezen | verhaaltjessommen ≥ 15–20 punten slechter dan kale sommen | verhaaltjessommen automatisch voorgelezen; Max vraagt eerst "wat wordt er gevraagd?" |
| Zelfvertrouwen / spanning | veel "weet ik niet", stoppen, opgeven na een fout | rustige modus: eerder makkelijkere sommen, Max extra kalm |
| Vastloper op een soort stap | dezelfde soort tussenstap ≥ 2× fout | Max legt juist die stap anders uit |
| Vaak fout, maar onbekend wáár | laatste 8 sommen ≥ 4 fout, geen herkende denkfout, geen kladblok-analyse | kladblok gaat vanzelf open + één keer vragen om tussenstappen; stopt zodra duidelijk is waar het misgaat |
| Welke uitleg helpt | Max labelt elke uitleg onzichtbaar (plaatje, verhaal, regel, stappen, voordoen); de volgende som van dat onderdeel telt als uitkomst | Max kiest meestal wat werkt, probeert af en toe iets anders |

Het kind ziet geen signalen of labels; ze staan alleen in het ouderscherm en het overzicht, en Max krijgt ze met de opdracht ze nooit te benoemen. Pas na ± 1–2 weken oefenen genoeg data; daarvoor staat er "nog te weinig data".

## Overzicht voor ouder/leerkracht
`#/overzicht` (link onderaan "Wie ben jij?", pincode `PARENT_PIN`): alle kinderen op één pagina — laatst geoefend, sommen en % goed deze week, reeks, spaarpot, samenvatting, zwakke punten met status, sterke kanten, niveau per onderdeel (g5–g8 + trend), denkfouten, kladblok en wat Max onthoudt. "Details" opent het ouderscherm van dat kind.

## Suid-Afrika (Afrikaans, KABV)
Bij het maken van een profiel kies je **land, taal, groep/graad en leeftijd**. Kies je Suid-Afrika/Afrikaans, dan
krijgt het kind een eigen curriculum (`src/za/`). De motor is dezelfde: beloning, niveaus, starttoets, foutenschrift,
signalen. Wat anders is, is de methode en de inhoud:
- **14 KABV-onderdelen** (Getalle 50%, Patrone 10%, Ruimte en vorm 15%, Meting 15%, Data 10%): optel, vermenigvuldig,
  deling, getalbegrip, breuke, desimale, persentasie, finansies, patrone, meetkunde, meting, omtrek, tyd, data.
- **Niveaus graad 4–7**; de begintoets start één graad lager.
- **Methodes uit de DBE-werkboeke** (Rainbow Workbooks gr 5/6/7, Afrikaans) en de KABV-dokumente:
  - kolommen met oordra/omruil;
  - opbou/afbreek;
  - "voltooi tot die volgende 1 000";
  - uitgebreide notasie (8 × 4 362 = 8 × (4 000 + 300 + 60 + 2));
  - langdeling met deelprodukte en "res";
  - deelbaarheidsreëls;
  - breuken van heelgetallen via groepen;
  - persentasie als "uit 100" en via breuke;
  - vloeidiagrammen en getallesinne met □;
  - BODMAS;
  - beraam (afronden) bij grote vermenigvuldigingen, altijd uitgelegd.
- **Notatie en contexten**: ÷, R12,50, `;` tussen getallen, Thabo, Pick n Pay, Olimpiese Spele, skaapboer.
- **Handboek** `src/za/didactiek.js`: Max (hier **Meneer Max**) krijgt per onderwerp de Suid-Afrikaanse aanpak en antwoordt in het Afrikaans.
- **Ouderschermen** volgen de taal van het kind.
- **Tests**:
  - `node --env-file=.env scripts/za-check.mjs`: 22 400 sommen;
  - `node scripts/e2e-za.mjs`: end-to-end met een Afrikaans kind;
  - `LES_LANG=af node scripts/lessen-check.mjs breuke:2`: lessen van Max.

## Profielen
Bij het openen: **"Wie ben jij?"** — kies je naam of maak een profiel (naam + plaatje, geen wachtwoord). Elk kind heeft een eigen afgeschermd deel van de database (PostgreSQL-schema `kid_<id>`): niveaus, sessies, spaarpot, badges, spaardoel, geheugen en profiel van Max. Wisselen via 👤 op het startscherm; profiel verwijderen in het ouderscherm.

## Bestanden
- `src/generators.js` — alle sommen, stappenplannen en het nakijken
- `src/engine.js` — intake, beheersing, verdeling van de dagtaak, "loopt vast"-detectie
- `src/ai.js` — Rekenmaatje en ouderadvies
- `server.js` — API
- `public/` — de app (HTML/CSS/JS, service worker, manifest, iconen)
- `scripts/e2e.mjs` — end-to-end test (alleen lokaal: wist alle data!)
