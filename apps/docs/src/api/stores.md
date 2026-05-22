# Stores API

CRUD operations, spatial search, and bulk import for store/POI data.

## Create Store

```
POST /v1/stores
```

### Body

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Store name (1-200 chars) |
| `address` | string | Yes | Store address (1-500 chars) |
| `lat` | number | Yes | Latitude (-90 to 90) |
| `lng` | number | Yes | Longitude (-180 to 180) |
| `metadata` | object | No | Custom key-value data |
| `tags` | string[] | No | Tags for filtering |
| `opening_hours` | object | No | Opening hours schedule |

### Example

```bash
curl -X POST -H 'X-API-Key: ak_live_xxx' -H 'Content-Type: application/json' \
  -d '{"name":"Camden Store","address":"1 Camden High St, London","lat":51.539,"lng":-0.1426,"tags":["retail","cafe"]}' \
  'http://api.localhost/v1/stores'
```

## Get Store

```
GET /v1/stores/:id
```

## Update Store

```
PUT /v1/stores/:id
```

Partial update supported — only include fields you want to change.

## Delete Store

```
DELETE /v1/stores/:id
```

## Search Stores

```
GET /v1/stores/search
```

Spatial + text search with optional tag filtering.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | No | - | Text search (name, address) |
| `lat` | number | No | - | Latitude for spatial search (-90 to 90) |
| `lng` | number | No | - | Longitude for spatial search (-180 to 180) |
| `radius` | integer | No | `10000` | Search radius in meters (1-100,000) |
| `tags` | string | No | - | Comma-separated tag filter |
| `limit` | integer | No | `20` | Max results (1-100) |
| `offset` | integer | No | `0` | Pagination offset |

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/stores/search?lat=51.5074&lng=-0.1278&radius=5000&tags=cafe&limit=10'
```

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Camden Store",
      "address": "1 Camden High St, London",
      "location": { "lat": 51.539, "lng": -0.1426 },
      "tags": ["retail", "cafe"],
      "distance": 3200,
      "metadata": null,
      "opening_hours": null
    }
  ],
  "meta": {
    "request_id": "req_abc",
    "attribution": "© OpenStreetMap contributors",
    "cache_hit": false
  }
}
```

## Store Autocomplete

```
GET /v1/stores/autocomplete
```

Autocomplete store names by prefix.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | Yes | - | Search prefix (min 1 char) |
| `limit` | integer | No | `5` | Max results (1-20) |

## Bulk Import

```
POST /v1/stores/bulk
```

Import up to 1,000 stores in a single request.

### Body

```json
{
  "stores": [
    { "name": "Store 1", "address": "Address 1", "lat": 51.5, "lng": -0.1 },
    { "name": "Store 2", "address": "Address 2", "lat": 51.6, "lng": -0.2 }
  ]
}
```

### Response

```json
{
  "data": {
    "created": 2,
    "errors": []
  }
}
```
