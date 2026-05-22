# Store Locator Widget

A web component combining a map and store list for location-based store discovery.

## Installation

### CDN (recommended)

```html
<script src="https://cdn.atlas.dev/widgets/v1.js"></script>
```

### npm

```bash
npm install @atlas/widget-store-locator
```

```javascript
import '@atlas/widget-store-locator';
```

## Usage

```html
<atlas-store-locator
  api-key="ak_live_your_key_here"
  style="light"
  lat="51.5074"
  lng="-0.1278"
  radius="5000"
></atlas-store-locator>
```

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `api-key` | string | required | Your Atlas API key |
| `style` | string | `"light"` | Map style (`light` or `dark`) |
| `lat` | number | required | Initial latitude center |
| `lng` | number | required | Initial longitude center |
| `radius` | number | `10000` | Search radius in meters |
| `zoom` | number | `12` | Initial map zoom level |

## Layout

The widget renders a split view:
- **Left**: Interactive map with store markers
- **Right**: Scrollable list of store cards

On mobile (below 768px), the layout stacks vertically with the map on top.

## Behavior

- On load: fetches stores near `lat`/`lng` within `radius`
- Click a map marker → highlights and scrolls to the corresponding card
- Click a list card → pans the map to the store and opens a popup
- "Near me" button uses browser geolocation to re-fetch stores
- Search input at top filters stores by name (autocomplete)

## Events

### `atlas:store-select`

Fired when a store is selected (via marker click or list card click).

```javascript
document.querySelector('atlas-store-locator').addEventListener('atlas:store-select', (event) => {
  console.log(event.detail);
  // {
  //   id: "uuid",
  //   name: "Camden Store",
  //   address: "1 Camden High St, London",
  //   location: { lat: 51.539, "lng": -0.1426 },
  //   distance: 3200
  // }
});
```

## Styling

```css
atlas-store-locator {
  --atlas-map-height: 500px;
  --atlas-card-padding: 16px;
  --atlas-card-radius: 8px;
  --atlas-accent-color: #2563eb;
  width: 100%;
  height: 600px;
}
```

## Store Card Content

Each store card displays:
- Store name
- Address
- Distance from center
- Tags (as badges)
- Opening hours (if available)
