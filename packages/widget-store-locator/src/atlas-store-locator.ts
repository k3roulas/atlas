import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import maplibregl from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';

interface StoreResult {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  distance?: number;
  tags?: string[];
  opening_hours?: Record<string, string>;
}

@customElement('atlas-store-locator')
export class AtlasStoreLocator extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100%;
    }

    .locator {
      display: flex;
      height: 100%;
      min-height: 400px;
    }

    .map-panel {
      flex: 1;
      position: relative;
    }

    .map-container {
      width: 100%;
      height: 100%;
    }

    .near-me-btn {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }

    .near-me-btn:hover {
      background: #f9fafb;
    }

    .list-panel {
      width: 320px;
      border-left: 1px solid #e5e7eb;
      overflow-y: auto;
      background: white;
    }

    .search-bar {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .search-bar input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }

    .search-bar input:focus {
      border-color: #3b82f6;
    }

    .store-card {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.15s;
    }

    .store-card:hover,
    .store-card.active {
      background: #f0f7ff;
    }

    .store-name {
      font-weight: 500;
      font-size: 14px;
    }

    .store-address {
      color: #6b7280;
      font-size: 12px;
      margin-top: 2px;
    }

    .store-distance {
      color: #3b82f6;
      font-size: 12px;
      margin-top: 4px;
    }

    .store-tags {
      margin-top: 4px;
    }

    .store-hours {
      color: #6b7280;
      font-size: 11px;
      margin-top: 4px;
    }

    .tag {
      display: inline-block;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-right: 4px;
    }

    .empty {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }

    .loading {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }

    @media (max-width: 768px) {
      .locator {
        flex-direction: column;
      }

      .map-panel {
        height: 50%;
      }

      .list-panel {
        width: 100%;
        height: 50%;
        border-left: none;
        border-top: 1px solid #e5e7eb;
      }
    }
  `;

  @property({ type: String }) apiKey = '';
  @property({ type: String }) mapStyle = 'light';
  @property({ type: Number }) lat = 51.5074;
  @property({ type: Number }) lng = -0.1278;
  @property({ type: Number }) radius = 5000;
  @property({ type: String }) baseUrl = 'https://api.atlas.dev';

  @state() private _stores: StoreResult[] = [];
  @state() private _loading = false;
  @state() private _activeStoreId: string | null = null;

  @query('.map-container') private _mapContainer!: HTMLElement;

  private _map: maplibregl.Map | null = null;
  private _markers: maplibregl.Marker[] = [];

  private get _apiUrl(): string {
    return this.baseUrl.replace(/\/$/, '');
  }

  firstUpdated() {
    this._initMap();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._map?.remove();
  }

  render() {
    return html`
      <div class="locator">
        <div class="map-panel">
          <div class="map-container"></div>
          <button class="near-me-btn" @click=${this._nearMe}>Near me</button>
        </div>
        <div class="list-panel">
          <div class="search-bar">
            <input
              type="text"
              placeholder="Search stores..."
              @input=${this._onSearchInput}
            />
          </div>
          ${
            this._loading
              ? html`<div class="loading">Loading stores...</div>`
              : this._stores.length === 0
                ? html`<div class="empty">No stores found nearby</div>`
                : this._stores.map(
                    (store) => html`
                    <div
                      class="store-card ${store.id === this._activeStoreId ? 'active' : ''}"
                      @click=${() => this._selectStore(store)}
                    >
                      <div class="store-name">${store.name}</div>
                      <div class="store-address">${store.address}</div>
                      ${
                        store.distance != null
                          ? html`<div class="store-distance">
                            ${(store.distance / 1000).toFixed(1)} km
                          </div>`
                          : nothing
                      }
                      ${
                        store.tags?.length
                          ? html`<div class="store-tags">
                            ${store.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
                          </div>`
                          : nothing
                      }
                      ${
                        store.opening_hours && Object.keys(store.opening_hours).length > 0
                          ? html`<div class="store-hours">
                            ${Object.entries(store.opening_hours)
                              .map(([day, hours]) => `${day}: ${hours}`)
                              .join(' · ')}
                          </div>`
                          : nothing
                      }
                    </div>
                  `
                  )
          }
        </div>
      </div>
    `;
  }

  private async _initMap() {
    this._map = new maplibregl.Map({
      container: this._mapContainer,
      style: `${this._apiUrl}/v1/map/styles/${this.mapStyle}`,
      center: [this.lng, this.lat],
      zoom: 13,
    });

    this._map.on('load', () => {
      this._fetchStores(this.lat, this.lng, this.radius);
    });
  }

  private async _fetchStores(lat: number, lng: number, radius: number) {
    this._loading = true;

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        limit: '50',
      });

      const res = await fetch(`${this._apiUrl}/v1/stores/search?${params}`, {
        headers: { 'X-API-Key': this.apiKey },
      });

      if (!res.ok) throw new Error('Failed to fetch stores');

      const body = await res.json();
      this._stores = body.data ?? [];
      this._updateMarkers();
    } catch {
      this._stores = [];
    } finally {
      this._loading = false;
    }
  }

  private _updateMarkers() {
    for (const marker of this._markers) {
      marker.remove();
    }
    this._markers = [];

    for (const store of this._stores) {
      if (!this._map) break;
      const marker = new maplibregl.Marker()
        .setLngLat([store.location.lng, store.location.lat])
        .addTo(this._map);

      marker.getElement().addEventListener('click', () => {
        this._selectStore(store);
      });

      this._markers.push(marker);
    }

    if (this._stores.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const store of this._stores) {
        bounds.extend([store.location.lng, store.location.lat]);
      }
      this._map?.fitBounds(bounds, { padding: 50 });
    }
  }

  private _selectStore(store: StoreResult) {
    this._activeStoreId = store.id;
    this._map?.flyTo({
      center: [store.location.lng, store.location.lat],
      zoom: 15,
    });

    this.dispatchEvent(
      new CustomEvent('atlas:store-select', {
        detail: store,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _nearMe() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.lat = latitude;
        this.lng = longitude;
        this._map?.flyTo({ center: [longitude, latitude], zoom: 13 });
        this._fetchStores(latitude, longitude, this.radius);
      },
      () => {
        // geolocation denied
      }
    );
  }

  private _onSearchInput(e: Event) {
    const query = (e.target as HTMLInputElement).value.trim();
    if (query.length < 2) return;

    this._fetchStoresByQuery(query);
  }

  private async _fetchStoresByQuery(query: string) {
    this._loading = true;
    try {
      const params = new URLSearchParams({
        query,
        lat: String(this.lat),
        lng: String(this.lng),
        radius: String(this.radius),
        limit: '20',
      });

      const res = await fetch(`${this._apiUrl}/v1/stores/search?${params}`, {
        headers: { 'X-API-Key': this.apiKey },
      });

      if (!res.ok) throw new Error('Search failed');

      const body = await res.json();
      this._stores = body.data ?? [];
      this._updateMarkers();
    } catch {
      this._stores = [];
    } finally {
      this._loading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'atlas-store-locator': AtlasStoreLocator;
  }
}
