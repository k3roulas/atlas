# Map API

Map styles management and vector tile serving via Martin (PostGIS).

## List Styles

```
GET /v1/map/styles
```

Returns all map styles for your tenant plus system defaults.

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/map/styles'
```

## Get Style

```
GET /v1/map/styles/:id
```

Returns the full MapLibre-compatible style JSON including tile sources, layers, glyphs, and sprites.

## Create Style

```
POST /v1/map/styles
```

### Body

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Style name (1-100 chars) |
| `style_json` | object | Yes | MapLibre style JSON |

### Example

```bash
curl -X POST -H 'X-API-Key: ak_live_xxx' -H 'Content-Type: application/json' \
  -d '{"name":"Custom Dark","style_json":{...}}' \
  'http://api.localhost/v1/map/styles'
```

## Delete Style

```
DELETE /v1/map/styles/:id
```

Deletes a custom style. System default styles cannot be deleted.

## Vector Tiles

```
GET /v1/map/tiles/:table/:z/:x/:y.mvt
```

Proxies vector tile requests to Martin, which serves tiles directly from PostGIS.

### Parameters

| Name | Type | Description |
|---|---|---|
| `table` | string | Table name (e.g., `store`) |
| `z` | integer | Zoom level (0-22) |
| `x` | integer | Tile column |
| `y` | integer | Tile row |

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/map/tiles/store/12/2048/1024.mvt' \
  --output tiles.mvt
```

## TileJSON

```
GET /v1/map/tiles/:table.json
```

Returns TileJSON metadata for a table, compatible with MapLibre GL JS.

### Example

```bash
curl -H 'X-API-Key: ak_live_xxx' \
  'http://api.localhost/v1/map/tiles/store.json'
```
