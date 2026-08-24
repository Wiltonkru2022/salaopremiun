import "server-only";

import { normalizeWhatsapp } from "@/lib/client-app/identity";

export type ClientBookingPersonSelection =
  | { tipo: "mim"; nome: null; whatsapp: null }
  | { tipo: "outra_pessoa"; nome: string; whatsapp: string };

export function bookingPersonCookieName(idSalao: string) {
  return `sp_booking_person_${String(idSalao || "").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function normalizeBookingPersonSelection(params: {
  tipo?: string | null;
  nome?: string | null;
  whatsapp?: string | null;
}): ClientBookingPersonSelection | null {
  if (String(params.tipo || "") !== "outra_pessoa") {
    return { tipo: "mim", nome: null, whatsapp: null };
  }

  const nome = String(params.nome || "").trim().replace(/\s+/g, " ");
  const whatsapp = normalizeWhatsapp(params.whatsapp);
  if (nome.length < 2 || whatsapp.length < 10 || whatsapp.length > 13) return null;

  return { tipo: "outra_pessoa", nome, whatsapp };
}

export function serializeBookingPersonSelection(value: ClientBookingPersonSelection) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseBookingPersonSelection(
  raw: string | null | undefined
): ClientBookingPersonSelection | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      tipo?: string;
      nome?: string | null;
      whatsapp?: string | null;
    };
    return normalizeBookingPersonSelection(value);
  } catch {
    return null;
  }
}
