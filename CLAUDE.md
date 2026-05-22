# Maps - Location Intelligence Platform

Woosmap competitor. Privacy-first location intelligence platform providing mapping, search, routing, and store locator APIs. See PLAN.md for full architecture.

## Tech Stack

- **Runtime**: Node.js
- **Package Manager**: pnpm (workspaces)
- **Linting/Formatting**: Biome
- **API Framework**: Hono
- **Auth**: better-auth
- **ORM**: Drizzle (packages/db)
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **Testing**: Vitest
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui
- **Map Rendering**: MapLibre GL JS v5
- **Geocoding**: Photon (Elasticsearch-based)
- **Tiles**: PMTiles (basemap via Cloudflare R2) + Martin (customer data from PostGIS)

## Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages and apps
pnpm check            # Biome lint + format check
pnpm check:fix        # Biome lint + format with auto-fix
pnpm typecheck        # TypeScript check across all packages
pnpm test             # Run all tests
pnpm test:coverage    # Tests with coverage

# Database (packages/db)
pnpm --filter @atlas/db reset  # Drop & recreate database, enable PostGIS
pnpm --filter @atlas/db push   # Push Drizzle schema to database (drizzle-kit push)
pnpm --filter @atlas/db seed   # Seed dev data (tenant, API key, default map styles)

# Basemap tiles (infra/workers/tiles)
cd infra/workers/tiles && pnpm dev  # Start tiles Worker on :8787 (wrangler dev + local R2)
```

## Quality Gates

Before completing any task, run:
```bash
pnpm check:fix && pnpm typecheck
```

## Code Style (Biome)

- 2-space indentation, LF line endings, 100 char width
- Single quotes for JS/TS, double quotes for JSX
- Semicolons always, trailing commas es5
- Imports auto-sorted by Biome
- No `any` types

## Project Structure

```
apps/
  dashboard/     # Next.js 15 developer console
  api/           # Hono modular monolith API server
  docs/          # VitePress API documentation
packages/
  sdk-js/        # @atlas/sdk-js - JavaScript SDK
  db/            # Drizzle schema, migrations, DB client
  shared/        # Shared types, validators, constants
  widget-*/      # Lit web components (store-locator, autocomplete)
infra/
  workers/
    tiles/       # Cloudflare Worker for basemap tile serving (PMTiles + R2)
```

## Conventions

- **Components**: kebab-case filenames
- **DB tables**: snake_case, singular (e.g., `store`, `api_key`)
- **Variables/functions**: camelCase
- **Types/interfaces**: PascalCase
- **Spatial queries**: Use Drizzle `sql` template literals for PostGIS functions (`ST_DWithin`, `ST_Distance`, etc.)
- **API responses**: `{ data, meta: { request_id, attribution, cache_hit } }`
- **API auth**: `X-API-Key` header with scoped permissions
- **Privacy**: No query logging, no IP retention, GDPR-compliant by default

## Development

```bash
docker compose up    # PostGIS, Valkey, Photon (ES), Martin
pnpm dev             # Hot-reload all apps
cd infra/workers/tiles && pnpm dev  # Start basemap tiles Worker (wrangler dev)
```

Caddy reverse proxy routes local traffic (api.localhost, dashboard.localhost, tiles.localhost).
Basemap tiles served by Cloudflare Worker locally via `wrangler dev` on port 8787, uses same code as production.

### Basemap tiles setup

Place a France PMTiles extract at `infra/data/pmtiles/france.pmtiles`, then upload to local R2:

```bash
# Option 1: Download a pre-built France extract (e.g. from OpenFreeMap or Geofabrik)

# Option 2: Extract from a global PMTiles archive
pmtiles extract world.pmtiles infra/data/pmtiles/france.pmtiles --bbox -5,41,10,52

# Upload to local R2 store (run from infra/workers/tiles/)
cd infra/workers/tiles && pnpm wrangler r2 object put basemap-tiles/france.pmtiles --file ../../data/pmtiles/france.pmtiles --local
```

The `pmtiles` CLI is at `~/bin/pmtiles`.

### Fresh database setup

```bash
pnpm --filter @atlas/db reset && pnpm --filter @atlas/db push && pnpm --filter @atlas/db seed
```

Seeded dev API key: `ak_live_dashboard_dev_key_12345678`

Do not commit - EVER
