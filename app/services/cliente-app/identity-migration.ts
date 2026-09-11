import { runAdminOperation } from "@/lib/supabase/admin-ops";
import type { ClienteAppSession } from "@/lib/cliente-auth.server";
import {
  isValidCpf,
  normalizeCpf,
  normalizeWhatsapp,
  parseClienteBirthDate,
} from "@/lib/client-app/identity";
import { getClienteAppPublicEmail, syncClienteAppLinksByIdentity } from "@/app/services/cliente-app/linking";
import { emitSecurityEvent } from "@/lib/security/security-events";

export type CompleteClienteIdentityResult =
  | { ok: true; session: ClienteAppSession }
  | { ok: false; error: string };

export async function completeClienteIdentityMigration(params: {
  idConta: string;
  cpf: string;
  dataNascimento: string;
  whatsapp: string;
}): Promise<CompleteClienteIdentityResult> {
  const idConta = String(params.idConta || "").trim();
  const cpf = normalizeCpf(params.cpf);
  const dataNascimento = parseClienteBirthDate(params.dataNascimento);
  const whatsapp = normalizeWhatsapp(params.whatsapp);

  if (!idConta) return { ok: false, error: "Não foi possível identificar sua conta." };
  if (!isValidCpf(cpf)) return { ok: false, error: "Informe um CPF válido." };
  if (!dataNascimento) return { ok: false, error: "Informe uma data de nascimento válida." };
  if (whatsapp.length < 10 || whatsapp.length > 13) return { ok: false, error: "Informe um WhatsApp válido." };

  return runAdminOperation({
    action: "cliente_app_complete_identity_migration",
    actorId: idConta,
    run: async (supabaseAdmin): Promise<CompleteClienteIdentityResult> => {
      const { data: current, error: currentError } = await supabaseAdmin
        .from("clientes_app_auth")
        .select("id, nome, email, ativo, auth_version")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();
      if (currentError || !current?.id || current.ativo === false) {
        return { ok: false, error: "Sua conta não está disponível agora." };
      }

      const { data: duplicateRows, error: duplicateError } = await supabaseAdmin
        .from("clientes_app_auth")
        .select("id")
        .eq("cpf", cpf)
        .neq("id", idConta)
        .limit(1);
      if (duplicateError) return { ok: false, error: "Não foi possível validar o CPF agora." };
      if (duplicateRows?.length) {
        return { ok: false, error: "Este CPF já pertence a outra conta do App Cliente. Use Recuperar acesso." };
      }

      const nextAuthVersion = Number(current.auth_version || 1) + 1;
      const updateResult = await supabaseAdmin
        .from("clientes_app_auth")
        .update({
          cpf,
          data_nascimento: dataNascimento,
          whatsapp,
          telefone: whatsapp,
          migracao_identidade_concluida: true,
          auth_version: nextAuthVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idConta);
      if (updateResult.error) return { ok: false, error: "Não foi possível concluir a atualização do acesso." };

      await syncClienteAppLinksByIdentity({ idConta });

      const { data: links } = await supabaseAdmin
        .from("clientes_auth")
        .select("id_cliente, id_salao")
        .eq("app_conta_id", idConta);

      for (const link of links || []) {
        if (!link.id_cliente || !link.id_salao) continue;
        await supabaseAdmin
          .from("clientes")
          .update({
            cpf,
            data_nascimento: dataNascimento,
            telefone: whatsapp,
            whatsapp,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", link.id_cliente)
          .eq("id_salao", link.id_salao);
      }

      void emitSecurityEvent({
        evento: "cliente_app_identidade_migrada",
        tipoUsuario: "cliente",
        userId: idConta,
        origem: "cliente-app",
        detalhes: { cpf_final: cpf.slice(-4) },
      });

      return {
        ok: true,
        session: {
          idConta,
          nome: String(current.nome || "").trim() || "Cliente SalãoPremium",
          email: getClienteAppPublicEmail(current.email),
          whatsapp,
          telefone: whatsapp,
          authVersion: nextAuthVersion,
          tipo: "cliente",
        },
      };
    },
  });
}
