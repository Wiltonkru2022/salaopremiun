import crypto from "node:crypto";
import { runAdminOperation } from "@/lib/db/admin-ops";
import { htmlEscape, sendBrevoEmail } from "@/lib/email/brevo";
import type { ClienteAppSession } from "@/lib/cliente-auth.server";
import {
  isValidCpf,
  normalizeClienteEmail,
  normalizeCpf,
  normalizeWhatsapp,
  parseClienteBirthDate,
} from "@/lib/client-app/identity";
import { getClienteAppPublicEmail } from "@/app/services/cliente-app/linking";
import { emitSecurityEvent } from "@/lib/security/security-events";

type RecoveryPurpose =
  | "recuperar_acesso_email"
  | "recuperar_acesso_identidade"
  | "alterar_email"
  | "verificar_email_cadastro";

type BasicResult = { ok: true; message: string } | { ok: false; error: string };
type SessionResult =
  | { ok: true; message: string; session: ClienteAppSession }
  | { ok: false; error: string };
type IdentityStartResult =
  | { ok: true; token: string; message: string }
  | { ok: false; error: string };

type AccountRow = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  auth_version: number | null;
  ativo: boolean | null;
};

const GENERIC_REQUEST_MESSAGE =
  "Se os dados estiverem vinculados a uma conta válida, enviaremos um código.";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;


function formatCpfForLegacyStorage(value: string) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function normalizeStoredBirthDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];

  return parseClienteBirthDate(raw) || "";
}

async function findRecoveryAccountByCpf(databaseAdmin: any, cpfInput: string) {
  const cpf = normalizeCpf(cpfInput);
  if (!cpf) return null;

  const exact = await databaseAdmin
    .from("clientes_app_auth")
    .select("id, data_nascimento, ativo")
    .eq("cpf", cpf)
    .limit(1)
    .maybeSingle();

  if (!exact.error && exact.data?.id) return exact.data;

  const legacyCpf = formatCpfForLegacyStorage(cpf);
  if (!legacyCpf || legacyCpf === cpf) return null;

  const legacy = await databaseAdmin
    .from("clientes_app_auth")
    .select("id, data_nascimento, ativo")
    .eq("cpf", legacyCpf)
    .limit(1)
    .maybeSingle();

  if (legacy.error || !legacy.data?.id) return null;
  return legacy.data;
}


function secret() {
  const value =
    process.env.CLIENT_APP_RECOVERY_SECRET ||
    process.env.CLIENTE_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET;
  if (!value) throw new Error("CLIENT_APP_RECOVERY_SECRET ausente.");
  return value;
}

function hmac(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function hashMetadata(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized ? hmac(normalized) : null;
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function buildSession(account: AccountRow, authVersion?: number): ClienteAppSession {
  const whatsapp = normalizeWhatsapp(account.whatsapp || account.telefone);
  return {
    idConta: account.id,
    nome: String(account.nome || "").trim() || "Cliente SalãoPremium",
    email: getClienteAppPublicEmail(account.email),
    whatsapp: whatsapp || null,
    telefone: whatsapp || null,
    authVersion: Number(authVersion || account.auth_version || 1),
    tipo: "cliente",
  };
}

function buildIdentityToken(accountId: string, purpose: "recover" | "change-email") {
  const payload = Buffer.from(
    JSON.stringify({ accountId, purpose, exp: Date.now() + 15 * 60 * 1000 }),
    "utf8"
  ).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

function parseIdentityToken(token: string, expectedPurpose: "recover" | "change-email") {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      accountId?: string;
      purpose?: string;
      exp?: number;
    };
    if (!parsed.accountId || parsed.purpose !== expectedPurpose || Number(parsed.exp || 0) < Date.now()) return null;
    return parsed.accountId;
  } catch {
    return null;
  }
}

async function sendCodeEmail(params: { to: string; code: string; title: string }) {
  await sendBrevoEmail({
    from:
      process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
      "SalãoPremium <recuperar@salaopremiun.com.br>",
    to: params.to,
    subject: `${params.title} - SalãoPremium`,
    text: `Seu código de confirmação é ${params.code}. Ele expira em 10 minutos e funciona uma única vez.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#18181b"><h1 style="font-size:24px">${htmlEscape(params.title)}</h1><p>Use o código abaixo no App Cliente:</p><div style="font-size:36px;font-weight:900;letter-spacing:8px;padding:20px 0">${htmlEscape(params.code)}</div><p style="color:#71717a">Ele expira em 10 minutos e funciona uma única vez. Se você não solicitou, ignore este e-mail.</p></div>`,
    replyTo: process.env.PASSWORD_RECOVERY_EMAIL_REPLY_TO || undefined,
  });
}

async function createOtp(params: {
  databaseAdmin: any;
  accountId: string;
  purpose: RecoveryPurpose;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const now = Date.now();
  const { data: latest } = await params.databaseAdmin
    .from("cliente_app_email_verificacoes")
    .select("id, criado_em")
    .eq("conta_id", params.accountId)
    .eq("finalidade", params.purpose)
    .eq("email", params.email)
    .is("consumido_em", null)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.criado_em) {
    const createdAt = new Date(latest.criado_em).getTime();
    if (Number.isFinite(createdAt) && now - createdAt < OTP_RESEND_COOLDOWN_MS) {
      return { ok: false as const, error: "Aguarde um minuto antes de pedir outro código." };
    }
  }

  await params.databaseAdmin
    .from("cliente_app_email_verificacoes")
    .update({ consumido_em: new Date().toISOString() })
    .eq("conta_id", params.accountId)
    .eq("finalidade", params.purpose)
    .is("consumido_em", null);

  const code = generateCode();
  const { data: created, error } = await params.databaseAdmin
    .from("cliente_app_email_verificacoes")
    .insert({
      conta_id: params.accountId,
      finalidade: params.purpose,
      email: params.email,
      codigo_hash: hmac(`${params.accountId}:${params.purpose}:${params.email}:${code}`),
      expira_em: new Date(now + OTP_TTL_MS).toISOString(),
      tentativas: 0,
      ip_hash: hashMetadata(params.ip),
      user_agent_hash: hashMetadata(params.userAgent),
    })
    .select("id")
    .maybeSingle();
  if (error || !created?.id) {
    return { ok: false as const, error: "Não foi possível gerar o código agora." };
  }
  return { ok: true as const, code, id: String(created.id) };
}

async function invalidateOtpAfterEmailFailure(databaseAdmin: any, otpId: string) {
  const { error } = await databaseAdmin
    .from("cliente_app_email_verificacoes")
    .update({ consumido_em: new Date().toISOString() })
    .eq("id", otpId)
    .is("consumido_em", null);

  if (error) {
    console.error("[CLIENTE_APP_OTP_INVALIDATE_ERROR]", {
      otpId,
      error: error.message,
    });
  }
}

async function sendCreatedOtp(params: {
  databaseAdmin: any;
  otpId: string;
  to: string;
  code: string;
  title: string;
}) {
  try {
    await sendCodeEmail({
      to: params.to,
      code: params.code,
      title: params.title,
    });
  } catch (error) {
    await invalidateOtpAfterEmailFailure(params.databaseAdmin, params.otpId);
    throw error;
  }
}

async function consumeOtp(params: {
  databaseAdmin: any;
  accountId: string;
  purpose: RecoveryPurpose;
  email: string;
  code: string;
}) {
  const { data: row, error } = await params.databaseAdmin
    .from("cliente_app_email_verificacoes")
    .select("id, codigo_hash, expira_em, tentativas, consumido_em")
    .eq("conta_id", params.accountId)
    .eq("finalidade", params.purpose)
    .eq("email", params.email)
    .is("consumido_em", null)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row?.id || row.consumido_em || new Date(row.expira_em).getTime() < Date.now()) {
    return { ok: false as const, error: "Código inválido ou expirado." };
  }
  if (Number(row.tentativas || 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false as const, error: "Código bloqueado por excesso de tentativas. Solicite outro." };
  }

  const expected = hmac(`${params.accountId}:${params.purpose}:${params.email}:${String(params.code || "").trim()}`);
  const actual = String(row.codigo_hash || "");
  const matches = actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  if (!matches) {
    await params.databaseAdmin
      .from("cliente_app_email_verificacoes")
      .update({ tentativas: Number(row.tentativas || 0) + 1 })
      .eq("id", row.id);
    return { ok: false as const, error: "Código inválido ou expirado." };
  }

  const consumed = await params.databaseAdmin
    .from("cliente_app_email_verificacoes")
    .update({ consumido_em: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumido_em", null);
  if (consumed.error) return { ok: false as const, error: "Não foi possível confirmar o código agora." };
  return { ok: true as const };
}

async function loadAccountById(databaseAdmin: any, accountId: string) {
  const { data, error } = await databaseAdmin
    .from("clientes_app_auth")
    .select("id, nome, email, telefone, whatsapp, cpf, data_nascimento, auth_version, ativo")
    .eq("id", accountId)
    .limit(1)
    .maybeSingle();
  if (error || !data?.id || data.ativo === false) return null;
  return data as AccountRow;
}

async function bumpAuthVersion(databaseAdmin: any, account: AccountRow) {
  const next = Number(account.auth_version || 1) + 1;
  const { error } = await databaseAdmin
    .from("clientes_app_auth")
    .update({ auth_version: next, updated_at: new Date().toISOString() })
    .eq("id", account.id);
  return error ? null : next;
}

async function syncEmailAcrossLinks(databaseAdmin: any, accountId: string, email: string) {
  const { data: links } = await databaseAdmin
    .from("clientes_auth")
    .select("id_cliente, id_salao")
    .eq("app_conta_id", accountId);
  await databaseAdmin
    .from("clientes_auth")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("app_conta_id", accountId);
  for (const link of links || []) {
    if (!link.id_cliente || !link.id_salao) continue;
    await databaseAdmin
      .from("clientes")
      .update({ email, atualizado_em: new Date().toISOString() })
      .eq("id", link.id_cliente)
      .eq("id_salao", link.id_salao);
  }
}

export async function requestClienteRecoveryCodeByEmail(params: {
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<BasicResult> {
  const email = normalizeClienteEmail(params.email);
  if (!email) return { ok: false, error: "Informe um e-mail válido." };

  return runAdminOperation({
    action: "cliente_app_recovery_email_request",
    actorId: `email:${hmac(email)}`,
    run: async (databaseAdmin): Promise<BasicResult> => {
      const { data: account } = await databaseAdmin
        .from("clientes_app_auth")
        .select("id, ativo")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (account?.id && account.ativo !== false) {
        const otp = await createOtp({
          databaseAdmin,
          accountId: account.id,
          purpose: "recuperar_acesso_email",
          email,
          ip: params.ip,
          userAgent: params.userAgent,
        });
        if (otp.ok) {
          await sendCreatedOtp({
            databaseAdmin,
            otpId: otp.id,
            to: email,
            code: otp.code,
            title: "Código para recuperar seu acesso",
          });
          void emitSecurityEvent({
            evento: "cliente_app_email_codigo_enviado",
            tipoUsuario: "cliente",
            userId: account.id,
            origem: "cliente-app",
            detalhes: { finalidade: "recuperar_acesso_email" },
          });
        }
      }

      return { ok: true, message: GENERIC_REQUEST_MESSAGE };
    },
  });
}

export async function confirmClienteRecoveryCodeByEmail(params: {
  email: string;
  code: string;
}): Promise<SessionResult> {
  const email = normalizeClienteEmail(params.email);
  if (!email) return { ok: false, error: "Código inválido ou expirado." };

  return runAdminOperation({
    action: "cliente_app_recovery_email_confirm",
    actorId: `email:${hmac(email)}`,
    run: async (databaseAdmin): Promise<SessionResult> => {
      const { data: accountRow } = await databaseAdmin
        .from("clientes_app_auth")
        .select("id, nome, email, telefone, whatsapp, cpf, data_nascimento, auth_version, ativo")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (!accountRow?.id || accountRow.ativo === false) return { ok: false, error: "Código inválido ou expirado." };
      const account = accountRow as AccountRow;
      const consumed = await consumeOtp({
        databaseAdmin,
        accountId: account.id,
        purpose: "recuperar_acesso_email",
        email,
        code: params.code,
      });
      if (!consumed.ok) return consumed;
      const next = await bumpAuthVersion(databaseAdmin, account);
      if (!next) return { ok: false, error: "Não foi possível recuperar o acesso agora." };
      return { ok: true, message: "Acesso recuperado com sucesso.", session: buildSession(account, next) };
    },
  });
}

export async function startClienteRecoveryByIdentity(params: {
  cpf: string;
  dataNascimento: string;
  purpose?: "recover" | "change-email";
}): Promise<IdentityStartResult> {
  const cpf = normalizeCpf(params.cpf);
  const birth = parseClienteBirthDate(params.dataNascimento);
  if (!isValidCpf(cpf) || !birth) return { ok: false, error: "Não foi possível validar os dados informados." };

  return runAdminOperation({
    action: "cliente_app_recovery_identity_start",
    actorId: `cpf:${hmac(cpf)}`,
    run: async (databaseAdmin): Promise<IdentityStartResult> => {
      const account = await findRecoveryAccountByCpf(databaseAdmin, cpf);
      if (
        !account?.id ||
        account.ativo === false ||
        normalizeStoredBirthDate(account.data_nascimento) !== birth
      ) {
        return { ok: false, error: "Não foi possível validar os dados informados." };
      }
      return {
        ok: true,
        token: buildIdentityToken(account.id, params.purpose || "recover"),
        message: "Identidade confirmada.",
      };
    },
  });
}

export async function requestClienteRecoveryCodeByIdentity(params: {
  token: string;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<BasicResult> {
  const accountId = parseIdentityToken(params.token, "recover");
  const email = normalizeClienteEmail(params.email);
  if (!accountId || !email) return { ok: false, error: "Não foi possível continuar a recuperação." };

  return runAdminOperation({
    action: "cliente_app_recovery_identity_email_request",
    actorId: accountId,
    run: async (databaseAdmin): Promise<BasicResult> => {
      const account = await loadAccountById(databaseAdmin, accountId);
      if (!account) return { ok: false, error: "Não foi possível continuar a recuperação." };
      const currentEmail = getClienteAppPublicEmail(account.email);
      if (currentEmail && currentEmail !== email) {
        return { ok: false, error: "Este não é o e-mail atual da conta. Se perdeu o e-mail, use Alterar meu e-mail." };
      }
      if (!currentEmail) {
        const { data: duplicate } = await databaseAdmin
          .from("clientes_app_auth")
          .select("id")
          .eq("email", email)
          .neq("id", accountId)
          .limit(1);
        if (duplicate?.length) return { ok: false, error: "Este e-mail já pertence a outra conta." };
      }

      const otp = await createOtp({
        databaseAdmin,
        accountId,
        purpose: "recuperar_acesso_identidade",
        email,
        ip: params.ip,
        userAgent: params.userAgent,
      });
      if (!otp.ok) return otp;
      await sendCreatedOtp({
        databaseAdmin,
        otpId: otp.id,
        to: email,
        code: otp.code,
        title: "Confirme o e-mail para recuperar seu acesso",
      });
      return { ok: true, message: "Código enviado para o e-mail informado." };
    },
  });
}

export async function confirmClienteRecoveryCodeByIdentity(params: {
  token: string;
  email: string;
  code: string;
}): Promise<SessionResult> {
  const accountId = parseIdentityToken(params.token, "recover");
  const email = normalizeClienteEmail(params.email);
  if (!accountId || !email) return { ok: false, error: "Código inválido ou expirado." };

  return runAdminOperation({
    action: "cliente_app_recovery_identity_email_confirm",
    actorId: accountId,
    run: async (databaseAdmin): Promise<SessionResult> => {
      const account = await loadAccountById(databaseAdmin, accountId);
      if (!account) return { ok: false, error: "Código inválido ou expirado." };
      const consumed = await consumeOtp({
        databaseAdmin,
        accountId,
        purpose: "recuperar_acesso_identidade",
        email,
        code: params.code,
      });
      if (!consumed.ok) return consumed;

      const currentEmail = getClienteAppPublicEmail(account.email);
      const next = Number(account.auth_version || 1) + 1;
      const payload: Record<string, unknown> = {
        auth_version: next,
        updated_at: new Date().toISOString(),
      };
      if (!currentEmail) {
        payload.email = email;
        payload.email_verificado_em = new Date().toISOString();
      }
      const updated = await databaseAdmin.from("clientes_app_auth").update(payload).eq("id", accountId);
      if (updated.error) return { ok: false, error: "Não foi possível recuperar o acesso agora." };
      if (!currentEmail) {
        account.email = email;
        await syncEmailAcrossLinks(databaseAdmin, accountId, email);
      }
      return { ok: true, message: "Acesso recuperado com sucesso.", session: buildSession(account, next) };
    },
  });
}

export async function requestClienteEmailChangeCode(params: {
  token: string;
  newEmail: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<BasicResult> {
  const accountId = parseIdentityToken(params.token, "change-email");
  const email = normalizeClienteEmail(params.newEmail);
  if (!accountId || !email) return { ok: false, error: "Informe um novo e-mail válido." };

  return runAdminOperation({
    action: "cliente_app_email_change_request",
    actorId: accountId,
    run: async (databaseAdmin): Promise<BasicResult> => {
      const account = await loadAccountById(databaseAdmin, accountId);
      if (!account) return { ok: false, error: "Não foi possível validar sua conta." };
      const { data: duplicate } = await databaseAdmin
        .from("clientes_app_auth")
        .select("id")
        .eq("email", email)
        .neq("id", accountId)
        .limit(1);
      if (duplicate?.length) return { ok: false, error: "Este e-mail já pertence a outra conta." };

      const otp = await createOtp({
        databaseAdmin,
        accountId,
        purpose: "alterar_email",
        email,
        ip: params.ip,
        userAgent: params.userAgent,
      });
      if (!otp.ok) return otp;
      await sendCreatedOtp({
        databaseAdmin,
        otpId: otp.id,
        to: email,
        code: otp.code,
        title: "Confirme seu novo e-mail",
      });
      return { ok: true, message: "Código enviado para o novo e-mail." };
    },
  });
}

export async function confirmClienteEmailChange(params: {
  token: string;
  newEmail: string;
  code: string;
}): Promise<SessionResult> {
  const accountId = parseIdentityToken(params.token, "change-email");
  const email = normalizeClienteEmail(params.newEmail);
  if (!accountId || !email) return { ok: false, error: "Código inválido ou expirado." };

  return runAdminOperation({
    action: "cliente_app_email_change_confirm",
    actorId: accountId,
    run: async (databaseAdmin): Promise<SessionResult> => {
      const account = await loadAccountById(databaseAdmin, accountId);
      if (!account) return { ok: false, error: "Código inválido ou expirado." };
      const consumed = await consumeOtp({
        databaseAdmin,
        accountId,
        purpose: "alterar_email",
        email,
        code: params.code,
      });
      if (!consumed.ok) return consumed;

      const next = Number(account.auth_version || 1) + 1;
      const updated = await databaseAdmin
        .from("clientes_app_auth")
        .update({
          email,
          email_verificado_em: new Date().toISOString(),
          auth_version: next,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);
      if (updated.error) return { ok: false, error: "Não foi possível alterar o e-mail agora." };

      account.email = email;
      await syncEmailAcrossLinks(databaseAdmin, accountId, email);
      await databaseAdmin
        .from("cliente_app_email_verificacoes")
        .update({ consumido_em: new Date().toISOString() })
        .eq("conta_id", accountId)
        .is("consumido_em", null);

      void emitSecurityEvent({
        evento: "cliente_app_email_alterado",
        tipoUsuario: "cliente",
        userId: accountId,
        origem: "cliente-app",
        detalhes: { email_hash: hmac(email) },
      });

      await sendBrevoEmail({
        from: process.env.PASSWORD_RECOVERY_EMAIL_FROM || "SalãoPremium <recuperar@salaopremiun.com.br>",
        to: email,
        subject: "Seu e-mail foi atualizado - SalãoPremium",
        text: "Seu e-mail do App Cliente foi atualizado com sucesso. Se você não reconhece esta alteração, fale com o suporte.",
        html: `<div style="font-family:Arial,sans-serif;padding:28px"><h1>E-mail atualizado</h1><p>Seu novo e-mail do App Cliente foi confirmado com sucesso.</p><p>Se você não reconhece esta alteração, fale com o suporte.</p></div>`,
      });

      return { ok: true, message: "E-mail atualizado com sucesso.", session: buildSession(account, next) };
    },
  });
}

export async function requestClienteAppRecovery(emailInput: string): Promise<BasicResult> {
  return requestClienteRecoveryCodeByEmail({ email: emailInput });
}

export async function resetClienteAppPasswordWithToken(_params: {
  token: string;
  senha: string;
  confirmacao: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<BasicResult> {
  return {
    ok: false,
    error: "Este link pertence ao fluxo antigo. Volte para Recuperar acesso e solicite um código novo.",
  };
}
