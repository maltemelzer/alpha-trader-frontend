#!/bin/sh
# Pulls the latest image from GHCR and restarts the container if it changed.
# Run by cron on the Pi, e.g.  */5 * * * * /home/pi/alpha-trader-frontend/docker/update.sh
set -eu
cd "$(dirname "$0")/.."
docker compose pull --quiet frontend
docker compose up -d --no-build frontend
docker image prune -f >/dev/null
