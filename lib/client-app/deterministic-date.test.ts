import { afterEach, describe, expect, it } from "vitest";
import {
  formatHydrationSafeLocalDateTime,
  toDeterministicSalonLocalDateTime,
} from "@/lib/client-app/deterministic-date";

const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe("hydration-safe appointment timestamps", () => {
  it("converts the instant to the canonical salon timezone", () => {
    expect(
      toDeterministicSalonLocalDateTime(
        "2026-08-19T15:17:43.000Z",
        "America/Campo_Grande"
      )
    ).toBe("2026-08-19T11:17:43");
  });

  it("renders identical text with SSR in UTC and browser in Campo Grande", () => {
    const stable = toDeterministicSalonLocalDateTime(
      "2026-08-19T15:17:43.000Z",
      "America/Campo_Grande"
    );

    process.env.TZ = "UTC";
    const serverText = formatHydrationSafeLocalDateTime(stable);
    process.env.TZ = "America/Campo_Grande";
    const clientText = formatHydrationSafeLocalDateTime(stable);

    expect(serverText).toBe(clientText);
    expect(clientText).toContain("19/08/2026");
  });

  it("renders identical text in a second browser timezone", () => {
    const stable = toDeterministicSalonLocalDateTime(
      "2026-08-19T15:17:43.000Z",
      "America/Campo_Grande"
    );

    process.env.TZ = "UTC";
    const serverText = formatHydrationSafeLocalDateTime(stable);
    process.env.TZ = "Asia/Tokyo";
    const otherBrowserText = formatHydrationSafeLocalDateTime(stable);

    expect(serverText).toBe(otherBrowserText);
  });
});
