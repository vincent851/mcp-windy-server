# mcp-windy-server

An MCP (Model Context Protocol) server that provides weather data from the [Windy](https://www.windy.com) API and [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/) for tides. Query weather forecasts, ocean waves/swell, tides, air quality, and webcams directly from AI assistants.

## Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `get_point_forecast` | Weather forecast — wind, temperature, humidity, pressure, precipitation, clouds, CAPE | Windy |
| `get_wave_forecast` | Ocean wave forecast — combined seas, primary/secondary swell, wind waves | Windy (GFS Wave) |
| `get_swell_forecast` | Detailed swell forecast — height (m/ft), period, direction, energy index, size classification | Windy (GFS Wave) |
| `get_air_quality` | Air quality forecast — NO2, PM2.5, PM10, O3, SO2 | Windy (CAMS) |
| `get_tide_predictions` | Tide predictions — high/low tides and hourly water levels | NOAA CO-OPS |
| `find_tide_stations` | Find nearest NOAA tide stations to a location | NOAA CO-OPS |
| `search_webcams` | Search weather webcams by location, country, or category | Windy |
| `get_webcam` | Get details for a specific webcam | Windy |

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
- Swell height: meters and feet
- Tide height: meters and feet

## Tide Data

Tide predictions are powered by the **NOAA CO-OPS API** (free, no API key required). This primarily covers **US coastal waters**. The `find_tide_stations` tool helps you discover nearby stations, and `get_tide_predictions` returns high/low tides or hourly water levels.

## Swell Classifications

The `get_swell_forecast` tool provides surf-friendly classifications:
- **Size**: flat, small, moderate, large, very large, huge, extreme
- **Period quality**: short (wind swell), medium, long (ground swell), very long (deep water swell)
- **Energy index**: height² × period (higher = more powerful waves)

## License

MIT
