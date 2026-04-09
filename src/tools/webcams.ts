import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchWebcams as apiSearchWebcams,
  getWebcam as apiGetWebcam,
} from "../api/windy-client.js";

export function registerWebcamTools(server: McpServer, apiKey: string): void {
  server.tool(
    "search_webcams",
    "Search for weather webcams. Filter by location (nearby lat/lon), country code, or category. Returns webcam details with images and locations.",
    {
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe("Latitude for nearby search (-90 to 90)"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe("Longitude for nearby search (-180 to 180)"),
      radius: z
        .number()
        .min(1)
        .max(250)
        .default(50)
        .describe("Search radius in km (1-250, default 50)"),
      country: z
        .string()
        .length(2)
        .optional()
        .describe("2-letter country code (e.g., US, GB, DE)"),
      category: z
        .string()
        .optional()
        .describe("Webcam category (e.g., beach, mountain, city)"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Max results (1-50, default 10)"),
      offset: z
        .number()
        .min(0)
        .default(0)
        .describe("Pagination offset (default 0)"),
    },
    async ({ latitude, longitude, radius, country, category, limit, offset }) => {
      try {
        const result = await apiSearchWebcams(apiKey, {
          nearby:
            latitude !== undefined && longitude !== undefined
              ? { lat: latitude, lon: longitude, radius }
              : undefined,
          country,
          category,
          limit,
          offset,
        });

        const webcams = result.webcams.map((w) => ({
          id: w.webcamId,
          title: w.title,
          status: w.status,
          location: w.location,
          images: w.images,
          url: w.urls?.detail,
          lastUpdated: w.lastUpdatedOn,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  total: result.total,
                  returned: webcams.length,
                  webcams,
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
              text: `Error searching webcams: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_webcam",
    "Get details for a specific webcam by its ID. Returns location, images, and status.",
    {
      webcam_id: z
        .string()
        .min(1)
        .describe("The numeric webcam ID"),
    },
    async ({ webcam_id }) => {
      try {
        const webcam = await apiGetWebcam(apiKey, webcam_id);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: webcam.webcamId,
                  title: webcam.title,
                  status: webcam.status,
                  location: webcam.location,
                  images: webcam.images,
                  url: webcam.urls?.detail,
                  lastUpdated: webcam.lastUpdatedOn,
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
              text: `Error fetching webcam: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
