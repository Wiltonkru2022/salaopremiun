"use server";

import { runAdminOperation } from "@/lib/supabase/admin-ops";
import type { Json } from "@/types/database.generated";

export type RecuperarSenhaProfissionalState = {
  ok: boolean;
  message: string | null;
};

function normalizeCpf(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function normalizeText(value: unknown, max = 240) {
  return String(value || "").trim().slice(0, max);
}

export async function solicitarRecuperacaoSenhaProfissionalAction(
  _prevState: RecuperarSenhaProfissionalState,
  formData: FormData
): Promise<RecuperarSenhaProfissionalState> {
  const cpf = normalizeCpf(String(formData.get("cpf") || ""));
  const contato = normalizeText(formData.get("contato"), 120);

  if (cpf.length !== 11) {
    return {
      ok: false,
      message: "Informe um CPF valido.",
    };
  }

  await runAdminOperation({
    action: "profissional_solicitar_recuperacao_senha",
    run: async (supabase) => {
      const { data: profissional } = await supabase
        .from("profissionais")
        .select("id, id_salao, nome, nome_exibicao, email, cpf")
        .eq("cpf", cpf)
        .maybeSingle();

      if (!profissional?.id_salao) {
        return;
      }

      const now = new Date().toISOString();
      const nome =
        normalizeText(profissional.nome_exibicao) ||
        normalizeText(profissional.nome) ||
        "Profissional";

      const { data: ticket } = await supabase
        .from("tickets")
        .insert({
          id_salao: profissional.id_salao,
          assunto: "Recuperacao de senha do profissional",
          categoria: "acesso",
          prioridade: "media",
          status: "aberto",
          origem: "app_profissional_login",
          solicitante_nome: nome,
          solicitante_email: normalizeText(profissional.email) || null,
          origem_contexto: {
            id_profissional: profissional.id,
            cpf_final: cpf.slice(-4),
            contato_informado: contato || null,
          } as Json,
          ultima_interacao_em: now,
          atualizado_em: now,
          sla_limite_em: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select("id")
        .single();

      if (ticket?.id) {
        await supabase.from("ticket_mensagens").insert({
          id_ticket: ticket.id,
          autor_tipo: "profissional",
          autor_nome: nome,
          mensagem:
            "Profissional solicitou recuperacao de senha pela tela de login do app.",
          interna: false,
          id_profissional: profissional.id,
        });
      }
    },
  });

  return {
    ok: true,
    message:
      "Se o CPF estiver cadastrado, o pedido foi enviado ao suporte do salao para redefinir seu acesso.",
  };
}
