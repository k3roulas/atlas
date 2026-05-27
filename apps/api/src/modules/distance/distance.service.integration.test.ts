import { beforeAll, describe, expect, it } from 'vitest';

import * as distanceService from './distance.service.ts';

const VALHALLA_URL = process.env.VALHALLA_URL ?? 'http://localhost:8002';

async function isValhallaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${VALHALLA_URL}/status`);
    return res.ok;
  } catch {
    return false;
  }
}

describe.skipIf(!(await isValhallaAvailable()))('distance.service (integration)', () => {
  beforeAll(() => {
    // Ensure env is set for the service
    process.env.VALHALLA_URL = VALHALLA_URL;
  });

  it('returns a route from Paris to Lyon', async () => {
    const result = await distanceService.getRoute(
      { lat: 48.8566, lng: 2.3522 },
      { lat: 45.764, lng: 4.8357 },
      'car'
    );

    expect(result.distance).toBeGreaterThan(400_000);
    expect(result.distance).toBeLessThan(600_000);
    expect(result.duration).toBeGreaterThan(10_000);
    expect(result.legs).toHaveLength(1);
    expect(result.legs[0].steps.length).toBeGreaterThan(0);
  });

  it('returns a 2x2 matrix', async () => {
    const origins = [
      { lat: 48.8566, lng: 2.3522 },
      { lat: 45.764, lng: 4.8357 },
    ];
    const destinations = [
      { lat: 43.2965, lng: 5.3698 },
      { lat: 48.8566, lng: 2.3522 },
    ];

    const result = await distanceService.getMatrix(origins, destinations, 'car');

    expect(result.distances).toHaveLength(2);
    expect(result.distances[0]).toHaveLength(2);
    expect(result.distances[1]).toHaveLength(2);
    expect(result.distances[1][1]).toBe(0);
  });

  it('returns isochrone contours', async () => {
    const result = await distanceService.getIsochrone(
      { lat: 48.8566, lng: 2.3522 },
      'car',
      [15, 30]
    );

    expect(result.contours).toHaveLength(2);
    expect(result.contours[0].time).toBe(15);
    expect(result.contours[1].time).toBe(30);
    for (const c of result.contours) {
      const geom = JSON.parse(c.geometry);
      expect(geom.type).toBe('Polygon');
      expect(geom.coordinates.length).toBeGreaterThan(0);
    }
  });
});
