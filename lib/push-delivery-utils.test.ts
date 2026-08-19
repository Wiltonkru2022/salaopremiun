import { describe, expect, it } from "vitest";
import {
  classifyPushFailure,
  getPushEndpointHost,
  getPushRetryDelayMs,
} from "@/lib/push-delivery-utils";

describe("classifyPushFailure", () => {
  it("desativa somente subscriptions expiradas", () => {
    expect(classifyPushFailure(404)).toMatchObject({
      category: "expired",
      retryable: false,
      deactivateSubscription: true,
    });
    expect(classifyPushFailure(410)).toMatchObject({
      category: "expired",
      retryable: false,
      deactivateSubscription: true,
    });
  });

  it("mantem subscription ativa em erro VAPID/autenticacao", () => {
    expect(classifyPushFailure(401)).toMatchObject({
      category: "authentication",
      retryable: false,
      deactivateSubscription: false,
    });
    expect(classifyPushFailure(403)).toMatchObject({
      category: "authentication",
      retryable: false,
      deactivateSubscription: false,
    });
  });

  it("faz retry para rate limit, indisponibilidade e erro de rede", () => {
    expect(classifyPushFailure(429).retryable).toBe(true);
    expect(classifyPushFailure(500).retryable).toBe(true);
    expect(classifyPushFailure(503).retryable).toBe(true);
    expect(classifyPushFailure(0).retryable).toBe(true);
  });

  it("nao faz retry automatico para erro 4xx comum", () => {
    expect(classifyPushFailure(400)).toMatchObject({
      category: "client",
      retryable: false,
      deactivateSubscription: false,
    });
  });
});

describe("getPushRetryDelayMs", () => {
  it("usa backoff exponencial curto e limitado", () => {
    expect(getPushRetryDelayMs(1)).toBe(250);
    expect(getPushRetryDelayMs(2)).toBe(500);
    expect(getPushRetryDelayMs(3)).toBe(1000);
    expect(getPushRetryDelayMs(4)).toBe(2000);
    expect(getPushRetryDelayMs(99)).toBe(2000);
  });
});

describe("getPushEndpointHost", () => {
  it("extrai somente o host do endpoint", () => {
    expect(getPushEndpointHost("https://fcm.googleapis.com/fcm/send/abc")).toBe(
      "fcm.googleapis.com"
    );
    expect(getPushEndpointHost("https://web.push.apple.com/Q123")).toBe(
      "web.push.apple.com"
    );
  });

  it("retorna null para endpoint invalido", () => {
    expect(getPushEndpointHost("nao-e-url")).toBeNull();
  });
});
