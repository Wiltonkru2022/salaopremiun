"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createClienteBookingAction,
  type ClienteBookingState,
} from "@/app/app-cliente/salao/[id]/actions";
import type {
  ClientAppProfessionalListItem,
  ClientAppServiceListItem,
} from "@/lib/client-app/queries";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando agendamento..." : "Agendar horario"}
    </button>
  );
}

export default function ClientBookingForm({
  idSalao,
  servicos,
  profissionais,
  intervaloMinutos,
}: {
  idSalao: string;
  servicos: ClientAppServiceListItem[];
  profissionais: ClientAppProfessionalListItem[];
  intervaloMinutos: number;
}) {
  const initialState: ClienteBookingState = { error: null };
  const [state, formAction] = useActionState<ClienteBookingState, FormData>(
    createClienteBookingAction,
    initialState
  );
  const [servicoId, setServicoId] = useState(servicos[0]?.id || "");

  const profissionaisFiltrados = useMemo(() => {
    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico?.profissionaisPermitidos?.length) return profissionais;
    return profissionais.filter((item) =>
      servico.profissionaisPermitidos.includes(item.id)
    );
  }, [profissionais, servicos, servicoId]);

  return (
    <form
      action={formAction}
      className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
    >
      <input type="hidden" name="salao" value={idSalao} />

      <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
        Agendar pelo app
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Escolha servico, profissional, data e horario. O pedido entra na sua
        agenda com o passo de confirmacao do salao.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Servico
          </label>
          <select
            name="servico"
            value={servicoId}
            onChange={(event) => setServicoId(event.target.value)}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          >
            <option value="">Selecione um servico</option>
            {servicos.map((servico) => (
              <option key={servico.id} value={servico.id}>
                {servico.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Profissional
          </label>
          <select
            name="profissional"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          >
            <option value="">Selecione um profissional</option>
            {profissionaisFiltrados.map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Data
            </label>
            <input
              name="data"
              type="date"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Horario
            </label>
            <input
              name="hora_inicio"
              type="time"
              step={Math.max(intervaloMinutos, 5) * 60}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Observacoes
          </label>
          <textarea
            name="observacoes"
            rows={3}
            placeholder="Se quiser, deixe um recado rapido para o salao."
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-500">
          Horarios seguem o intervalo configurado pelo salao:{" "}
          <strong>{intervaloMinutos} min</strong>.
        </div>

        <SubmitButton />
      </div>
    </form>
  );
}
