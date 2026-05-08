import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClienteAgendamentosLoading() {
  return (
    <ClientAppPageSkeleton
      title="Meus agendamentos"
      subtitle="Buscando seus próximos horários."
      panels={4}
    />
  );
}
