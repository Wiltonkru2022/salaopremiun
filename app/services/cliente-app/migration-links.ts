import crypto from "node:crypto";
import { runAdminOperation } from "@/lib/db/admin-ops";
import { htmlEscape, sendBrevoEmail } from "@/lib/email/brevo";
import { DOMINIO_APP } from "@/lib/proxy/domain-config";
import type { ClienteAppSession } from "@/lib/cliente-auth.server";
import {
  isValidCpf,
  normalizeClienteEmail,
  normalizeCpf,
  normalizeWhatsapp,
  parseClienteBirthDate,
} from "@/lib/client-app/identity";
import { getClienteAppPublicEmail, syncClienteAppLinksByIdentity } from "@/app/services/cliente-app/linking";
import { emitSecurityEvent } from "@/lib/security/security-events";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function baseUrl() {
  const root = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_MAIN_HOST || `https://${DOMINIO_APP}`;
  return root.startsWith("http") ? root.replace(/\/$/, "") : `https://${root.replace(/\/$/, "")}`;
}

function whatsappUrl(phoneInput: string, message: string) {
  let phone = normalizeWhatsapp(phoneInput);
  if (!phone) return null;
  if ((phone.length === 10 || phone.length === 11) && !phone.startsWith("55")) phone = `55${phone}`;
  if (phone.length < 12 || phone.length > 13) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function realEmail(value?: string | null) {
  const email = normalizeClienteEmail(value);
  if (!email) return "";
  return email.endsWith(".local") || email.includes("@telefone.salaopremium.local") ? "" : email;
}

export async function createClienteMigrationLink(params: {
  idSalao: string;
  idCliente: string;
  criadoPorUsuario?: string | null;
}) {
  const idSalao = String(params.idSalao || "").trim();
  const idCliente = String(params.idCliente || "").trim();
  if (!idSalao || !idCliente) return { ok: false as const, error: "Cliente inválido." };

  return runAdminOperation({
    action: "cliente_app_create_migration_link",
    actorId: params.criadoPorUsuario || "painel",
    idSalao,
    run: async (supabaseAdmin) => {
      const { data: client, error } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, whatsapp, telefone, email, cpf, data_nascimento")
        .eq("id", idCliente)
        .eq("id_salao", idSalao)
        .limit(1)
        .maybeSingle();
      if (error || !client?.id) return { ok: false as const, error: "Cliente não encontrado neste salão." };

      const { data: auth } = await supabaseAdmin
        .from("clientes_auth")
        .select("app_conta_id")
        .eq("id_salao", idSalao)
        .eq("id_cliente", idCliente)
        .limit(1)
        .maybeSingle();

      await supabaseAdmin
        .from("cliente_app_migracao_tokens")
        .update({ consumido_em: new Date().toISOString() })
        .eq("id_salao", idSalao)
        .eq("id_cliente", idCliente)
        .is("consumido_em", null);

      const token = crypto.randomBytes(32).toString("base64url");
      const insert = await supabaseAdmin.from("cliente_app_migracao_tokens").insert({
        id_salao: idSalao,
        id_cliente: idCliente,
        conta_id: auth?.app_conta_id || null,
        token_hash: hashToken(token),
        expira_em: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
        criado_por_usuario: params.criadoPorUsuario || null,
      });
      if (insert.error) return { ok: false as const, error: "Não foi possível gerar o link agora." };

      const link = `${baseUrl()}/app-cliente/atualizar-acesso/${encodeURIComponent(token)}`;
      const name = String(client.nome || "Cliente").trim() || "Cliente";
      const message = `Olá, ${name}! Estamos atualizando o acesso ao App Cliente. Agora o login será feito com CPF + data de nascimento. Atualize seus dados com segurança pelo link individual: ${link}\n\nO link é pessoal e temporário. Não encaminhe para outra pessoa.`;
      const phone = String(client.whatsapp || client.telefone || "");

      return {
        ok: true as const,
        link,
        whatsappUrl: whatsappUrl(phone, message),
        message,
        email: realEmail(client.email) || null,
        nome: name,
      };
    },
  });
}

export async function sendClienteMigrationEmail(params: {
  idSalao: string;
  idCliente: string;
  criadoPorUsuario?: string | null;
}) {
  const generated = await createClienteMigrationLink(params);
  if (!generated.ok) return generated;
  if (!generated.email) return { ok: false as const, error: "Este cliente não possui e-mail real cadastrado." };

  await sendBrevoEmail({
    from: process.env.PASSWORD_RECOVERY_EMAIL_FROM || "SalãoPremium <recuperar@salaopremiun.com.br>",
    to: generated.email,
    subject: "Atualize seu acesso ao App Cliente - SalãoPremium",
    text: `${generated.message}\n\nSe preferir, você também pode atualizar seu cadastro presencialmente no salão.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:28px;color:#18181b"><h1>Atualize seu acesso ao App Cliente</h1><p>Olá, ${htmlEscape(generated.nome)}!</p><p>O novo acesso usa <strong>CPF + data de nascimento</strong>.</p><a href="${htmlEscape(generated.link)}" style="display:inline-block;background:#18181b;color:white;padding:13px 18px;border-radius:14px;text-decoration:none;font-weight:700">Atualizar meu acesso</a><p style="margin-top:20px;color:#71717a">O link é pessoal, temporário e não deve ser encaminhado.</p></div>`,
  });

  return { ok: true as const, message: "E-mail de atualização enviado.", link: generated.link };
}

export async function completeClienteMigrationToken(params: {
  token: string;
  cpf: string;
  dataNascimento: string;
  whatsapp: string;
}): Promise<
  | { ok: true; session: ClienteAppSession }
  | { ok: false; error: string }
> {
  const tokenHash = hashToken(String(params.token || "").trim());
  const cpf = normalizeCpf(params.cpf);
  const birth = parseClienteBirthDate(params.dataNascimento);
  const whatsapp = normalizeWhatsapp(params.whatsapp);

  if (!isValidCpf(cpf)) return { ok: false, error: "Informe um CPF válido." };
  if (!birth) return { ok: false, error: "Informe uma data de nascimento válida." };
  if (whatsapp.length < 10 || whatsapp.length > 13) return { ok: false, error: "Informe um WhatsApp válido." };

  return runAdminOperation({
    action: "cliente_app_complete_migration_token",
    actorId: `migration:${tokenHash.slice(0, 16)}`,
    run: async (supabaseAdmin) => {
      const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from("cliente_app_migracao_tokens")
        .select("id, id_salao, id_cliente, conta_id, expira_em, consumido_em")
        .eq("token_hash", tokenHash)
        .limit(1)
        .maybeSingle();
      if (
        tokenError ||
        !tokenRow?.id ||
        tokenRow.consumido_em ||
        new Date(tokenRow.expira_em).getTime() < Date.now()
      ) {
        return { ok: false as const, error: "Este link é inválido, já foi usado ou expirou." };
      }

      const { data: client, error: clientError } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, email")
        .eq("id", tokenRow.id_cliente)
        .eq("id_salao", tokenRow.id_salao)
        .limit(1)
        .maybeSingle();
      if (clientError || !client?.id) return { ok: false as const, error: "Cliente não encontrado." };

      const { data: cpfAccount } = await supabaseAdmin
        .from("clientes_app_auth")
        .select("id, nome, email, auth_version, ativo")
        .eq("cpf", cpf)
        .limit(1)
        .maybeSingle();

      let accountId = String(tokenRow.conta_id || "").trim();
      if (cpfAccount?.id && accountId && cpfAccount.id !== accountId) {
        return { ok: false as const, error: "Este CPF já pertence a outra conta do App Cliente. Use Recuperar acesso." };
      }
      if (cpfAccount?.id) accountId = cpfAccount.id;

      let account: {
        id: string;
        nome: string | null;
        email: string | null;
        auth_version: number | null;
      } | null = null;

      if (accountId) {
        const { data: existing } = await supabaseAdmin
          .from("clientes_app_auth")
          .select("id, nome, email, auth_version, ativo, cpf")
          .eq("id", accountId)
          .limit(1)
          .maybeSingle();
        if (!existing?.id || existing.ativo === false) return { ok: false as const, error: "A conta vinculada não está disponível." };
        if (existing.cpf && normalizeCpf(existing.cpf) !== cpf) {
          return { ok: false as const, error: "Os dados informados não correspondem à conta vinculada." };
        }
        const next = Number(existing.auth_version || 1) + 1;
        const updated = await supabaseAdmin
          .from("clientes_app_auth")
          .update({
            cpf,
            data_nascimento: birth,
            whatsapp,
            telefone: whatsapp,
            migracao_identidade_concluida: true,
            auth_version: next,
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);
        if (updated.error) return { ok: false as const, error: "Não foi possível atualizar sua conta agora." };
        account = { id: accountId, nome: existing.nome, email: existing.email, auth_version: next };
      } else {
        const email = realEmail(client.email) || null;
        if (email) {
          const { data: emailOwner } = await supabaseAdmin
            .from("clientes_app_auth")
            .select("id")
            .eq("email", email)
            .limit(1)
            .maybeSingle();
          if (emailOwner?.id) accountId = emailOwner.id;
        }

        if (accountId) {
          const { data: existing } = await supabaseAdmin
            .from("clientes_app_auth")
            .select("id, nome, email, auth_version, ativo, cpf")
            .eq("id", accountId)
            .limit(1)
            .maybeSingle();
          if (!existing?.id || existing.ativo === false || (existing.cpf && normalizeCpf(existing.cpf) !== cpf)) {
            return { ok: false as const, error: "Já existe uma conta incompatível com os dados informados." };
          }
          const next = Number(existing.auth_version || 1) + 1;
          await supabaseAdmin
            .from("clientes_app_auth")
            .update({ cpf, data_nascimento: birth, whatsapp, telefone: whatsapp, migracao_identidade_concluida: true, auth_version: next })
            .eq("id", accountId);
          account = { id: accountId, nome: existing.nome, email: existing.email, auth_version: next };
        } else {
          const { data: created, error: createError } = await supabaseAdmin
            .from("clientes_app_auth")
            .insert({
              nome: String(client.nome || "").trim() || "Cliente SalãoPremium",
              email,
              telefone: whatsapp,
              whatsapp,
              cpf,
              data_nascimento: birth,
              senha_hash: null,
              auth_version: 1,
              migracao_identidade_concluida: true,
              ativo: true,
            })
            .select("id, nome, email, auth_version")
            .maybeSingle();
          if (createError || !created?.id) return { ok: false as const, error: "Não foi possível criar sua conta agora." };
          accountId = created.id;
          account = created;
        }
      }

      const clientUpdate = await supabaseAdmin
        .from("clientes")
        .update({ cpf, data_nascimento: birth, telefone: whatsapp, whatsapp, atualizado_em: new Date().toISOString() })
        .eq("id", tokenRow.id_cliente)
        .eq("id_salao", tokenRow.id_salao);
      if (clientUpdate.error) return { ok: false as const, error: "Não foi possível atualizar a ficha do salão." };

      const { data: authRow } = await supabaseAdmin
        .from("clientes_auth")
        .select("id")
        .eq("id_salao", tokenRow.id_salao)
        .eq("id_cliente", tokenRow.id_cliente)
        .limit(1)
        .maybeSingle();
      const linkPayload = {
        app_conta_id: accountId,
        email: getClienteAppPublicEmail(account?.email) || null,
        app_ativo: true,
        updated_at: new Date().toISOString(),
      };
      const linked = authRow?.id
        ? await supabaseAdmin.from("clientes_auth").update(linkPayload).eq("id", authRow.id)
        : await supabaseAdmin.from("clientes_auth").insert({
            id_salao: tokenRow.id_salao,
            id_cliente: tokenRow.id_cliente,
            senha_hash: null,
            ...linkPayload,
          });
      if (linked.error) return { ok: false as const, error: "Não foi possível ativar o acesso ao salão." };

      await supabaseAdmin
        .from("cliente_app_migracao_tokens")
        .update({ consumido_em: new Date().toISOString(), conta_id: accountId })
        .eq("id", tokenRow.id)
        .is("consumido_em", null);

      await syncClienteAppLinksByIdentity({ idConta: accountId });
      void emitSecurityEvent({
        evento: "cliente_app_identidade_migrada",
        tipoUsuario: "cliente",
        userId: accountId,
        idSalao: tokenRow.id_salao,
        origem: "cliente-app-migration-link",
        detalhes: { cpf_final: cpf.slice(-4) },
      });

      return {
        ok: true as const,
        session: {
          idConta: accountId,
          nome: String(account?.nome || client.nome || "").trim() || "Cliente SalãoPremium",
          email: getClienteAppPublicEmail(account?.email),
          whatsapp,
          telefone: whatsapp,
          authVersion: Number(account?.auth_version || 1),
          tipo: "cliente",
        },
      };
    },
  });
}
