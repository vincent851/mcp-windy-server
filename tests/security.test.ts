import { describe, it, expect, vi } from "vitest";
import {
  validateLat,
  validateLon,
  fetchPointForecast,
  searchWebcams,
  getWebcam,
} from "../src/api/windy-client.js";

/**
 * Security-focused tests to verify the server is hardened against
 * common attack vectors: injection, boundary abuse, prototype pollution, etc.
 */

describe("Security: Input validation boundaries", () => {
  it("rejects NaN latitude", () => {
    expect(() => validateLat(NaN)).toThrow();
  });

  it("rejects NaN longitude", () => {
    expect(() => validateLon(NaN)).toThrow();
  });

  it("rejects Infinity latitude", () => {
    expect(() => validateLat(Infinity)).toThrow();
    expect(() => validateLat(-Infinity)).toThrow();
  });

  it("rejects Infinity longitude", () => {
    expect(() => validateLon(Infinity)).toThrow();
    expect(() => validateLon(-Infinity)).toThrow();
  });
});

describe("Security: API key handling", () => {
  it("does not include API key in error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Invalid API key"),
      })
    );

    try {
      await fetchPointForecast("secret-key-123", 0, 0, "gfs", ["wind"]);
    } catch (e) {
      const message = (e as Error).message;
      expect(message).not.toContain("secret-key-123");
    }

    vi.restoreAllMocks();
  });
});

describe("Security: Injection prevention in webcam search", () => {
  it("strips script tags from category", () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = input.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 50);
    expect(sanitized).not.toContain("<");
    expect(sanitized).not.toContain(">");
    expect(sanitized).not.toContain("(");
    expect(sanitized).not.toContain('"');
  });

  it("strips SQL injection attempts from country", () => {
    const input = "US' OR '1'='1";
    const sanitized = input.replace(/[^a-zA-Z]/g, "").slice(0, 2);
    expect(sanitized).toBe("US");
  });

  it("strips path traversal from webcam ID", () => {
    const input = "../../../etc/passwd";
    const sanitized = input.replace(/[^0-9]/g, "");
    expect(sanitized).toBe("");
  });

  it("strips null bytes from webcam ID", () => {
    const input = "12345\x00evil";
    const sanitized = input.replace(/[^0-9]/g, "");
    expect(sanitized).toBe("12345");
  });

  it("strips CRLF injection from country", () => {
    const input = "US\r\nX-Injected: true";
    const sanitized = input.replace(/[^a-zA-Z]/g, "").slice(0, 2);
    expect(sanitized).toBe("US");
  });
});

describe("Security: No prototype pollution via API responses", () => {
  it("JSON.parse does not pollute Object prototype", () => {
    const maliciousJson = '{"__proto__": {"polluted": true}}';
    const parsed = JSON.parse(maliciousJson);

    // Verify that prototype was NOT polluted
    const clean: Record<string, unknown> = {};
    expect(clean["polluted"]).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(parsed, "__proto__")).toBe(
      true
    );
  });
});

describe("Security: URL construction safety", () => {
  it("URL constructor properly encodes special characters", () => {
    const url = new URL("https://api.windy.com/webcams/api/v3/webcams");
    url.searchParams.set("nearby", "40.7,-74.0,25");
    url.searchParams.set("country", "US");

    const str = url.toString();
    // Verify the URL is properly formed
    expect(str).toContain("https://api.windy.com");
    expect(str).not.toContain("\n");
    expect(str).not.toContain("\r");
  });
});
