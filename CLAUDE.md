# Alpha-Trader – alternatives Frontend („Bankiersgrün“)

Inoffizielles Web-Frontend für die Börsensimulation [Alpha-Trader](https://alpha-trader.com): Spieler gründen Unternehmen, handeln Aktien, Anleihen, Coins, Fonds, Immobilien; Kurse entstehen nur aus Spielerhandel. Sprache der Oberfläche: Deutsch.

## Grundsätze (wichtiger als alles andere)
1. **Visualisieren statt beschreiben.** Jede Zahl, die eine Entwicklung, Verteilung oder einen Vergleich hat, wird als Diagramm, Balken, Sparkline, Heatmap oder Fortschrittsbalken gezeigt – nicht als Absatz oder lange Tabelle. Text nur für Namen, Labels, Tooltips. Welches Diagramm wofür: siehe Design-System `guidelines/diagramme.md`.
2. **Eine Seite = ein Bildschirm.** Ziel-Viewports 1440×900 und 1280×720 (Desktop), 390×844 (Handy): Hauptseiten passen ohne Seiten-Scroll. Mittel: Layout mit `100dvh`-Grid, Panels mit fester Höhe und internem Scroll (Orderbuch, Trades), Tabs/Segmente statt Untereinanderstapeln, Kennzahlen als kompakte `StatTile`-Reihe, Details in Tooltip/Sheet/Dialog. Wenn eine Seite doch scrollen muss, steht das Wichtigste above the fold – und das wird in der PR begründet.
3. **Mobil gleichwertig.** Alles ab 360 px Breite; `BottomNav` < 720 px; Handel über `TradeBar` + `Sheet`; Tippflächen ≥ 44 px; nichts nur per Hover.
4. **Design-System vor Eigenbau.** Erst Komponente aus `Bankiersgruen` suchen (`index.d.ts`), dann kombinieren, erst zuletzt neu bauen – und neue Muster als Vorschlag fürs Design-System notieren.

## Stack
- Vite + React 18 + TypeScript 5 (strict), reine SPA, kein eigener Server.
- **React bleibt auf 18**, weil das Design-System-Bundle für React 18 gebaut ist. Deshalb React Router 7 (Version 8 verlangt React 19), `@types/react@18`. TypeScript bleibt auf 5.x (openapi-typescript und typescript-eslint unterstützen 7 noch nicht).
- React Router (Routen = Spielbereiche), TanStack Query für alle API-Daten (Caching, Polling für Kurse).
- API-Typen generiert aus der OpenAPI-Spec (`src/api/schema.d.ts`, nicht von Hand ändern), Client in `src/api/client.ts` (`openapi-fetch`, Auth-Middleware, `login()`, `unwrap()`). View-Typen in `src/api/types.ts`: Aliase auf das Schema; nur wo die Spec bloß `object` liefert (Listing-Profil, Orderbuch, Portfolio), eine knappe Form nach echten Antworten.
- Alle Abfragen als Hooks in `src/api/queries.ts` (ein Hook je Endpunkt, Polling: Kurse/Orderbuch 15 s, Rest 60 s). Spring-`Pageable` flach senden (`?page=0&size=50&sort=date,desc`) – dafür `pageableSerializer`.
- Diagramme: Plotly 3.x (`plotly.js-dist-min`) – keine zweite Chart-Bibliothek. Immer über `<Plot figure={(theme, width) => …} />` aus `src/charts/Plot.tsx`: lädt Plotly erst bei Bedarf, füllt seinen Container, zeichnet bei Größen- und Theme-Wechsel neu. Figuren als reine Funktionen (Beispiel `src/security/charts.ts`), Achsen-Kurzformen mit `short()` aus `src/lib/format.ts`.
- Tests: Vitest + Testing Library; Formatierungsfunktionen (Beträge, Kurse, Datum) immer getestet.

### Befehle
| Befehl | Zweck |
| --- | --- |
| `npm run dev` / `build` / `preview` | Vite |
| `npm test` · `npm run lint` | Vitest (`src/**/*.test.ts(x)`, `scripts/**/*.test.mjs`) · ESLint |
| `npm run api:generate` | `src/api/schema.d.ts` aus der Live-Spec neu erzeugen |
| `npm run api:get -- /api/…` | Nur lesender API-Aufruf mit dem Konto aus `.env` (Login inklusive, gibt JSON aus, nie den Token). `--base <url>` für nightly/dev |
| `npm run ds:sync -- <ordner> [--version <v>]` | Design-System nach `vendor/bankiersgruen/` übernehmen (siehe unten) |
| `npm run shot -- /pfad [--size 1440x900] [--anon]` | Screenshot per headless Chrome (Dev-Server muss laufen), eingeloggt mit `.env`. Meldet, ob die Seite scrollt und welches Element über den Rand ragt, plus Konsolenfehler. Bilder in `shots/` (ignoriert). Ohne `--size`: 1440×900, 1280×720, 390×844 |

## Design-System „Bankiersgrün“
- Quelle: https://claude.ai/artifact/JTZ2zQxkHrv2m5uZHdqq9C (Artifact vom Typ Design System). Lesen mit dem Artifact-Tool (`action: read`, `path: project/README.md` bzw. `project/components/<Name>/README.md`), nie per WebFetch.
- Im Repo als Kopie unter `vendor/bankiersgruen/`: `bundle.js`, `bundle.css`, `index.d.ts`, `tokens.json`, `README.md` (Markenbuch), `diagramme.md`, Plotly-Templates, dazu das **generierte** `tokens.css` und `SOURCE.json` (Artifact-Version, Zeitpunkt, Hashes). Nicht von Hand ändern – Änderungen im Artifact machen und neu synchronisieren.
- **Ins Design-System einbauen:** Dateien mit dem Artifact-Tool lesen (`paths`), Kopie unter `scratchpad/…/project/…` bearbeiten (bundle.js ist ein klassisches Skript mit `h()`, neue Komponente am Ende bei `window.Bankiersgruen.X = X` eintragen, Typen in `index.d.ts` inkl. `interface Window`), je Komponente `components/<Name>/README.md` + `preview.html` (Zeile 1 `<!-- @dsCard group=… -->`), `design-system.json` → `lastChange` setzen. Veröffentlichen in **einem** Aufruf mit `root`, `file_path` = Index, `files` = Rest; `index.d.ts` braucht `contentType: "text/plain"`. Wird das Veröffentlichen abgelehnt („latest version nicht gesehen“), das Artifact einmal ohne `path` lesen. Danach wie unten synchronisieren.
- **Synchronisieren:** Das Artifact ist privat, das Skript kann es nicht selbst laden. Also zuerst mit dem Artifact-Tool lesen (`action: read`, `paths`: `project/components/bundle.js`, `project/components/bundle.css`, `project/components/index.d.ts`, `project/tokens.json`, `project/README.md`, `project/guidelines/diagramme.md`, `project/assets/Charts/plotly-template.json`, `project/assets/Charts/plotly-template-farbenblind.json`). Dann `npm run ds:sync -- <Ordner, in dem project/ liegt> --version <Version aus der Read-Antwort>`. Das Skript prüft die Dateien, kopiert sie und erzeugt `tokens.css` aus `tokens.json` (erstes Theme in `:root`, Farbenblind als `[data-theme="cb"]`, Typo-Stile als Klassen `.t-display`, `.t-label`, `.t-figure` …).
- Einbindung: `bundle.js` ist ein klassisches Skript, liest `window.React`/`window.ReactDOM` und setzt `window.Bankiersgruen`. `src/ds.ts` setzt die Globals (`src/ds-globals.ts`), lädt Bundle, Tokens und CSS und exportiert `DS` und `format` typisiert (Typen aus `vendor/bankiersgruen/index.d.ts`). Komponenten immer über `import { DS } from './ds'`.
- Kernregeln (Details im README des Systems): Darkmode, Flaschengrün + Messing · **ein** Messing-Button pro Bildschirm · Grün/Rot nur für Kursbewegungen/Fehler · Richtung immer mit ▲/▼ und Vorzeichen · Messing-Tönung nur für Belohnungen · flach, keine Verläufe/Schatten · Farben nur über Tokens (`var(--bg-card)` …), nie Hex im Code · Farbenblind-Theme `data-theme="cb"` muss funktionieren.
- Zahlen: deutsches Format, echtes `−`, Kurzform Mio./Mrd./Bio./Brd. mit vollem Wert im Tooltip (`Amount`, `Bankiersgruen.format`); Anleihen/Repos in % mit 4 Nachkommastellen; ASINs in Mono als Link.
- Schriften: Source Serif 4, Libre Franklin, IBM Plex Mono (Google Fonts).

## API
- Spec: https://stable.alpha-trader.com/v3/api-docs (Swagger UI: https://stable.alpha-trader.com/swagger-ui/index.html). Server: `stable` (Standard), `nightly`, `dev`.
- CORS ist offen (Origin wird gespiegelt) – kein Proxy nötig.
- Login: `POST /user/token?username=…&password=…&partnerId=…` → Antwort `{ code, message, … }`, das JWT steht in `message`.
- Authentifizierte Requests: `Authorization: Bearer <JWT>` (verifiziert). `X-Authorization` ist **nicht** der Token-Header, darüber kann die Partner-ID mitgeschickt werden. Token nur im Speicher/`sessionStorage`, nie loggen.
- `PARTNER_ID` ist öffentlich und kommt als `VITE_PARTNER_ID` in den Build; Basis-URL als `VITE_API_BASE`.
- Neuere Endpunkte unter `/api/v2/...` bevorzugen, wenn es beide gibt. Zeitstempel sind Millisekunden.
- Wichtige Endpunkte je Seite stehen in den READMEs der Seitenvorlagen im Design-System (z. B. Wertpapierseite: `/listingprofiles/{asin}`, `/pricespreads/{asin}`, `/orderbook/{asin}`, `/shareholders/{asin}`, `/v2/securityorderlogs/by-asin/{asin}`, `/v2/historizedlistingdata/{asin}`).

## Testen gegen die echte API (für Claude)
- Zugangsdaten in `.env` (`AT_USERNAME`, `AT_PASSWORD`, `PARTNER_ID`; nie committen, nie ausgeben – auch Tokens nicht in Tool-Ausgaben drucken). Claude darf sich damit einloggen, um Antwortformen zu prüfen und Seiten im Browser zu verifizieren. Dafür `npm run api:get -- /api/…` benutzen (kann nur GET).
- `stable` ist das Live-Spiel: **nur lesende Requests ohne Rückfrage.** Alles Schreibende (Orders, Überweisungen, Kapitalmaßnahmen, Chat, Abstimmungen …) nur nach ausdrücklicher Bestätigung.
- UI-Änderungen mit `npm run shot` prüfen (1440×900, 1280×720, 390×844): passt die Seite ohne Scrollen? Stimmen Farben im Farbenblind-Modus? Ansichten stehen in der URL (z. B. `/wertpapier/STSN3G03LB?markt=depth&zeitraum=K`), so lässt sich jede Ansicht direkt fotografieren.
- Gute Testwerte: Aktie `STSN3G03LB` (Alphakasse SE, viel Handel), Anleihe `BOADHCPS2D` (Kurs in %), Coin `ACALPHCOIN`.

## Aufbau der App
- `src/app/` Rahmen: `AppShell` (AppHeader mit Glocke `Notifications.tsx`, unter 720 px BottomNav + „Mehr“-Sheet), Bereiche in `nav.ts`. Seite = Grid in `100dvh`, `main` scrollt nur im Notfall.
- `src/app/layout.css` gemeinsames Ein-Bildschirm-Layout: `.page` (Kopf + Rest), `.page__body`/`.page__col` (Grids), `.panel` + `.panel__fill` (Karte füllt Zelle, Inhalt scrollt), `.panel__tabs` (Tabs in füllender Karte, Panel scrollt). Neu im DS: `Card fill` – für neue Seiten bevorzugen.
- Seiten (je Ordner `XyzPage.tsx`, `derive.ts` + Test, ggf. `charts.ts`): `organisation/` (Startseite „Meine Organisation“), `orders/`, `market/`, `highscores/`, `chat/` (`/nachrichten/:chatId?`), `news/` (`/zeitung/:postId?`), `players/` (`/spieler/:username`), `alliances/` (`/allianzen` mit `?gruenden=1`, `/allianz/:id` mit Verlassen, `?bearbeiten=1`, `?aufnehmen=1`; Rollen/Entfernen für Gründer und Stellvertretung), `polls/` (`/abstimmungen`), `forum/` (`/forum/:boardId?/:postId?`), `companies/` (`/unternehmen` mit Anstellungen/Gehalt abholen, `/unternehmen/:asin` mit Entwicklungsdiagramm, Bilanz, Presse, Abstimmungen, Erfolge (CEO holt ab), „Führen“ für CEOs: `ManagePanel` mit `?aktion=kapital|anleihe|index|etf|optionsschein|bank`), `capital/` (`/kapitalmassnahmen`: Zeitstrahl der Zeichnungsfristen + Tabelle), `me/` (`/bank`, `/miner`, `/erfolge`, `/einstellungen`). Kopfleiste: `GlobalSearch` (ab 1200 px, Taste „/“) und Glocke.
- Farbenblind-Modus: `src/lib/theme.ts` setzt `data-theme="cb"` (gespeichert im Browser, Schalter in den Einstellungen).
- Ansichten stehen in der URL (`?ansicht=…`, `?art=…`, `?seite=…`), damit `npm run shot` sie direkt fotografieren kann.
- `src/api/live.ts`: STOMP über die rohe WebSocket-Variante von SockJS (`wss://…/ws/websocket`, `@stomp/stompjs`, Header `Authorization: Bearer`). `useTopic(dest, fn)`; Topics `/user/topic/my/chats` und `/user/topic/chatmessages/{chatId}` (so auch die offizielle App unter alpha-trader.com/v2). Nach Reconnect werden die betroffenen Queries neu geladen.
- `src/lib/messages.ts`: Die API schickt Texte nur englisch als Vorlage (`message` mit `#`, `substitutions`). `translate()` übersetzt bekannte Vorlagen und formatiert Zahlen deutsch; unbekannte fallen auf `filledString` zurück. Neue Vorlagen dort ergänzen. `unwrap()` übersetzt auch Fehlermeldungen.
- `src/lib/html.ts`: Beschreibungen, Artikel, Kommentare sind HTML aus dem alten Spiel → `htmlToText()` zum Anzeigen (nie `dangerouslySetInnerHTML`), `textToHtml()` beim Schreiben.
- `useInternalLinks()` als `onClick` am Seitencontainer: DS-Komponenten rendern normale `<a href="/…">`, der Handler leitet sie durch den Router.
- `src/auth/` Login-Zustand (`AuthProvider`, `RequireAuth`); 401 meldet überall ab (`LOGOUT_EVENT`).
- `src/security/` Wertpapierseite (Muster für weitere Seiten): reine Rechenfunktionen in `derive.ts` (getestet), Plotly-Figuren in `charts.ts`, Layout in `SecurityPage.tsx/.css`.
  - Desktop ≥ 1100 px: kompakter Kopf · Kursverlauf (1T/14T/Kerzen, Buchwert-Linie) · [Orderbuch | Markttiefe | Trades] + Anteilseigner-Balken · Order-Maske rechts. 720–1099 px: ohne rechte Spalte, Order im Sheet. Handy: MobileTopBar · Kopf ohne Geld/Brief · eine Ansicht per SegmentedControl · TradeBar + Sheet.
- Stolperfallen:
  - `prices14d` aus `/listingprofiles` sind die letzten ~500 Trades, bei aktiven Aktien nur Stunden. Für 14 Tage Tagesschlusskurse aus `/v2/historizedlistingdata` mit den jüngsten Trades kombinieren (`recentPrices`).
  - Absolut positionierter Screenreader-Text (`.bnk-sr`) sprengt Scroll-Container ohne `position: relative` → die Seite scrollt. Scroll-Container immer `position: relative`.
  - `AppHeader.renderLink` bekommt `key` in den Props – vor dem Spreaden herausnehmen.
  - Markttiefe nur ±50 % um den Mittelkurs zeigen, ferne Verkaufswände (Mrd. Stück) machen das Diagramm sonst unlesbar.
  - `POST /api/v2/filter/pricespreads` ist bei vielen Treffern extrem langsam (nur `type = STOCK`: ~3 min) und hängt von der Reihenfolge der Bedingungen ab. Für die Marktsuche `GET /api/v2/pricespreads?search=` (< 1 s) plus Filter im Browser; ohne Suchtext `/api/v2/mostfrequentlytradedsecurities?type`.
  - `GET /api/v2/securityorders` ohne `securitiesAccountId` liefert die Orders **aller** Spieler – immer das Depot mitgeben.
  - `GET /api/securityorderlogs` ohne Parameter = die letzten ~1.000 Trades des ganzen Markts (Live-Ticker).
  - Chat: Nachrichten kommen neueste zuerst, 50 je Abruf, ältere mit `beforeDate`. Mitglieder über `/api/v2/chatmemberships?chatId=` (die Pfad-Variante `/chat/{id}` antwortet 500). Neue Direktnachricht = `POST /api/v2/chats` + `POST /api/v2/chatmemberships`. Lobby-Beitritte kommen als Nachricht „<name> has joined“. `/api/v2/my/chats` enthält nur Räume, in denen man Mitglied ist; alle öffentlichen Räume liefert `GET /api/chatrooms`, ihre Nachrichten gibt es erst nach dem Beitritt (sonst leere Liste).
  - Spieler-Highscores gibt es nur für TRADES, ACHIEVEMENTS, MINER, CHAT_MESSAGES, ONLINE_TIME; Unternehmen und Allianzen für die Geld-Kategorien (`TYPES_BY_KIND`).
  - `GET /api/user` enthält das JWT als `jwtToken` – nie ausgeben (`api:get` schwärzt Felder mit token/jwt/password).
  - Queries mit Pfadparameter aus `useMe()` brauchen `enabled`, sonst geht `/…/` ohne Namen raus (500).
  - `useDebounced` nie mit einem jedes Mal neuen Objekt füttern (Endlosschleife) – vorher `JSON.stringify`.
  - In einer scrollenden `.panel__fill` behalten Kinder ihre natürliche Höhe (`flex: none`), sonst überlappen „Mehr laden“-Knöpfe den Inhalt.
  - `GET /api/v2/my/alliancemembership` antwortet ohne Allianz mit 200 und einer leeren Meldung (`{ code, message: null }`), nicht 404.
  - `GET /api/v2/averagebondinterestrate` liefert einen Bruch (0,02 = 2 %), Anleihe-`interestRate` und Leitzins dagegen Prozent.
  - `/api/v2/capitalincreases` und `/capitalreductions` enthalten nur laufende und geplante Maßnahmen (wenige Einträge); der Parameter `sort` wird ignoriert.
  - `GET /api/centralbankreserves` antwortet 400, wenn man das Unternehmen nicht führt.
  - Screenshots öffnen Seiten wirklich: ein geöffneter Chat wird als gelesen markiert (`PUT /api/v2/my/chats/read`).

## Vorschläge fürs Design-System
- `SecurityHeader` braucht eine kompakte Variante (Kurszeile und Eckdaten in einer Zeile, weniger Abstand oben). Bis dahin seitenweise Überschreibung in `SecurityPage.css`.
- Anteilseigner als waagerechte Balken (größte 4 + „Übrige“) statt Ring – liest sich bei niedriger Höhe besser.
- Trades als Punktwolke (Kurs über Zeit, Fläche ∝ Volumen) statt Tabelle.
- Umgesetzt (Version 43): `UserPicker`, `Card fill`, `MarketPulse` mit `trades24h`/`volume24h`, `MarketResults defaultSort`, `PollList` ohne Sammelabstimmung bei leerer Liste.
- Offen: `Textarea` (mehrzeiliges Feld; bis dahin `.bnk-input` + `<textarea>` in `AllianceForm`); `BankingPanel` – Kennzahl-Beschriftungen stoßen unter ~760 px Breite aneinander; `Plot`-Klick auf Balken → Wertpapierseite (Gewinner/Verlierer); `SecurityHeader compact`; `LiveTicker` mit Namen-Nachschlag, wenn nur ASINs bekannt sind; `ChatComposer` am Handy mit Senden-Knopf in der Zeile.

## Konventionen
- Code, Bezeichner, Commits auf Englisch; UI-Texte und diese Datei auf Deutsch. Begriffe der Oberfläche siehe Design-System („Meine Organisation“ statt „Imperium“).
- Props und Datenfelder heißen wie in der API.
