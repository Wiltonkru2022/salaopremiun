import AppShell from "@/components/layout/AppShell";
import { getUser } from "@/lib/auth/get-user";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { buildShellNotifications } from "@/lib/notifications/shell-notifications";
import { createClient } from "@/lib/supabase/server";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/components/caixa/permissions";
import { redirect } from "next/navigation";

type Permissoes = Record<string, boolean>;

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
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

  const [{ data: permissoes }, { data: salao }, { data: assinatura }] =
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
  });

  return (
    <AppShell
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
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
