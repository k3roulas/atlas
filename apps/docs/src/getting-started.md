# Getting Started

## 1. Create an Account

Sign up at the [Atlas Dashboard](http://dashboard.localhost) and create your first API key.

## 2. Make Your First Request

```bash
curl -H 'X-API-Key: ak_live_your_key_here' \
  'http://api.localhost/v1/localities/autocomplete?query=London&limit=5'
```

Response:

```json
{
  "data": [
    {
      "id": "12345",
      "name": "London",
      "address": {
        "city": "London",
        "state": "England",
        "country": "United Kingdom"
      },
      "type": "city",
      "location": { "lat": 51.5074, "lng": -0.1278 }
    }
  ],
  "meta": {
    "request_id": "req_abc123",
    "attribution": "© OpenStreetMap contributors",
    "cache_hit": false
  }
}
```

## 3. Search Nearby Stores

```bash
curl -H 'X-API-Key: ak_live_your_key_here' \
  'http://api.localhost/v1/stores/search?lat=51.5074&lng=-0.1278&radius=5000&limit=10'
```

## 4. Use the SDK

```bash
npm install @atlas/sdk-js
```

```typescript
import { Atlas } from '@atlas/sdk-js';

const atlas = new Atlas({ apiKey: 'ak_live_your_key_here' });

// Autocomplete
const results = await atlas.localities.autocomplete({ query: 'London' });

// Search stores
const stores = await atlas.stores.search({
  lat: 51.5074,
  lng: -0.1278,
  radius: 5000,
});
```

## 5. Embed a Widget

```html
<script src="https://cdn.atlas.dev/widgets/v1.js"></script>

<atlas-autocomplete
  api-key="ak_live_your_key_here"
  placeholder="Search for an address..."
></atlas-autocomplete>
```

## Base URL

| Environment | Base URL |
|---|---|
| Local development | `http://api.localhost` |
| Production | `https://api.atlas.dev` |

All API endpoints require the `X-API-Key` header for authentication.
