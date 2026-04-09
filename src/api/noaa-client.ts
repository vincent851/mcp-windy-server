/**
 * Client for the NOAA CO-OPS Tides and Currents API.
 * Free, no API key required.
 * https://api.tidesandcurrents.noaa.gov/api/prod/datagetter
 */

const NOAA_DATA_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const NOAA_STATIONS_URL =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json";

export interface TidePrediction {
  time: string;
  height_m: number;
  type?: "H" | "L"; // High or Low (only for hi/lo predictions)
}

export interface TideStation {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

export interface TideStationListResponse {
  stations: TideStation[];
}

export interface TidePredictionResponse {
  station: TideStation;
  predictions: TidePrediction[];
}

/** Formats a Date to YYYYMMDD for the NOAA API */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Haversine distance between two lat/lon points in km */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/** Fetches NOAA tide stations and finds the nearest ones to a lat/lon */
export async function findNearestStations(
  lat: number,
  lon: number,
  limit: number = 5
): Promise<TideStation[]> {
  const url = `${NOAA_STATIONS_URL}?type=tidepredictions&units=metric`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NOAA stations API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    stations: Array<{
      id: string;
      name: string;
      state: string;
      lat: number;
      lng: number;
    }>;
  };

  if (!data.stations || data.stations.length === 0) {
    throw new Error("No tide stations found");
  }

  const withDistance = data.stations
    .map((s) => ({
      id: s.id,
      name: s.name,
      state: s.state || "",
      latitude: s.lat,
      longitude: s.lng,
      distance_km: haversineDistance(lat, lon, s.lat, s.lng),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);

  return withDistance.slice(0, Math.min(limit, 10));
}

/** Fetches tide predictions for a given station */
export async function fetchTidePredictions(
  stationId: string,
  days: number = 3,
  hiLoOnly: boolean = false
): Promise<{ predictions: TidePrediction[] }> {
  // Sanitize station ID — allow digits and optional letters (some stations have letter suffixes)
  const sanitizedId = stationId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  if (sanitizedId.length === 0) {
    throw new Error("Invalid station ID");
  }

  const clampedDays = Math.min(Math.max(1, days), 10);

  const beginDate = new Date();
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() + clampedDays);

  const params = new URLSearchParams({
    begin_date: formatDate(beginDate),
    end_date: formatDate(endDate),
    station: sanitizedId,
    product: hiLoOnly ? "predictions" : "predictions",
    datum: "MLLW",
    units: "metric",
    time_zone: "gmt",
    format: "json",
    interval: hiLoOnly ? "hilo" : "h", // hilo = high/low only, h = hourly
    application: "mcp-windy-server",
  });

  const url = `${NOAA_DATA_URL}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NOAA predictions API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    predictions?: Array<{ t: string; v: string; type?: string }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`NOAA API error: ${data.error.message}`);
  }

  if (!data.predictions || data.predictions.length === 0) {
    return { predictions: [] };
  }

  const predictions: TidePrediction[] = data.predictions.map((p) => {
    const pred: TidePrediction = {
      time: p.t,
      height_m: Math.round(parseFloat(p.v) * 100) / 100,
    };
    if (p.type === "H" || p.type === "L") {
      pred.type = p.type;
    }
    return pred;
  });

  return { predictions };
}
