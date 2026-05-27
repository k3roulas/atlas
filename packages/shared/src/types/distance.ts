export type TravelMode = 'car' | 'bike' | 'foot' | 'truck' | 'motorcycle';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name: string;
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  geometry: string;
}

export interface RouteResult {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: TravelMode;
  distance: number;
  duration: number;
  legs: RouteLeg[];
}

export interface MatrixResult {
  origins: Array<{ lat: number; lng: number }>;
  destinations: Array<{ lat: number; lng: number }>;
  mode: TravelMode;
  distances: number[][];
  durations: number[][];
}

export interface IsochroneContour {
  time: number;
  geometry: string;
}

export interface IsochroneResult {
  origin: { lat: number; lng: number };
  mode: TravelMode;
  contours: IsochroneContour[];
}
