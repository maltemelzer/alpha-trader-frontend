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
