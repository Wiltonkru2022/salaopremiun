"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelClienteAppointmentAction,
  reviewClienteAppointmentAction,
  type ClienteAppointmentActionState,
} from "@/app/app-cliente/agendamentos/actions";
import type { ClientAppAppointmentListItem } from "@/lib/client-app/queries";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(new Date(`${value}T12:00:00`));
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
      return "Seu pedido de agendamento foi enviado com sucesso.";
    }
    if (successKey === "cancelado") {
      return "Seu agendamento foi cancelado.";
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
                <CancelAppointmentForm idAgendamento={item.id} />
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
