export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, unknown>;
  tags?: string[];
  opening_hours?: OpeningHours;
  created_at: string;
}

export interface OpeningHours {
  [day: string]: {
    open: string;
    close: string;
  } | null;
}

export interface StoreSearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface StoreSearchResult extends Store {
  distance?: number;
}

export interface StoreBulkImport {
  stores: Omit<Store, 'id' | 'tenant_id' | 'created_at'>[];
}

export interface StoreBulkImportResult {
  created: number;
  errors: { index: number; message: string }[];
}
