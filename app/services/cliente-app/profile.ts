import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { clearClienteSession, createClienteSession } from "@/lib/cliente-auth.server";
import { getClienteAppPublicEmail, syncClienteAppLinksByIdentity } from "@/app/services/cliente-app/linking";
import { normalizeClienteEmail, normalizeWhatsapp } from "@/lib/client-app/identity";

type UpdateClienteProfileParams = {
  idConta: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  preferencias?: string | null;
};

export type ClienteProfileActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function updateClienteAppProfile(
  params: UpdateClienteProfileParams
): Promise<ClienteProfileActionResult> {
  const idConta = String(params.idConta || "").trim();
  const nome = String(params.nome || "").trim().replace(/\s+/g, " ");
  const whatsapp = normalizeWhatsapp(params.telefone);
  const requestedEmail = normalizeClienteEmail(params.email);
  const preferencias = String(params.preferencias || "").trim() || null;

  if (!idConta) return { ok: false, error: "Não foi possível identificar a conta do cliente." };
  if (!nome) return { ok: false, error: "Informe seu nome." };
  if (!whatsapp) return { ok: false, error: "Informe seu WhatsApp." };

  return runAdminOperation({
    action: "cliente_app_update_profile_global",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const { data: account, error } = await supabaseAdmin
        .from("clientes_app_auth")
        .select("id, email, auth_version")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();
      if (error || !account?.id) return { ok: false as const, error: "Não foi possível localizar sua conta do app." };

      const currentEmail = getClienteAppPublicEmail(account.email);
      if (requestedEmail && requestedEmail !== currentEmail) {
        return {
          ok: false as const,
          error: "Para alterar o e-mail, use a opção Alterar e-mail e confirme o código enviado ao novo endereço.",
        };
      }

      const updated = await supabaseAdmin
        .from("clientes_app_auth")
        .update({
          nome,
          whatsapp,
          telefone: whatsapp,
          preferencias_gerais: preferencias,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idConta);
      if (updated.error) return { ok: false as const, error: "Não foi possível salvar seu perfil agora." };

      const { data: links } = await supabaseAdmin
        .from("clientes_auth")
        .select("id_cliente, id_salao")
        .eq("app_conta_id", idConta);
      for (const link of links || []) {
        if (!link.id_cliente || !link.id_salao) continue;
        await supabaseAdmin
          .from("clientes")
          .update({
            nome,
            telefone: whatsapp,
            whatsapp,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", link.id_cliente)
          .eq("id_salao", link.id_salao);
      }

      await syncClienteAppLinksByIdentity({ idConta });
      await createClienteSession({
        idConta,
        nome,
        email: currentEmail,
        whatsapp,
        telefone: whatsapp,
        authVersion: Number(account.auth_version || 1),
        tipo: "cliente",
      });

      return { ok: true as const, message: "Perfil atualizado com sucesso." };
    },
  });
}

export async function deleteClienteAppAccount(params: {
  idConta: string;
}): Promise<ClienteProfileActionResult> {
  const idConta = String(params.idConta || "").trim();
  if (!idConta) return { ok: false, error: "Não foi possível identificar a conta do cliente." };

  return runAdminOperation({
    action: "cliente_app_delete_account",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const { data: links, error } = await supabaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente, id_salao")
        .eq("app_conta_id", idConta);
      if (error) return { ok: false as const, error: "Não foi possível carregar seus vínculos agora." };

      const today = new Date().toISOString().slice(0, 10);
      for (const link of links || []) {
        if (!link.id_cliente || !link.id_salao) continue;
        await supabaseAdmin
          .from("agendamentos")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
            observacoes: "Cancelado por encerramento da conta do app cliente.",
          })
          .eq("id_salao", link.id_salao)
          .eq("cliente_id", link.id_cliente)
          .gte("data", today)
          .in("status", ["pendente", "confirmado"]);
      }

      const authUpdate = await supabaseAdmin
        .from("clientes_auth")
        .update({ app_ativo: false, app_conta_id: null, updated_at: new Date().toISOString() })
        .eq("app_conta_id", idConta);
      const deleteAccount = await supabaseAdmin.from("clientes_app_auth").delete().eq("id", idConta);
      if (authUpdate.error || deleteAccount.error) {
        return { ok: false as const, error: "Não foi possível encerrar sua conta agora." };
      }

      await clearClienteSession();
      return { ok: true as const, message: "Conta encerrada com sucesso." };
    },
  });
}
