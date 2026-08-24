import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
import ClientAppointmentsManager from "@/components/client-app/ClientAppointmentsManager";
import ClientBookingDraftCleanup from "@/components/client-app/ClientBookingDraftCleanup";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { listClienteAppAppointments } from "@/lib/client-app/queries";
import { getSalonTimeZoneMap } from "@/lib/client-app/appointment-timezones.server";
import { toDeterministicSalonLocalDateTime } from "@/lib/client-app/deterministic-date";

export const metadata = {
  title: "Meus Agendamentos",
};

function bookedForAnotherPersonName(observacoes?: string | null) {
  const value = String(observacoes || "");
  const match = /Reserva para outra pessoa:\s*([^.\n]+)\./i.exec(value);
  const nome = String(match?.[1] || "").trim();
  return nome && nome.toLowerCase() !== "nome não informado" ? nome : null;
}

export default async function ClienteAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; pagina?: string; salao?: string }>;
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
  const salonTimeZones = await getSalonTimeZoneMap(
    agendamentos.map((item) => item.idSalao)
  );
  const hydrationStableAppointments = agendamentos.map((item) => {
    const outraPessoa = bookedForAnotherPersonName(item.observacoes);
    return {
      ...item,
      salaoNome: outraPessoa ? `${item.salaoNome} · Agendado por você` : item.salaoNome,
      servicoNome: outraPessoa ? `${item.servicoNome} · Para ${outraPessoa}` : item.servicoNome,
      criadoEm: toDeterministicSalonLocalDateTime(
        item.criadoEm,
        salonTimeZones.get(item.idSalao)
      ),
    };
  });

  return (
    <ClientAppFrame
      title="Meus agendamentos"
      subtitle={`Tudo certo, ${session.nome}. Veja o que está marcado e o que já pode avaliar.`}
    >
      <section className="mx-auto min-h-dvh max-w-3xl bg-white px-5 pb-28 pt-0 text-zinc-950">
        {params?.status === "agendado" ? (
          <ClientBookingDraftCleanup idSalao={params.salao || null} />
        ) : null}
        <header className="sp-mobile-fixed sticky top-0 z-50 -mx-5 mb-8 flex items-center gap-3 border-b border-zinc-100 bg-white/96 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)] backdrop-blur-xl">
          <Link
            href="/app-cliente"
            className="flex h-12 w-12 shrink-0 items-center justify-center -ml-2"
            aria-label="Voltar"
          >
            <ArrowLeft size={34} />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-[1.85rem] font-black leading-none tracking-[-0.05em]">
            Meus agendamentos
          </h1>
          <ClientAppDrawerNav />
        </header>
        <ClientAppointmentsManager
          agendamentos={hydrationStableAppointments.slice(0, pageSize)}
          successKey={params?.status || null}
          currentPage={paginaAtual}
          hasMore={hasMore}
        />
      </section>
    </ClientAppFrame>
  );
}
