import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { listClienteAppAppointments } from "@/lib/client-app/queries";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(new Date(`${value}T12:00:00`));
}

export default async function ClienteAppointmentsPage() {
  const session = await requireClienteAppContext();
  const agendamentos = await listClienteAppAppointments({
    idCliente: session.idCliente,
    idSalao: session.idSalao,
  });

  return (
    <ClientAppFrame
      title="Meus agendamentos"
      subtitle={`Acompanhamento de ${session.nome}`}
    >
      <section className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
          Sua agenda no salao
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Essa primeira fase ja entrega login proprio e historico enxuto do
          cliente. A criacao do agendamento vem no proximo bloco.
        </p>

        <div className="mt-5 space-y-3">
          {agendamentos.length ? (
            agendamentos.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-zinc-950">
                      {item.servicoNome}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      com {item.profissionalNome}
                    </div>
                  </div>
                  <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
                    {item.status}
                  </div>
                </div>
                <div className="mt-3 text-sm leading-6 text-zinc-600">
                  {formatDate(item.data)} as {item.horaInicio.slice(0, 5)}
                  {item.horaFim ? ` ate ${item.horaFim.slice(0, 5)}` : ""}
                </div>
                {item.observacoes ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {item.observacoes}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
              Ainda nao encontramos agendamentos para esta conta. Quando o salao
              fizer um novo horario para voce, ele aparece aqui.
            </div>
          )}
        </div>
      </section>
    </ClientAppFrame>
  );
}
