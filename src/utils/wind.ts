/**
 * Computes wind speed from U (east-west) and V (north-south) components.
 * Both components should be in m/s. Returns speed in m/s.
 */
export function windSpeed(u: number, v: number): number {
  return Math.sqrt(u * u + v * v);
}

/**
 * Computes meteorological wind direction from U and V components.
 * Returns direction in degrees (0-360) where the wind is coming FROM.
 * - 0/360 = from North
 * - 90 = from East
 * - 180 = from South
 * - 270 = from West
 */
export function windDirection(u: number, v: number): number {
  // atan2 gives the angle of the wind vector (where wind is going TO)
  // We add 180 to convert to "from" direction (meteorological convention)
  const deg = (Math.atan2(u, v) * 180) / Math.PI + 180;
  return Math.round((deg % 360) * 100) / 100;
}

/** Converts wind direction in degrees to compass direction string */
export function degreesToCompass(deg: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}
