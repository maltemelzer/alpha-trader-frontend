# Auslieferung auf den Raspberry Pi

Der Pi **holt** neue Versionen selbst ab – GitHub führt keinen Code auf dem Pi aus
(kein selbst gehosteter Runner, das Repo ist öffentlich).

1. Push auf `main` → GitHub Actions (`.github/workflows/deploy.yml`, nur Runner von GitHub):
   **test** (Lint + Tests) → **image**: baut das Image für `linux/amd64` und `linux/arm64` und legt es als
   `ghcr.io/maltemelzer/alpha-trader-frontend:latest` (und `:sha-<commit>`) in die GitHub Container Registry.
2. Auf dem Pi prüft ein Cron-Job alle 5 Minuten `docker/update.sh`: `docker compose pull` → `up -d`
   (startet den Container nur neu, wenn sich das Image geändert hat) → alte Images aufräumen.

Von Hand auslösen: Actions → „Deploy“ → „Run workflow“; auf dem Pi `./docker/update.sh`.

## Einstellungen im Repo

- Variable `PARTNER_ID` (Settings → Secrets and variables → Actions → Variables) – öffentlich, landet im Bundle.
- Das Paket `alpha-trader-frontend` (Profil → Packages → Package settings) auf **Public** stellen, sobald das Repo
  öffentlich ist – dann braucht der Pi keine Anmeldung bei `ghcr.io`.

## Pi einrichten (einmalig)

```sh
git clone https://github.com/maltemelzer/alpha-trader-frontend.git ~/alpha-trader-frontend
cd ~/alpha-trader-frontend
echo "PORT=9010" > .env              # optional, Standard 9010
./docker/update.sh                   # erster Start
crontab -e                           # Zeile ergänzen:
# */5 * * * * $HOME/alpha-trader-frontend/docker/update.sh >> /tmp/alpha-trader-update.log 2>&1
```

Solange das Paket noch privat ist, einmalig anmelden: `docker login ghcr.io -u maltemelzer` mit einem
Personal Access Token (classic) nur mit `read:packages` als Passwort.

Ändert sich `compose.yaml` oder `docker/update.sh`, auf dem Pi `git pull` ausführen – der Cron-Job holt nur Images.

## Feedback-Dienst (Experimente)

Seit den Experimenten laufen zwei Container: `frontend` (nginx) und `feedback` (`feedback/`, Bewertungen und
Kommentare zu Varianten, SQLite im Volume `feedback-data`). nginx leitet `/feedback-api/` weiter und startet auch,
wenn `feedback` fehlt (dann antwortet nur `/feedback-api/` mit 502).

Einmalig auf dem Pi:

```sh
cd ~/alpha-trader-frontend && git pull          # neue compose.yaml + update.sh
echo "FEEDBACK_ADMINS=DeinSpielername" >> .env   # wer die Auswertung /experimente sehen darf
./docker/update.sh
```

## Impressum und Datenschutz

Name und Anschrift stehen nicht im Code und nicht im Image, sondern nur in der `.env` auf dem Pi. Der
Frontend-Container schreibt daraus beim Start `/legal.json` (`docker/40-legal-config.sh`):

```sh
cat >> .env <<'ENV'
LEGAL_NAME=Vorname Nachname
LEGAL_STREET=Straße 1          # oder c/o-Anschrift eines Impressum-Service
LEGAL_CITY=12345 Ort
LEGAL_EMAIL=kontakt@example.org
LEGAL_HOSTING=auf einem eigenen Server (Raspberry Pi) in Deutschland
ENV
docker compose up -d frontend   # übernimmt die neuen Werte
```

`LEGAL_HOSTING` ist ein Satz für die Datenschutzerklärung über den Server selbst („Die Seite läuft …“).
Steht **Cloudflare** davor (Tunnel oder Proxy mit oranger Wolke), zusätzlich `LEGAL_CDN=cloudflare` setzen – dann
bekommt die Datenschutzerklärung einen eigenen Abschnitt (volle IP bei Cloudflare, Auftragsverarbeitung, USA/Data
Privacy Framework, mögliche Bot-Cookies `__cf_bm`/`cf_clearance`). Dann bei Cloudflare **keine** Zusatzdienste
einschalten, die die Erklärung nicht nennt: Web Analytics/Browser Insights, Zaraz, Rocket Loader, E-Mail-Verschleierung
(die fügen Skripte in die Seite ein). Ohne die Angaben zeigen `/impressum` und `/datenschutz` einen Hinweis.
nginx protokolliert nur gekürzte IP-Adressen; Docker hält höchstens 3 × 10 MB Log je Container.

Das Paket `alpha-trader-feedback` in GHCR wie das Frontend auf **Public** stellen (oder `docker login ghcr.io`).
Sicherung: `docker compose cp feedback:/data/feedback.db ./feedback-backup.db`. Details in `feedback/README.md`.

## Alten Runner entfernen (einmalig)

Der frühere selbst gehostete Runner `pi-5` ist in GitHub bereits abgemeldet. Auf dem Pi den Dienst stoppen und löschen:

```sh
cd ~/actions-runner-alpha-trader
sudo ./svc.sh stop && sudo ./svc.sh uninstall
cd ~ && rm -rf ~/actions-runner-alpha-trader
```

Der alte Container läuft weiter, bis `update.sh` ihn ersetzt (gleicher Compose-Projektname `alpha-trader-frontend`).

## Sicherheit

- Workflows laufen nur auf Runnern von GitHub; es gibt keine Secrets, `GITHUB_TOKEN` darf standardmäßig nur lesen,
  Schreibrecht auf Pakete hat allein der Job `image`, und der läuft nur bei Push auf `main` oder per Hand.
- Workflows aus Fork-PRs laufen erst nach Freigabe; nie `pull_request_target` verwenden.
- Der Pi braucht keinen Zugang von außen und kein Token mit Schreibrechten.
