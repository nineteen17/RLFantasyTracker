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
  if [ -f package-lock.json ]; then npm ci; else npm install; fi'

FROM base AS build
COPY --from=deps /workspace/app/client/node_modules ./app/client/node_modules
COPY --from=deps /workspace/packages/types ./packages/types
COPY app/client ./app/client
COPY packages/types ./packages/types
RUN cd packages/types && npm install && npm run build
RUN cd app/client && npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid app app

COPY --from=deps /workspace/app/client/node_modules ./node_modules
COPY --from=build /workspace/app/client/package*.json ./
COPY --from=build /workspace/app/client/.next ./.next
COPY --from=build /workspace/app/client/public ./public
COPY --from=build /workspace/app/client/next.config.ts ./next.config.ts

RUN npm cache clean --force && chown -R app:app /app

USER app
EXPOSE 3000

CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
