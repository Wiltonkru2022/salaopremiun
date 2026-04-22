import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { SELECT_USUARIO_TENANT } from "@/lib/db/selects";
import { buildShellNotifications } from "@/lib/notifications/shell-notifications";
import { PERMISSIONS } from "@/lib/permissions";

type RpcShellResumo = {
  usuario?: {
    id?: string;
    id_salao?: string;
    nivel?: string;
    status?: string;
  };
  salao?: {
    nome?: string | null;
    responsavel?: string | null;
    logo_url?: string | null;
    plano?: string | null;
    status?: string | null;
  };
  assinatura?: {
    status?: string | null;
    plano?: string | null;
    vencimento_em?: string | null;
    trial_fim_em?: string | null;
  };
  tickets?: Array<{
    id: string;
    numero?: number | string | null;
    assunto?: string | null;
    prioridade?: string | null;
    status?: string | null;
    ultima_interacao_em?: string | null;
  }>;
  onboarding?: {
    score_total?: number | null;
    dias_com_acesso?: number | null;
    modulos_usados?: number | null;
    detalhes_json?: Record<string, unknown> | null;
  };
};

type PermissoesDbRow = Record<string, boolean | string | null>;

export async function loadPainelShellData() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login?motivo=sessao_expirada");
  }

  const userName =
    user.user_metadata?.nome || user.email?.split("@")[0] || "Usuario";

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select(SELECT_USUARIO_TENANT)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario?.id || !usuario.id_salao) {
    return {
      ok: false as const,
      error: "Erro ao carregar usuario do sistema.",
    };
  }

  if (usuario.status !== "ativo") {
    redirect("/login?motivo=usuario_inativo");
  }

  const permissionsSelect = ["id_usuario", "id_salao", ...Object.keys(PERMISSIONS)].join(", ");

  const [{ data: permissoes }, { data: resumoRpc, error: resumoError }] =
    await Promise.all([
      supabase
        .from("usuarios_permissoes")
        .select(permissionsSelect)
        .eq("id_usuario", usuario.id)
        .eq("id_salao", usuario.id_salao)
        .maybeSingle(),
      supabase.rpc("fn_shell_resumo_painel"),
    ]);

  if (resumoError) {
    return {
      ok: false as const,
      error: resumoError.message || "Erro ao carregar resumo do painel.",
    };
  }

  const rpc = (resumoRpc || {}) as RpcShellResumo;
  const permissoesPadrao = buildPermissoesByNivel(usuario.nivel);
  const permissoesDb = sanitizePermissoesDb(
    (permissoes as PermissoesDbRow | null) ?? null,
    {
      idSalao: usuario.id_salao,
      idUsuario: usuario.id,
      origem: "loadPainelShellData",
    }
  );

  const permissoesFinal = {
    ...permissoesPadrao,
    ...permissoesDb,
    perfil_salao_ver:
      usuario.nivel === "admin" &&
      (permissoesDb.perfil_salao_ver ?? permissoesPadrao.perfil_salao_ver),
    configuracoes_ver:
      usuario.nivel === "admin" &&
      (permissoesDb.configuracoes_ver ?? permissoesPadrao.configuracoes_ver),
    assinatura_ver:
      usuario.nivel === "admin" &&
      (permissoesDb.assinatura_ver ?? permissoesPadrao.assinatura_ver),
  };

  const resumoAssinatura = rpc.assinatura?.status
    ? getResumoAssinatura({
        status: rpc.assinatura.status,
        vencimentoEm: rpc.assinatura.vencimento_em,
        trialFimEm: rpc.assinatura.trial_fim_em,
      })
    : null;

  const onboardingSeguro = rpc.onboarding
    ? {
        score_total: rpc.onboarding.score_total,
        dias_com_acesso: rpc.onboarding.dias_com_acesso,
        modulos_usados: rpc.onboarding.modulos_usados,
        detalhes_json:
          rpc.onboarding.detalhes_json &&
          typeof rpc.onboarding.detalhes_json === "object"
            ? rpc.onboarding.detalhes_json
            : {},
      }
    : null;

  const notifications = buildShellNotifications({
    resumoAssinatura,
    clientes: [],
    agendamentos: [],
    movimentosCaixa: [],
    onboarding: onboardingSeguro,
    tickets: rpc.tickets ?? [],
  });

  return {
    ok: true as const,
    data: {
      idSalao: usuario.id_salao,
      idUsuario: usuario.id,
      userName,
      userEmail: user.email || "",
      nivel: String(usuario.nivel || ""),
      permissoes: permissoesFinal,
      salaoNome: rpc.salao?.nome || "SalaoPremium",
      salaoResponsavel: rpc.salao?.responsavel || userName,
      salaoLogoUrl: rpc.salao?.logo_url || null,
      planoNome: rpc.assinatura?.plano || rpc.salao?.plano || "Sem plano",
      assinaturaStatus: rpc.assinatura?.status || rpc.salao?.status || null,
      resumoAssinatura,
      onboarding: onboardingSeguro
        ? {
            scoreTotal: onboardingSeguro.score_total,
            diasComAcesso: onboardingSeguro.dias_com_acesso,
            modulosUsados: onboardingSeguro.modulos_usados,
            detalhes: onboardingSeguro.detalhes_json || {},
          }
        : null,
      notifications,
    },
  };
}
