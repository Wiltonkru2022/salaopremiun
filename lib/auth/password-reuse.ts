import crypto from "crypto";

export function buildSalonPasswordReuseHash(params: {
  idSalao: string;
  password: string;
}) {
  const secret = process.env.PASSWORD_REUSE_SECRET;

  if (!secret) {
    throw new Error("PASSWORD_REUSE_SECRET não configurado.");
  }

  const normalizedPassword = String(params.password || "").trim();

  return crypto
    .createHmac("sha256", `${secret}:${params.idSalao}`)
    .update(normalizedPassword)
    .digest("hex");
}