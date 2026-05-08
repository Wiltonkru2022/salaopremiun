type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function getPublicRateLimitIdentity(request: Request, scope: string) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) || "ua";
  return `${scope}:${ip}:${userAgent}`;
}

export function assertPublicRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = buckets.get(params.key);

  if (!current || current.resetAt <= now) {
    buckets.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return;
  }

  current.count += 1;
  buckets.set(params.key, current);

  if (current.count > params.limit) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }
}
