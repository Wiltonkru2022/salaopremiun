"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelClienteAppointmentAction,
  rescheduleClienteAppointmentAction,
  type ClienteAppointmentActionState,
} from "@/app/app-cliente/agendamentos/actions";
import ClientAppointmentReviewForm from "@/components/client-app/ClientAppointmentReviewForm";
import PaginationControls from "@/components/ui/PaginationControls";
import type { ClientAppAppointmentListItem } from "@/lib/client-app/queries";

type AvailabilitySlot = {
  horaInicio: string;
  horaFim: string;
};

type AvailabilityDay = {
  data: string;
  rotulo: string;
  horarios: AvailabilitySlot[];
};

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" })
    .format(new Date(`${value}T12:00:00`))
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric" }).format(
    new Date(`${value}T12:00:00`)
  );
}

function formatStatus(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "pendente") return "Pendente";
  if (normalized === "confirmado") return "Confirmada";
  if (normalized === "cancelado") return "Cancelada";
  if (normalized === "atendido") return "Finalizada";
  if (normalized === "faltou") return "Nao compareceu";
  return value || "Status";
}

function canBookAgain(item: ClientAppAppointmentListItem) {
  return Boolean(item.idSalao);
}

function ActionButton({
  label,
  pendingLabel,
  tone = "dark",
}: {
  label: string;
  pendingLabel: string;
  tone?: "dark" | "light" | "danger";
}) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "danger"
      ? "border border-red-200 bg-red-50 text-red-700"
      : tone === "light"
        ? "border border-zinc-200 bg-white text-zinc-900"
        : "bg-teal-600 text-white";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-11 rounded-xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function CancelAppointmentForm({ idAgendamento }: { idAgendamento: string }) {
  const initialState: ClienteAppointmentActionState = { error: null };
  const [state, formAction] = useActionState<
    ClienteAppointmentActionState,
    FormData
  >(cancelClienteAppointmentAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="agendamento" value={idAgendamento} />
      <ActionButton label="Cancelar" pendingLabel="Cancelando..." tone="light" />
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      ) : null}
    </form>
  );
}

function RescheduleAppointmentForm({
  item,
}: {
  item: ClientAppAppointmentListItem;
}) {
  const initialState: ClienteAppointmentActionState = { error: null };
  const [state, formAction] = useActionState<
    ClienteAppointmentActionState,
    FormData
  >(rescheduleClienteAppointmentAction, initialState);
  const [open, setOpen] = useState(false);
  const [dias, setDias] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const horarios = useMemo(
    () => dias.find((dia) => dia.data === selectedDate)?.horarios || [],
    [dias, selectedDate]
  );

  async function loadAvailability() {
    setOpen(true);
    if (dias.length || loading) return;

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        salao: item.idSalao,
        servico: item.idServico,
        profissional: item.idProfissional,
        ignorar: item.id,
      });
      const response = await fetch(
        `/api/app-cliente/disponibilidade?${params.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Nao foi possivel carregar horarios.");
      }
      const nextDias = Array.isArray(payload.dias)
        ? (payload.dias as AvailabilityDay[])
        : [];
      setDias(nextDias);
      setSelectedDate(nextDias[0]?.data || "");
      setSelectedTime(nextDias[0]?.horarios[0]?.horaInicio || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nao foi possivel carregar horarios."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void loadAvailability()}
        className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-900"
      >
        Reagendar
      </button>

      {open ? (
        <form action={formAction} className="space-y-3 rounded-2xl bg-zinc-50 p-3">
          <input type="hidden" name="agendamento" value={item.id} />
          <input type="hidden" name="data" value={selectedDate} />
          <input type="hidden" name="hora_inicio" value={selectedTime} />

          {loading ? (
            <div className="rounded-xl bg-white px-3 py-2 text-sm text-zinc-500">
              Buscando horarios livres...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : dias.length ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dias.map((dia) => (
                  <button
                    key={dia.data}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dia.data);
                      setSelectedTime(dia.horarios[0]?.horaInicio || "");
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-black ${
                      selectedDate === dia.data
                        ? "bg-zinc-950 text-white"
                        : "bg-white text-zinc-700"
                    }`}
                  >
                    {dia.rotulo}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {horarios.map((horario) => (
                  <button
                    key={`${selectedDate}-${horario.horaInicio}`}
                    type="button"
                    onClick={() => setSelectedTime(horario.horaInicio)}
                    className={`rounded-full px-4 py-2 text-sm font-black ${
                      selectedTime === horario.horaInicio
                        ? "bg-teal-600 text-white"
                        : "bg-white text-zinc-700"
                    }`}
                  >
                    {horario.horaInicio}
                  </button>
                ))}
              </div>
              <ActionButton
                label="Confirmar"
                pendingLabel="Reagendando..."
              />
            </>
          ) : (
            <div className="rounded-xl bg-white px-3 py-2 text-sm text-zinc-500">
              Sem horarios livres para esse atendimento.
            </div>
          )}

          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.error}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

export default function ClientAppointmentsManager({
  agendamentos,
  successKey,
  currentPage = 0,
  hasMore = false,
}: {
  agendamentos: ClientAppAppointmentListItem[];
  successKey?: string | null;
  currentPage?: number;
  hasMore?: boolean;
}) {
  const successMessage = useMemo(() => {
    if (successKey === "agendado") {
      return "Seu pedido foi enviado. O salao vai confirmar o horario.";
    }
    if (successKey === "cancelado") {
      return "Seu agendamento foi cancelado e o horario foi liberado.";
    }
    if (successKey === "reagendado") return "Seu agendamento foi reagendado.";
    if (successKey === "avaliado") return "Sua avaliacao foi enviada.";
    return null;
  }, [successKey]);

  return (
    <section className="space-y-4 px-4 md:px-6">
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {agendamentos.length ? (
          agendamentos.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[1fr_96px] gap-4 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
            >
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                  {formatStatus(item.status)}
                </span>
                <h2 className="mt-3 break-words text-xl font-black text-zinc-950">
                  {item.servicoNome}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  com {item.profissionalNome}
                </p>
                <p className="mt-3 text-base font-semibold text-zinc-900">
                  {item.salaoNome}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canBookAgain(item) ? (
                    <Link
                      href={`/app-cliente/salao/${item.idSalao}`}
                      className="inline-flex h-11 items-center rounded-xl bg-teal-600 px-4 text-sm font-black text-white"
                    >
                      Reserve novamente
                    </Link>
                  ) : null}
                  {item.podeCancelar ? (
                    <>
                      <RescheduleAppointmentForm item={item} />
                      <CancelAppointmentForm idAgendamento={item.id} />
                    </>
                  ) : null}
                  {item.podeAvaliar ? (
                    <Link
                      href={`/app-cliente/agendamentos/${item.id}/avaliar`}
                      className="inline-flex h-11 items-center rounded-xl bg-zinc-950 px-4 text-sm font-black text-white"
                    >
                      Avaliar
                    </Link>
                  ) : null}
                </div>

                {item.podeAvaliar ? (
                  <div className="mt-4">
                    <ClientAppointmentReviewForm idAgendamento={item.id} compact />
                  </div>
                ) : null}
                {item.avaliado ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    Avaliacao enviada.
                  </div>
                ) : null}
              </div>

              <div className="border-l border-zinc-200 pl-4 text-center">
                <div className="text-sm text-zinc-600">{formatMonth(item.data)}</div>
                <div className="text-5xl font-light leading-none text-zinc-950">
                  {formatDay(item.data)}
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {item.horaInicio.slice(0, 5)}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-[1.5rem] bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-6 h-24 w-36 rounded-2xl border border-zinc-200 bg-zinc-50" />
            <h2 className="text-2xl font-black text-zinc-950">
              Ainda nao ha agendamentos
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              Quando voce reservar um horario, ele aparece aqui com status,
              reagendamento, cancelamento e avaliacao.
            </p>
            <Link
              href="/app-cliente/inicio"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-teal-600 px-6 text-sm font-black text-white"
            >
              Agende ja
            </Link>
          </div>
        )}
      </div>

      {hasMore ? (
        <div className="rounded-[1.4rem] border border-dashed border-zinc-300 bg-white px-4 py-3">
          <PaginationControls
            currentPage={currentPage}
            pageSize={10}
            hasMore={hasMore}
            buildHref={(page) => `/app-cliente/agendamentos?pagina=${page + 1}`}
          />
        </div>
      ) : null}
    </section>
  );
}
