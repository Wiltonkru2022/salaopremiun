"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  reviewClienteAppointmentAction,
  type ClienteAppointmentActionState,
} from "@/app/app-cliente/agendamentos/actions";

function ReviewButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando avaliacao..." : "Enviar avaliacao"}
    </button>
  );
}

export default function ClientAppointmentReviewForm({
  idAgendamento,
  compact = false,
}: {
  idAgendamento: string;
  compact?: boolean;
}) {
  const initialState: ClienteAppointmentActionState = { error: null };
  const [state, formAction] = useActionState<
    ClienteAppointmentActionState,
    FormData
  >(reviewClienteAppointmentAction, initialState);
  const [nota, setNota] = useState("5");

  return (
    <form
      action={formAction}
      className={`space-y-4 rounded-[22px] border border-zinc-200 bg-white ${
        compact ? "p-3" : "p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
      }`}
    >
      <input type="hidden" name="agendamento" value={idAgendamento} />

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          Nota
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[5, 4, 3, 2, 1].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setNota(String(value))}
              className={`h-12 rounded-2xl border text-sm font-black transition ${
                nota === String(value)
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white"
              }`}
              aria-pressed={nota === String(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <input type="hidden" name="nota" value={nota} />
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          Comentario
        </label>
        <textarea
          name="comentario"
          rows={compact ? 3 : 5}
          placeholder="Conte como foi sua experiencia."
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <ReviewButton />
    </form>
  );
}
