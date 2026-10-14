# Rekenen groep 8 — app voor Christo

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

1. **Starttoets (adaptief)**: eerst "In welke groep zit je?". Dan 40 sommen, beginnend **één groep lager** (groep 8 → groep 7-niveau): goed → moeilijker, fout → makkelijker. Geen hulp (eerlijk meten), wel een "Weet ik niet"-knop.
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

### Beloning
- Centen, 100 cent = € 1. **Alleen voor goede antwoorden.**
- Starttoets: tot **100 cent**. Dagtaak: tot **50 cent** per schooldag (2,5 cent per goede som). Oefenen/weekend: geen centen.
- **Tussenstappen** (per onderdeel):
  - De eerste **5 keer** goed met tussenstappen: gewone beloning (leerfase, gaat vanzelf aan als het nodig is).
  - Daarna een **"Nu moet je het zelf kunnen"**-moment, met de stappen die hij steeds deed op een rij.
  - Vanaf dan **kiest Christo zelf**: *met tussenstappen* = halve beloning, *helemaal zelf* = **dubbele beloning** (de eerste 5 keer, daarna gewoon).
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

## AI (Rekenmaatje)
Gebruikt Claude (`claude-opus-5-5`, aan te passen met `AI_MODEL`). Zonder `ANTHROPIC_API_KEY` werkt alles behalve de AI-knoppen; de ingebouwde stappenplannen blijven. `AI_DAILY_LIMIT` (standaard 80) begrenst het aantal AI-vragen per dag. Uitlegkaarten en ouderadvies worden gecachet.

## Bestanden
- `src/generators.js` — alle sommen, stappenplannen en het nakijken
- `src/engine.js` — intake, beheersing, verdeling van de dagtaak, "loopt vast"-detectie
- `src/ai.js` — Rekenmaatje en ouderadvies
- `server.js` — API
- `public/` — de app (HTML/CSS/JS, service worker, manifest, iconen)
- `scripts/e2e.mjs` — end-to-end test (alleen lokaal: wist alle data!)
