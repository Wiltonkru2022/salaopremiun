import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppointmentsManager from "@/components/client-app/ClientAppointmentsManager";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { listClienteAppAppointments } from "@/lib/client-app/queries";

export default async function ClienteAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; todos?: string }>;
}) {
  const session = await requireClienteAppContext();
  const agendamentos = await listClienteAppAppointments({
    idConta: session.idConta,
  });
  const params = searchParams ? await searchParams : undefined;

  return (
    <ClientAppFrame
      title="Meus agendamentos"
      subtitle={`Tudo certo, ${session.nome}. Veja o que esta marcado e o que ja pode avaliar.`}
    >
      <ClientAppointmentsManager
        agendamentos={agendamentos}
        successKey={params?.status || null}
        showAll={params?.todos === "1"}
      />
    </ClientAppFrame>
  );
}
