import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchPointForecast } from "../api/windy-client.js";

interface AirQualityEntry {
  time: string;
  no2?: number;
  pm2_5?: number;
  pm10?: number;
  o3?: number;
  so2?: number;
}

/** Formats the raw CAMS API response into air quality entries */
export function formatAirQualityResponse(
  data: Record<string, unknown>
): AirQualityEntry[] {
  const timestamps = data.ts as number[] | undefined;
  if (!timestamps || timestamps.length === 0) return [];

  return timestamps.map((ts, i) => {
    const entry: AirQualityEntry = {
      time: new Date(ts).toISOString(),
    };

    const no2 = data["no2-surface"] as number[] | undefined;
    if (no2 && no2[i] != null) entry.no2 = Math.round(no2[i] * 1e9 * 100) / 100;

    const pm25 = data["pm2p5-surface"] as number[] | undefined;
    if (pm25 && pm25[i] != null) entry.pm2_5 = Math.round(pm25[i] * 1e9 * 100) / 100;

    const pm10val = data["pm10-surface"] as number[] | undefined;
    if (pm10val && pm10val[i] != null) entry.pm10 = Math.round(pm10val[i] * 1e9 * 100) / 100;

    const o3 = data["o3-surface"] as number[] | undefined;
    if (o3 && o3[i] != null) entry.o3 = Math.round(o3[i] * 1e9 * 100) / 100;

    const so2 = data["so2-surface"] as number[] | undefined;
    if (so2 && so2[i] != null) entry.so2 = Math.round(so2[i] * 1e9 * 100) / 100;

    return entry;
  });
}

export function registerAirQualityTool(
  server: McpServer,
  apiKey: string
): void {
  server.tool(
    "get_air_quality",
    "Get air quality forecast for a location. Returns NO2, PM2.5, PM10, O3, and SO2 concentrations in µg/m³. Uses the CAMS global model.",
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
    },
    async ({ latitude, longitude }) => {
      try {
        const data = await fetchPointForecast(
          apiKey,
          latitude,
          longitude,
          "cams",
          ["no2", "pm2p5", "pm10", "o3", "so2"],
          ["surface"]
        );

        const entries = formatAirQualityResponse(
          data as unknown as Record<string, unknown>
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  location: { latitude, longitude },
                  model: "cams",
                  unit: "µg/m³",
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
              text: `Error fetching air quality: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
