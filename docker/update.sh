#!/bin/sh
# Pulls the latest images from GHCR and restarts the containers that changed.
# Run by cron on the Pi, e.g.  */5 * * * * /home/pi/alpha-trader-frontend/docker/update.sh
set -eu
cd "$(dirname "$0")/.."
docker compose pull --quiet frontend feedback
docker compose up -d --no-build frontend feedback
docker image prune -f >/dev/null
