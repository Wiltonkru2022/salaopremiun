import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClienteSalaoReservaLoading() {
  return (
    <ClientAppPageSkeleton
      title="Reserva online"
      subtitle="Carregando fluxo de reserva."
      panels={2}
      dark
    />
  );
}
