'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

interface RouteMapProps {
  routeGeometry?: string | null;
  isochroneContours?: Array<{ time: number; geometry: string }> | null;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

export function RouteMap({ routeGeometry, isochroneContours, origin, destination }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const res = await fetch(`${API_URL}/v1/map/styles/light`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const json = await res.json();
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: json.data.styleJson,
        center: [2.3522, 48.8566],
        zoom: 5,
        transformRequest: (url) => {
          if (url.startsWith(API_URL)) {
            return { url, headers: { 'X-API-Key': API_KEY } };
          }
          return { url };
        },
      });

      map.on('load', () => {
        if (!cancelled) setMapReady(true);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getSource('route')) map.removeSource('route');

    for (let i = 0; i < 10; i++) {
      const id = `isochrone-fill-${i}`;
      const lineId = `isochrone-line-${i}`;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(id)) map.removeSource(id);
    }

    if (routeGeometry) {
      const coords = decodePolyline(routeGeometry);
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      };

      map.addSource('route', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.8 },
      });
    }

    if (isochroneContours?.length) {
      isochroneContours.forEach((contour, i) => {
        const id = `isochrone-fill-${i}`;
        const geojson = JSON.parse(contour.geometry) as GeoJSON.Polygon;

        map.addSource(id, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: geojson },
        });

        const opacity = 0.15 + (0.15 * (isochroneContours.length - i)) / isochroneContours.length;
        map.addLayer({
          id,
          type: 'fill',
          source: id,
          paint: { 'fill-color': '#2563eb', 'fill-opacity': opacity },
        });
        map.addLayer({
          id: `isochrone-line-${i}`,
          type: 'line',
          source: id,
          paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-opacity': 0.6 },
        });
      });
    }

    if (origin) {
      const el = document.createElement('div');
      el.style.cssText =
        'width:14px;height:14px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)';
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (destination) {
      const el = document.createElement('div');
      el.style.cssText =
        'width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)';
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (routeGeometry && origin && destination) {
      const coords = decodePolyline(routeGeometry);
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([origin.lng, origin.lat]);
      bounds.extend([destination.lng, destination.lat]);
      for (const c of coords) bounds.extend(c);
      map.fitBounds(bounds, { padding: 50 });
    } else if (isochroneContours?.length && origin) {
      map.flyTo({ center: [origin.lng, origin.lat], zoom: 10 });
    }
  }, [routeGeometry, isochroneContours, origin, destination, mapReady]);

  return <div ref={containerRef} className="h-[400px] w-full rounded border border-gray-200" />;
}

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / 1e6, lat / 1e6]);
  }

  return coords;
}
