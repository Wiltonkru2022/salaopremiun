import AppShell from "@/components/layout/AppShell";
import { loadPainelShellData } from "@/lib/painel/load-painel-shell-data";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await loadPainelShellData();

  if (!result.ok) {
    return <div className="p-6 text-red-600">{result.error}</div>;
  }

  const data = result.data;

  return (
    <AppShell
      idSalao={data.idSalao}
      idUsuario={data.idUsuario}
      userName={data.userName}
      userEmail={data.userEmail}
      permissoes={data.permissoes}
      nivel={data.nivel}
      salaoNome={data.salaoNome}
      salaoResponsavel={data.salaoResponsavel}
      salaoLogoUrl={data.salaoLogoUrl}
      planoNome={data.planoNome}
      assinaturaStatus={data.assinaturaStatus}
      resumoAssinatura={data.resumoAssinatura}
      notifications={data.notifications}
    >
      {children}
    </AppShell>
  );
}
