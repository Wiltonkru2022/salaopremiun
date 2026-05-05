import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppointmentsManager from "@/components/client-app/ClientAppointmentsManager";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { listClienteAppAppointments } from "@/lib/client-app/queries";

export default async function ClienteAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await requireClienteAppContext();
  const agendamentos = await listClienteAppAppointments({
    idConta: session.idConta,
  });
  const params = searchParams ? await searchParams : undefined;

  return (
    <ClientAppFrame
      title="Meus agendamentos"
      subtitle={`Acompanhamento de ${session.nome}`}
    >
      <ClientAppointmentsManager
        agendamentos={agendamentos}
        successKey={params?.status || null}
      />
    </ClientAppFrame>
  );
}
