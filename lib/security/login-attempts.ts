import { emitSecurityEvent } from "@/lib/security/security-events";
import { htmlEscape, sendResendEmail } from "@/lib/email/resend";
import {
  buildSecurityBlockPath,
  type SecurityTipoUsuario,
} from "@/lib/security/user-security";
import { getSupabaseAdmin, type SupabaseAdminClient } from "@/lib/supabase/admin";

type RecordLoginFailureParams = {
  evento?: string;
  tipoUsuario: SecurityTipoUsuario;
  userId?: string | null;
  idSalao?: string | null;
  identidade?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  origem?: string | null;
  route?: string | null;
  detalhes?: Record<string, unknown> | null;
};

type RecordLoginFailureResult = {
  blocked: boolean;
  status: "ativo" | "bloqueado_temporario" | "verificacao_necessaria";
  redirectTo?: string;
  blockedUntil?: string;
  attempts10m: number;
  attempts1h: number;
};

function normalizeIdentity(value: string | null | undefined) {
  const trimmed = String(value || "").trim().toLowerCase();
  return trimmed || null;
}

function getWindowStart(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function getBlockUntil(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function formatDateTimePt(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

function isFuture(value: string | null | undefined) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}

async function resolveSecurityRecipientEmail(params: {
  supabase: SupabaseAdminClient;
  tipoUsuario: SecurityTipoUsuario;
  userId?: string | null;
  identidade?: string | null;
}) {
  if (isEmail(params.identidade)) return params.identidade;
  if (!params.userId) return null;

  if (params.tipoUsuario === "salao") {
    const { data } = await params.supabase
      .from("usuarios")
      .select("email")
      .eq("id", params.userId)
      .maybeSingle();
    const email = (data as { email?: string | null } | null)?.email || null;
    return isEmail(email) ? email : null;
  }

  if (params.tipoUsuario === "cliente") {
    const { data } = await params.supabase
      .from("clientes_app_auth")
      .select("email")
      .eq("id", params.userId)
      .maybeSingle();
    const email = (data as { email?: string | null } | null)?.email || null;
    return isEmail(email) ? email : null;
  }

  if (params.tipoUsuario === "profissional") {
    const { data } = await params.supabase
      .from("profissionais")
      .select("email")
      .eq("id", params.userId)
      .maybeSingle();
    const email = (data as { email?: string | null } | null)?.email || null;
    return isEmail(email) ? email : null;
  }

  return null;
}

async function sendTemporaryBlockEmail(params: {
  supabase: SupabaseAdminClient;
  tipoUsuario: SecurityTipoUsuario;
  userId: string;
  idSalao?: string | null;
  identidade?: string | null;
  status: string;
  motivo: string;
  blockedUntil: string;
  ip?: string | null;
  userAgent?: string | null;
  attempts10m: number;
  attempts1h: number;
}) {
  try {
    const to = await resolveSecurityRecipientEmail({
      supabase: params.supabase,
      tipoUsuario: params.tipoUsuario,
      userId: params.userId,
      identidade: params.identidade,
    });

    if (!to) return;

    const from =
      process.env.SECURITY_EMAIL_FROM ||
      process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
      "SalãoPremium Segurança <recuperar@salaopremiun.com.br>";
    const subject =
      params.status === "verificacao_necessaria"
        ? "Confirmação de segurança necessária no SalãoPremium"
        : "Bloqueio temporário de segurança no SalãoPremium";
    const safeMotivo = htmlEscape(params.motivo);
    const safeIp = htmlEscape(params.ip || "não identificado");
    const safeDevice = htmlEscape(
      params.userAgent
        ? params.userAgent.slice(0, 180)
        : "dispositivo não identificado"
    );
    const blockedUntil = formatDateTimePt(params.blockedUntil);

    await sendResendEmail({
      from,
      to,
      subject,
      idempotencyKey: `security-block:${params.userId}:${params.blockedUntil}`,
      text: [
        "Olá,",
        "",
        "Detectamos muitas tentativas de acesso à sua conta no SalãoPremium.",
        `Motivo: ${params.motivo}`,
        `Bloqueado até: ${blockedUntil}`,
        `IP: ${params.ip || "não identificado"}`,
        "",
        "Se foi você, aguarde o tempo indicado e tente novamente. Se não reconhece essa atividade, altere sua senha ou fale com o suporte.",
        "",
        "Equipe SalãoPremium",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#18181b;line-height:1.6">
          <h1 style="font-size:24px;margin:0 0 12px">Proteção de acesso ativada</h1>
          <p>Olá,</p>
          <p>Detectamos muitas tentativas de acesso à sua conta no <strong>SalãoPremium</strong>. Por segurança, aplicamos uma proteção temporária.</p>
          <div style="border:1px solid #e4e4e7;border-radius:18px;padding:16px;background:#fafafa;margin:20px 0">
            <p style="margin:0 0 8px"><strong>Motivo:</strong> ${safeMotivo}</p>
            <p style="margin:0 0 8px"><strong>Bloqueado até:</strong> ${htmlEscape(blockedUntil)}</p>
            <p style="margin:0 0 8px"><strong>IP:</strong> ${safeIp}</p>
            <p style="margin:0"><strong>Dispositivo:</strong> ${safeDevice}</p>
          </div>
          <p>Se foi você, aguarde o tempo indicado e tente novamente. Se não reconhece essa atividade, altere sua senha ou fale com o suporte imediatamente.</p>
          <p style="color:#71717a;font-size:13px">Tentativas: ${params.attempts10m} nos últimos 10 minutos e ${params.attempts1h} na última hora.</p>
          <p>Equipe SalãoPremium</p>
        </div>
      `,
    });

    void emitSecurityEvent({
      evento: "email_bloqueio_temporario_enviado",
      tipoUsuario: params.tipoUsuario,
      userId: params.userId,
      idSalao: params.idSalao || null,
      risco: "baixo",
      ip: params.ip || null,
      userAgent: params.userAgent || null,
      origem: "security-login",
      detalhes: {
        destinatario: to,
        bloqueado_ate: params.blockedUntil,
      },
    });
  } catch (error) {
    void emitSecurityEvent({
      evento: "email_bloqueio_temporario_falhou",
      tipoUsuario: params.tipoUsuario,
      userId: params.userId,
      idSalao: params.idSalao || null,
      risco: "medio",
      ip: params.ip || null,
      userAgent: params.userAgent || null,
      origem: "security-login",
      detalhes: {
        erro: error instanceof Error ? error.message : "Falha ao enviar e-mail.",
      },
    });
  }
}

function buildAttemptQuery(
  supabase: SupabaseAdminClient,
  params: {
    tipoUsuario: SecurityTipoUsuario;
    userId?: string | null;
    identidade?: string | null;
    since: string;
  }
) {
  let query = supabase
    .from("security_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("tipo_usuario", params.tipoUsuario)
    .gte("criado_em", params.since);

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  } else if (params.identidade) {
    query = query.eq("identidade", params.identidade);
  } else {
    query = query.is("user_id", null).is("identidade", null);
  }

  return query;
}

export async function recordSecurityLoginFailure(
  params: RecordLoginFailureParams
): Promise<RecordLoginFailureResult> {
  const supabase = getSupabaseAdmin();
  const identidade = normalizeIdentity(params.identidade);
  const now = new Date().toISOString();

  await supabase.from("security_login_attempts").insert({
    tipo_usuario: params.tipoUsuario,
    user_id: params.userId || null,
    id_salao: params.idSalao || null,
    identidade,
    ip: params.ip || null,
    user_agent: params.userAgent || null,
    risco: "baixo",
    criado_em: now,
  });

  const [{ count: attempts10m }, { count: attempts1h }] = await Promise.all([
    buildAttemptQuery(supabase, {
      tipoUsuario: params.tipoUsuario,
      userId: params.userId,
      identidade,
      since: getWindowStart(10),
    }),
    buildAttemptQuery(supabase, {
      tipoUsuario: params.tipoUsuario,
      userId: params.userId,
      identidade,
      since: getWindowStart(60),
    }),
  ]);

  const count10m = Number(attempts10m || 0);
  const count1h = Number(attempts1h || 0);
  const shouldVerify = count1h >= 10;
  const shouldBlock = count10m >= 5 || shouldVerify;

  void emitSecurityEvent({
    evento: params.evento || "login_falhou",
    tipoUsuario: params.tipoUsuario,
    userId: params.userId || null,
    idSalao: params.idSalao || null,
    risco: shouldBlock ? "alto" : count10m >= 3 ? "medio" : "baixo",
    ip: params.ip || null,
    userAgent: params.userAgent || null,
    origem: params.origem || "security-login",
    route: params.route || null,
    detalhes: {
      identidade,
      tentativas_10_minutos: count10m,
      tentativas_1_hora: count1h,
      ...(params.detalhes || {}),
    },
  });

  if (!shouldBlock || !params.userId) {
    return {
      blocked: false,
      status: "ativo",
      attempts10m: count10m,
      attempts1h: count1h,
    };
  }

  const blockedUntil = getBlockUntil(shouldVerify ? 60 : 15);
  const status = shouldVerify ? "verificacao_necessaria" : "bloqueado_temporario";
  const motivo = shouldVerify
    ? "Detectamos muitas tentativas de acesso. Confirme sua identidade para continuar."
    : "Bloqueio temporario por muitas tentativas de login.";
  const { data: previousStatus } = await supabase
    .from("user_security_status")
    .select("status, bloqueado_ate")
    .eq("user_id", params.userId)
    .maybeSingle();
  const wasAlreadyBlocked =
    previousStatus &&
    ["bloqueado_temporario", "verificacao_necessaria", "bloqueado"].includes(
      String(previousStatus.status || "")
    ) &&
    isFuture(previousStatus.bloqueado_ate);

  await supabase
    .from("user_security_status")
    .upsert(
      {
        user_id: params.userId,
        tipo_usuario: params.tipoUsuario,
        status,
        motivo,
        risco_atual: shouldVerify ? "alto" : "medio",
        bloqueado_ate: blockedUntil,
        verificacao_necessaria: shouldVerify,
        atualizado_em: now,
      },
      { onConflict: "user_id" }
    );

  if (params.tipoUsuario === "salao" && params.idSalao) {
    await supabase
      .from("saloes")
      .update({
        status_seguranca: status,
        motivo_seguranca: motivo,
        bloqueado_ate: blockedUntil,
      })
      .eq("id", params.idSalao);
  }

  void emitSecurityEvent({
    evento: "bloqueio_temporario_login",
    tipoUsuario: params.tipoUsuario,
    userId: params.userId,
    idSalao: params.idSalao || null,
    risco: shouldVerify ? "alto" : "medio",
    ip: params.ip || null,
    userAgent: params.userAgent || null,
    origem: params.origem || "security-login",
    route: params.route || null,
    detalhes: {
      identidade,
      status,
      bloqueado_ate: blockedUntil,
      tentativas_10_minutos: count10m,
      tentativas_1_hora: count1h,
    },
  });

  if (!wasAlreadyBlocked) {
    void sendTemporaryBlockEmail({
      supabase,
      tipoUsuario: params.tipoUsuario,
      userId: params.userId,
      idSalao: params.idSalao || null,
      identidade,
      status,
      motivo,
      blockedUntil,
      ip: params.ip || null,
      userAgent: params.userAgent || null,
      attempts10m: count10m,
      attempts1h: count1h,
    });
  }

  return {
    blocked: true,
    status,
    redirectTo: buildSecurityBlockPath({
      tipoUsuario: params.tipoUsuario,
      motivo,
      origem: "login_attempts",
    }),
    blockedUntil,
    attempts10m: count10m,
    attempts1h: count1h,
  };
}
