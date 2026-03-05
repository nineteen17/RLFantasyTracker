# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true

FROM base AS deps
COPY app/client/package*.json ./app/client/
COPY packages/types/package*.json ./packages/types/
COPY packages/types/src ./packages/types/src
RUN --mount=type=cache,target=/root/.npm sh -lc '\
  cd app/client && \
  if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi'

FROM base AS build
COPY --from=deps /workspace/app/client/node_modules ./app/client/node_modules
COPY --from=deps /workspace/packages/types ./packages/types
COPY app/client ./app/client
COPY packages/types ./packages/types
RUN cd packages/types && npm install && npm run build
RUN cd app/client && npm run build

FROM base AS prod-deps
COPY app/client/package*.json ./app/client/
COPY --from=build /workspace/packages/types/package*.json ./packages/types/
COPY --from=build /workspace/packages/types/dist ./packages/types/dist
RUN cd app/client && \
  if [ -f package-lock.json ]; then npm ci --omit=dev --omit=optional || npm install --omit=dev --omit=optional; else npm install --omit=dev --omit=optional; fi

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid app app

COPY --from=prod-deps /workspace/app/client/node_modules ./node_modules
COPY --from=build /workspace/app/client/package*.json ./
COPY --from=build /workspace/app/client/.next ./.next
COPY --from=build /workspace/app/client/public ./public
COPY --from=build /workspace/app/client/next.config.ts ./next.config.ts
COPY --from=build /workspace/packages/types /packages/types

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx && \
    chown -R app:app /app

USER app
EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
