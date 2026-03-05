# Shared Types Package (@nrl/types)

## What It Is

Single source of truth for Zod schemas and inferred TypeScript types. Both the Express API and Next.js client import from here — no type duplication.

## Location

`packages/types/` in monorepo root.

## Package Config

```json
{
  "name": "@nrl/types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./dist/*": "./dist/*"
  },
  "scripts": { "build": "tsc" },
  "dependencies": { "zod": "^3.25.51" }
}
```

Requires a build step (`npm run build` → `tsc`) to produce `dist/`. The `dist/` directory is gitignored, so CI jobs must build this package before consuming it.

## File Structure

```
packages/types/src/
  index.ts       — barrel export
  common.ts      — PaginatedResponseSchema, PaginatedResponse<T>
  teams.ts       — SquadSchema, PlayerCardSchema, FixtureStripItemSchema,
                   TeamsListResponseSchema, TeamDetailResponseSchema + inferred types
  players.ts     — searchQuerySchema, playerIdParamSchema, SearchResultSchema,
                   SearchResponseSchema, PlayerCurrentSchema, PlayerInfoSchema,
                   PlayerDetailResponseSchema + inferred types
```

## How API Uses It

- `package.json`: `"@nrl/types": "file:../../packages/types"`
- `tsconfig.json`: `"preserveSymlinks": true` (required for tsup DTS build)
- OpenAPI files import schemas: `import { SquadSchema, ... } from "@nrl/types"`
- `players.schema.ts` re-exports: `export { searchQuerySchema, ... } from "@nrl/types"`

## How Client Uses It

1. Add to `app/client/package.json`:
   ```json
   "@nrl/types": "file:../../packages/types"
   ```
2. Add to `app/client/next.config.ts`:
   ```typescript
   transpilePackages: ["@nrl/types"]
   ```
3. Import types in components/hooks:
   ```typescript
   import type { Squad, SearchResult, PlayerDetailResponse } from "@nrl/types";
   // or import schemas for runtime validation:
   import { SearchResponseSchema } from "@nrl/types";
   ```

## Available Exports

### Schemas (Zod — runtime validation + type inference)

- `SquadSchema`, `PlayerCardSchema`, `FixtureStripItemSchema`
- `TeamsListResponseSchema`, `TeamDetailResponseSchema`
- `searchQuerySchema`, `playerIdParamSchema`
- `SearchResultSchema`, `SearchResponseSchema`
- `PlayerCurrentSchema`, `PlayerInfoSchema`, `PlayerDetailResponseSchema`
- `PaginatedResponseSchema`

### Types (inferred from schemas via `z.infer<>`)

- `Squad`, `PlayerCard`, `FixtureStripItem`
- `TeamsListResponse`, `TeamDetailResponse`
- `SearchQuery`, `SearchResult`, `SearchResponse`
- `PlayerCurrent`, `PlayerInfo`, `PlayerDetailResponse`
- `PaginatedResponse<T>`

## Key Decisions

- Zod as a direct dependency
- Built via `tsc` to `dist/` — consumers import compiled JS + declarations
- `dist/` is gitignored; CI must run `npm install && npm run build` in `packages/types` before building API or client
- Next.js client uses `transpilePackages: ["@nrl/types"]` for additional bundling
- OpenAPI docs are separate (for human reading only); shared types are the real type enforcement
