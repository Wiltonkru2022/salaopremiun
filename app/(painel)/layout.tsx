import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import PanelFormPendingGuard from "@/components/layout/PanelFormPendingGuard";
import { loadPainelShellData } from "@/lib/painel/load-painel-shell-data";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await loadPainelShellData();

  if (!result.ok) {
    console.error("[PAINEL_SHELL_LOAD_ERROR]", result.error);
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-zinc-950">
            Não foi possível carregar o painel
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Tente atualizar a página. Se o problema continuar, aguarde alguns instantes e tente novamente.
          </p>
          <a
            href="/dashboard"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white"
          >
            Tentar novamente
          </a>
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
    >
      <PanelFormPendingGuard />
      {children}
    </AppShell>
  );
}
