export interface LocalityResult {
  id: string;
  name: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    street?: string;
    house_number?: string;
  };
  type: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface GeocodeResult extends LocalityResult {}

export interface ReverseGeocodeResult extends LocalityResult {
  distance: number;
}
