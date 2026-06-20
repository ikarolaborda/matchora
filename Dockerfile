# syntax=docker/dockerfile:1.7
# Multi-stage build for the MatchOra web app (Next.js 15 standalone) in a
# pnpm/Turborepo monorepo. Build context MUST be the repo root.

ARG NODE_VERSION=22-alpine

# ── builder: install the workspace + build the web app (standalone) ───────────
# A shared BuildKit cache mount keeps the pnpm store warm across rebuilds; the
# store lives in the mount (not a copyable layer), so install runs here directly.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
ENV NODE_ENV=production
RUN pnpm --filter @matchora/web build

# ── migrate: one-shot Drizzle migration runner (run as a compose pre-step) ────
# Reuses the builder (full workspace + tsx + drizzle-kit + generated SQL). Used
# by the compose `migrate` service; exits after applying migrations.
FROM builder AS migrate
WORKDIR /app
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@matchora/data", "run", "db:migrate:run"]

# ── runner: minimal standalone image, non-root ───────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# drop privileges
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

# standalone output (monorepo: traced tree is rooted at the repo root, so the
# server entrypoint lives at apps/web/server.js inside the copied tree)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

# container self-healthcheck hits the app's health route
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
