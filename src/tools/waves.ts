import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchPointForecast } from "../api/windy-client.js";

interface WaveEntry {
  time: string;
  waves?: { height_m: number; period_s: number; direction_deg: number };
  swell1?: { height_m: number; period_s: number; direction_deg: number };
  swell2?: { height_m: number; period_s: number; direction_deg: number };
  windWaves?: { height_m: number; period_s: number; direction_deg: number };
}

function parseWaveComponent(
  data: Record<string, unknown>,
  prefix: string,
  index: number
): { height_m: number; period_s: number; direction_deg: number } | undefined {
  const hArr = data[`${prefix}_height-surface`] as number[] | undefined;
  const pArr = data[`${prefix}_period-surface`] as number[] | undefined;
  const dArr = data[`${prefix}_direction-surface`] as number[] | undefined;

  if (hArr && hArr[index] != null) {
    return {
      height_m: Math.round(hArr[index] * 100) / 100,
      period_s: pArr && pArr[index] != null ? Math.round(pArr[index] * 10) / 10 : 0,
      direction_deg:
        dArr && dArr[index] != null ? Math.round(dArr[index] * 10) / 10 : 0,
    };
  }
  return undefined;
}

/** Formats the raw wave API response into structured entries */
export function formatWaveResponse(
  data: Record<string, unknown>
): WaveEntry[] {
  const timestamps = data.ts as number[] | undefined;
  if (!timestamps || timestamps.length === 0) return [];

  return timestamps.map((ts, i) => {
    const entry: WaveEntry = {
      time: new Date(ts).toISOString(),
    };

    const waves = parseWaveComponent(data, "waves", i);
    if (waves) entry.waves = waves;

    const swell1 = parseWaveComponent(data, "swell1", i);
    if (swell1) entry.swell1 = swell1;

    const swell2 = parseWaveComponent(data, "swell2", i);
    if (swell2) entry.swell2 = swell2;

    const windWaves = parseWaveComponent(data, "windWaves", i);
    if (windWaves) entry.windWaves = windWaves;

    return entry;
  });
}

export function registerWaveTool(server: McpServer, apiKey: string): void {
  server.tool(
    "get_wave_forecast",
    "Get ocean wave and swell forecast for a location. Returns wave height, period, and direction for combined seas, primary swell, secondary swell, and wind waves. Uses the GFS Wave model.",
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

        const entries = formatWaveResponse(
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
              text: `Error fetching wave forecast: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
