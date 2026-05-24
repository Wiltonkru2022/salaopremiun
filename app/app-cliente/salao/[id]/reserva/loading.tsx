import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClienteSalaoReservaLoading() {
  return (
    <ClientAppPageSkeleton
      title="Reserva online"
      subtitle="Carregando horários e serviços."
      panels={3}
      dark
    />
  );
}
