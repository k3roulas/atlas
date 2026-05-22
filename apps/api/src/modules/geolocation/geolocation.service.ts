import type { Context } from 'hono';
import maxmind, { type CityResponse, type Reader } from 'maxmind';

import type { IpGeolocationResult, TimezoneResult } from '@atlas/shared';
import { ApiError } from '../../utils/error.ts';

const MMDB_PATH = process.env.GEOLITE2_CITY_PATH ?? './data/GeoLite2-City.mmdb';

let reader: Reader<CityResponse> | null = null;

async function getReader(): Promise<Reader<CityResponse>> {
  if (!reader) {
    try {
      reader = await maxmind.open<CityResponse>(MMDB_PATH);
    } catch {
      throw new ApiError(
        503,
        'GEOLOCATION_UNAVAILABLE',
        'IP geolocation database is not configured'
      );
    }
  }
  return reader;
}

export function extractClientIp(c: Context): string {
  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    return normalizeIp(ip);
  }
  const realIp = c.req.header('X-Real-IP');
  if (realIp) {
    return normalizeIp(realIp.trim());
  }
  return '127.0.0.1';
}

function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

export async function lookupIp(ip: string): Promise<IpGeolocationResult> {
  const r = await getReader();
  const result = r.get(ip);

  if (!result?.location) {
    return {
      ip,
      city: result?.city?.names?.en ?? null,
      country: result?.country?.names?.en ?? null,
      country_code: result?.country?.iso_code ?? null,
      location: null,
      timezone: null,
    };
  }

  return {
    ip,
    city: result.city?.names?.en ?? null,
    country: result.country?.names?.en ?? null,
    country_code: result.country?.iso_code ?? null,
    location: {
      lat: result.location.latitude,
      lng: result.location.longitude,
    },
    timezone: result.location.time_zone ?? null,
  };
}

export async function lookupTimezone(lat: number, lng: number): Promise<TimezoneResult> {
  const { find } = await import('geo-tz');
  const timezones = find(lat, lng);

  if (timezones.length === 0) {
    throw new ApiError(404, 'TIMEZONE_NOT_FOUND', 'No timezone found for the given coordinates');
  }

  const tz = timezones[0];
  const offsetMinutes = getTimezoneOffsetMinutes(tz);

  return {
    timezone: tz,
    offset_minutes: offsetMinutes,
    location: { lat, lng },
  };
}

function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = now.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return Math.round((tzDate.getTime() - utcDate.getTime()) / 60_000);
}
