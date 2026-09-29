#!/bin/sh
# Writes /legal.json from the environment when the container starts (nginx runs /docker-entrypoint.d/*.sh).
# Name and address of the operator stay out of the code and the public image – they come from the
# .env on the Pi via compose.yaml. The pages /impressum and /datenschutz read this file.
set -eu

# JSON string: escape backslash and double quote, drop control characters.
json() { printf '%s' "$1" | tr -d '\000-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

cat > /usr/share/nginx/html/legal.json <<JSON
{
  "name": "$(json "${LEGAL_NAME:-}")",
  "street": "$(json "${LEGAL_STREET:-}")",
  "city": "$(json "${LEGAL_CITY:-}")",
  "country": "$(json "${LEGAL_COUNTRY:-Deutschland}")",
  "email": "$(json "${LEGAL_EMAIL:-}")",
  "phone": "$(json "${LEGAL_PHONE:-}")",
  "hosting": "$(json "${LEGAL_HOSTING:-}")",
  "cdn": "$(json "${LEGAL_CDN:-}")"
}
JSON
[ -n "${LEGAL_NAME:-}" ] || echo "40-legal-config: LEGAL_NAME is empty – Impressum and Datenschutz show a notice instead of the operator" >&2
