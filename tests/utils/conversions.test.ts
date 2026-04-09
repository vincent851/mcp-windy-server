import { describe, it, expect } from "vitest";
import {
  kelvinToCelsius,
  kelvinToFahrenheit,
  msToKmh,
  msToKnots,
  paToHpa,
  mToMm,
  precipitationType,
} from "../../src/utils/conversions.js";

describe("kelvinToCelsius", () => {
  it("converts 273.15K to 0°C", () => {
    expect(kelvinToCelsius(273.15)).toBe(0);
  });

  it("converts 373.15K to 100°C", () => {
    expect(kelvinToCelsius(373.15)).toBe(100);
  });

  it("converts 0K to -273.15°C", () => {
    expect(kelvinToCelsius(0)).toBe(-273.15);
  });

  it("handles fractional values", () => {
    expect(kelvinToCelsius(293.45)).toBeCloseTo(20.3, 1);
  });
});

describe("kelvinToFahrenheit", () => {
  it("converts 273.15K to 32°F", () => {
    expect(kelvinToFahrenheit(273.15)).toBeCloseTo(32, 0);
  });

  it("converts 373.15K to 212°F", () => {
    expect(kelvinToFahrenheit(373.15)).toBeCloseTo(212, 0);
  });
});

describe("msToKmh", () => {
  it("converts 1 m/s to 3.6 km/h", () => {
    expect(msToKmh(1)).toBe(3.6);
  });

  it("converts 0 m/s to 0 km/h", () => {
    expect(msToKmh(0)).toBe(0);
  });

  it("converts 10 m/s to 36 km/h", () => {
    expect(msToKmh(10)).toBe(36);
  });
});

describe("msToKnots", () => {
  it("converts 1 m/s to ~1.94 knots", () => {
    expect(msToKnots(1)).toBeCloseTo(1.94, 1);
  });

  it("converts 0 m/s to 0 knots", () => {
    expect(msToKnots(0)).toBe(0);
  });
});

describe("paToHpa", () => {
  it("converts 101325 Pa to 1013.25 hPa", () => {
    expect(paToHpa(101325)).toBe(1013.25);
  });

  it("converts 100 Pa to 1 hPa", () => {
    expect(paToHpa(100)).toBe(1);
  });
});

describe("mToMm", () => {
  it("converts 0.001 m to 1 mm", () => {
    expect(mToMm(0.001)).toBe(1);
  });

  it("converts 0 m to 0 mm", () => {
    expect(mToMm(0)).toBe(0);
  });

  it("converts 0.0254 m to 25.4 mm", () => {
    expect(mToMm(0.0254)).toBe(25.4);
  });
});

describe("precipitationType", () => {
  it("returns 'none' for code 0", () => {
    expect(precipitationType(0)).toBe("none");
  });

  it("returns 'rain' for code 1", () => {
    expect(precipitationType(1)).toBe("rain");
  });

  it("returns 'snow' for code 4", () => {
    expect(precipitationType(4)).toBe("snow");
  });

  it("returns 'freezing rain' for code 2", () => {
    expect(precipitationType(2)).toBe("freezing rain");
  });

  it("returns 'unknown' for unrecognized code", () => {
    expect(precipitationType(99)).toBe("unknown");
  });
});
