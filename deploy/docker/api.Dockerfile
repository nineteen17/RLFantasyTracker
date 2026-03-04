# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /workspace
ENV CI=true

FROM base AS deps
COPY app/api/package*.json ./app/api/
COPY packages/types/package.json ./packages/types/
COPY packages/types/src ./packages/types/src
RUN --mount=type=cache,target=/root/.npm cd app/api && npm ci

FROM base AS build
COPY --from=deps /workspace/app/api/node_modules ./app/api/node_modules
COPY --from=deps /workspace/packages/types ./packages/types
COPY app/api ./app/api
RUN cd app/api && npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid app app

COPY --from=deps /workspace/app/api/node_modules ./node_modules
COPY --from=build /workspace/app/api/package*.json ./
COPY --from=build /workspace/app/api/dist ./dist
COPY --from=build /workspace/app/api/drizzle ./drizzle

RUN npm prune --omit=dev && npm cache clean --force
RUN mkdir -p /app/logs && chown -R app:app /app

USER app
EXPOSE 5000

CMD ["node", "dist/index.js"]
