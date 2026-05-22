# Localities API

Address search, geocoding, and reverse geocoding powered by Photon (OpenStreetMap data).

## Autocomplete

```
GET /v1/localities/autocomplete
```

Search for addresses and places with location bias support. Results are cached for 1 hour.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | Yes | - | Search text (min 2 characters) |
| `lat` | number | No | - | Latitude for location bias (-90 to 90) |
| `lng` | number | No | - | Longitude for location bias (-180 to 180) |
| `limit` | integer | No | `5` | Max results (1-20) |
| `lang` | string | No | `"en"` | Language code (2 chars) |

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/localities/autocomplete?query=Lond&lat=51.5&lng=-0.1&limit=3'
```

### Response

```json
{
  "data": [
    {
      "id": "abc123",
      "name": "London",
      "address": {
        "city": "London",
        "state": "England",
        "country": "United Kingdom",
        "postcode": null,
        "street": null
      },
      "type": "city",
      "location": { "lat": 51.5074, "lng": -0.1278 }
    }
  ],
  "meta": {
    "request_id": "req_abc",
    "attribution": "© OpenStreetMap contributors",
    "cache_hit": false
  }
}
```

## Geocode

```
GET /v1/localities/geocode
```

Geocode a full address to coordinates.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `address` | string | Yes | - | Full address (min 2 characters) |
| `limit` | integer | No | `1` | Max results (1-20) |
| `lang` | string | No | `"en"` | Language code (2 chars) |

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/localities/geocode?address=10%20Downing%20Street%2C%20London'
```

## Reverse Geocode

```
GET /v1/localities/reverse
```

Find the nearest address for given coordinates.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `lat` | number | Yes | - | Latitude (-90 to 90) |
| `lng` | number | Yes | - | Longitude (-180 to 180) |
| `limit` | integer | No | `1` | Max results (1-20) |
| `lang` | string | No | `"en"` | Language code (2 chars) |

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/localities/reverse?lat=51.5074&lng=-0.1278'
```

## Error Codes

| Status | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing parameters |
| 503 | `PHOTON_UNAVAILABLE` | Photon search service is down |
