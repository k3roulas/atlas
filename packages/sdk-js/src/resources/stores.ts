import type { StoreSearchResult } from '@atlas/shared';
import type { FetchOptions } from '../utils/fetch.ts';
import { atlasFetch } from '../utils/fetch.ts';

interface StoreCreateParams {
  name: string;
  address: string;
  lat: number;
  lng: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  opening_hours?: Record<string, unknown>;
}

interface StoreSearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

interface StoreListResponse {
  data: StoreSearchResult[];
  meta: {
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

export class StoresResource {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async search(params: StoreSearchParams, options?: FetchOptions): Promise<StoreListResponse> {
    const p: Record<string, string> = {};
    if (params.query) p.query = params.query;
    if (params.lat != null) p.lat = String(params.lat);
    if (params.lng != null) p.lng = String(params.lng);
    if (params.radius != null) p.radius = String(params.radius);
    if (params.tags?.length) p.tags = params.tags.join(',');
    if (params.limit != null) p.limit = String(params.limit);
    if (params.offset != null) p.offset = String(params.offset);

    return atlasFetch<StoreListResponse>(this.baseUrl, this.apiKey, '/v1/stores/search', {
      ...options,
      params: p,
    });
  }

  async autocomplete(params: { query: string; limit?: number }, options?: FetchOptions) {
    const p: Record<string, string> = { query: params.query };
    if (params.limit != null) p.limit = String(params.limit);

    const res = await atlasFetch<{
      data: { id: string; name: string; address: string; location: { lat: number; lng: number } }[];
    }>(this.baseUrl, this.apiKey, '/v1/stores/autocomplete', { ...options, params: p });
    return res.data;
  }

  async get(id: string, options?: FetchOptions) {
    const res = await atlasFetch<{ data: StoreSearchResult }>(
      this.baseUrl,
      this.apiKey,
      `/v1/stores/${id}`,
      options
    );
    return res.data;
  }

  async create(params: StoreCreateParams, options?: FetchOptions) {
    const res = await atlasFetch<{ data: StoreSearchResult }>(
      this.baseUrl,
      this.apiKey,
      '/v1/stores',
      { ...options, method: 'POST', body: JSON.stringify(params) }
    );
    return res.data;
  }

  async update(id: string, params: Partial<StoreCreateParams>, options?: FetchOptions) {
    const res = await atlasFetch<{ data: StoreSearchResult }>(
      this.baseUrl,
      this.apiKey,
      `/v1/stores/${id}`,
      { ...options, method: 'PUT', body: JSON.stringify(params) }
    );
    return res.data;
  }

  async delete(id: string, options?: FetchOptions) {
    await atlasFetch(this.baseUrl, this.apiKey, `/v1/stores/${id}`, {
      ...options,
      method: 'DELETE',
    });
  }

  async bulk(
    params: { stores: StoreCreateParams[] },
    options?: FetchOptions
  ): Promise<{ created: number; errors: Array<{ index: number; message: string }> }> {
    const res = await atlasFetch<{
      data: { created: number; errors: Array<{ index: number; message: string }> };
    }>(this.baseUrl, this.apiKey, '/v1/stores/bulk', {
      ...options,
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  }
}
