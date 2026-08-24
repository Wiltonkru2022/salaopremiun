import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PanelFormPendingGuard from "@/components/layout/PanelFormPendingGuard";
import PartnerAdSlot from "@/components/parcerias/PartnerAdSlot";
import { loadPainelShellData } from "@/lib/painel/load-painel-shell-data";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { hasAal2 } from "@/lib/auth/mfa-assurance";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function requireOnboardingConcluido() {
  const { user, usuario } = await getPainelUserContext({ allowAdminAal1: true });
  if (!user || !usuario?.id_salao) redirect("/login?motivo=sessao_expirada");

  if (String(usuario.nivel || "").toLowerCase() === "admin" && !(await hasAal2())) {
    redirect("/seguranca/mfa?next=/dashboard");
  }

  const admin = getSupabaseAdmin() as any;
  const { data, error } = await admin
    .from("saloes")
    .select("onboarding_concluido, produtos_modulo_ativo")
    .eq("id", usuario.id_salao)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Nao foi possivel validar a configuracao inicial do salao.");
  }
  if (data.onboarding_concluido !== true) redirect("/onboarding-salao");

  return { produtosModuloAtivo: data.produtos_modulo_ativo !== false };
}

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  let operational: { produtosModuloAtivo: boolean };
  try {
    operational = await requireOnboardingConcluido();
  } catch (error) {
    console.error("[PAINEL_ONBOARDING_GUARD_ERROR]", error);
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-xl rounded-[28px] border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-zinc-950">Não foi possível validar seu cadastro</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Por segurança, o painel só é liberado depois que o sistema confirma a conclusão da configuração inicial. Atualize a página para tentar novamente.</p>
          <Link href="/onboarding-salao" className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white">Ver configuração inicial</Link>
        </div>
      </main>
    );
  }

  const result = await loadPainelShellData();
  if (!result.ok) {
    console.error("[PAINEL_SHELL_LOAD_ERROR]", result.error);
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-zinc-950">Não foi possível carregar o painel</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Tente atualizar a página. Se o problema continuar, aguarde alguns instantes e tente novamente.</p>
          <Link href="/dashboard" prefetch className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white">Tentar novamente</Link>
        </div>
      </main>
    );
  }

  const data = result.data;
  return (
    <AppShell
      idSalao={data.idSalao}
      idUsuario={data.idUsuario}
      userName={data.userName}
      userEmail={data.userEmail}
      permissoes={data.permissoes}
      planoRecursos={data.planoRecursos}
      nivel={data.nivel}
      salaoNome={data.salaoNome}
      salaoResponsavel={data.salaoResponsavel}
      salaoLogoUrl={data.salaoLogoUrl}
      planoNome={data.planoNome}
      assinaturaStatus={data.assinaturaStatus}
      resumoAssinatura={data.resumoAssinatura}
      notifications={data.notifications}
      produtosModuloAtivo={operational.produtosModuloAtivo}
    >
      <PanelFormPendingGuard />
      <PartnerAdSlot idSalao={data.idSalao} />
      {children}
    </AppShell>
  );
}
