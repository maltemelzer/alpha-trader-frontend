# Deployment auf den Raspberry Pi

Push auf `main` → GitHub Actions (`.github/workflows/deploy.yml`):

1. **test** (GitHub-Runner): `npm ci` + `npm test`.
2. **deploy** (selbst gehosteter Runner auf dem Pi): `docker compose build` → `up -d` → prüft, ob
   `http://127.0.0.1:9010/…` antwortet → alte Images aufräumen.

Von Hand auslösen: Actions → „Deploy“ → „Run workflow“.

## Einstellungen im Repo

- Variable `PARTNER_ID` (Settings → Secrets and variables → Actions → Variables) – öffentlich, landet im Bundle.
- Optional Variable `PORT` (Standard 9010; 8080–8082 und 9004–9009 belegt der digital-garden).

## Runner auf dem Pi einrichten (einmalig)

Runner eines privaten Kontos gelten nur für ein Repo – neben dem Runner des `digital-garden` läuft
auf dem Pi ein eigener für dieses Repo (Name `pi-5`, nur die Standard-Labels `self-hosted, Linux, ARM64`).

Settings → Actions → Runners → „New self-hosted runner“ → Linux / ARM64 zeigt Download und Token
(1 Std. gültig). Auf dem Pi:

```sh
mkdir ~/actions-runner-alpha-trader && cd ~/actions-runner-alpha-trader
# Download- und tar-Befehl von der GitHub-Seite übernehmen, dann:
./config.sh --url https://github.com/maltemelzer/alpha-trader-frontend --token <TOKEN> \
  --name pi-5 --unattended
sudo ./svc.sh install && sudo ./svc.sh start
```

Der Runner-Nutzer braucht Docker-Rechte (wie beim digital-garden-Runner: Gruppe `docker`).
