# Testrapport: virtuele leerling "Fenna" (groep 8)

Datum: 14 oktober 2026 · Script: `scripts/simulate.mjs` · Met echte AI (OpenAI, gpt-6-luna)

## Opzet
Een virtuele leerling met vooraf vastgelegde zwakke plekken doorloopt de hele app over 10 gesimuleerde schooldagen
(testklok, alleen in een aparte testserver met `ALLOW_TEST_CLOCK=1`):
starttoets, 10 dagtaken (waarvan 1 vooruitgewerkt), 3 keer extra oefenen (1× breuken), tussenstappen, hints, kladblok,
gesprekken met Max (het kind wordt door een tweede AI gespeeld), een korte les, teach-back, reflecties, spaardoel,
verrassingen, weekbonus, uitbetaling, ouderadvies, profiel, signalen en het overzicht.

**De "waarheid" over Fenna:** breuken optellen = boven én onder optellen; een uur = 100 minuten; procenten onzeker
("weet ik niet"); impulsief (fouten binnen 2–5 s); tafels goed maar traag (14–22 s); verhaaltjessommen moeilijker;
sterk in optellen en grafieken. Ze leert een beetje van elk gesprek met Max.

## Resultaat (2e run, na de fixes)
- 261 sommen, 569/569 controles goed, 0 serverfouten.
- Gecontroleerd bij elke stap: geen antwoord naar de app gelekt, antwoord juist beoordeeld, max 50 cent per dagtaak /
  100 bij de starttoets, Max gebruikt geen interne termen of schuilnaam, het kindscherm bevat geen signalen.

| Waarheid | Gevonden? |
|---|---|
| Uur = 100 minuten | ✅ 7 van 7 keer herkend als denkfout; kladblok-analyse "Uur als honderdheid"; profiel: *gaat beter* met bewijs |
| Breuken: boven én onder optellen | ✅ herkend (1e run 3/3 + kladblok); in de 2e run kwam dat sommentype toevallig niet voor |
| Impulsief | ✅ "27 van de 39 foute antwoorden binnen 6 seconden" → "eerst schatten" aan |
| Tafels traag | ✅ (na fix) "gemiddeld 19 seconden per basissom" |
| Verhaaltjessommen moeilijker | ✅ (na drempelaanpassing) kaal 81% vs verhaaltjes 63% → automatisch voorlezen |
| Niveaus | ✅ zwakke onderdelen zakten naar groep 6 (tijd, kommagetallen), sterke naar groep 8 (delen, vermenigvuldigen) |
| Welke uitleg helpt | ✅ per onderwerp opgebouwd (bijv. schaal: stap voor stap 6/6) |
| Max | ✅ kort (gem. 29 woorden), wijst de specifieke fout aan, geeft geen eindantwoord, gaat goed om met "kan je het gewoon zeggen?" |

## Gevonden en opgelost
1. **Profiel werd na dag 1 niet meer bijgewerkt** (stil). Oorzaak: `gpt-6-luna` is een "denkend" model, maar de code
   herkende alleen `gpt-5`; alle ruimte ging op aan nadenken → leeg antwoord. Opgelost (ook voor lesplannen, die
   daardoor terugvielen op vaste regels) + een foutmelding in de log als een AI-antwoord leeg/ongeldig is.
   Bijeffect: starten van een dagtaak van ± 10 s naar < 1 s.
2. **Tafels werden niet gemeten** bij een sterke leerling → elke dagtaak begint nu met 2 opwarmers (tafels).
3. **Leessignaal te streng** → bij genoeg sommen geldt nu ≥ 15 punten verschil.
4. **AI schreef "hij" over Fenna** in het ouderadvies → profiel- en adviesprompts: naam of "het kind", nooit hij/zij.
5. "1 dagen" → "1 dag" in het overzicht.

## Beperkingen van deze test
- De database-tijd schuift niet mee met de testklok: trends (vooruit/achteruit over 14 dagen) zijn daarom niet getest.
- De virtuele leerling is een model; een echt kind is grilliger. De echte toets is Christo zelf, na 1–2 weken.

## Opnieuw draaien
```
ALLOW_TEST_CLOCK=1 PORT=3002 node server.js
SIM_BASE=http://localhost:3002 node scripts/simulate.mjs
```
Kost een paar honderd OpenAI-aanroepen (± 7 minuten). Het profiel "Fenna" kan daarna in het ouderscherm verwijderd worden.
