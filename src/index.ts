#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerForecastTool } from "./tools/forecast.js";
import { registerWaveTool } from "./tools/waves.js";
import { registerAirQualityTool } from "./tools/air-quality.js";
import { registerWebcamTools } from "./tools/webcams.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    console.error(`Error: ${name} environment variable is required.`);
    console.error(`Set it in your MCP client config or export it in your shell.`);
    process.exit(1);
  }
  return value.trim();
}

const server = new McpServer({
  name: "mcp-windy-server",
  version: "1.0.0",
});

const windyApiKey = getRequiredEnv("WINDY_API_KEY");

// Register forecast tools (Point Forecast API)
registerForecastTool(server, windyApiKey);
registerWaveTool(server, windyApiKey);
registerAirQualityTool(server, windyApiKey);

// Register webcam tools (Webcams API) — uses separate key if provided, falls back to main key
const webcamsApiKey = process.env.WINDY_WEBCAMS_API_KEY?.trim() || windyApiKey;
registerWebcamTools(server, webcamsApiKey);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-windy-server started successfully");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  process.exit(0);
});
