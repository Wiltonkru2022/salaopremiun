import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, Scissors, Star } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppointmentReviewForm from "@/components/client-app/ClientAppointmentReviewForm";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getClienteAppAppointmentForReview } from "@/lib/client-app/queries";

export const metadata = {
  title: "Avaliar Atendimento",
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ status?: string }>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(new Date(`${value}T12:00:00`));
}

export default async function ClienteAppointmentReviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await requireClienteAppContext();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const appointment = await getClienteAppAppointmentForReview({
    idConta: session.idConta,
    idAgendamento: id,
  });

  return (
    <ClientAppFrame
      title="Avaliar atendimento"
      subtitle="Sua opiniao ajuda o salão a melhorar"
    >
      <div className="space-y-4">
        <Link
          href="/app-cliente/agendamentos"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700"
        >
          <ArrowLeft size={18} />
          Voltar
        </Link>

        {query.status === "avaliado" ? (
          <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Avaliação enviada com sucesso.
          </div>
        ) : null}

        {!appointment ? (
          <section className="rounded-[1.8rem] border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            Não encontramos este atendimento na sua conta.
          </section>
        ) : appointment.avaliado ? (
          <section className="rounded-[1.8rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <div className="flex items-center gap-2 text-base font-black">
              <CheckCircle2 size={20} />
              Avaliação já enviada
            </div>
            <p className="mt-2 text-sm leading-6">
              Obrigado por avaliar este atendimento. Sua resposta já foi
              registrada para o salão.
            </p>
          </section>
        ) : !appointment.podeAvaliar ? (
          <section className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-5 text-amber-800">
            <div className="text-base font-black">Ainda não está liberado</div>
            <p className="mt-2 text-sm leading-6">
              A avaliação fica disponível depois que o atendimento for marcado
              como finalizado.
            </p>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[2rem] bg-zinc-950 p-5 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                <Star size={14} />
                Avalie sua experiência
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-[-0.05em]">
                Como foi seu atendimento?
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Responda em poucos segundos. O salão recebe seu feedback para
                cuidar melhor dos próximos atendimentos.
              </p>

              <div className="mt-4 grid gap-3 rounded-[1.4rem] bg-white/10 p-4">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Scissors size={17} />
                  <span>{appointment.servicoNome}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <CalendarClock size={17} />
                  <span>
                    {formatDate(appointment.data)} as{" "}
                    {appointment.horaInicio.slice(0, 5)}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {appointment.salaoNome} com {appointment.profissionalNome}
                </div>
              </div>
            </section>

            <ClientAppointmentReviewForm idAgendamento={appointment.id} />
          </>
        )}
      </div>
    </ClientAppFrame>
  );
}
