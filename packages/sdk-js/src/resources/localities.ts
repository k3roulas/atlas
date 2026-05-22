import type { LocalityResult, ReverseGeocodeResult } from '@atlas/shared';
import type { FetchOptions } from '../utils/fetch.ts';
import { atlasFetch } from '../utils/fetch.ts';

export class LocalitiesResource {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async autocomplete(
    params: {
      query: string;
      lat?: number;
      lng?: number;
      limit?: number;
      lang?: string;
    },
    options?: FetchOptions
  ): Promise<LocalityResult[]> {
    const p: Record<string, string> = { query: params.query };
    if (params.lat != null) p.lat = String(params.lat);
    if (params.lng != null) p.lng = String(params.lng);
    if (params.limit != null) p.limit = String(params.limit);
    if (params.lang) p.lang = params.lang;

    const res = await atlasFetch<{ data: LocalityResult[] }>(
      this.baseUrl,
      this.apiKey,
      '/v1/localities/autocomplete',
      { ...options, params: p }
    );
    return res.data;
  }

  async geocode(
    params: {
      address: string;
      limit?: number;
      lang?: string;
    },
    options?: FetchOptions
  ): Promise<LocalityResult[]> {
    const p: Record<string, string> = { address: params.address };
    if (params.limit != null) p.limit = String(params.limit);
    if (params.lang) p.lang = params.lang;

    const res = await atlasFetch<{ data: LocalityResult[] }>(
      this.baseUrl,
      this.apiKey,
      '/v1/localities/geocode',
      { ...options, params: p }
    );
    return res.data;
  }

  async reverse(
    params: {
      lat: number;
      lng: number;
      limit?: number;
      lang?: string;
    },
    options?: FetchOptions
  ): Promise<ReverseGeocodeResult[]> {
    const p: Record<string, string> = {
      lat: String(params.lat),
      lng: String(params.lng),
    };
    if (params.limit != null) p.limit = String(params.limit);
    if (params.lang) p.lang = params.lang;

    const res = await atlasFetch<{ data: ReverseGeocodeResult[] }>(
      this.baseUrl,
      this.apiKey,
      '/v1/localities/reverse',
      { ...options, params: p }
    );
    return res.data;
  }
}
