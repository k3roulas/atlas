# Atlas

This project is a working progress

Privacy-first location intelligence platform for developers. Embed mapping, search, routing, and store locator capabilities into any website or application.

## Why Atlas?

- **Privacy-first**: No query logging, no IP retention, GDPR-compliant by default
- **Developer experience**: TypeScript SDK, drop-in web components, RESTful APIs
- **Open-source stack**: PostGIS, MapLibre GL JS, Photon, Valhalla — no vendor lock-in
- **Edge-native**: Basemap tiles served from Cloudflare R2 at zero compute cost

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Developer                         │
│  Dashboard · API Keys · Store Management · Analytics │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                   Atlas API (Hono)                   │
│  Search · Geolocation · Distance · Stores · Routing  │
└──────┬──────────┬──────────┬──────────┬──────────────┘
       │          │          │          │
   PostgreSQL   Photon    Valhalla   Martin
   + PostGIS   (geocode)  (routes)  (PostGIS→MVT)
       │
    Valkey (cache)

┌──────────────────────────────────────────────────────┐
│                  Edge (Cloudflare)                   │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │ R2 + PMTiles    │  │ Worker (tile proxy)      │   │
│  │ (basemap tiles) │──│ Serves vector basemap    │   │
│  └─────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

Monorepo with pnpm workspaces:

| Path                            | Package                       | Description                                               |
| ------------------------------- | ----------------------------- | --------------------------------------------------------- |
| `apps/api`                      | `@atlas/api`                  | Hono modular monolith API (auth, search, stores, routing) |
| `apps/dashboard`                | `@atlas/dashboard`            | Next.js 15 developer console                              |
| `apps/docs`                     | `@atlas/docs`                 | VitePress API documentation                               |
| `packages/sdk-js`               | `@atlas/sdk-js`               | TypeScript SDK                                            |
| `packages/db`                   | `@atlas/db`                   | Drizzle schema, migrations, PostGIS queries               |
| `packages/shared`               | `@atlas/shared`               | Shared types, validators, constants                       |
| `packages/widget-store-locator` | `@atlas/widget-store-locator` | `<atlas-store-locator>` web component                     |
| `packages/widget-autocomplete`  | `@atlas/widget-autocomplete`  | `<atlas-autocomplete>` web component                      |
| `infra/workers/tiles`           | —                             | Cloudflare Worker for basemap tile serving (PMTiles + R2) |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostGIS, Valkey, Photon, Valhalla, Martin)
docker compose -f infra/docker-compose.yml up -d

# Set up the database
pnpm --filter @atlas/db reset && pnpm --filter @atlas/db push && pnpm --filter @atlas/db seed

# Start all apps (API, Dashboard, Docs)
pnpm dev

# (Separate terminal) Start basemap tiles Worker
cd infra/workers/tiles && pnpm dev
```

The Caddy reverse proxy serves everything locally:

| Service   | URL                                |
| --------- | ---------------------------------- |
| Dashboard | `https://dashboard.localhost:3002` |
| API       | `https://api.localhost:3001`       |
| Docs      | `https://docs.localhost:3003`      |
| Tiles     | `https://tiles.localhost:3000`     |

Dev API key (seeded): `ak_live_dashboard_dev_key_12345678`

### Basemap Tiles

Place a PMTiles extract at `infra/data/pmtiles/france.pmtiles`, then upload to local R2:

```bash
# Extract from a global archive (requires pmtiles CLI)
pmtiles extract world.pmtiles infra/data/pmtiles/france.pmtiles --bbox -5,41,10,52

# Upload to local R2
cd infra/workers/tiles && pnpm wrangler r2 object put basemap-tiles/france.pmtiles \
  --file ../../data/pmtiles/france.pmtiles --local
```

## Development

```bash
pnpm dev              # Start all apps
pnpm build            # Build all packages and apps
pnpm check            # Lint + format check (Biome)
pnpm check:fix        # Lint + format with auto-fix
pnpm typecheck        # TypeScript check
pnpm test             # Run tests (Vitest)
pnpm test:coverage    # Tests with coverage
```

## Tech Stack

| Category  | Technology                                       |
| --------- | ------------------------------------------------ |
| API       | Hono, better-auth, Drizzle ORM                   |
| Database  | PostgreSQL 16 + PostGIS 3.4                      |
| Cache     | Valkey                                           |
| Geocoding | Photon (Elasticsearch)                           |
| Routing   | Valhalla                                         |
| Tiles     | PMTiles + Martin (PostGIS to MVT)                |
| Dashboard | Next.js 15, React 19, Tailwind CSS v4, shadcn/ui |
| Maps      | MapLibre GL JS v5                                |
| Widgets   | Lit web components                               |
| Docs      | VitePress                                        |
| Linting   | Biome                                            |
| Testing   | Vitest                                           |
