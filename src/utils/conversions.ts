/** Converts Kelvin to Celsius */
export function kelvinToCelsius(k: number): number {
  return Math.round((k - 273.15) * 100) / 100;
}

/** Converts Kelvin to Fahrenheit */
export function kelvinToFahrenheit(k: number): number {
  return Math.round(((k - 273.15) * 9 / 5 + 32) * 100) / 100;
}

/** Converts meters/second to km/h */
export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6 * 100) / 100;
}

/** Converts meters/second to knots */
export function msToKnots(ms: number): number {
  return Math.round(ms * 1.94384 * 100) / 100;
}

/** Converts Pascals to hectopascals (millibars) */
export function paToHpa(pa: number): number {
  return Math.round((pa / 100) * 100) / 100;
}

/** Converts meters of precipitation to millimeters */
export function mToMm(m: number): number {
  return Math.round(m * 1000 * 100) / 100;
}

/** Converts radians to degrees */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Maps precipitation type code to human-readable string */
export function precipitationType(code: number): string {
  switch (code) {
    case 0:
      return "none";
    case 1:
      return "rain";
    case 2:
      return "freezing rain";
    case 3:
      return "ice pellets";
    case 4:
      return "snow";
    case 5:
      return "wet snow";
    case 6:
      return "mixed rain/snow";
    case 7:
      return "sleet";
    default:
      return "unknown";
  }
}
