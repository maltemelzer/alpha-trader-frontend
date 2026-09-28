# Mitmachen

Danke, dass du helfen willst! Ein paar Regeln, damit das Frontend einheitlich bleibt.

## Einrichten

```sh
npm ci
cp .env.example .env   # PARTNER_ID eintragen; AT_USERNAME/AT_PASSWORD nur für die Skripte
npm run dev
```

## Vor dem Pull Request

- `npm test`, `npm run lint` und `npm run build` laufen grün (die CI prüft alle drei).
- Neue Rechenlogik steht als reine Funktion in `derive.ts` o. ä. und hat Tests; Formatierungen
  (Beträge, Kurse, Datum) werden immer getestet.
- UI-Änderungen: Screenshots mit `npm run shot -- /pfad` (1440×900, 1280×720, 390×844) in den PR und
  `npm run audit` laufen lassen. Die Seite sollte ohne Seiten-Scroll auskommen; wenn nicht, im PR begründen.
- Farbenblind-Modus prüfen (Einstellungen → Farbenblind), Farben nur über Tokens (`var(--…)`).

## Gestaltung

Die Grundsätze stehen oben in [`CLAUDE.md`](CLAUDE.md), die wichtigsten:

1. **Visualisieren statt beschreiben** – welches Diagramm wofür: `design-system/guidelines/diagramme.md`.
2. **Eine Seite = ein Bildschirm**, Panels mit festem Rahmen und internem Scroll.
3. **Mobil gleichwertig** – ab 360 px, Tippflächen ≥ 44 px, nichts nur per Hover; Handy-Bausteine aus `src/app/phone.tsx`.
4. **Design-System vor Eigenbau** – erst in `design-system/components/index.d.ts` suchen (oder in der
   Galerie unter `/design-system/`), dann kombinieren, erst zuletzt neu bauen.

## Design-System ändern

- Komponenten stehen in `design-system/components/bundle.js` (klassisches Skript mit `h()`, kein Build);
  eine neue Komponente am Ende bei `window.Bankiersgruen` eintragen, Typen in `index.d.ts` ergänzen.
- Je Komponente `components/<Name>/README.md` (erster Satz = Zusammenfassung) und `preview.html`
  (Zeile 1 `<!-- @dsCard group="…" height=… -->`).
- Tokens nur in `tokens.json` ändern, dann `npm run ds:tokens`. Regeln und Kontraste im Markenbuch
  `design-system/README.md` beachten (Farbenblind-Theme `cb` mitdenken).

## Konventionen

- Code, Bezeichner und Commit-Nachrichten auf Englisch; Oberflächentexte auf Deutsch, Anrede „du“.
- Props und Datenfelder heißen wie in der API. `src/api/schema.d.ts` ist generiert (`npm run api:generate`).
- API-Abfragen als Hook in `src/api/queries.ts`; Ansichten und Filter in der URL (`usePageView`, `useFilters`).
- Kein Prettier auf bestehende Dateien.

## Gegen die echte API testen

`stable` ist das Live-Spiel. Lesen ist unproblematisch (`npm run api:get -- /api/…`).
Schreibende Aktionen (Orders, Überweisungen, Abstimmungen, Chat …) nur bewusst und mit dem eigenen Konto –
und nie Zugangsdaten oder Tokens in Issues, PRs oder Logs.

Unklares Verhalten der API ist in `CLAUDE.md` unter „Stolperfallen“ gesammelt. Findest du etwas Neues heraus,
ergänze es dort.
