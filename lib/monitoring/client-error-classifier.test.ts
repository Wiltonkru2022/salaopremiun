import { describe, expect, it } from "vitest";
import {
  classifyClientRuntimeError,
  classifyStaticResourceFailure,
} from "@/lib/monitoring/client-error-classifier";

describe("client runtime error classification", () => {
  it("classifies React #418 as hydration, never as chunk failure", () => {
    const result = classifyClientRuntimeError({
      message:
        "Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]=",
    });

    expect(result.code).toBe("react_hydration_mismatch");
    expect(result.recoverAsset).toBe(false);
  });

  it("does not classify a generic runtime error as chunk merely because the stack file is a chunk", () => {
    const result = classifyClientRuntimeError({
      error: new Error("Cannot read properties of undefined"),
      message: "Cannot read properties of undefined",
    });

    expect(result.code).toBe("javascript_runtime_error");
  });

  it("classifies a real ChunkLoadError as recoverable asset failure", () => {
    const result = classifyClientRuntimeError({
      error: new Error("ChunkLoadError: Loading chunk 123 failed"),
    });

    expect(result.code).toBe("chunk_load_failed");
    expect(result.recoverAsset).toBe(true);
  });

  it("classifies a failed static resource as a chunk/asset failure", () => {
    const result = classifyStaticResourceFailure(
      "https://app.salaopremiun.com.br/_next/static/chunks/app-123.js"
    );

    expect(result?.code).toBe("chunk_load_failed");
  });
});
