# Geolocation API

IP-based geolocation and timezone lookup. No query logging, no IP retention.

## IP Geolocation

```
GET /v1/geolocation/ip
```

Returns geolocation data based on the requesting client's IP address. Uses MaxMind GeoLite2 database.

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/geolocation/ip'
```

### Response

```json
{
  "data": {
    "ip": "81.2.69.144",
    "city": "Paris",
    "country": "France",
    "country_code": "FR",
    "location": { "lat": 48.8566, "lng": 2.3522 },
    "timezone": "Europe/Paris"
  },
  "meta": {
    "request_id": "req_abc",
    "attribution": "© OpenStreetMap contributors",
    "cache_hit": false
  }
}
```

For private IPs (127.0.0.1, 10.x, 192.168.x), `location`, `city`, `country`, `country_code`, and `timezone` will be `null`.

## Timezone Lookup

```
GET /v1/geolocation/timezone
```

Returns the IANA timezone for given coordinates. Uses offline boundary data — no external API calls.

### Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `lat` | number | Yes | Latitude (-90 to 90) |
| `lng` | number | Yes | Longitude (-180 to 180) |

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/geolocation/timezone?lat=48.8566&lng=2.3522'
```

### Response

```json
{
  "data": {
    "timezone": "Europe/Paris",
    "offset_minutes": 60,
    "location": { "lat": 48.8566, "lng": 2.3522 }
  },
  "meta": {
    "request_id": "req_abc",
    "attribution": "© OpenStreetMap contributors",
    "cache_hit": false
  }
}
```

`offset_minutes` is the current UTC offset including daylight saving time.

## Error Codes

| Status | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid coordinates |
| 404 | `TIMEZONE_NOT_FOUND` | No timezone for these coordinates (e.g., ocean) |
| 503 | `GEOLOCATION_UNAVAILABLE` | GeoLite2 database not configured |
