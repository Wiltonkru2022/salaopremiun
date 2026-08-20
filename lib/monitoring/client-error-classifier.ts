export type ClientRuntimeErrorCode =
  | "react_hydration_mismatch"
  | "chunk_load_failed"
  | "stale_service_worker"
  | "asset_version_mismatch"
  | "network_error"
  | "javascript_runtime_error";

export type ClientRuntimeErrorClassification = {
  code: ClientRuntimeErrorCode;
  category: "render" | "asset" | "network" | "runtime";
  recoverAsset: boolean;
};

function errorText(value: unknown) {
  if (value instanceof Error) {
    return `${value.name} ${value.message} ${value.stack || ""}`;
  }
  return String(value || "");
}

export function isNextStaticAssetUrl(value: unknown) {
  const text = String(value || "");
  return /\/_next\/static\/(?:chunks|css|media)\//i.test(text);
}

export function classifyClientRuntimeError(input: {
  error?: unknown;
  message?: unknown;
}): ClientRuntimeErrorClassification {
  const text = `${errorText(input.error)} ${String(input.message || "")}`.trim();

  if (
    /Minified React error #418\b/i.test(text) ||
    /hydration (?:failed|mismatch)/i.test(text) ||
    /server rendered HTML.*client/i.test(text) ||
    /text content does not match/i.test(text)
  ) {
    return {
      code: "react_hydration_mismatch",
      category: "render",
      recoverAsset: false,
    };
  }

  if (
    /stale service worker/i.test(text) ||
    /service worker.*(?:old|stale|outdated).*(?:chunk|asset)/i.test(text)
  ) {
    return {
      code: "stale_service_worker",
      category: "asset",
      recoverAsset: true,
    };
  }

  if (
    /asset version mismatch/i.test(text) ||
    /build(?:-| )?id mismatch/i.test(text) ||
    /deployment version mismatch/i.test(text)
  ) {
    return {
      code: "asset_version_mismatch",
      category: "asset",
      recoverAsset: true,
    };
  }

  if (
    /ChunkLoadError/i.test(text) ||
    /Loading chunk .* failed/i.test(text) ||
    /failed to load chunk/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    /Importing a module script failed/i.test(text)
  ) {
    return {
      code: "chunk_load_failed",
      category: "asset",
      recoverAsset: true,
    };
  }

  if (/failed to fetch|networkerror|network request failed|ERR_NETWORK/i.test(text)) {
    return {
      code: "network_error",
      category: "network",
      recoverAsset: false,
    };
  }

  return {
    code: "javascript_runtime_error",
    category: "runtime",
    recoverAsset: false,
  };
}

export function classifyStaticResourceFailure(source: unknown) {
  return isNextStaticAssetUrl(source)
    ? ({
        code: "chunk_load_failed",
        category: "asset",
        recoverAsset: true,
      } satisfies ClientRuntimeErrorClassification)
    : null;
}
