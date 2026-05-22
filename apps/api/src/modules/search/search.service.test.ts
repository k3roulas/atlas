import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as searchService from './search.service.ts';

describe('search service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockPhotonResponse(
    features: Array<{
      osm_id?: number;
      osm_type?: string;
      name?: string;
      city?: string;
      state?: string;
      country?: string;
      postcode?: string;
      street?: string;
      housenumber?: string;
      osm_value?: string;
      type?: string;
      distance?: number;
      coordinates?: [number, number];
    }>
  ) {
    const body = {
      features: features.map((f) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: f.coordinates ?? [2.3522, 48.8566],
        },
        properties: {
          osm_id: f.osm_id,
          osm_type: f.osm_type,
          name: f.name,
          city: f.city,
          state: f.state,
          country: f.country,
          postcode: f.postcode,
          street: f.street,
          housenumber: f.housenumber,
          osm_value: f.osm_value,
          type: f.type,
          distance: f.distance,
        },
      })),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
  }

  describe('autocomplete', () => {
    it('returns normalized locality results', async () => {
      mockPhotonResponse([
        {
          osm_id: 123,
          osm_type: 'N',
          name: 'Paris',
          city: 'Paris',
          country: 'France',
          osm_value: 'city',
          coordinates: [2.3522, 48.8566],
        },
      ]);

      const results = await searchService.autocomplete({ query: 'Par' });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'N123',
        name: 'Paris',
        address: {
          city: 'Paris',
          state: undefined,
          country: 'France',
          postcode: undefined,
          street: undefined,
          house_number: undefined,
        },
        type: 'city',
        location: { lat: 48.8566, lng: 2.3522 },
      });
    });

    it('includes location bias when lat/lng provided', async () => {
      mockPhotonResponse([]);

      await searchService.autocomplete({
        query: 'test',
        lat: 48.85,
        lng: 2.35,
      });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('lat=48.85');
      expect(url).toContain('lon=2.35');
      expect(url).toContain('location_bias_scale=0.2');
    });

    it('returns empty array for short queries', async () => {
      const results = await searchService.autocomplete({ query: 'a' });
      expect(results).toHaveLength(0);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('sanitizes special characters from query', async () => {
      mockPhotonResponse([]);

      await searchService.autocomplete({ query: '<script>alert("xss")</script>test' });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('q=');
      expect(url).not.toContain('<script>');
    });

    it('respects limit parameter', async () => {
      mockPhotonResponse([]);

      await searchService.autocomplete({ query: 'test', limit: 3 });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('limit=3');
    });

    it('passes lang parameter', async () => {
      mockPhotonResponse([]);

      await searchService.autocomplete({ query: 'test', lang: 'fr' });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('lang=fr');
    });
  });

  describe('geocode', () => {
    it('returns normalized results for address search', async () => {
      mockPhotonResponse([
        {
          osm_id: 456,
          osm_type: 'W',
          name: '10 Downing Street',
          street: 'Downing Street',
          city: 'London',
          country: 'United Kingdom',
          postcode: 'SW1A 2AA',
          osm_value: 'house',
          coordinates: [-0.1276, 51.5033],
        },
      ]);

      const results = await searchService.geocode({ address: '10 Downing St' });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('10 Downing Street');
      expect(results[0].location).toEqual({ lat: 51.5033, lng: -0.1276 });
      expect(results[0].address.street).toBe('Downing Street');
    });

    it('returns empty for short address', async () => {
      const results = await searchService.geocode({ address: 'a' });
      expect(results).toHaveLength(0);
    });
  });

  describe('reverseGeocode', () => {
    it('returns results with distance', async () => {
      mockPhotonResponse([
        {
          osm_id: 789,
          osm_type: 'N',
          name: 'Eiffel Tower',
          city: 'Paris',
          country: 'France',
          osm_value: 'tourism',
          distance: 150.5,
          coordinates: [2.2945, 48.8584],
        },
      ]);

      const results = await searchService.reverseGeocode({
        lat: 48.8566,
        lng: 2.3522,
      });

      expect(results).toHaveLength(1);
      expect(results[0].distance).toBe(150.5);
      expect(results[0].name).toBe('Eiffel Tower');
    });

    it('constructs correct reverse URL', async () => {
      mockPhotonResponse([]);

      await searchService.reverseGeocode({ lat: 51.5, lng: -0.1 });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('/reverse/');
      expect(url).toContain('lat=51.5');
      expect(url).toContain('lon=-0.1');
    });
  });

  describe('error handling', () => {
    it('returns empty on fetch timeout', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      });

      const results = await searchService.autocomplete({ query: 'test' });
      expect(results).toHaveLength(0);
    });

    it('throws on Photon server error', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(searchService.autocomplete({ query: 'test' })).rejects.toThrow(
        'Photon returned status 500'
      );
    });

    it('throws on network failure', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(searchService.autocomplete({ query: 'test' })).rejects.toThrow(
        'Geocoding service is temporarily unavailable'
      );
    });
  });
});
