import { timingSafeEqual } from "crypto";

function normalizeSecret(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function verifyHeaderSecret(
  headerValue: string | null,
  expectedSecret?: string | null
) {
  const received = normalizeSecret(headerValue);
  const expected = normalizeSecret(expectedSecret);

  if (!received || !expected) {
    return false;
  }

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifyBearerSecret(
  authorizationHeader: string | null,
  expectedSecret?: string | null
) {
  const header = String(authorizationHeader || "").trim();

  if (!header.toLowerCase().startsWith("bearer ")) {
    return false;
  }

  return verifyHeaderSecret(header.slice("bearer ".length), expectedSecret);
}
