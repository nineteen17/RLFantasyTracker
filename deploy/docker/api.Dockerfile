# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /workspace
ENV CI=true

FROM base AS deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
COPY app/api/package*.json ./app/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src
RUN --mount=type=cache,target=/root/.npm sh -lc '\
  cd app/api && \
  if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi && \
  cd ../../packages/types && \
  if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi && \
  npm run build'

FROM base AS build
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV TSUP_DTS=false
COPY --from=deps /workspace/app/api/node_modules ./app/api/node_modules
COPY --from=deps /workspace/packages/types ./packages/types
COPY app/api ./app/api
RUN cd app/api && npm run build

FROM base AS prod-deps
COPY app/api/package*.json ./app/api/
COPY --from=deps /workspace/packages/types/package*.json ./packages/types/
COPY --from=deps /workspace/packages/types/dist ./packages/types/dist
RUN cd app/api && \
  if [ -f package-lock.json ]; then npm ci --omit=dev --omit=optional || npm install --omit=dev --omit=optional; else npm install --omit=dev --omit=optional; fi

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid app app

COPY --from=prod-deps /workspace/app/api/node_modules ./node_modules
COPY --from=deps /workspace/packages/types /packages/types
COPY --from=build /workspace/app/api/package*.json ./
COPY --from=build /workspace/app/api/dist ./dist
COPY --from=build /workspace/app/api/drizzle ./drizzle

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
RUN mkdir -p /app/logs && chown -R app:app /app

USER app
EXPOSE 5000

CMD ["node", "dist/index.js"]
