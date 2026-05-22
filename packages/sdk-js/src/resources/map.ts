import type { FetchOptions } from '../utils/fetch.ts';
import { atlasFetch } from '../utils/fetch.ts';

interface MapOptions {
  container: string | HTMLElement;
  style?: string;
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
}

interface MapStyle {
  id: string;
  name: string;
  style_json: Record<string, unknown>;
  is_default: boolean;
}

export class MapResource {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  private resolveStyleUrl(style: string): string {
    if (style.startsWith('atlas://styles/')) {
      const name = style.replace('atlas://styles/', '');
      return `${this.baseUrl}/v1/map/styles/${name}`;
    }
    return style;
  }

  async create(options: MapOptions) {
    const maplibregl = await import('maplibre-gl');

    const styleIdOrUrl = options.style ?? 'atlas://styles/light';
    const styleUrl = this.resolveStyleUrl(styleIdOrUrl);

    const map = new maplibregl.Map({
      container: options.container,
      style: styleUrl,
      center: options.center ?? [0, 0],
      zoom: options.zoom ?? 2,
      bearing: options.bearing ?? 0,
      pitch: options.pitch ?? 0,
      transformRequest: (url: string) => {
        if (url.startsWith(this.baseUrl)) {
          return {
            url,
            headers: { 'X-API-Key': this.apiKey },
          };
        }
        return { url };
      },
    });

    return map;
  }

  async getStyles(options?: FetchOptions) {
    const res = await atlasFetch<{ data: MapStyle[] }>(
      this.baseUrl,
      this.apiKey,
      '/v1/map/styles',
      options
    );
    return res.data;
  }
}
