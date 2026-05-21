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
docker compose up    # PostGIS, Valkey, Photon (ES), Martin, MinIO
pnpm dev             # Hot-reload all apps
```

Caddy reverse proxy routes local traffic (api.localhost, dashboard.localhost).

Do not commit - EVER
