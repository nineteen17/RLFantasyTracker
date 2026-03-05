# Session Fixes — 5 March 2026

## 1. Web Container Crash (Docker)

**Root cause:** The web container runs with `read_only: true` filesystem. Next.js detects `next.config.ts` and tries to install TypeScript at runtime to transpile it. The 64MB tmpfs is too small → `ENOSPC` → container crash loop.

**Fix (2 files):**

### `app/client/next.config.ts`
- Added `output: "standalone"` to the Next.js config.
- This tells `next build` to produce a self-contained `.next/standalone/` directory with `server.js` and all traced dependencies bundled. No `node_modules` or TypeScript needed at runtime.

### `deploy/docker/web.Dockerfile`
- **Removed** the `prod-deps` stage entirely (standalone bundles its own dependencies).
- **Removed** the `next.config.mjs` hack that was manually writing a JS config during build.
- **Runner stage** now copies only 3 things: standalone output, static assets, and public dir.
- **CMD** changed from `node_modules/.bin/next start` → `node app/client/server.js`.

---

## 2. CI: `package-lock.json` Not Found

**Root cause:** `package-lock.json` is intentionally gitignored. The CI workflow referenced it in `actions/setup-node@v4` with `cache: npm` and `cache-dependency-path`, causing `Error: Some specified paths were not resolved, unable to cache dependencies`.

**Fix (`/.github/workflows/ci.yml`):**
- Removed `cache: npm` and `cache-dependency-path` from both `setup-node` steps.
- Changed `npm ci` → `npm install` in both jobs (since `npm ci` requires a lock file).

---

## 3. CI: Missing `@nrl/types` Build Step

**Root cause:** Both `app/api` and `app/client` depend on `@nrl/types` (a local `file:` dependency). The package's `dist/` is gitignored, so it doesn't exist in CI. Both jobs failed when trying to resolve `@nrl/types`.

**Fix (`/.github/workflows/ci.yml`):**
- Added a `Build @nrl/types` step (`npm install && npm run build` in `packages/types`) to both the `api` and `client` CI jobs, before their respective `npm install`.

---

## 4. ESLint: `setState` in `useEffect`

**Root cause:** `desktop-nav.tsx` and `mobile-menu.tsx` used `useEffect` + `setState` to read `window.location.search`. The React Hooks ESLint rule (`react-hooks/set-state-in-effect`) flagged this as a cascading render anti-pattern.

**Fix (2 files):**
- Replaced `useEffect`/`useState` for `returnTo` with `useSearchParams()` from `next/navigation` in both components.
- This is the idiomatic Next.js approach — reactive and SSR-safe.

### `app/client/src/app/layout.tsx`
- Wrapped `<MobileMenu />` and `<DesktopNav />` in `<Suspense>` — required by Next.js when components use `useSearchParams()` (otherwise static prerendering of `/_not-found` fails).

---

## 5. Biome Lint: Unused Variable & Import (API)

**Root cause:** Incomplete refactoring left behind unused code.

**Fix (2 files):**
- `app/api/src/index.ts` — removed unused `const NODE_ENV = process.env.NODE_ENV` (already logged directly on the line above).
- `app/api/src/logic/model/teams/teams.repository.ts` — removed unused `playerCurrent` import.
