# Static build of the SPA, served by nginx. Multi-arch: the build stage runs on the
# host platform (output is plain HTML/JS), the nginx image exists for arm64/armv7 (Raspberry Pi).
#
# GitHub Actions builds linux/amd64 + linux/arm64 and pushes ghcr.io/maltemelzer/alpha-trader-frontend.
#   docker compose up -d --build                                   # build locally

FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Public values, baked into the bundle (see CLAUDE.md → API).
ARG VITE_PARTNER_ID=""
ARG VITE_API_BASE="https://stable.alpha-trader.com"
ENV VITE_PARTNER_ID=$VITE_PARTNER_ID VITE_API_BASE=$VITE_API_BASE
RUN npm run build

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=60s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
