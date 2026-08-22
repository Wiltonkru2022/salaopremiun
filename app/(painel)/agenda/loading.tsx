import {
  PainelAgendaSkeleton,
  PainelPageHeader,
} from "@/components/painel-ui";

export default function Loading() {
  return (
    <div className="space-y-3">
      <PainelPageHeader
        title="Abrindo agenda"
        description="Preparando profissionais, horarios e atendimentos."
      />
      <PainelAgendaSkeleton />
    </div>
  );
}
