import {
  PainelDashboardSkeleton,
  PainelPageHeader,
} from "@/components/painel-ui";

export default function PainelLoading() {
  return (
    <div className="space-y-3">
      <PainelPageHeader
        title="Carregando painel"
        description="Preparando sua area de trabalho com os dados mais recentes."
      />
      <PainelDashboardSkeleton />
    </div>
  );
}
