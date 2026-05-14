import { createHmac, timingSafeEqual } from "node:crypto";
import { getGoogleCalendarEnv } from "@/lib/google-calendar/oauth";

export type GoogleCalendarOAuthState = {
  idSalao: string;
  returnTo: string;
  exp: number;
  nonce: string;
};

function getStateSecret() {
  return (
    process.env.GOOGLE_CALENDAR_STATE_SECRET ||
    getGoogleCalendarEnv().clientSecret ||
    process.env.CRON_SECRET ||
    ""
  );
}

function signPayload(payload: string) {
  const secret = getStateSecret();
  if (!secret) {
    throw new Error("GOOGLE_CALENDAR_STATE_SECRET não configurado.");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createGoogleCalendarState(params: {
  idSalao: string;
  returnTo?: string;
}) {
  const payload: GoogleCalendarOAuthState = {
    idSalao: params.idSalao,
    returnTo: params.returnTo || "/perfil-salao?google_calendar=connected",
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyGoogleCalendarState(value: string | null) {
  if (!value) return null;

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8")
  ) as GoogleCalendarOAuthState;

  if (!payload.idSalao || Number(payload.exp || 0) < Date.now()) {
    return null;
  }

  return payload;
}
