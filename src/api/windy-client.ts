import type {
  ForecastModel,
  PointForecastRequest,
  PointForecastResponse,
  PressureLevel,
  WeatherParameter,
  WebcamListResponse,
  WebcamSearchParams,
  Webcam,
} from "./types.js";

const POINT_FORECAST_URL = "https://api.windy.com/api/point-forecast/v2";
const WEBCAMS_BASE_URL = "https://api.windy.com/webcams/api/v3";

/** Validates latitude is within valid range */
export function validateLat(lat: number): void {
  if (lat < -90 || lat > 90 || !Number.isFinite(lat)) {
    throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
  }
}

/** Validates longitude is within valid range */
export function validateLon(lon: number): void {
  if (lon < -180 || lon > 180 || !Number.isFinite(lon)) {
    throw new Error(
      `Invalid longitude: ${lon}. Must be between -180 and 180.`
    );
  }
}

/** Fetches a point forecast from the Windy API */
export async function fetchPointForecast(
  apiKey: string,
  lat: number,
  lon: number,
  model: ForecastModel,
  parameters: WeatherParameter[],
  levels: PressureLevel[] = ["surface"]
): Promise<PointForecastResponse> {
  validateLat(lat);
  validateLon(lon);

  if (parameters.length === 0) {
    throw new Error("At least one parameter is required.");
  }

  const body: PointForecastRequest = {
    lat,
    lon,
    model,
    parameters,
    levels,
    key: apiKey,
  };

  const response = await fetch(POINT_FORECAST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Windy Point Forecast API error (${response.status}): ${text}`
    );
  }

  return (await response.json()) as PointForecastResponse;
}

/** Searches webcams using the Windy Webcams API v3 */
export async function searchWebcams(
  apiKey: string,
  params: WebcamSearchParams
): Promise<WebcamListResponse> {
  const url = new URL(`${WEBCAMS_BASE_URL}/webcams`);
  const searchParams = url.searchParams;

  searchParams.set("include", "location,images,urls");
  searchParams.set("lang", "en");

  if (params.limit !== undefined) {
    const limit = Math.min(Math.max(1, params.limit), 50);
    searchParams.set("limit", String(limit));
  }
  if (params.offset !== undefined) {
    searchParams.set("offset", String(Math.max(0, params.offset)));
  }
  if (params.nearby) {
    validateLat(params.nearby.lat);
    validateLon(params.nearby.lon);
    const radius = Math.min(Math.max(1, params.nearby.radius), 250);
    searchParams.set(
      "nearby",
      `${params.nearby.lat},${params.nearby.lon},${radius}`
    );
  }
  if (params.country) {
    // Sanitize: only allow 2-letter country codes
    const code = params.country.replace(/[^a-zA-Z]/g, "").slice(0, 2);
    if (code.length === 2) {
      searchParams.set("country", code.toUpperCase());
    }
  }
  if (params.category) {
    // Sanitize: only allow alphanumeric and hyphens
    const cat = params.category.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 50);
    if (cat.length > 0) {
      searchParams.set("category", cat);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "x-windy-api-key": apiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Windy Webcams API error (${response.status}): ${text}`);
  }

  return (await response.json()) as WebcamListResponse;
}

/** Gets a specific webcam by ID */
export async function getWebcam(
  apiKey: string,
  webcamId: string
): Promise<Webcam> {
  // Sanitize webcam ID: only allow digits
  const sanitizedId = webcamId.replace(/[^0-9]/g, "");
  if (sanitizedId.length === 0) {
    throw new Error("Invalid webcam ID. Must contain numeric digits.");
  }

  const url = `${WEBCAMS_BASE_URL}/webcams/${sanitizedId}?include=location,images,urls&lang=en`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "x-windy-api-key": apiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Windy Webcams API error (${response.status}): ${text}`);
  }

  return (await response.json()) as Webcam;
}
