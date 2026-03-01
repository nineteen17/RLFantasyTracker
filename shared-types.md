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
  "main": "src/index.ts",
  "types": "src/index.ts",
  "peerDependencies": { "zod": "^3.0.0" }
}
```

No build step — consumers compile raw `.ts` directly.

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

- Zod as peerDependency (not direct) to avoid duplicate zod instances at build time
- No build step — raw TypeScript consumed directly by tsup (API) and Next.js (client via `transpilePackages`)
- OpenAPI docs are separate (for human reading only); shared types are the real type enforcement
