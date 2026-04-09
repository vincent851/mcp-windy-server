import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  findNearestStations,
  fetchTidePredictions,
} from "../api/noaa-client.js";

export function registerTideTools(server: McpServer): void {
  server.tool(
    "get_tide_predictions",
    "Get tide predictions (high/low tides and hourly water levels) for a location. Uses NOAA CO-OPS data. Finds the nearest tide station to the given coordinates and returns predictions. Primarily covers US coastal waters.",
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
      days: z
        .number()
        .min(1)
        .max(10)
        .default(3)
        .describe("Number of days to forecast (1-10, default 3)"),
      hi_lo_only: z
        .boolean()
        .default(true)
        .describe(
          "If true, returns only high/low tide times. If false, returns hourly predictions (default true)."
        ),
      station_id: z
        .string()
        .optional()
        .describe(
          "Optional NOAA station ID. If not provided, the nearest station to the coordinates is used."
        ),
    },
    async ({ latitude, longitude, days, hi_lo_only, station_id }) => {
      try {
        let stationInfo;

        if (station_id) {
          stationInfo = {
            id: station_id,
            name: "User-specified station",
            state: "",
            latitude,
            longitude,
          };
        } else {
          const stations = await findNearestStations(latitude, longitude, 1);
          if (stations.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "No tide stations found near this location. NOAA tide data primarily covers US coastal waters.",
                },
              ],
              isError: true,
            };
          }
          stationInfo = stations[0];
        }

        const { predictions } = await fetchTidePredictions(
          stationInfo.id,
          days,
          hi_lo_only
        );

        const formattedPredictions = predictions.map((p) => ({
          time: p.time,
          height_m: p.height_m,
          height_ft: Math.round(p.height_m * 3.28084 * 100) / 100,
          ...(p.type ? { type: p.type === "H" ? "HIGH" : "LOW" } : {}),
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  station: {
                    id: stationInfo.id,
                    name: stationInfo.name,
                    state: stationInfo.state,
                    latitude: stationInfo.latitude,
                    longitude: stationInfo.longitude,
                    ...(stationInfo.distance_km !== undefined
                      ? { distance_km: stationInfo.distance_km }
                      : {}),
                  },
                  datum: "MLLW (Mean Lower Low Water)",
                  predictions: formattedPredictions,
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
              text: `Error fetching tide predictions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "find_tide_stations",
    "Find the nearest NOAA tide stations to a location. Returns station IDs, names, and distances. Use this to discover available stations before fetching tide predictions. Primarily covers US coastal waters.",
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
      limit: z
        .number()
        .min(1)
        .max(10)
        .default(5)
        .describe("Number of stations to return (1-10, default 5)"),
    },
    async ({ latitude, longitude, limit }) => {
      try {
        const stations = await findNearestStations(latitude, longitude, limit);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  search_location: { latitude, longitude },
                  stations: stations.map((s) => ({
                    id: s.id,
                    name: s.name,
                    state: s.state,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    distance_km: s.distance_km,
                  })),
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
              text: `Error finding tide stations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
