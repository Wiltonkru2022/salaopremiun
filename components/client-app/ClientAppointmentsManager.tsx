"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelClienteAppointmentAction,
  rescheduleClienteAppointmentAction,
  reviewClienteAppointmentAction,
  type ClienteAppointmentActionState,
} from "@/app/app-cliente/agendamentos/actions";
import type { ClientAppAppointmentListItem } from "@/lib/client-app/queries";

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

function ReviewAppointmentForm({ idAgendamento }: { idAgendamento: string }) {
  const initialState: ClienteAppointmentActionState = { error: null };
  const [state, formAction] = useActionState<
    ClienteAppointmentActionState,
    FormData
  >(reviewClienteAppointmentAction, initialState);
  const [nota, setNota] = useState("5");

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <input type="hidden" name="agendamento" value={idAgendamento} />
      <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Nota
          </label>
          <select
            name="nota"
            value={nota}
            onChange={(event) => setNota(event.target.value)}
            className="h-10 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Comentario
          </label>
          <textarea
            name="comentario"
            rows={3}
            placeholder="Conte como foi a experiencia."
            className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      ) : null}

      <ActionButton idleLabel="Enviar avaliacao" pendingLabel="Enviando..." />
    </form>
  );
}

export default function ClientAppointmentsManager({
  agendamentos,
  successKey,
}: {
  agendamentos: ClientAppAppointmentListItem[];
  successKey?: string | null;
}) {
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
    <section className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
        Sua agenda no salao
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Acompanhe seus horarios, cancele quando precisar e avalie os atendimentos
        concluidos.
      </p>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {agendamentos.length ? (
          agendamentos.map((item) => (
            <article
              key={item.id}
              className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
            >
              {buildWhatsappHref(item) ? (
                <div className="flex justify-end">
                  <a
                    href={buildWhatsappHref(item) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Falar no WhatsApp
                  </a>
                </div>
              ) : null}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                    {item.salaoNome}
                  </div>
                  <div className="text-sm font-bold text-zinc-950">
                    {item.servicoNome}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    com {item.profissionalNome}
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
                  {formatStatus(item.status)}
                </div>
              </div>

              <div className="text-sm leading-6 text-zinc-600">
                {formatDate(item.data)} as {item.horaInicio.slice(0, 5)}
                {item.horaFim ? ` ate ${item.horaFim.slice(0, 5)}` : ""}
              </div>

              {item.observacoes ? (
                <p className="text-sm leading-6 text-zinc-500">
                  {item.observacoes}
                </p>
              ) : null}

              {item.podeCancelar ? (
                <div className="space-y-3">
                  <RescheduleAppointmentForm item={item} />
                  <CancelAppointmentForm idAgendamento={item.id} />
                </div>
              ) : null}

              {item.podeAvaliar ? (
                <ReviewAppointmentForm idAgendamento={item.id} />
              ) : null}

              {item.avaliado ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Avaliacao enviada para este atendimento.
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
            Ainda nao encontramos agendamentos para esta conta. Assim que voce
            marcar um horario, ele aparece aqui.
          </div>
        )}
      </div>
    </section>
  );
}
