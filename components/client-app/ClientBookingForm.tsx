"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createClienteBookingAction,
  type ClienteBookingState,
} from "@/app/app-cliente/salao/[id]/actions";
import type {
  ClientAppProfessionalListItem,
  ClientAppServiceListItem,
} from "@/lib/client-app/queries";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando agendamento..." : "Agendar horario"}
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
  const [profissionalId, setProfissionalId] = useState("");
  const [diasDisponiveis, setDiasDisponiveis] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bufferMinutos, setBufferMinutos] = useState(5);

  const profissionaisFiltrados = useMemo(() => {
    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico?.profissionaisPermitidos?.length) return profissionais;
    return profissionais.filter((item) =>
      servico.profissionaisPermitidos.includes(item.id)
    );
  }, [profissionais, servicos, servicoId]);

  const horariosDoDiaSelecionado = useMemo(
    () => diasDisponiveis.find((dia) => dia.data === selectedDate)?.horarios || [],
    [diasDisponiveis, selectedDate]
  );
  const canSubmit = Boolean(servicoId && profissionalId && selectedDate && selectedTime);

  useEffect(() => {
    if (!profissionaisFiltrados.some((item) => item.id === profissionalId)) {
      setProfissionalId("");
    }
  }, [profissionaisFiltrados, profissionalId]);

  useEffect(() => {
    setDiasDisponiveis([]);
    setSelectedDate("");
    setSelectedTime("");
    setAvailabilityError(null);

    if (!servicoId || !profissionalId) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      salao: idSalao,
      servico: servicoId,
      profissional: profissionalId,
    });

    setLoadingAvailability(true);

    fetch(`/api/app-cliente/disponibilidade?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error || "Nao foi possivel carregar os horarios agora."
          );
        }

        const dias = Array.isArray(payload.dias) ? (payload.dias as AvailabilityDay[]) : [];
        setDiasDisponiveis(dias);
        setBufferMinutos(Number(payload.bufferMinutos || 5) || 5);

        if (dias.length) {
          setSelectedDate(dias[0].data);
          setSelectedTime(dias[0].horarios[0]?.horaInicio || "");
        } else {
          setSelectedDate("");
          setSelectedTime("");
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os horarios agora."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingAvailability(false);
        }
      });

    return () => controller.abort();
  }, [idSalao, profissionalId, servicoId]);

  useEffect(() => {
    if (!horariosDoDiaSelecionado.some((item) => item.horaInicio === selectedTime)) {
      setSelectedTime(horariosDoDiaSelecionado[0]?.horaInicio || "");
    }
  }, [horariosDoDiaSelecionado, selectedTime]);

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
            value={profissionalId}
            onChange={(event) => setProfissionalId(event.target.value)}
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

        <input type="hidden" name="data" value={selectedDate} />
        <input type="hidden" name="hora_inicio" value={selectedTime} />

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div>
            <div className="mb-1.5 block text-sm font-medium text-zinc-700">
              Dias disponiveis
            </div>
            {!servicoId || !profissionalId ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                Escolha servico e profissional para liberar os proximos dias.
              </div>
            ) : loadingAvailability ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                Carregando dias disponiveis...
              </div>
            ) : availabilityError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {availabilityError}
              </div>
            ) : diasDisponiveis.length ? (
              <div className="flex flex-wrap gap-2">
                {diasDisponiveis.map((dia) => (
                  <button
                    key={dia.data}
                    type="button"
                    onClick={() => setSelectedDate(dia.data)}
                    className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      selectedDate === dia.data
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {dia.rotulo}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                Nao encontramos horarios livres nos proximos dias para essa combinacao.
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 block text-sm font-medium text-zinc-700">
              Horarios disponiveis
            </div>
            {selectedDate && horariosDoDiaSelecionado.length ? (
              <div className="flex flex-wrap gap-2">
                {horariosDoDiaSelecionado.map((horario) => (
                  <button
                    key={`${selectedDate}-${horario.horaInicio}`}
                    type="button"
                    onClick={() => setSelectedTime(horario.horaInicio)}
                    className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      selectedTime === horario.horaInicio
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {horario.horaInicio}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                Escolha um dia com horarios livres para continuar.
              </div>
            )}
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
          <strong>{intervaloMinutos} min</strong>. Entre um atendimento e outro,
          o app reserva <strong>{bufferMinutos} min</strong> para o profissional
          se organizar.
        </div>

        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}
