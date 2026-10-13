# Rekenen groep 8 — app voor Christo

Webapp die op de telefoon werkt als een echte app (PWA). Eerst een starttoets, daarna elke schooldag 20 sommen die zich aanpassen aan wat nog lastig is. Centen sparen voor goede antwoorden, AI-hulp ("Rekenmaatje") als hij vastloopt.

## Waar het op gebaseerd is

- **Referentieniveaus rekenen** (Commissie Meijerink): eind groep 8 hoort een kind **1F** te beheersen (fundamenteel), **1S** is het streefniveau richting havo/vwo. Landelijk doel: 85% haalt 1F, 65% haalt 1S.
- **Vier domeinen** zoals in de doorstroomtoets (Cito/IEP/Route 8 enz.): *Getallen*, *Verhoudingen*, *Meten & meetkunde*, *Verbanden*.
- **Leerlijn groep 8** van de gangbare methodes (o.a. Pluspunt 4): ongelijknamige breuken, breuk × breuk, delen door een breuk, kommagetallen × en : (komma plaatsen via schatten), kolomsgewijs/cijferend vermenigvuldigen (22 × 64), kolomsgewijs delen ("happen", 5819 : 23), procenten en korting, schaal 1 : xx, maten omrekenen (ook m², m³, liter), inhoud van een balk, tijd/snelheid, grafieken aflezen en gemiddelde.
- Uitleg gebruikt de strategieën uit die methodes: verhoudingstabel, splitsen, happen, de "maten-trap", 10%/1% eerst, gelijknamig maken.

### 13 onderdelen × 3 niveaus

| Domein | Onderdelen |
|---|---|
| Getallen | Optellen & aftrekken · Vermenigvuldigen · Delen · Kommagetallen · Grote getallen & afronden |
| Verhoudingen | Breuken · Procenten · Verhoudingen · Schaal |
| Meten & meetkunde | Maten omrekenen · Omtrek, oppervlakte & inhoud · Tijd & snelheid |
| Verbanden | Tabellen & grafieken |

Niveau 1 = basis (groep 6/7-stof), 2 = 1F, 3 = 1S. Alle sommen worden gegenereerd (duizenden varianten) en hebben een eigen stappenplan. `npm test` controleert per onderdeel en niveau 3000 sommen.

## Hoe het werkt

1. **Starttoets**: 39 sommen (elk onderdeel op 3 niveaus, eerst makkelijk). Pauzeren mag. Daarna een ranglijst van sterk naar zwak.
2. **Dagtaak** (ma–vr): 20 sommen. Zwakke onderdelen krijgen meer sommen, sterke minder (wel af en toe een onderhoudssom). Sommen door elkaar, beginnen met iets wat hij goed kan.
3. **Bijhouden**: per onderdeel een beheersingsscore. Genoeg goed → niveau omhoog; blijft het fout gaan → een niveau terug. Hints gebruiken telt iets minder zwaar.
4. **Blijft hij vastlopen** (score laag en 3 oefendagen geen vooruitgang, of 8 pogingen bijna allemaal fout): onderdeel krijgt extra sommen, een opstapje van een niveau lager, en vooraf een **uitlegkaart** van Rekenmaatje (AI) met stappenplan, voorbeeld en "let op!" op basis van zijn eigen fouten.
5. **Bij elke som**: hints stap voor stap, na een fout het hele stappenplan, en (met AI) "Leg het anders uit" en doorvragen.

### Beloning
- Centen, 100 cent = € 1. **Alleen voor goede antwoorden.**
- Starttoets: tot **100 cent** (goed/39 × 100).
- Dagtaak: tot **50 cent** per schooldag (2,5 cent per goede som).
- Extra oefenen en weekend: geen centen.
- Ouder ziet saldo en boekt uitbetalingen af in het ouderscherm (Spaarpot → "Voor ouders", pincode).

### Ouderscherm
Saldo + uitbetalen, score/niveau/trend per onderdeel, recente fouten (wat hij invulde vs. goed), sessies met tijd, AI-advies ("wat kan ik thuis doen"), naam wijzigen, starttoets opnieuw.

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
