import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchPointForecast } from "../api/windy-client.js";
import { degreesToCompass } from "../utils/wind.js";

/** Classifies swell size for surfers/mariners */
export function classifySwellSize(heightM: number): string {
  if (heightM < 0.3) return "flat";
  if (heightM < 0.6) return "small";
  if (heightM < 1.2) return "moderate";
  if (heightM < 2.0) return "large";
  if (heightM < 3.0) return "very large";
  if (heightM < 5.0) return "huge";
  return "extreme";
}

/** Estimates swell energy (proportional to height² × period) */
export function swellEnergy(heightM: number, periodS: number): number {
  return Math.round(heightM * heightM * periodS * 100) / 100;
}

/** Classifies swell period quality for surfing */
export function classifySwellPeriod(periodS: number): string {
  if (periodS < 6) return "short (wind swell)";
  if (periodS < 9) return "medium";
  if (periodS < 13) return "long (ground swell)";
  if (periodS < 18) return "very long (deep water swell)";
  return "ultra long";
}

interface SwellDetail {
  height_m: number;
  height_ft: number;
  period_s: number;
  period_quality: string;
  direction_deg: number;
  compass: string;
  energy: number;
  size_class: string;
}

interface SwellEntry {
  time: string;
  primary_swell?: SwellDetail;
  secondary_swell?: SwellDetail;
  combined_seas?: SwellDetail;
  wind_waves?: SwellDetail;
}

function buildSwellDetail(
  data: Record<string, unknown>,
  prefix: string,
  index: number
): SwellDetail | undefined {
  const hArr = data[`${prefix}_height-surface`] as number[] | undefined;
  const pArr = data[`${prefix}_period-surface`] as number[] | undefined;
  const dArr = data[`${prefix}_direction-surface`] as number[] | undefined;

  if (!hArr || hArr[index] == null) return undefined;

  const height = Math.round(hArr[index] * 100) / 100;
  const period =
    pArr && pArr[index] != null ? Math.round(pArr[index] * 10) / 10 : 0;
  const dir =
    dArr && dArr[index] != null ? Math.round(dArr[index] * 10) / 10 : 0;

  return {
    height_m: height,
    height_ft: Math.round(height * 3.28084 * 10) / 10,
    period_s: period,
    period_quality: classifySwellPeriod(period),
    direction_deg: dir,
    compass: degreesToCompass(dir),
    energy: swellEnergy(height, period),
    size_class: classifySwellSize(height),
  };
}

/** Formats raw API response into detailed swell entries */
export function formatSwellResponse(
  data: Record<string, unknown>
): SwellEntry[] {
  const timestamps = data.ts as number[] | undefined;
  if (!timestamps || timestamps.length === 0) return [];

  return timestamps.map((ts, i) => {
    const entry: SwellEntry = {
      time: new Date(ts).toISOString(),
    };

    const primary = buildSwellDetail(data, "swell1", i);
    if (primary) entry.primary_swell = primary;

    const secondary = buildSwellDetail(data, "swell2", i);
    if (secondary) entry.secondary_swell = secondary;

    const combined = buildSwellDetail(data, "waves", i);
    if (combined) entry.combined_seas = combined;

    const windWaves = buildSwellDetail(data, "windWaves", i);
    if (windWaves) entry.wind_waves = windWaves;

    return entry;
  });
}

export function registerSwellTool(server: McpServer, apiKey: string): void {
  server.tool(
    "get_swell_forecast",
    "Get detailed ocean swell forecast for surfing and marine activities. Returns primary and secondary swell with height (m/ft), period, direction, energy index, and size classification. Uses the GFS Wave model.",
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
          "gfsWave",
          ["waves", "swell1", "swell2", "windWaves"],
          ["surface"]
        );

        const entries = formatSwellResponse(
          data as unknown as Record<string, unknown>
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  location: { latitude, longitude },
                  model: "gfsWave",
                  note: "Swell direction indicates where the swell is coming FROM",
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
              text: `Error fetching swell forecast: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
