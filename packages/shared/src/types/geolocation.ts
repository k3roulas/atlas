export interface IpGeolocationResult {
  ip: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  location: { lat: number; lng: number } | null;
  timezone: string | null;
}

export interface TimezoneResult {
  timezone: string;
  offset_minutes: number;
  location: { lat: number; lng: number };
}
