/** Supported Windy forecast models */
export type ForecastModel =
  | "gfs"
  | "gfsWave"
  | "iconEu"
  | "arome"
  | "namConus"
  | "namHawaii"
  | "namAlaska"
  | "cams";

/** Atmospheric parameters (support multiple pressure levels) */
export type AtmosphericParameter =
  | "wind"
  | "temp"
  | "dewpoint"
  | "rh"
  | "gh";

/** Surface-only weather parameters */
export type SurfaceParameter =
  | "windGust"
  | "precip"
  | "past3hprecip"
  | "convPrecip"
  | "past3hconvprecip"
  | "snowPrecip"
  | "past3hsnowprecip"
  | "cape"
  | "pressure"
  | "ptype"
  | "lclouds"
  | "mclouds"
  | "hclouds";

/** Wave/ocean parameters (gfsWave model only) */
export type WaveParameter = "waves" | "swell1" | "swell2" | "windWaves";

/** Air quality parameters (cams model only) */
export type AirQualityParameter =
  | "no2"
  | "pm2p5"
  | "pm10"
  | "o3"
  | "so2"
  | "gtco3"
  | "tcno2"
  | "tcso2";

/** All available weather parameters */
export type WeatherParameter =
  | AtmosphericParameter
  | SurfaceParameter
  | WaveParameter
  | AirQualityParameter;

/** Supported pressure levels */
export type PressureLevel =
  | "surface"
  | "1000h"
  | "950h"
  | "925h"
  | "900h"
  | "850h"
  | "800h"
  | "700h"
  | "600h"
  | "500h"
  | "400h"
  | "300h"
  | "200h"
  | "150h";

/** Request body for the Windy Point Forecast API */
export interface PointForecastRequest {
  lat: number;
  lon: number;
  model: ForecastModel;
  parameters: WeatherParameter[];
  levels?: PressureLevel[];
  key: string;
}

/** Response from the Windy Point Forecast API */
export interface PointForecastResponse {
  ts: number[];
  units: Record<string, string>;
  [key: string]: number[] | string[] | Record<string, string>;
}

/** Webcam search parameters */
export interface WebcamSearchParams {
  nearby?: { lat: number; lon: number; radius: number };
  country?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

/** Webcam data from Windy Webcams API v3 */
export interface Webcam {
  webcamId: string;
  title: string;
  status: string;
  location: {
    city: string;
    region: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  };
  images?: {
    current?: { preview: string; thumbnail: string };
    daylight?: { preview: string; thumbnail: string };
  };
  urls?: {
    detail: string;
    edit: string;
  };
  lastUpdatedOn?: string;
}

/** Webcam list response */
export interface WebcamListResponse {
  total: number;
  webcams: Webcam[];
}
