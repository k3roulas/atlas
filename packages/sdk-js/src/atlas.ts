import { DistanceResource } from './resources/distance.ts';
import { LocalitiesResource } from './resources/localities.ts';
import { MapResource } from './resources/map.ts';
import { StoresResource } from './resources/stores.ts';

export interface AtlasConfig {
  apiKey: string;
  baseUrl?: string;
}

export class Atlas {
  public readonly localities: LocalitiesResource;
  public readonly stores: StoresResource;
  public readonly map: MapResource;
  public readonly distance: DistanceResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AtlasConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.atlas.dev';

    this.localities = new LocalitiesResource(this.baseUrl, this.apiKey);
    this.stores = new StoresResource(this.baseUrl, this.apiKey);
    this.map = new MapResource(this.baseUrl, this.apiKey);
    this.distance = new DistanceResource(this.baseUrl, this.apiKey);
  }
}
