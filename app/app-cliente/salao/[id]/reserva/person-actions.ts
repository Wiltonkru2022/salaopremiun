"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  bookingPersonCookieName,
  normalizeBookingPersonSelection,
  serializeBookingPersonSelection,
} from "@/lib/client-app/booking-person-selection";

function safeReservaPath(idSalao: string) {
  return `/app-cliente/salao/${encodeURIComponent(idSalao)}/reserva`;
}

export async function selectBookingPersonAction(formData: FormData) {
  const idSalao = String(formData.get("salao") || "").trim();
  const selection = normalizeBookingPersonSelection({
    tipo: String(formData.get("pessoa_tipo") || "mim"),
    nome: String(formData.get("pessoa_nome") || ""),
    whatsapp: String(formData.get("pessoa_whatsapp") || ""),
  });

  if (!idSalao || !selection) {
    redirect(`${safeReservaPath(idSalao)}?pessoa_erro=1`);
  }

  const store = await cookies();
  store.set(bookingPersonCookieName(idSalao), serializeBookingPersonSelection(selection), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: safeReservaPath(idSalao),
    maxAge: 60 * 60,
  });

  redirect(safeReservaPath(idSalao));
}

export async function resetBookingPersonAction(formData: FormData) {
  const idSalao = String(formData.get("salao") || "").trim();
  if (idSalao) {
    const store = await cookies();
    store.delete(bookingPersonCookieName(idSalao));
  }
  redirect(safeReservaPath(idSalao));
}
