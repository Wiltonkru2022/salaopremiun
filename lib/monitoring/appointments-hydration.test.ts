/** @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  formatHydrationSafeLocalDateTime,
  toDeterministicSalonLocalDateTime,
} from "@/lib/client-app/deterministic-date";

function RequestedAt({ value }: { value: string | null }) {
  const formatted = formatHydrationSafeLocalDateTime(value);
  return formatted
    ? React.createElement("span", null, `Solicitado em ${formatted}`)
    : null;
}

const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("App Cliente appointments hydration", () => {
  it.each(["America/Campo_Grande", "Asia/Tokyo"])(
    "keeps the first client render identical when browser timezone is %s",
    async (clientTimezone) => {
      process.env.TZ = "UTC";
      const deterministicValue = toDeterministicSalonLocalDateTime(
        "2026-08-19T12:17:43.000Z",
        "America/Campo_Grande"
      );
      const element = React.createElement(RequestedAt, {
        value: deterministicValue,
      });
      const serverHtml = renderToString(element);

      document.body.innerHTML = `<div id="root">${serverHtml}</div>`;
      const rootElement = document.getElementById("root");
      expect(rootElement).not.toBeNull();

      process.env.TZ = clientTimezone;
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const root = hydrateRoot(
        rootElement as HTMLElement,
        React.createElement(RequestedAt, { value: deterministicValue })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      const hydrationOutput = consoleError.mock.calls
        .flat()
        .map(String)
        .join(" ");
      expect(hydrationOutput).not.toMatch(
        /hydration|did not match|minified react error #418/i
      );
      expect(rootElement?.textContent).toBe(
        `Solicitado em ${formatHydrationSafeLocalDateTime(deterministicValue)}`
      );

      root.unmount();
    }
  );
});
