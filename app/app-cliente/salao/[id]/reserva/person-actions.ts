"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  bookingPersonCookieName,
  serializeBookingPersonSelection,
} from "@/lib/client-app/booking-person-selection";

function normalizeReturnQuery(formData: FormData) {
  const params = new URLSearchParams();
  const cupom = String(formData.get("cupom") || "").trim().toUpperCase();
  const campanha = String(formData.get("campanha") || "").trim();
  if (cupom) params.set("cupom", cupom);
  if (campanha) params.set("campanha", campanha);
  return params;
}

export async function selectBookingPersonAction(formData: FormData) {
  const idSalao = String(formData.get("salao") || "").trim();
  const tipo = String(formData.get("pessoa_tipo") || "mim") === "outra_pessoa"
    ? "outra_pessoa"
    : "mim";
  const nome = String(formData.get("pessoa_nome") || "").trim().replace(/\s+/g, " ");
  const whatsapp = String(formData.get("pessoa_whatsapp") || "").replace(/\D/g, "");
  const query = normalizeReturnQuery(formData);

  if (!idSalao) redirect("/app-cliente/explorar");

  if (tipo === "outra_pessoa" && (nome.length < 2 || whatsapp.length < 10 || whatsapp.length > 13)) {
    query.set("pessoa_erro", "1");
    redirect(`/app-cliente/salao/${encodeURIComponent(idSalao)}/reserva?${query.toString()}`);
  }

  const store = await cookies();
  store.set(
    bookingPersonCookieName(idSalao),
    serializeBookingPersonSelection({
      tipo,
      nome: tipo === "outra_pessoa" ? nome : null,
      whatsapp: tipo === "outra_pessoa" ? whatsapp : null,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    }
  );

  redirect(
    `/app-cliente/salao/${encodeURIComponent(idSalao)}/reserva${
      query.size ? `?${query.toString()}` : ""
    }`
  );
}

export async function resetBookingPersonAction(formData: FormData) {
  const idSalao = String(formData.get("salao") || "").trim();
  const query = normalizeReturnQuery(formData);
  if (!idSalao) redirect("/app-cliente/explorar");

  const store = await cookies();
  store.delete(bookingPersonCookieName(idSalao));
  redirect(
    `/app-cliente/salao/${encodeURIComponent(idSalao)}/reserva${
      query.size ? `?${query.toString()}` : ""
    }`
  );
}
