import type { IsochroneResult, MatrixResult, RouteResult, TravelMode } from '@atlas/shared';
import { atlasFetch } from '../utils/fetch.ts';

export class DistanceResource {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async route(
    params: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      mode?: TravelMode;
    },
    options?: { signal?: AbortSignal }
  ): Promise<RouteResult> {
    const p: Record<string, string> = {
      origin: `${params.origin.lat},${params.origin.lng}`,
      destination: `${params.destination.lat},${params.destination.lng}`,
    };
    if (params.mode) p.mode = params.mode;

    const res = await atlasFetch<{ data: RouteResult }>(
      this.baseUrl,
      this.apiKey,
      '/v1/distance/route',
      { params: p, signal: options?.signal }
    );
    return res.data;
  }

  async matrix(
    params: {
      origins: Array<{ lat: number; lng: number }>;
      destinations: Array<{ lat: number; lng: number }>;
      mode?: TravelMode;
    },
    options?: { signal?: AbortSignal }
  ): Promise<MatrixResult> {
    const res = await atlasFetch<{ data: MatrixResult }>(
      this.baseUrl,
      this.apiKey,
      '/v1/distance/matrix',
      {
        method: 'POST',
        body: JSON.stringify({
          origins: params.origins,
          destinations: params.destinations,
          mode: params.mode ?? 'car',
        }),
        signal: options?.signal,
      }
    );
    return res.data;
  }

  async isochrone(
    params: {
      origin: { lat: number; lng: number };
      mode?: 'car' | 'bike' | 'foot';
      range: number[];
    },
    options?: { signal?: AbortSignal }
  ): Promise<IsochroneResult> {
    const p: Record<string, string> = {
      origin: `${params.origin.lat},${params.origin.lng}`,
      range: params.range.join(','),
    };
    if (params.mode) p.mode = params.mode;

    const res = await atlasFetch<{ data: IsochroneResult }>(
      this.baseUrl,
      this.apiKey,
      '/v1/distance/isochrone',
      { params: p, signal: options?.signal }
    );
    return res.data;
  }
}
