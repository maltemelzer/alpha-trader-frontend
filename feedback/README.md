# Feedback-Dienst (Experimente)

Kleiner Dienst neben dem Frontend auf dem Pi: speichert Bewertungen, Kommentare und Nutzungszahlen, wenn
Spieler mehrere Varianten einer Seite ausprobieren (`src/experiments/`). Node ≥ 22.13 mit dem eingebauten
`node:sqlite`, **keine Abhängigkeiten**, kein Build-Schritt.

## Wie er arbeitet

- nginx leitet `/feedback-api/…` an den Container `feedback:8787` weiter (`docker/nginx.conf`), also gleicher
  Ursprung wie die App – kein CORS. Im Dev-Server macht das der Vite-Proxy (`npm run feedback` startet den Dienst lokal).
- **Anmeldung = das JWT des Spiels.** Der Dienst fragt mit dem Token `GET /api/user` beim Spielserver und merkt
  sich nur den Spielernamen (10 Min. im Speicher, Schlüssel = SHA-256 des Tokens). Das Token wird nie gespeichert
  oder geloggt. So kann nur ein echter Spieler bewerten, einmal je Variante (erneut senden ändert die Bewertung).
- Begrenzung: 120 Anfragen/Min. je Spieler, Body ≤ 16 KB, Kommentar ≤ 2.000 Zeichen.

## Endpunkte (alle unter `/feedback-api`)

| Methode + Pfad | Wer | Inhalt |
| --- | --- | --- |
| `GET /health` | alle | `{ ok: true }` |
| `GET /me?experiment=` | Spieler | eigene Bewertungen, Favorit, `admin` |
| `PUT /rating` | Spieler | `{ experiment, variant, stars: 1–5, comment }` – eine je Spieler und Variante |
| `PUT /favorite` | Spieler | `{ experiment, variant }` – „Welche soll bleiben?“, eine je Spieler |
| `POST /usage` | Spieler | `{ experiment, variant, visit, dwellMs, clicks: { "/wertpapier": 2 } }` |
| `GET /results?experiment=` | Admins | je Variante Personen, Besuche, Median-Verweildauer je Besuch, Sterne, Favoriten, Klickziele + alle Kommentare mit Namen |
| `GET /experiments` | Admins | Experimente mit Daten |

## Daten

SQLite in `/data/feedback.db` (Volume `feedback-data`). Bewertungen und Favoriten **mit Spielernamen** (steht so
im Dialog). Nutzungszahlen nur mit einem gesalzenen Hash des Namens – zählbar, aber keine Liste, wer wann wo war.
Klickziele sind grob (erstes Pfadsegment eines Links oder `data-track`).

Sicherung auf dem Pi: `docker compose cp feedback:/data/feedback.db ./feedback-backup.db`.

## Umgebung

| Variable | Standard | |
| --- | --- | --- |
| `FEEDBACK_ADMINS` | leer | Spielernamen mit Komma, die `/experimente` sehen (Groß/Klein egal) |
| `API_BASE` | `https://stable.alpha-trader.com` | Spielserver für die Anmeldung |
| `FEEDBACK_DB` | `/data/feedback.db` | |
| `PORT` | `8787` | |

Tests: `feedback/app.test.mjs` (läuft mit `npm test`, SQLite im Speicher).
