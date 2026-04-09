import { describe, it, expect } from "vitest";
import {
  windSpeed,
  windDirection,
  degreesToCompass,
} from "../../src/utils/wind.js";

describe("windSpeed", () => {
  it("returns 0 for zero components", () => {
    expect(windSpeed(0, 0)).toBe(0);
  });

  it("computes speed from u-only component", () => {
    expect(windSpeed(3, 0)).toBe(3);
  });

  it("computes speed from v-only component", () => {
    expect(windSpeed(0, 4)).toBe(4);
  });

  it("computes speed from both components (3-4-5 triangle)", () => {
    expect(windSpeed(3, 4)).toBe(5);
  });

  it("handles negative components", () => {
    expect(windSpeed(-3, -4)).toBe(5);
  });
});

describe("windDirection", () => {
  it("returns 180° for wind from south (u=0, v>0 means going north, so from south)", () => {
    // u=0, v=1 => wind vector points north => wind FROM south = 180°
    expect(windDirection(0, 1)).toBe(180);
  });

  it("returns 0° for wind from north (u=0, v<0)", () => {
    // u=0, v=-1 => wind vector points south => wind FROM north = 0° or 360°
    const dir = windDirection(0, -1);
    expect(dir === 0 || dir === 360).toBe(true);
  });

  it("returns 270° for wind from west (u>0, v=0)", () => {
    // u=1, v=0 => wind blows east => FROM west = 270°
    expect(windDirection(1, 0)).toBe(270);
  });

  it("returns 90° for wind from east (u<0, v=0)", () => {
    // u=-1, v=0 => wind blows west => FROM east = 90°
    expect(windDirection(-1, 0)).toBe(90);
  });

  it("returns value between 0 and 360", () => {
    for (let u = -5; u <= 5; u++) {
      for (let v = -5; v <= 5; v++) {
        if (u === 0 && v === 0) continue;
        const dir = windDirection(u, v);
        expect(dir).toBeGreaterThanOrEqual(0);
        expect(dir).toBeLessThanOrEqual(360);
      }
    }
  });
});

describe("degreesToCompass", () => {
  it("returns N for 0°", () => {
    expect(degreesToCompass(0)).toBe("N");
  });

  it("returns N for 360°", () => {
    expect(degreesToCompass(360)).toBe("N");
  });

  it("returns E for 90°", () => {
    expect(degreesToCompass(90)).toBe("E");
  });

  it("returns S for 180°", () => {
    expect(degreesToCompass(180)).toBe("S");
  });

  it("returns W for 270°", () => {
    expect(degreesToCompass(270)).toBe("W");
  });

  it("returns NE for 45°", () => {
    expect(degreesToCompass(45)).toBe("NE");
  });

  it("returns SE for 135°", () => {
    expect(degreesToCompass(135)).toBe("SE");
  });

  it("returns SW for 225°", () => {
    expect(degreesToCompass(225)).toBe("SW");
  });

  it("returns NW for 315°", () => {
    expect(degreesToCompass(315)).toBe("NW");
  });

  it("handles negative degrees by wrapping", () => {
    expect(degreesToCompass(-90)).toBe("W");
  });
});
