import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppointmentsManager from "@/components/client-app/ClientAppointmentsManager";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { listClienteAppAppointments } from "@/lib/client-app/queries";

export const metadata = {
  title: "Meus Agendamentos",
};

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
      subtitle={`Tudo certo, ${session.nome}. Veja o que está marcado e o que já pode avaliar.`}
    >
      <section className="mx-auto min-h-dvh max-w-3xl bg-white px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)] text-zinc-950">
        <header className="mb-8 flex items-center gap-4">
          <Link
            href="/app-cliente"
            className="flex h-12 w-12 items-center justify-center -ml-2"
            aria-label="Voltar"
          >
            <ArrowLeft size={34} />
          </Link>
          <h1 className="min-w-0 flex-1 whitespace-nowrap text-[1.85rem] font-black leading-none tracking-[-0.05em]">
            Meus agendamentos
          </h1>
        </header>
        <ClientAppointmentsManager
          agendamentos={agendamentos.slice(0, pageSize)}
          successKey={params?.status || null}
          currentPage={paginaAtual}
          hasMore={hasMore}
        />
      </section>
    </ClientAppFrame>
  );
}
