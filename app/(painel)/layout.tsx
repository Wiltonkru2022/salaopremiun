import AppShell from "@/components/layout/AppShell";
import { getUser } from "@/lib/auth/get-user";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { buildShellNotifications } from "@/lib/notifications/shell-notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

type Permissoes = Record<string, boolean>;

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user.user_metadata?.nome || user.email?.split("@")[0] || "Usuario";

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, id_salao, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario) {
    return (
      <div className="p-6 text-red-600">
        Erro ao carregar usuario do sistema.
      </div>
    );
  }

  if (usuario.status !== "ativo") {
    return <div className="p-6 text-red-600">Usuario inativo.</div>;
  }

  const [
    { data: permissoes },
    { data: salao },
    { data: assinatura },
    { data: tickets },
    { data: onboarding },
  ] =
    await Promise.all([
      supabase
        .from("usuarios_permissoes")
        .select("*")
        .eq("id_usuario", usuario.id)
        .eq("id_salao", usuario.id_salao)
        .maybeSingle(),

      supabase
        .from("saloes")
        .select("id, nome, responsavel, logo_url, plano, status")
        .eq("id", usuario.id_salao)
        .maybeSingle(),

      supabase
        .from("assinaturas")
        .select("status, plano, vencimento_em, trial_fim_em")
        .eq("id_salao", usuario.id_salao)
        .maybeSingle(),
      supabaseAdmin
        .from("tickets")
        .select("id, numero, assunto, prioridade, status, ultima_interacao_em")
        .eq("id_salao", usuario.id_salao)
        .in("status", [
          "aberto",
          "em_atendimento",
          "aguardando_cliente",
          "aguardando_tecnico",
        ])
        .order("ultima_interacao_em", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("score_onboarding_salao")
        .select("score_total, dias_com_acesso, modulos_usados, detalhes_json")
        .eq("id_salao", usuario.id_salao)
        .maybeSingle(),
    ]);

  const permissoesPadrao = buildPermissoesByNivel(usuario.nivel);
  const permissoesDb = sanitizePermissoesDb(permissoes as Permissoes | null);

  const permissoesFinal: Permissoes = {
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

  const resumoAssinatura = assinatura
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
    onboarding: onboarding
      ? {
          score_total: onboarding.score_total,
          dias_com_acesso: onboarding.dias_com_acesso,
          modulos_usados: onboarding.modulos_usados,
          detalhes_json:
            onboarding.detalhes_json &&
            typeof onboarding.detalhes_json === "object"
              ? (onboarding.detalhes_json as Record<string, unknown>)
              : {},
        }
      : null,
    tickets: (tickets as
      | Array<{
          id: string;
          numero?: number | string | null;
          assunto?: string | null;
          prioridade?: string | null;
          status?: string | null;
          ultima_interacao_em?: string | null;
        }>
      | null) || [],
  });

  return (
    <AppShell
      idSalao={usuario.id_salao}
      idUsuario={usuario.id}
      userName={userName}
      userEmail={user.email || ""}
      permissoes={permissoesFinal}
      nivel={usuario.nivel}
      salaoNome={salao?.nome || "SalaoPremium"}
      salaoResponsavel={salao?.responsavel || userName}
      salaoLogoUrl={salao?.logo_url || null}
      planoNome={assinatura?.plano || salao?.plano || "Sem plano"}
      assinaturaStatus={assinatura?.status || salao?.status || null}
      resumoAssinatura={resumoAssinatura}
      onboarding={
        onboarding
          ? {
              scoreTotal: onboarding.score_total,
              diasComAcesso: onboarding.dias_com_acesso,
              modulosUsados: onboarding.modulos_usados,
              detalhes:
                onboarding.detalhes_json &&
                typeof onboarding.detalhes_json === "object"
                  ? (onboarding.detalhes_json as Record<string, unknown>)
                  : {},
            }
          : null
      }
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
