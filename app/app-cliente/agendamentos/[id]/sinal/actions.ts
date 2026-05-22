"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeWhatsapp(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export async function enviarComprovanteSinalAction(formData: FormData) {
  const session = await requireClienteAppContext();
  const idAgendamento = String(formData.get("agendamento") || "").trim();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: row } = await (supabaseAdmin as any)
    .from("agendamentos")
    .select("id, cliente_id, id_salao, sinal_whatsapp, sinal_mensagem_comprovante")
    .eq("id", idAgendamento)
    .maybeSingle();

  if (!row?.id) {
    redirect("/app-cliente/agendamentos?status=sinal_erro");
  }

  const { data: vinculo } = await (supabaseAdmin as any)
    .from("clientes_auth")
    .select("id_cliente")
    .eq("id_cliente", row.cliente_id)
    .eq("app_conta_id", session.idConta)
    .maybeSingle();

  if (!vinculo?.id_cliente) {
    redirect("/app-cliente/agendamentos?status=sinal_erro");
  }

  await (supabaseAdmin as any)
    .from("agendamentos")
    .update({
      status: "aguardando_confirmacao_salao",
      sinal_status: "comprovante_enviado",
      sinal_comprovante_enviado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", idAgendamento);

  revalidatePath("/app-cliente/agendamentos");
  const phone = normalizeWhatsapp(row.sinal_whatsapp);
  const message =
    String(row.sinal_mensagem_comprovante || "").trim() ||
    "Olá, fiz o pagamento do sinal do meu agendamento. Segue o comprovante.";
  redirect(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : "/app-cliente/agendamentos");
}
