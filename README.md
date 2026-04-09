# mcp-windy-server

An MCP (Model Context Protocol) server that provides weather data from the [Windy](https://www.windy.com) API. Query weather forecasts, ocean waves/swell, air quality, and webcams directly from AI assistants.

## Tools

| Tool | Description |
|------|-------------|
| `get_point_forecast` | Weather forecast — wind, temperature, humidity, pressure, precipitation, clouds, CAPE |
| `get_wave_forecast` | Ocean wave/swell forecast — combined seas, primary/secondary swell, wind waves |
| `get_air_quality` | Air quality forecast — NO2, PM2.5, PM10, O3, SO2 (CAMS model) |
| `search_webcams` | Search weather webcams by location, country, or category |
| `get_webcam` | Get details for a specific webcam |

## Supported Models

- **GFS** — Global forecast (default)
- **GFS Wave** — Global wave/swell data
- **ICON-EU** — High-resolution European forecast
- **AROME** — High-resolution France/surroundings
- **NAM** — Regional US/Canada/Mexico, Hawaii, Alaska
- **CAMS** — Global air quality

## Setup

### 1. Get API Keys

Register at [api.windy.com](https://api.windy.com) to get:
- **Point Forecast API key** (for weather, waves, and air quality tools)
- **Webcams API key** (for webcam tools — separate key)

### 2. Install

```bash
npm install
npm run build
```

### 3. Configure in your MCP client

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "windy": {
      "command": "node",
      "args": ["/path/to/mcp-windy-server/build/index.js"],
      "env": {
        "WINDY_API_KEY": "your-point-forecast-key",
        "WINDY_WEBCAMS_API_KEY": "your-webcams-key"
      }
    }
  }
}
```

## Development

```bash
npm install
npm run typecheck   # Type check
npm test            # Run tests
npm run build       # Build
npm run dev         # Run with tsx (no build needed)
```

## Unit Conversions

All raw API data is automatically converted to human-friendly units:
- Temperature: Kelvin → Celsius
- Wind speed: m/s → km/h and knots
- Wind direction: U/V components → degrees and compass direction
- Pressure: Pa → hPa (millibars)
- Precipitation: m → mm
- Air quality: kg/m³ → µg/m³

## Note on Tides

Windy does not provide tide data through its API. For tide information, consider supplementary APIs like NOAA Tides & Currents or WorldTides.

## License

MIT
