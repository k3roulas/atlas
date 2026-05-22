# Authentication

All API requests require authentication via an API key passed in the `X-API-Key` header.

## API Keys

Create and manage API keys in the [Atlas Dashboard](http://dashboard.localhost/api-keys).

### Key Format

API keys follow the format `ak_{environment}_{random}`:

- Test keys: `ak_test_...`
- Live keys: `ak_live_...`

### Usage

```bash
curl -H 'X-API-Key: ak_live_your_key_here' \
  'http://api.localhost/v1/localities/autocomplete?query=Paris'
```

### Scopes

Each API key has an associated set of scopes that determine which endpoints it can access:

| Scope | Description |
|---|---|
| `*` | Full access to all endpoints |
| `localities:read` | Access to localities endpoints |
| `stores:read` | Read access to stores |
| `stores:write` | Create, update, delete stores |
| `map:read` | Access to map styles and tiles |
| `geolocation:read` | Access to geolocation endpoints |

## Rate Limiting

Rate limits are applied per tenant based on your plan tier.

| Plan | Requests/sec | Requests/month |
|---|---|---|
| Free | 10 | 10,000 |
| Pro | 50 | 1,000,000 |
| Enterprise | 200 | Unlimited |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9995
```

When rate limited, the API returns a `429` status:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Monthly request limit exceeded"
  }
}
```

## Error Codes

| Status | Code | Description |
|---|---|---|
| 401 | `MISSING_API_KEY` | No `X-API-Key` header provided |
| 401 | `INVALID_API_KEY` | API key not found |
| 403 | `API_KEY_REVOKED` | API key has been revoked |
| 403 | `INSUFFICIENT_SCOPE` | API key lacks required scope |
| 429 | `RATE_LIMIT_EXCEEDED` | Monthly request limit exceeded |

## Response Format

All successful responses follow this structure:

```json
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "attribution": "© OpenStreetMap contributors",
    "cache_hit": false
  }
}
```
