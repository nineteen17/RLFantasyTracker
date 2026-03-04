# FROM node:20-slim AS base
# RUN corepack enable && corepack prepare pnpm@8.10.0 --activate
# WORKDIR /app

# # Install dependencies
# FROM base AS deps
# COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# COPY packages/shared/package.json ./packages/shared/
# COPY apps/web/package.json ./apps/web/
# RUN pnpm install --frozen-lockfile

# # Build
# FROM base AS builder
# WORKDIR /app

# # Accept build args for Next.js env vars
# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# COPY --from=deps /app/node_modules ./node_modules
# COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
# COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
# COPY . .

# # Build shared package first
# RUN cd packages/shared && pnpm build

# # Build Next.js app
# ENV NEXT_TELEMETRY_DISABLED=1
# ENV NODE_ENV=production
# RUN cd apps/web && pnpm build

# # Production image
# FROM node:20-slim AS runner
# WORKDIR /app

# ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

# RUN groupadd --system --gid 1001 nodejs
# RUN useradd --system --uid 1001 nextjs

# # Copy public assets
# COPY --from=builder /app/apps/web/public ./public

# # Copy standalone build output
# # The standalone output includes server.js at the root of .next/standalone
# COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# USER nextjs

# EXPOSE 3000

# ENV PORT=3000
# ENV HOSTNAME="0.0.0.0"

# # The standalone server.js is at the monorepo root level in standalone output
# CMD ["node", "apps/web/server.js"]
