import { runAdminOperation } from "@/lib/supabase/admin-ops";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { isSalaoStatusOperational } from "@/lib/plans/access";
import { verifyPassword } from "@/lib/profissional-auth.server";
import { recordSecurityLoginFailure } from "@/lib/security/login-attempts";
import { emitSecurityEvent } from "@/lib/security/security-events";
import {
  getSecurityAccessDecision,
  getSecurityStatusMessage,
} from "@/lib/security/user-security";

type LoginResult =
  | {
      ok: true;
      session: {
        idProfissional: string;
        idSalao: string;
        nome: string;
        cpf: string;
        tipo: "profissional";
      };
    }
  | {
      ok: false;
      error: string;
      redirectTo?: string;
    };

type ProfissionalAcessoLoginRow = {
  id: string;
  cpf?: string | null;
  senha_hash: string;
  ativo?: boolean | null;
  id_profissional: string;
  passwordAlreadyVerified?: boolean;
};

function normalizeCpf(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

async function findAcessoByProfissionalCpf(params: {
  supabaseAdmin: SupabaseAdminClient;
  cpf: string;
  senha: string;
}): Promise<ProfissionalAcessoLoginRow | null> {
  const { data: profissionais, error: profissionaisError } =
    await params.supabaseAdmin
      .from("profissionais")
      .select("id")
      .eq("cpf", params.cpf)
      .eq("ativo", true)
      .limit(10);

  if (profissionaisError || !profissionais?.length) {
    return null;
  }

  const idsProfissionais = profissionais
    .map((item) => String(item.id || "").trim())
    .filter(Boolean);

  if (!idsProfissionais.length) {
    return null;
  }

  const { data: acessos, error: acessosError } = await params.supabaseAdmin
    .from("profissionais_acessos")
    .select("id, cpf, senha_hash, ativo, id_profissional")
    .eq("ativo", true)
    .in("id_profissional", idsProfissionais);

  if (acessosError || !acessos?.length) {
    return null;
  }

  for (const acesso of acessos as ProfissionalAcessoLoginRow[]) {
    const senhaOk = await verifyPassword(params.senha, acesso.senha_hash);
    if (senhaOk) {
      return {
        ...acesso,
        passwordAlreadyVerified: true,
      };
    }
  }

  return null;
}

async function buildProfissionalSession(params: {
  supabaseAdmin: SupabaseAdminClient;
  idProfissional: string;
  cpf: string;
  acessoId?: string | null;
}): Promise<LoginResult> {
  const { data: profissional, error: profissionalError } =
    await params.supabaseAdmin
      .from("profissionais")
      .select(
        "id, nome, nome_exibicao, ativo, id_salao, tipo_profissional, nivel_acesso, pode_usar_sistema"
      )
      .eq("id", params.idProfissional)
      .limit(1)
      .maybeSingle();

  if (profissionalError) {
    return { ok: false, error: "Erro ao buscar profissional." };
  }

  if (!profissional) {
    return { ok: false, error: "Profissional nao encontrado." };
  }

  if (!profissional.ativo) {
    return { ok: false, error: "Profissional inativo." };
  }

  if (
    String(profissional.tipo_profissional || "profissional").toLowerCase() ===
    "assistente"
  ) {
    return {
      ok: false,
      error: "Assistente do salao nao possui acesso ao app profissional.",
    };
  }

  const nivelAcesso = String(profissional.nivel_acesso || "proprio").toLowerCase();
  if (profissional.pode_usar_sistema === false || nivelAcesso === "sem_acesso") {
    return {
      ok: false,
      error: "Profissional sem acesso liberado para o app.",
    };
  }

  if (!profissional.id_salao) {
    return { ok: false, error: "Profissional sem salao vinculado." };
  }

  const { data: salao, error: salaoError } = await params.supabaseAdmin
    .from("saloes")
    .select("id, nome, status")
    .eq("id", profissional.id_salao)
    .limit(1)
    .maybeSingle();

  if (salaoError) {
    return { ok: false, error: "Erro ao buscar salao." };
  }

  if (!salao) {
    return { ok: false, error: "Salao nao encontrado." };
  }

  if (!isSalaoStatusOperational(salao.status)) {
    return { ok: false, error: "Salao inativo ou bloqueado." };
  }

  const securityAccess = await getSecurityAccessDecision({
    tipoUsuario: "profissional",
    userId: profissional.id,
    idSalao: profissional.id_salao,
  });

  if (!securityAccess.allowed) {
    return {
      ok: false,
      error: getSecurityStatusMessage({
        status: securityAccess.status,
        motivo: securityAccess.motivo,
        bloqueadoAte: securityAccess.bloqueadoAte,
      }),
      redirectTo: securityAccess.redirectPath || undefined,
    };
  }

  if (params.acessoId) {
    await params.supabaseAdmin
      .from("profissionais_acessos")
      .update({ ultimo_login_em: new Date().toISOString() })
      .eq("id", params.acessoId);
  }

  return {
    ok: true,
    session: {
      idProfissional: profissional.id,
      idSalao: profissional.id_salao,
      nome: profissional.nome_exibicao || profissional.nome || "Profissional",
      cpf: params.cpf,
      tipo: "profissional",
    },
  };
}

export async function loginProfissionalByCpfSenha(
  cpf: string,
  senha: string
): Promise<LoginResult> {
  const cpfLimpo = normalizeCpf(cpf);
  const senhaLimpa = String(senha || "").trim();

  return runAdminOperation({
    action: "profissional_auth_login_por_cpf",
    actorId: cpfLimpo || null,
    run: async (supabaseAdmin): Promise<LoginResult> => {
      let acesso = await findAcessoByProfissionalCpf({
        supabaseAdmin,
        cpf: cpfLimpo,
        senha: senhaLimpa,
      });

      if (!acesso) {
        const { data: acessoPorCpf, error: acessoError } = await supabaseAdmin
          .from("profissionais_acessos")
          .select("id, cpf, senha_hash, ativo, id_profissional")
          .eq("cpf", cpfLimpo)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();

        if (acessoError) {
          return { ok: false, error: "Erro ao buscar acesso do profissional." };
        }

        acesso = (acessoPorCpf as ProfissionalAcessoLoginRow | null) || null;
      }

      if (!acesso) {
        void recordSecurityLoginFailure({
          evento: "profissional_app_login_falhou",
          tipoUsuario: "profissional",
          identidade: cpfLimpo,
          origem: "app-profissional",
          detalhes: { cpf: cpfLimpo },
        });
        return { ok: false, error: "CPF ou senha invalidos." };
      }

      let senhaOk = true;

      if (acesso.passwordAlreadyVerified !== true) {
        senhaOk =
          normalizeCpf(acesso.cpf || "") === cpfLimpo
            ? await verifyPassword(senhaLimpa, acesso.senha_hash)
            : true;
      }

      if (!senhaOk) {
        void recordSecurityLoginFailure({
          evento: "profissional_app_login_falhou",
          tipoUsuario: "profissional",
          userId: acesso.id_profissional,
          identidade: cpfLimpo,
          origem: "app-profissional",
          detalhes: { cpf: cpfLimpo },
        });
        return { ok: false, error: "CPF ou senha invalidos." };
      }

      const session = await buildProfissionalSession({
        supabaseAdmin,
        idProfissional: acesso.id_profissional,
        cpf: cpfLimpo,
        acessoId: acesso.id,
      });

      if (session.ok) {
        void emitSecurityEvent({
          evento: "profissional_app_login_sucesso",
          tipoUsuario: "profissional",
          userId: acesso.id_profissional,
          idSalao: session.session.idSalao,
          origem: "app-profissional",
          detalhes: { cpf: cpfLimpo },
        });
      }

      return session;
    },
  });
}
