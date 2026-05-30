"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const COMPROVANTES_BUCKET = "agendamento-comprovantes";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf"]);

function getExtension(file: File) {
  const name = file.name || "";
  const byName = name.includes(".") ? name.split(".").pop() || "" : "";
  if (byName) return byName.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return file.type.split("/")[1] || "jpg";
  return "bin";
}

export async function enviarComprovanteSinalAction(formData: FormData) {
  const session = await requireClienteAppContext();
  const idAgendamento = String(formData.get("agendamento") || "").trim();
  const file = formData.get("comprovante");
  const supabaseAdmin = getSupabaseAdmin();

  const { data: row } = await (supabaseAdmin as any)
    .from("agendamentos")
    .select("id, cliente_id, id_salao, sinal_confirmacao_responsavel")
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

  if (!(file instanceof File) || file.size <= 0) {
    redirect(`/app-cliente/agendamentos/${idAgendamento}/sinal?erro=arquivo`);
  }

  if (file.size > MAX_FILE_SIZE) {
    redirect(`/app-cliente/agendamentos/${idAgendamento}/sinal?erro=tamanho`);
  }

  const type = file.type || "application/octet-stream";
  if (!type.startsWith("image/") && !ALLOWED_TYPES.has(type)) {
    redirect(`/app-cliente/agendamentos/${idAgendamento}/sinal?erro=tipo`);
  }

  const extension = getExtension(file);
  const storagePath = `${row.id_salao}/${idAgendamento}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error: uploadError } = await (supabaseAdmin as any).storage
    .from(COMPROVANTES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: type,
      upsert: false,
    });

  if (uploadError) {
    redirect(`/app-cliente/agendamentos/${idAgendamento}/sinal?erro=upload`);
  }

  await (supabaseAdmin as any)
    .from("agendamentos")
    .update({
      status:
        String(row.sinal_confirmacao_responsavel || "") === "profissional"
          ? "aguardando_confirmacao_profissional"
          : "aguardando_confirmacao_salao",
      sinal_status: "comprovante_enviado",
      sinal_comprovante_path: storagePath,
      sinal_comprovante_nome: file.name || "comprovante",
      sinal_comprovante_tipo: type,
      sinal_comprovante_enviado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", idAgendamento);

  revalidatePath("/app-cliente/agendamentos");
  revalidatePath(`/app-cliente/agendamentos/${idAgendamento}/sinal`);
  redirect("/app-cliente/agendamentos?status=comprovante_enviado");
}
