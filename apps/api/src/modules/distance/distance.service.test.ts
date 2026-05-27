import { afterEach, describe, expect, it, vi } from 'vitest';

import * as distanceService from './distance.service.ts';

vi.stubEnv('VALHALLA_URL', 'http://localhost:8002');

describe('distance.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(response: unknown) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    } as Response);
  }
  describe('getRoute', () => {
    it('transforms Valhalla route response', async () => {
      mockFetch({
        trip: {
          legs: [
            {
              shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
              summary: { length: 465.2, time: 16200 },
              maneuvers: [
                {
                  instruction: 'Head north',
                  length: 0.5,
                  time: 30,
                  street_names: ['Rue de Rivoli'],
                },
                {
                  instruction: 'Turn right',
                  length: 10,
                  time: 300,
                  begin_street_names: ['A6'],
                },
              ],
            },
          ],
          summary: { length: 465.2, time: 16200 },
          locations: [
            { lat: 48.8566, lon: 2.3522 },
            { lat: 45.764, lon: 4.8357 },
          ],
        },
      });

      const result = await distanceService.getRoute(
        { lat: 48.8566, lng: 2.3522 },
        { lat: 45.764, lng: 4.8357 },
        'car'
      );

      expect(result.distance).toBe(465200);
      expect(result.duration).toBe(16200);
      expect(result.mode).toBe('car');
      expect(result.origin).toEqual({ lat: 48.8566, lng: 2.3522 });
      expect(result.destination).toEqual({ lat: 45.764, lng: 4.8357 });
      expect(result.legs).toHaveLength(1);
      expect(result.legs[0].steps).toHaveLength(2);
      expect(result.legs[0].steps[0].name).toBe('Rue de Rivoli');
      expect(result.legs[0].steps[0].distance).toBe(500);
      expect(result.legs[0].steps[1].name).toBe('A6');
    });

    it('maps travel modes to Valhalla costings', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            trip: {
              legs: [{ shape: '', summary: { length: 1, time: 60 }, maneuvers: [] }],
              summary: { length: 1, time: 60 },
              locations: [],
            },
          }),
      } as Response);

      await distanceService.getRoute(
        { lat: 48.8566, lng: 2.3522 },
        { lat: 45.764, lng: 4.8357 },
        'bike'
      );

      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.costing).toBe('bicycle');
    });
  });

  describe('getMatrix', () => {
    it('transforms Valhalla matrix response', async () => {
      mockFetch({
        sources_to_targets: [
          [
            { distance: 465000, time: 16200 },
            { distance: 120000, time: 5400 },
          ],
          [
            { distance: 465000, time: 16200 },
            { distance: 0, time: 0 },
          ],
        ],
      });

      const origins = [
        { lat: 48.8566, lng: 2.3522 },
        { lat: 45.764, lng: 4.8357 },
      ];
      const destinations = [
        { lat: 45.764, lng: 4.8357 },
        { lat: 43.2965, lng: 5.3698 },
      ];

      const result = await distanceService.getMatrix(origins, destinations, 'car');

      expect(result.distances).toEqual([
        [465000, 120000],
        [465000, 0],
      ]);
      expect(result.durations).toEqual([
        [16200, 5400],
        [16200, 0],
      ]);
      expect(result.mode).toBe('car');
    });

    it('handles null entries (unreachable)', async () => {
      mockFetch({
        sources_to_target: [[null]],
        sources_to_targets: [[null]],
      });

      const result = await distanceService.getMatrix(
        [{ lat: 48.8566, lng: 2.3522 }],
        [{ lat: 45.764, lng: 4.8357 }],
        'car'
      );

      expect(result.distances[0][0]).toBe(-1);
      expect(result.durations[0][0]).toBe(-1);
    });
  });

  describe('getIsochrone', () => {
    it('transforms Valhalla isochrone response', async () => {
      mockFetch({
        features: [
          {
            type: 'Feature',
            properties: { time: 30, contour: 30 },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [2.2, 48.8],
                  [2.5, 48.8],
                  [2.5, 48.9],
                  [2.2, 48.9],
                  [2.2, 48.8],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: { time: 15, contour: 15 },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [2.3, 48.84],
                  [2.4, 48.84],
                  [2.4, 48.87],
                  [2.3, 48.87],
                  [2.3, 48.84],
                ],
              ],
            },
          },
        ],
      });

      const result = await distanceService.getIsochrone(
        { lat: 48.8566, lng: 2.3522 },
        'car',
        [15, 30]
      );

      expect(result.contours).toHaveLength(2);
      expect(result.contours[0].time).toBe(15);
      expect(result.contours[1].time).toBe(30);
      expect(result.origin).toEqual({ lat: 48.8566, lng: 2.3522 });
    });
  });

  describe('error handling', () => {
    it('throws 503 when Valhalla is down', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        distanceService.getRoute({ lat: 48.8566, lng: 2.3522 }, { lat: 45.764, lng: 4.8357 }, 'car')
      ).rejects.toThrow('Routing service is temporarily unavailable');
    });

    it('throws 503 when Valhalla returns non-200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(
        distanceService.getRoute({ lat: 48.8566, lng: 2.3522 }, { lat: 45.764, lng: 4.8357 }, 'car')
      ).rejects.toThrow();
    });
  });
});
