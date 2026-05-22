# Autocomplete Widget

A web component for address/place search with dropdown suggestions.

## Installation

### CDN (recommended)

```html
<script src="https://cdn.atlas.dev/widgets/v1.js"></script>
```

### npm

```bash
npm install @atlas/widget-autocomplete
```

```javascript
import '@atlas/widget-autocomplete';
```

## Usage

```html
<atlas-autocomplete
  api-key="ak_live_your_key_here"
  placeholder="Search for an address..."
  lang="en"
  limit="5"
></atlas-autocomplete>
```

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `api-key` | string | required | Your Atlas API key |
| `placeholder` | string | `"Search..."` | Input placeholder text |
| `lang` | string | `"en"` | Language code for results |
| `limit` | number | `5` | Max suggestions (1-20) |

## Events

### `atlas:select`

Fired when the user selects a result from the dropdown.

```javascript
document.querySelector('atlas-autocomplete').addEventListener('atlas:select', (event) => {
  console.log(event.detail);
  // {
  //   id: "abc123",
  //   name: "London",
  //   address: { city: "London", country: "United Kingdom" },
  //   location: { lat: 51.5074, lng: -0.1278 }
  // }
});
```

## Styling

The widget uses Shadow DOM for encapsulation. Style via CSS custom properties:

```css
atlas-autocomplete {
  --atlas-input-border: 1px solid #ddd;
  --atlas-input-radius: 8px;
  --atlas-input-padding: 12px;
  --atlas-dropdown-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  --atlas-highlight-color: #2563eb;
  width: 100%;
  max-width: 400px;
}
```

## Keyboard Navigation

- **Arrow Down** — Move to next suggestion
- **Arrow Up** — Move to previous suggestion
- **Enter** — Select highlighted suggestion
- **Escape** — Close dropdown
