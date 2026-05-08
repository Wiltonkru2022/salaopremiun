import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppointmentsManager from "@/components/client-app/ClientAppointmentsManager";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { listClienteAppAppointments } from "@/lib/client-app/queries";

export default async function ClienteAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; pagina?: string }>;
}) {
  const session = await requireClienteAppContext();
  const params = searchParams ? await searchParams : undefined;
  const paginaAtual = Math.max(0, Number(params?.pagina || 1) - 1);
  const pageSize = 10;
  const agendamentos = await listClienteAppAppointments({
    idConta: session.idConta,
    page: paginaAtual,
    limit: pageSize + 1,
  });
  const hasMore = agendamentos.length > pageSize;

  return (
    <ClientAppFrame
      title="Meus agendamentos"
      subtitle={`Tudo certo, ${session.nome}. Veja o que esta marcado e o que ja pode avaliar.`}
    >
      <ClientAppointmentsManager
        agendamentos={agendamentos.slice(0, pageSize)}
        successKey={params?.status || null}
        currentPage={paginaAtual}
        hasMore={hasMore}
      />
    </ClientAppFrame>
  );
}
