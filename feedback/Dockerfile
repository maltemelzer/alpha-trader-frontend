# Feedback service (experiments: ratings, comments, usage). No dependencies, no build step – the image only
# copies files, so GitHub builds it for amd64 + arm64 without emulation. Data lives in the volume /data.
FROM node:24-alpine
WORKDIR /app
COPY store.mjs app.mjs server.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production FEEDBACK_DB=/data/feedback.db PORT=8787
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=60s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/feedback-api/health >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
