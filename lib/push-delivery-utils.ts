export type PushFailureCategory =
  | "expired"
  | "authentication"
  | "rate_limit"
  | "provider"
  | "network"
  | "client";

export type PushFailurePolicy = {
  category: PushFailureCategory;
  retryable: boolean;
  deactivateSubscription: boolean;
};

export function classifyPushFailure(statusCode?: number | null): PushFailurePolicy {
  const status = Number(statusCode || 0);

  if (status === 404 || status === 410) {
    return {
      category: "expired",
      retryable: false,
      deactivateSubscription: true,
    };
  }

  if (status === 401 || status === 403) {
    return {
      category: "authentication",
      retryable: false,
      deactivateSubscription: false,
    };
  }

  if (status === 429) {
    return {
      category: "rate_limit",
      retryable: true,
      deactivateSubscription: false,
    };
  }

  if (status >= 500) {
    return {
      category: "provider",
      retryable: true,
      deactivateSubscription: false,
    };
  }

  if (status === 0) {
    return {
      category: "network",
      retryable: true,
      deactivateSubscription: false,
    };
  }

  return {
    category: "client",
    retryable: false,
    deactivateSubscription: false,
  };
}

export function getPushRetryDelayMs(attempt: number) {
  const normalizedAttempt = Math.max(1, Math.min(Math.trunc(attempt || 1), 4));
  return 250 * 2 ** (normalizedAttempt - 1);
}

export function getPushEndpointHost(endpoint: string) {
  try {
    return new URL(endpoint).host || null;
  } catch {
    return null;
  }
}
