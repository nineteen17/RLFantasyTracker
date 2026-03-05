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
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
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

COPY --from=build /workspace/app/client/.next/standalone ./
COPY --from=build /workspace/app/client/.next/static ./.next/static
COPY --from=build /workspace/app/client/public ./public

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx && \
    chown -R app:app /app

USER app
EXPOSE 3000

CMD ["node", "server.js"]
