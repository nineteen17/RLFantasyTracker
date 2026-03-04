FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

# Build shared package first
RUN cd packages/shared && pnpm build

# Build API
RUN cd apps/api && pnpm build

# Production image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy dependencies and built files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy migration files (not compiled by TypeScript)
COPY --from=builder /app/apps/api/src/db/migrations ./apps/api/dist/src/db/migrations
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts

WORKDIR /app/apps/api
EXPOSE 5002
CMD ["node", "dist/src/server.js"]
