import { beforeEach, describe, expect, it } from "vitest";
import { getCacheSavedAt, readCache, writeCache } from "./cache";

describe("professional cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists the value with a synchronization timestamp", () => {
    writeCache("agenda", { total: 3 });

    expect(readCache("agenda", { total: 0 })).toEqual({ total: 3 });
    expect(getCacheSavedAt("agenda")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it("uses stale cached data as an offline fallback", () => {
    localStorage.setItem(
      "salaopremiun.cache.agenda",
      JSON.stringify({
        value: { total: 2 },
        savedAt: "2026-08-13T10:00:00.000Z",
      })
    );

    expect(readCache("agenda", { total: 0 })).toEqual({ total: 2 });
    expect(getCacheSavedAt("agenda")).toBe("2026-08-13T10:00:00.000Z");
  });

  it("returns the fallback when the cache is invalid", () => {
    localStorage.setItem("salaopremiun.cache.agenda", "{invalid");

    expect(readCache("agenda", { total: 0 })).toEqual({ total: 0 });
    expect(getCacheSavedAt("agenda")).toBeNull();
  });
});
