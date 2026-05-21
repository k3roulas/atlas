export interface MapStyle {
  id: string;
  tenant_id: string | null;
  name: string;
  style_json: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

export interface TileJson {
  tilejson: string;
  name: string;
  tiles: string[];
  minzoom: number;
  maxzoom: number;
  attribution: string;
}
