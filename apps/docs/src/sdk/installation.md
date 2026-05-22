# SDK Installation

The Atlas JavaScript SDK provides a typed client for the Atlas API.

## Install

```bash
npm install @atlas/sdk-js
```

## Initialize

```typescript
import { Atlas } from '@atlas/sdk-js';

const atlas = new Atlas({
  apiKey: 'ak_live_your_key_here',
  baseUrl: 'https://api.atlas.dev', // optional, defaults to production
});
```

## Requirements

- Node.js 18+ or modern browsers
- MapLibre GL JS v5+ (peer dependency for map features)

```bash
npm install maplibre-gl
```

## TypeScript

The SDK is written in TypeScript and ships with full type definitions. No additional `@types` packages needed.

## Next Steps

- [SDK Usage](/sdk/usage) — Complete method reference and examples
