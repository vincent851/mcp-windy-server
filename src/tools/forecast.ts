import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchPointForecast } from "../api/windy-client.js";
import type { ForecastModel, PressureLevel } from "../api/types.js";
import {
  kelvinToCelsius,
  msToKmh,
  msToKnots,
  paToHpa,
  mToMm,
  precipitationType,
} from "../utils/conversions.js";
import { windSpeed, windDirection, degreesToCompass } from "../utils/wind.js";

const VALID_MODELS = [
  "gfs",
  "iconEu",
  "arome",
  "namConus",
  "namHawaii",
  "namAlaska",
] as const;

const VALID_LEVELS = [
  "surface",
  "1000h",
  "950h",
  "925h",
  "900h",
  "850h",
  "800h",
  "700h",
  "600h",
  "500h",
  "400h",
  "300h",
  "200h",
  "150h",
] as const;

interface ForecastEntry {
  time: string;
  wind?: {
    speed_ms: number;
    speed_kmh: number;
    speed_knots: number;
    direction_deg: number;
    compass: string;
    gust_ms?: number;
    gust_kmh?: number;
  };
  temperature?: { celsius: number };
  dewpoint?: { celsius: number };
  humidity?: number;
  pressure?: { hpa: number };
  precipitation?: { mm: number; type?: string };
  snow?: { mm: number };
  clouds?: { low?: number; mid?: number; high?: number };
  cape?: number;
}

/** Formats the raw API response into human-friendly forecast entries */
export function formatForecastResponse(
  data: Record<string, unknown>,
  level: string
): ForecastEntry[] {
  const timestamps = data.ts as number[] | undefined;
  if (!timestamps || timestamps.length === 0) return [];

  return timestamps.map((ts, i) => {
    const entry: ForecastEntry = {
      time: new Date(ts).toISOString(),
    };

    const uArr = data[`wind_u-${level}`] as number[] | undefined;
    const vArr = data[`wind_v-${level}`] as number[] | undefined;
    if (uArr && vArr && uArr[i] != null && vArr[i] != null) {
      const speed = windSpeed(uArr[i], vArr[i]);
      const dir = windDirection(uArr[i], vArr[i]);
      entry.wind = {
        speed_ms: Math.round(speed * 100) / 100,
        speed_kmh: msToKmh(speed),
        speed_knots: msToKnots(speed),
        direction_deg: dir,
        compass: degreesToCompass(dir),
      };

      const gustArr = data[`gust-${level}`] as number[] | undefined;
      if (gustArr && gustArr[i] != null) {
        entry.wind.gust_ms = gustArr[i];
        entry.wind.gust_kmh = msToKmh(gustArr[i]);
      }
    }

    const tempArr = data[`temp-${level}`] as number[] | undefined;
    if (tempArr && tempArr[i] != null) {
      entry.temperature = { celsius: kelvinToCelsius(tempArr[i]) };
    }

    const dewArr = data[`dewpoint-${level}`] as number[] | undefined;
    if (dewArr && dewArr[i] != null) {
      entry.dewpoint = { celsius: kelvinToCelsius(dewArr[i]) };
    }

    const rhArr = data[`rh-${level}`] as number[] | undefined;
    if (rhArr && rhArr[i] != null) {
      entry.humidity = Math.round(rhArr[i] * 100) / 100;
    }

    const pressArr = data[`pressure-${level}`] as number[] | undefined;
    if (pressArr && pressArr[i] != null) {
      entry.pressure = { hpa: paToHpa(pressArr[i]) };
    }

    const precipArr = data[`past3hprecip-${level}`] as number[] | undefined;
    if (precipArr && precipArr[i] != null) {
      entry.precipitation = { mm: mToMm(precipArr[i]) };
      const ptypeArr = data[`ptype-${level}`] as number[] | undefined;
      if (ptypeArr && ptypeArr[i] != null) {
        entry.precipitation.type = precipitationType(ptypeArr[i]);
      }
    }

    const snowArr = data[`past3hsnowprecip-${level}`] as number[] | undefined;
    if (snowArr && snowArr[i] != null) {
      entry.snow = { mm: mToMm(snowArr[i]) };
    }

    const lcArr = data[`lclouds-${level}`] as number[] | undefined;
    const mcArr = data[`mclouds-${level}`] as number[] | undefined;
    const hcArr = data[`hclouds-${level}`] as number[] | undefined;
    if (lcArr || mcArr || hcArr) {
      entry.clouds = {};
      if (lcArr && lcArr[i] != null) entry.clouds.low = lcArr[i];
      if (mcArr && mcArr[i] != null) entry.clouds.mid = mcArr[i];
      if (hcArr && hcArr[i] != null) entry.clouds.high = hcArr[i];
    }

    const capeArr = data[`cape-${level}`] as number[] | undefined;
    if (capeArr && capeArr[i] != null) {
      entry.cape = capeArr[i];
    }

    return entry;
  });
}

export function registerForecastTool(server: McpServer, apiKey: string): void {
  server.tool(
    "get_point_forecast",
    "Get weather forecast for a location. Returns wind, temperature, humidity, pressure, precipitation, clouds, and CAPE data with unit conversions.",
    {
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe("Latitude (-90 to 90)"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude (-180 to 180)"),
      model: z
        .enum(VALID_MODELS)
        .default("gfs")
        .describe(
          "Forecast model: gfs (global), iconEu (Europe), arome (France), namConus (US/CA/MX), namHawaii, namAlaska"
        ),
      level: z
        .enum(VALID_LEVELS)
        .default("surface")
        .describe("Pressure level: surface, 850h, 700h, 500h, etc."),
    },
    async ({ latitude, longitude, model, level }) => {
      try {
        const parameters = [
          "wind",
          "windGust",
          "temp",
          "dewpoint",
          "rh",
          "pressure",
          "precip",
          "snowPrecip",
          "cape",
          "ptype",
          "lclouds",
          "mclouds",
          "hclouds",
        ] as const;

        const data = await fetchPointForecast(
          apiKey,
          latitude,
          longitude,
          model as ForecastModel,
          [...parameters],
          [level as PressureLevel]
        );

        const entries = formatForecastResponse(
          data as unknown as Record<string, unknown>,
          level
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  location: { latitude, longitude },
                  model,
                  level,
                  forecast: entries,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching forecast: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
