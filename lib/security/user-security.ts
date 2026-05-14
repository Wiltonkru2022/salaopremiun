import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SecurityTipoUsuario = "cliente" | "salao" | "profissional";

export type SecurityStatusValue =
  | "ativo"
  | "verificacao_necessaria"
  | "bloqueado_temporario"
  | "bloqueado"
  | "em_analise";

export type SecurityStatusRow = {
  user_id: string;
  tipo_usuario: SecurityTipoUsuario;
  status: SecurityStatusValue | string | null;
  motivo: string | null;
  risco_atual: string | null;
  bloqueado_ate: string | null;
  verificacao_necessaria: boolean | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type SecurityAccessDecision = {
  allowed: boolean;
  tipoUsuario: SecurityTipoUsuario;
  status: SecurityStatusValue | string;
  motivo: string | null;
  riscoAtual: string | null;
  bloqueadoAte: string | null;
  verificacaoNecessaria: boolean;
  origem: "user_security_status" | "saloes" | "none";
  redirectPath: string | null;
};

type SecurityAccessParams = {
  tipoUsuario: SecurityTipoUsuario;
  userId: string;
  idSalao?: string | null;
};

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function getSupportPath(tipoUsuario: SecurityTipoUsuario) {
  if (tipoUsuario === "cliente") {
    return "/app-cliente/suporte";
  }

  if (tipoUsuario === "profissional") {
    return "/app-profissional/suporte";
  }

  return "/painel/suporte";
}

export function isSecurityStatusBlockingValue(value: string | null | undefined) {
  const status = normalizeStatus(value);
  return [
    "verificacao_necessaria",
    "bloqueado_temporario",
    "bloqueado",
    "em_analise",
  ].includes(status);
}

export function buildSecurityBlockPath(params: {
  tipoUsuario: SecurityTipoUsuario;
  motivo?: string | null;
  origem?: string | null;
  returnTo?: string | null;
}) {
  const search = new URLSearchParams();
  search.set("tipo", params.tipoUsuario);

  const motivo = String(params.motivo || "").trim();
  if (motivo) {
    search.set("motivo", motivo);
  }

  const origem = String(params.origem || "").trim();
  if (origem) {
    search.set("origem", origem);
  }

  const returnTo = String(params.returnTo || "").trim();
  if (returnTo.startsWith("/")) {
    search.set("returnTo", returnTo);
  }

  const serialized = search.toString();
  return `/conta-bloqueada${serialized ? `?${serialized}` : ""}`;
}

export function buildSecurityVerificationPath(params: {
  tipoUsuario: SecurityTipoUsuario;
  motivo?: string | null;
  origem?: string | null;
  returnTo?: string | null;
}) {
  const search = new URLSearchParams();
  search.set("tipo", params.tipoUsuario);

  const motivo = String(params.motivo || "").trim();
  if (motivo) {
    search.set("motivo", motivo);
  }

  const origem = String(params.origem || "").trim();
  if (origem) {
    search.set("origem", origem);
  }

  const returnTo = String(params.returnTo || "").trim();
  if (returnTo.startsWith("/")) {
    search.set("returnTo", returnTo);
  }

  const serialized = search.toString();
  return `/seguranca/verificacao${serialized ? `?${serialized}` : ""}`;
}

export function getSecurityStatusMessage(params: {
  status: string | null | undefined;
  motivo?: string | null;
  bloqueadoAte?: string | null;
}) {
  const status = normalizeStatus(params.status);
  const motivo = String(params.motivo || "").trim();

  if (status === "verificacao_necessaria") {
    return (
      motivo ||
      "Sua conta precisa de verificacao adicional antes de continuar."
    );
  }

  if (status === "bloqueado_temporario") {
    return (
      motivo ||
      "Seu acesso ficou bloqueado temporariamente por seguranca."
    );
  }

  if (status === "bloqueado") {
    return motivo || "Sua conta foi bloqueada por seguranca.";
  }

  if (status === "em_analise") {
    return motivo || "Sua conta esta em analise no momento.";
  }

  if (params.bloqueadoAte) {
    return (
      motivo ||
      "Seu acesso esta temporariamente bloqueado ate a liberacao do periodo de seguranca."
    );
  }

  return motivo || "Acesso bloqueado por seguranca.";
}

async function getSecurityRowByUserId(
  tipoUsuario: SecurityTipoUsuario,
  userId: string
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("user_security_status")
    .select(
      "user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate, verificacao_necessaria, criado_em, atualizado_em"
    )
    .eq("user_id", userId)
    .eq("tipo_usuario", tipoUsuario)
    .maybeSingle();

  if (error || !data?.user_id) {
    return null;
  }

  return data as SecurityStatusRow;
}

async function getSalaoSecurityRow(idSalao: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("saloes")
    .select("id, status_seguranca, motivo_seguranca, bloqueado_ate, status")
    .eq("id", idSalao)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data as {
    id: string;
    status_seguranca: string | null;
    motivo_seguranca: string | null;
    bloqueado_ate: string | null;
    status: string | null;
  };
}

export async function getSecurityAccessDecision(
  params: SecurityAccessParams
): Promise<SecurityAccessDecision> {
  const userId = String(params.userId || "").trim();
  const tipoUsuario = params.tipoUsuario;
  const idSalao = String(params.idSalao || "").trim();

  const [userStatus, salaoStatus] = await Promise.all([
    userId ? getSecurityRowByUserId(tipoUsuario, userId) : Promise.resolve(null),
    idSalao ? getSalaoSecurityRow(idSalao) : Promise.resolve(null),
  ]);

  const userStatusValue = normalizeStatus(userStatus?.status);
  const salaoSecurityValue = normalizeStatus(salaoStatus?.status_seguranca);

  if (
    userStatusValue === "verificacao_necessaria" ||
    userStatus?.verificacao_necessaria
  ) {
    return {
      allowed: false,
      tipoUsuario,
      status: userStatus?.status || "verificacao_necessaria",
      motivo: userStatus?.motivo || null,
      riscoAtual: userStatus?.risco_atual || null,
      bloqueadoAte: userStatus?.bloqueado_ate || null,
      verificacaoNecessaria: true,
      origem: "user_security_status",
      redirectPath: buildSecurityVerificationPath({
        tipoUsuario,
        motivo: userStatus?.motivo || null,
        origem: "user_security_status",
      }),
    };
  }

  if (isSecurityStatusBlockingValue(userStatusValue)) {
    return {
      allowed: false,
      tipoUsuario,
      status: userStatus?.status || "bloqueado_temporario",
      motivo: userStatus?.motivo || null,
      riscoAtual: userStatus?.risco_atual || null,
      bloqueadoAte: userStatus?.bloqueado_ate || null,
      verificacaoNecessaria: false,
      origem: "user_security_status",
      redirectPath: buildSecurityBlockPath({
        tipoUsuario,
        motivo: userStatus?.motivo || null,
        origem: "user_security_status",
      }),
    };
  }

  if (
    salaoStatus &&
    salaoSecurityValue &&
    salaoSecurityValue !== "ativo"
  ) {
    if (salaoSecurityValue === "verificacao_necessaria") {
      return {
        allowed: false,
        tipoUsuario,
        status: salaoStatus.status_seguranca || "verificacao_necessaria",
        motivo: salaoStatus.motivo_seguranca || null,
        riscoAtual: null,
        bloqueadoAte: salaoStatus.bloqueado_ate || null,
        verificacaoNecessaria: true,
        origem: "saloes",
        redirectPath: buildSecurityVerificationPath({
          tipoUsuario,
          motivo: salaoStatus.motivo_seguranca || null,
          origem: "saloes",
        }),
      };
    }

    return {
      allowed: false,
      tipoUsuario,
      status: salaoStatus.status_seguranca || "bloqueado_temporario",
      motivo: salaoStatus.motivo_seguranca || null,
      riscoAtual: null,
      bloqueadoAte: salaoStatus.bloqueado_ate || null,
      verificacaoNecessaria: false,
      origem: "saloes",
      redirectPath: buildSecurityBlockPath({
        tipoUsuario,
        motivo: salaoStatus.motivo_seguranca || null,
        origem: "saloes",
      }),
    };
  }

  return {
    allowed: true,
    tipoUsuario,
    status: userStatus?.status || salaoStatus?.status_seguranca || "ativo",
    motivo: userStatus?.motivo || salaoStatus?.motivo_seguranca || null,
    riscoAtual: userStatus?.risco_atual || null,
    bloqueadoAte: userStatus?.bloqueado_ate || salaoStatus?.bloqueado_ate || null,
    verificacaoNecessaria: false,
    origem: "none",
    redirectPath: null,
  };
}

export function getSecuritySupportPath(tipoUsuario: SecurityTipoUsuario) {
  return getSupportPath(tipoUsuario);
}

