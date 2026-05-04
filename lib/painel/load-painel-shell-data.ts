import { redirect } from "next/navigation";
import { buildLoginRedirectUrl } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { buildShellNotifications } from "@/lib/notifications/shell-notifications";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { getPlanoCatalogo } from "@/lib/plans/catalog";
import { PERMISSIONS } from "@/lib/permissions";

type PermissoesDbRow = Record<string, boolean | string | null>;

export async function loadPainelShellData() {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect(buildLoginRedirectUrl("sessao_expirada"));
  }

  const user = session.user;
  const userName =
    user.user_metadata?.nome || user.email?.split("@")[0] || "Usuario";

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, id_salao, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    return {
      ok: false as const,
      error: usuarioError.message || "Erro ao carregar usuario do sistema.",
    };
  }

  if (!usuario?.id || !usuario.id_salao) {
    return {
      ok: false as const,
      error: "Erro ao carregar usuario do sistema.",
    };
  }

  if (usuario.status !== "ativo") {
    redirect(buildLoginRedirectUrl("usuario_inativo"));
  }

  const permissionsSelect = ["id_usuario", "id_salao", ...Object.keys(PERMISSIONS)].join(", ");

  const { data: permissoes } = await supabase
    .from("usuarios_permissoes")
    .select(permissionsSelect)
    .eq("id_usuario", usuario.id)
    .eq("id_salao", usuario.id_salao)
    .maybeSingle();
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

  const [{ data: salao }, { data: assinatura }] = await Promise.all([
    supabase
      .from("saloes")
      .select("nome, responsavel, logo_url, plano, status")
      .eq("id", usuario.id_salao)
      .maybeSingle(),
    supabase
      .from("assinaturas")
      .select("status, plano, vencimento_em, trial_fim_em")
      .eq("id_salao", usuario.id_salao)
      .limit(1)
      .maybeSingle(),
  ]);

  const resumoAssinatura = assinatura?.status
    ? getResumoAssinatura({
        status: assinatura.status,
        vencimentoEm: assinatura.vencimento_em,
        trialFimEm: assinatura.trial_fim_em,
      })
    : null;

  const notifications = buildShellNotifications({
    resumoAssinatura,
    clientes: [],
    agendamentos: [],
    movimentosCaixa: [],
    onboarding: null,
    tickets: [],
  });

  const planoAccess = await getPlanoAccessSnapshot(usuario.id_salao);
  const planoCatalogo = getPlanoCatalogo(planoAccess.planoCodigo);

  return {
    ok: true as const,
    data: {
      idSalao: usuario.id_salao,
      idUsuario: usuario.id,
      userName,
      userEmail: user.email || "",
      nivel: String(usuario.nivel || ""),
      permissoes: permissoesFinal,
      salaoNome: salao?.nome || "SalaoPremium",
      salaoResponsavel: salao?.responsavel || userName,
      salaoLogoUrl: salao?.logo_url || null,
      planoNome: planoCatalogo.nome,
      assinaturaStatus: assinatura?.status || salao?.status || null,
      resumoAssinatura,
      planoRecursos: planoAccess.recursos,
      notifications,
    },
  };
}
