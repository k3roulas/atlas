'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Store {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  tags: string[] | null;
  created_at: string;
}

interface StoresMapProps {
  stores: Store[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

export function StoresMap({ stores }: StoresMapProps) {
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

    for (const store of stores) {
      if (!store.location.lat && !store.location.lng) continue;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="font-family:system-ui;max-width:200px">
          <strong>${store.name}</strong>
          <p style="margin:4px 0;color:#6b7280;font-size:13px">${store.address}</p>
          <a href="/stores/${store.id}" style="color:#2563eb;font-size:13px">View details</a>
        </div>
      `);

      const marker = new maplibregl.Marker()
        .setLngLat([store.location.lng, store.location.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    if (stores.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const store of stores) {
        bounds.extend([store.location.lng, store.location.lat]);
      }
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [stores, mapReady]);

  return (
    <div ref={containerRef} className="mt-4 h-[500px] w-full rounded border border-gray-200" />
  );
}
