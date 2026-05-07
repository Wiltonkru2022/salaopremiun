"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, MessageCircle, Scissors, Star } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelClienteAppointmentAction,
  rescheduleClienteAppointmentAction,
  type ClienteAppointmentActionState,
} from "@/app/app-cliente/agendamentos/actions";
import type { ClientAppAppointmentListItem } from "@/lib/client-app/queries";
import ClientAppointmentReviewForm from "@/components/client-app/ClientAppointmentReviewForm";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(new Date(`${value}T12:00:00`));
}

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildWhatsappHref(item: ClientAppAppointmentListItem) {
  const destination = normalizePhone(item.salaoWhatsapp || item.salaoTelefone);
  if (!destination) return null;

  return `https://wa.me/${destination}?text=${encodeURIComponent(
    `Oi, quero falar sobre meu horario no ${item.salaoNome} em ${formatDate(item.data)} as ${item.horaInicio.slice(0, 5)} para ${item.servicoNome} com ${item.profissionalNome}.`
  )}`;
}

function formatStatus(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "pendente") return "Pendente de confirmacao";
  if (normalized === "confirmado") return "Confirmado";
  if (normalized === "cancelado") return "Cancelado";
  if (normalized === "atendido") return "Atendido";
  if (normalized === "faltou") return "Nao compareceu";
  return value || "Status";
}

function getStatusClass(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "confirmado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "pendente") return "border-amber-200 bg-amber-50 text-amber-800";
  if (normalized === "atendido") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "cancelado" || normalized === "faltou") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function ActionButton({
  idleLabel,
  pendingLabel,
  tone = "dark",
}: {
  idleLabel: string;
  pendingLabel: string;
  tone?: "dark" | "light";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-10 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "dark"
          ? "bg-zinc-950 text-white hover:opacity-95"
          : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
      }`}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

type AvailabilitySlot = {
  horaInicio: string;
  horaFim: string;
};

type AvailabilityDay = {
  data: string;
  rotulo: string;
  horarios: AvailabilitySlot[];
};

function CancelAppointmentForm({ idAgendamento }: { idAgendamento: string }) {
  const initialState: ClienteAppointmentActionState = { error: null };
  const [state, formAction] = useActionState<
    ClienteAppointmentActionState,
    FormData
  >(cancelClienteAppointmentAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="agendamento" value={idAgendamento} />
      <ActionButton
        idleLabel="Cancelar agendamento"
        pendingLabel="Cancelando..."
        tone="light"
      />
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
      const response = await fetch(`/api/app-cliente/disponibilidade?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Nao foi possivel carregar horarios.");
      }
      const nextDias = Array.isArray(payload.dias) ? payload.dias as AvailabilityDay[] : [];
      setDias(nextDias);
      setSelectedDate(nextDias[0]?.data || "");
      setSelectedTime(nextDias[0]?.horarios[0]?.horaInicio || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar horarios.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void loadAvailability()}
        className="h-10 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:opacity-95"
      >
        Reagendar
      </button>

      {open ? (
        <form action={formAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3">
          <input type="hidden" name="agendamento" value={item.id} />
          <input type="hidden" name="data" value={selectedDate} />
          <input type="hidden" name="hora_inicio" value={selectedTime} />

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              Buscando horarios livres...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : dias.length ? (
            <>
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Novo dia
                </div>
                <div className="flex flex-wrap gap-2">
                  {dias.map((dia) => (
                    <button
                      key={dia.data}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dia.data);
                        setSelectedTime(dia.horarios[0]?.horaInicio || "");
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${
                        selectedDate === dia.data
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {dia.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Novo horario
                </div>
                <div className="flex flex-wrap gap-2">
                  {horarios.map((horario) => (
                    <button
                      key={`${selectedDate}-${horario.horaInicio}`}
                      type="button"
                      onClick={() => setSelectedTime(horario.horaInicio)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${
                        selectedTime === horario.horaInicio
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {horario.horaInicio}
                    </button>
                  ))}
                </div>
              </div>

              <ActionButton
                idleLabel="Confirmar reagendamento"
                pendingLabel="Reagendando..."
              />
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              Sem horarios livres para esse atendimento.
            </div>
          )}

          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
  showAll = false,
}: {
  agendamentos: ClientAppAppointmentListItem[];
  successKey?: string | null;
  showAll?: boolean;
}) {
  const visibleAppointments = showAll ? agendamentos : agendamentos.slice(0, 10);
  const hasMore = agendamentos.length > visibleAppointments.length;
  const successMessage = useMemo(() => {
    if (successKey === "agendado") {
      return "Seu pedido foi enviado. O salao vai confirmar o horario.";
    }
    if (successKey === "cancelado") {
      return "Seu agendamento foi cancelado e o horario foi liberado.";
    }
    if (successKey === "reagendado") {
      return "Seu agendamento foi reagendado.";
    }
    if (successKey === "avaliado") {
      return "Sua avaliacao foi enviada.";
    }
    return null;
  }, [successKey]);

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] bg-zinc-950 p-5 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
              <CalendarClock size={14} />
              Meus horarios
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              Sua agenda no salao
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Veja seus proximos horarios, reagende quando precisar e avalie
              atendimentos concluidos.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <div className="text-2xl font-black">{agendamentos.length}</div>
            <div className="text-xs font-semibold text-zinc-300">registros</div>
          </div>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="space-y-3">
        {agendamentos.length ? (
          visibleAppointments.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
            >
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                      {item.salaoNome}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-base font-black tracking-[-0.03em] text-zinc-950">
                      <Scissors size={17} className="shrink-0 text-zinc-500" />
                      <span className="truncate">{item.servicoNome}</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      com {item.profissionalNome}
                    </div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${getStatusClass(item.status)}`}>
                    {formatStatus(item.status)}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Data e horario
                  </div>
                  <div className="mt-1 text-sm font-bold text-zinc-900">
                    {formatDate(item.data)} as {item.horaInicio.slice(0, 5)}
                    {item.horaFim ? ` ate ${item.horaFim.slice(0, 5)}` : ""}
                  </div>
                </div>

                {item.observacoes ? (
                  <p className="text-sm leading-6 text-zinc-500">
                    {item.observacoes}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {buildWhatsappHref(item) ? (
                    <a
                      href={buildWhatsappHref(item) || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                  ) : null}

                  {item.podeAvaliar ? (
                    <Link
                      href={`/app-cliente/agendamentos/${item.id}/avaliar`}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white"
                    >
                      <Star size={16} />
                      Avaliar
                    </Link>
                  ) : null}
                </div>

                {item.podeCancelar ? (
                  <div className="space-y-3 border-t border-zinc-100 pt-3">
                    <RescheduleAppointmentForm item={item} />
                    <CancelAppointmentForm idAgendamento={item.id} />
                  </div>
                ) : null}

                {item.podeAvaliar ? (
                  <ClientAppointmentReviewForm idAgendamento={item.id} compact />
                ) : null}

                {item.avaliado ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Avaliacao enviada para este atendimento.
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
            Ainda nao encontramos agendamentos para esta conta. Assim que voce
            marcar um horario, ele aparece aqui.
          </div>
        )}
      </div>

      {hasMore ? (
        <div className="rounded-[1.4rem] border border-dashed border-zinc-300 bg-white px-4 py-3 text-center">
          <Link
            href="/app-cliente/agendamentos?todos=1"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-800"
          >
            Ver mais agendamentos
            <ChevronRight size={16} />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
