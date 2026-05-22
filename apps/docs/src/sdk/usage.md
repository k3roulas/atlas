# SDK Usage

Complete reference for the Atlas JavaScript SDK.

## Localities

### Autocomplete

```typescript
const results = await atlas.localities.autocomplete({
  query: 'London',
  lat: 51.5,
  lng: -0.1,
  limit: 5,
  lang: 'en',
});

results.forEach((r) => {
  console.log(r.name, r.location);
});
```

### Geocode

```typescript
const results = await atlas.localities.geocode({
  address: '10 Downing Street, London',
  limit: 1,
});
```

### Reverse Geocode

```typescript
const results = await atlas.localities.reverse({
  lat: 51.5074,
  lng: -0.1278,
  limit: 1,
});
```

## Stores

### Search

```typescript
const result = await atlas.stores.search({
  lat: 51.5074,
  lng: -0.1278,
  radius: 5000,
  tags: ['cafe', 'retail'],
  limit: 10,
});

result.data.forEach((store) => {
  console.log(store.name, `${store.distance}m away`);
});
```

### Get

```typescript
const store = await atlas.stores.get('store-uuid');
```

### Create

```typescript
const store = await atlas.stores.create({
  name: 'My Store',
  address: '123 High St, London',
  lat: 51.5,
  lng: -0.1,
  tags: ['retail'],
});
```

### Update

```typescript
const store = await atlas.stores.update('store-uuid', {
  name: 'Updated Name',
  tags: ['retail', 'cafe'],
});
```

### Delete

```typescript
await atlas.stores.delete('store-uuid');
```

### Autocomplete

```typescript
const results = await atlas.stores.autocomplete({
  query: 'Cam',
  limit: 5,
});
```

### Bulk Import

```typescript
const result = await atlas.stores.bulk({
  stores: [
    { name: 'Store 1', address: 'Addr 1', lat: 51.5, lng: -0.1 },
    { name: 'Store 2', address: 'Addr 2', lat: 51.6, lng: -0.2 },
  ],
});

console.log(`Created ${result.created} stores`);
```

## Map

### Create Map

```typescript
const map = atlas.map.create({
  container: 'map',
  style: 'atlas://styles/light', // or 'atlas://styles/dark'
  center: [-0.1278, 51.5074],
  zoom: 12,
});
```

The SDK wraps MapLibre GL JS and automatically injects your API key into tile requests. The `atlas://styles/*` URLs resolve to your Atlas style endpoints.

## Error Handling

```typescript
import { AtlasError } from '@atlas/sdk-js';

try {
  await atlas.stores.get('invalid-id');
} catch (error) {
  if (error instanceof AtlasError) {
    console.log(error.code);    // 'VALIDATION_ERROR'
    console.log(error.status);  // 400
  }
}
```
