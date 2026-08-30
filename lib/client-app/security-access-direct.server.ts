import "server-only";

import { queryNeonDirect } from "@/lib/neon/direct.server";
import {
  buildSecurityBlockPath,
  buildSecurityVerificationPath,
} from "@/lib/security/user-security";

type SecurityRow = {
  status: string | null;
  motivo: string | null;
  risco_atual: string | null;
  bloqueado_ate: string | null;
  verificacao_necessaria: boolean | null;
};

type SalaoSecurityRow = {
  status_seguranca: string | null;
  motivo_seguranca: string | null;
  bloqueado_ate: string | null;
};

export type ClienteSecurityDecision = {
  allowed: boolean;
  error: string | null;
  redirectTo: string | null;
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function message(status: string, motivo?: string | null) {
  const custom = String(motivo || "").trim();
  if (custom) return custom;

  if (status === "verificacao_necessaria") {
    return "Sua conta precisa de verificação adicional antes de continuar.";
  }
  if (status === "bloqueado_temporario") {
    return "Seu acesso ficou bloqueado temporariamente por segurança.";
  }
  if (status === "bloqueado") {
    return "Sua conta foi bloqueada por segurança.";
  }
  if (status === "em_analise") {
    return "Sua conta está em análise no momento.";
  }
  return "Acesso bloqueado por segurança.";
}

export async function getClienteSecurityDecisionDirect(params: {
  userId: string;
  idSalao?: string | null;
}): Promise<ClienteSecurityDecision> {
  const userId = String(params.userId || "").trim();
  const idSalao = String(params.idSalao || "").trim();

  if (!userId) {
    return {
      allowed: false,
      error: "Sessão de cliente inválida.",
      redirectTo: "/app-cliente/login?erro=sessao_expirada",
    };
  }

  const [userResult, salaoResult] = await Promise.all([
    queryNeonDirect<SecurityRow>(
      `select status::text,
              motivo::text,
              risco_atual::text,
              bloqueado_ate::text,
              verificacao_necessaria
         from public.user_security_status
        where user_id::text = $1::text
          and tipo_usuario::text = 'cliente'
        limit 1`,
      [userId]
    ),
    idSalao
      ? queryNeonDirect<SalaoSecurityRow>(
          `select status_seguranca::text,
                  motivo_seguranca::text,
                  bloqueado_ate::text
             from public.saloes
            where id::text = $1::text
            limit 1`,
          [idSalao]
        )
      : Promise.resolve({ rows: [] as SalaoSecurityRow[] } as any),
  ]);

  const user = userResult.rows[0] || null;
  const salao = salaoResult.rows[0] || null;
  const userStatus = normalize(user?.status);

  if (
    userStatus === "verificacao_necessaria" ||
    Boolean(user?.verificacao_necessaria)
  ) {
    const error = message("verificacao_necessaria", user?.motivo);
    return {
      allowed: false,
      error,
      redirectTo: buildSecurityVerificationPath({
        tipoUsuario: "cliente",
        motivo: error,
        origem: "user_security_status",
      }),
    };
  }

  if (
    ["bloqueado_temporario", "bloqueado", "em_analise"].includes(
      userStatus
    )
  ) {
    const error = message(userStatus, user?.motivo);
    return {
      allowed: false,
      error,
      redirectTo: buildSecurityBlockPath({
        tipoUsuario: "cliente",
        motivo: error,
        origem: "user_security_status",
      }),
    };
  }

  const salaoStatus = normalize(salao?.status_seguranca);
  if (salaoStatus && salaoStatus !== "ativo") {
    const error = message(salaoStatus, salao?.motivo_seguranca);
    return {
      allowed: false,
      error,
      redirectTo:
        salaoStatus === "verificacao_necessaria"
          ? buildSecurityVerificationPath({
              tipoUsuario: "cliente",
              motivo: error,
              origem: "saloes",
            })
          : buildSecurityBlockPath({
              tipoUsuario: "cliente",
              motivo: error,
              origem: "saloes",
            }),
    };
  }

  return { allowed: true, error: null, redirectTo: null };
}
