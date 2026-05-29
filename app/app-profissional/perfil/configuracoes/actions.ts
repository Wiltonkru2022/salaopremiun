"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function checked(value: FormDataEntryValue | null) {
  return String(value || "") === "on" || String(value || "") === "true";
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function buildConfigUrl(key: "ok" | "erro", value: string) {
  const query = new URLSearchParams();
  query.set(key, value);
  return `/app-profissional/perfil/configuracoes?${query.toString()}`;
}

export async function salvarPixSinalProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();

  const sinalPixProprio = checked(formData.get("sinal_pix_proprio"));
  const sinalConfirmacaoResponsavel = String(
    formData.get("sinal_confirmacao_responsavel") || "profissional"
  ).trim();
  const pixTipo = String(formData.get("pix_tipo") || "").trim();
  const pixChave = String(formData.get("pix_chave") || "").trim();
  const recebedor = String(formData.get("sinal_pix_recebedor") || "").trim();
  const whatsapp = String(formData.get("sinal_whatsapp") || "")
    .replace(/\D/g, "")
    .trim();

  try {
    if (sinalPixProprio && !pixChave) {
      throw new Error("Informe a chave Pix para receber sinal no Pix proprio.");
    }

    if (!["salao", "profissional"].includes(sinalConfirmacaoResponsavel)) {
      throw new Error("Responsavel pela confirmacao do sinal invalido.");
    }

    await runAdminOperation({
      action: "app_profissional_configuracoes_salvar_pix_sinal",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("profissionais")
          .update({
            sinal_pix_proprio: sinalPixProprio,
            pix_tipo: pixTipo || null,
            pix_chave: pixChave || null,
            sinal_pix_recebedor: recebedor || null,
            sinal_whatsapp: whatsapp || null,
            sinal_confirmacao_responsavel: sinalConfirmacaoResponsavel,
          })
          .eq("id", session.idProfissional)
          .eq("id_salao", session.idSalao);

        if (error) throw new Error(error.message);
      },
    });

    revalidatePath("/app-profissional/perfil");
    revalidatePath("/app-profissional/perfil/configuracoes");
    revalidatePath("/app-profissional/agenda");
    redirect(buildConfigUrl("ok", "Pix do sinal salvo."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao salvar Pix do sinal.";
    redirect(buildConfigUrl("erro", message));
  }
}
