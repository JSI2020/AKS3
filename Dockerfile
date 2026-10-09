# AKS — production-ish image for Docker Desktop / Hetzner
# Multi-stage: deps → build → runner (Next.js standalone + worker)

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* is inlined at build — use the production site URL so the
# client/middleware never bake in localhost. Secrets stay runtime-only.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://aks:aks@postgres:5432/aks \
    AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    AUTH_URL=https://www.aks-atelier.com \
    NEXT_PUBLIC_SITE_URL=https://www.aks-atelier.com \
    AI_GENERATION_MOCK=1

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Worker + migrate/seed need full TS sources and node_modules (tsx).
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/modules ./modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/auth.ts /app/auth.config.ts ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/i18n ./i18n
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN chmod +x /app/scripts/docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["app"]
