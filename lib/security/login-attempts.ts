import { emitSecurityEvent } from "@/lib/security/security-events";
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
