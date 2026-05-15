"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Scissors,
  UserRound,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createClienteBookingAction,
  joinClienteWaitlistAction,
  type ClienteBookingState,
} from "@/app/app-cliente/salao/[id]/actions";
import type {
  ClientAppProfessionalListItem,
  ClientAppServiceListItem,
} from "@/lib/client-app/queries";

type AvailabilitySlot = {
  horaInicio: string;
  horaFim: string;
};

type AvailabilityDay = {
  data: string;
  rotulo: string;
  horarios: AvailabilitySlot[];
};

type StepKey = "profissional" | "servico" | "horario";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateInput(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    .toISOString()
    .slice(0, 10);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthLabel(date: Date) {
  const base = new Date(date.getFullYear(), date.getMonth(), 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(base);
}

function buildCalendarDays(diasDisponiveis: AvailabilityDay[], monthCursor: Date) {
  const availableDates = new Set(diasDisponiveis.map((dia) => dia.data));
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: Array<{
    key: string;
    label: string;
    date: string;
    currentMonth: boolean;
    available: boolean;
  }> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({
      key: `blank-${index}`,
      label: "",
      date: "",
      currentMonth: false,
      available: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const iso = date.toISOString().slice(0, 10);
    cells.push({
      key: iso,
      label: String(day),
      date: iso,
      currentMonth: true,
      available: availableDates.has(iso),
    });
  }

  return cells;
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="h-14 w-full rounded-2xl bg-zinc-950 text-base font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enviando..." : "Continuar"}
    </button>
  );
}

function StepBadge({
  active,
  done,
  index,
  label,
}: {
  active: boolean;
  done: boolean;
  index: number;
  label: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : done
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-zinc-200 bg-white text-zinc-500"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
          active
            ? "bg-white text-zinc-950"
            : done
              ? "bg-amber-100 text-amber-900"
              : "bg-zinc-100 text-zinc-500"
        }`}
      >
        {index}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function EmptySearch({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

export default function ClientBookingForm({
  idSalao,
  servicos,
  profissionais,
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
  const [step, setStep] = useState<StepKey>("profissional");
  const [profissionalId, setProfissionalId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [buscaProfissional, setBuscaProfissional] = useState("");
  const [buscaServico, setBuscaServico] = useState("");
  const [diasDisponiveis, setDiasDisponiveis] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const selectedProfissional = useMemo(
    () => profissionais.find((item) => item.id === profissionalId) || null,
    [profissionalId, profissionais]
  );
  const selectedServico = useMemo(
    () => servicos.find((item) => item.id === servicoId) || null,
    [servicoId, servicos]
  );

  const servicosDoProfissional = useMemo(() => {
    if (!profissionalId) return [];
    return servicos.filter((servico) => {
      if (!servico.profissionaisPermitidos?.length) return true;
      return servico.profissionaisPermitidos.includes(profissionalId);
    });
  }, [profissionalId, servicos]);

  const sugestoesAdicionais = useMemo(() => {
    if (!servicoId) return [];
    const combos = servicosDoProfissional.filter(
      (servico) => servico.id !== servicoId && servico.ehCombo
    );
    const extras = servicosDoProfissional.filter(
      (servico) => servico.id !== servicoId && !servico.ehCombo
    );
    return [...combos, ...extras].slice(0, 3);
  }, [servicoId, servicosDoProfissional]);

  const profissionaisFiltrados = useMemo(() => {
    const term = normalizeSearch(buscaProfissional);
    if (!term) return profissionais;
    return profissionais.filter((profissional) =>
      normalizeSearch(
        [profissional.nome, profissional.especialidade, profissional.bio]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    );
  }, [buscaProfissional, profissionais]);

  const servicosFiltrados = useMemo(() => {
    const term = normalizeSearch(buscaServico);
    if (!term) return servicosDoProfissional;
    return servicosDoProfissional.filter((servico) =>
      normalizeSearch(
        [servico.nome, servico.descricao, String(servico.preco ?? "")]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    );
  }, [buscaServico, servicosDoProfissional]);

  const horariosDoDiaSelecionado = useMemo(
    () => diasDisponiveis.find((dia) => dia.data === selectedDate)?.horarios || [],
    [diasDisponiveis, selectedDate]
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(diasDisponiveis, monthCursor),
    [diasDisponiveis, monthCursor]
  );
  const monthLabel = formatMonthLabel(monthCursor);
  const minMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const canGoPreviousMonth = monthCursor > minMonth;
  const selectedDayLabel = selectedDate
    ? new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(new Date(`${selectedDate}T12:00:00`))
    : "";
  const canSubmit = Boolean(servicoId && profissionalId && selectedDate && selectedTime);
  const friendlyAvailabilityError = availabilityError
    ? availabilityError.toLowerCase().includes("vinculado") ||
      availabilityError.toLowerCase().includes("profissional")
      ? "Esse profissional ainda não atende esse serviço no app. Escolha outro profissional ou volte para serviços."
      : availabilityError
    : null;

  useEffect(() => {
    if (!profissionalId) return;
    if (servicoId && !servicosDoProfissional.some((item) => item.id === servicoId)) {
      setServicoId("");
      setSelectedDate("");
      setSelectedTime("");
      setDiasDisponiveis([]);
      setStep("servico");
    }
  }, [profissionalId, servicoId, servicosDoProfissional]);

  useEffect(() => {
    setDiasDisponiveis([]);
    setSelectedDate("");
    setSelectedTime("");
    setAvailabilityError(null);

    if (!servicoId || !profissionalId) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      salao: idSalao,
      servico: servicoId,
      profissional: profissionalId,
      inicio: formatDateInput(monthCursor),
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
            payload?.error || "Não foi possível carregar os horários agora."
          );
        }

        const dias = Array.isArray(payload.dias)
          ? (payload.dias as AvailabilityDay[])
          : [];
        setDiasDisponiveis(dias);

        if (dias.length) {
          setSelectedDate(dias[0].data);
          setSelectedTime(dias[0].horarios[0]?.horaInicio || "");
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os horários agora."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAvailability(false);
      });

    return () => controller.abort();
  }, [idSalao, monthCursor, profissionalId, servicoId]);

  useEffect(() => {
    if (!horariosDoDiaSelecionado.some((item) => item.horaInicio === selectedTime)) {
      setSelectedTime(horariosDoDiaSelecionado[0]?.horaInicio || "");
    }
  }, [horariosDoDiaSelecionado, selectedTime]);

  function selectProfissional(id: string) {
    setProfissionalId(id);
    setBuscaServico("");
    setStep("servico");
  }

  function selectServico(id: string) {
    setServicoId(id);
    setAdicionaisSelecionados([]);
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setStep("horario");
  }

  function toggleAdicional(id: string) {
    setAdicionaisSelecionados((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 3
          ? current
          : [...current, id]
    );
  }

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-[1.8rem] border border-zinc-200 bg-white shadow-[0_20px_56px_rgba(15,23,42,0.1)]"
    >
      <input type="hidden" name="salao" value={idSalao} />
      <input type="hidden" name="profissional" value={profissionalId} />
      <input type="hidden" name="servico" value={servicoId} />
      <input type="hidden" name="data" value={selectedDate} />
      <input type="hidden" name="hora_inicio" value={selectedTime} />
      {adicionaisSelecionados.map((id) => (
        <input key={id} type="hidden" name="adicionais" value={id} />
      ))}

      <div className="border-b border-zinc-100 bg-white p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-600">
          <CalendarDays size={14} />
          Reserva online
        </div>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-zinc-950">
          Escolha seu atendimento
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Primeiro o profissional, depois o serviço e por último data e hora.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StepBadge
            index={1}
            label="Profissional"
            active={step === "profissional"}
            done={Boolean(profissionalId)}
          />
          <StepBadge
            index={2}
            label="Serviço"
            active={step === "servico"}
            done={Boolean(servicoId)}
          />
          <StepBadge
            index={3}
            label="Horário"
            active={step === "horario"}
            done={Boolean(selectedDate && selectedTime)}
          />
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {step === "profissional" ? (
          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-800">
                <UserRound size={20} />
              </div>
              <div>
                <h4 className="text-lg font-black text-zinc-950">
                  Escolha o profissional
                </h4>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Digite o nome ou toque em uma opção para continuar.
                </p>
              </div>
            </div>

            <label className="flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4">
              <Search size={17} className="text-zinc-500" />
              <input
                type="search"
                value={buscaProfissional}
                onChange={(event) => setBuscaProfissional(event.target.value)}
                placeholder="Buscar profissional"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </label>

            <div className="grid gap-2">
              {profissionaisFiltrados.length ? (
                profissionaisFiltrados.map((profissional) => (
                  <button
                    key={profissional.id}
                    type="button"
                    onClick={() => selectProfissional(profissional.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      profissionalId === profissional.id
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-black text-zinc-700">
                      {profissional.fotoUrl ? (
                        <img
                          src={profissional.fotoUrl}
                          alt={profissional.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profissional.nome.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black">
                        {profissional.nome}
                      </div>
                      <div
                        className={`mt-0.5 text-xs ${
                          profissionalId === profissional.id
                            ? "text-zinc-300"
                            : "text-zinc-500"
                        }`}
                      >
                        {profissional.especialidade || "Atendimento do salão"}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <EmptySearch text="Nenhum profissional encontrado." />
              )}
            </div>
          </section>
        ) : null}

        {step === "servico" ? (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setStep("profissional")}
              className="inline-flex items-center gap-1 text-sm font-bold text-zinc-600 underline underline-offset-4"
            >
              <ArrowLeft size={14} />
              Trocar profissional
            </button>

            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-800">
                <Scissors size={20} />
              </div>
              <div>
                <h4 className="text-lg font-black text-zinc-950">
                  Agora escolha o serviço
                </h4>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Mostrando serviços disponíveis com {selectedProfissional?.nome}.
                </p>
              </div>
            </div>

            <label className="flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4">
              <Search size={17} className="text-zinc-500" />
              <input
                type="search"
                value={buscaServico}
                onChange={(event) => setBuscaServico(event.target.value)}
                placeholder="Buscar serviço"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </label>

            <div className="grid gap-2">
              {servicosFiltrados.length ? (
                servicosFiltrados.map((servico) => (
                  <button
                    key={servico.id}
                    type="button"
                    onClick={() => selectServico(servico.id)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      servicoId === servico.id
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {servico.ehCombo ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                                servicoId === servico.id
                                  ? "bg-white/15 text-white"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              Combo
                            </span>
                          ) : null}
                          <div className="break-words text-sm font-black">
                            {servico.nome}
                          </div>
                        </div>
                        {servico.descricao ? (
                          <div
                            className={`mt-1 line-clamp-2 text-xs leading-5 ${
                              servicoId === servico.id
                                ? "text-zinc-300"
                                : "text-zinc-500"
                            }`}
                          >
                            {servico.descricao}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-black">
                          {servico.exigeAvaliacao
                            ? "A avaliar"
                            : formatCurrency(servico.preco)}
                        </div>
                        <div
                          className={`mt-1 text-xs font-semibold ${
                            servicoId === servico.id
                              ? "text-zinc-300"
                              : "text-zinc-500"
                          }`}
                        >
                          {servico.duracaoMinutos
                            ? `${servico.duracaoMinutos} min`
                            : "Tempo sob consulta"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <EmptySearch text="Nenhum serviço encontrado para esse profissional." />
              )}
            </div>
          </section>
        ) : null}

        {step === "horario" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("profissional")}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700"
              >
                <ArrowLeft size={13} />
                Profissional
              </button>
              <button
                type="button"
                onClick={() => setStep("servico")}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700"
              >
                Serviço
              </button>
            </div>

            <div className="text-center">
              <h4 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">
                Selecione data e hora
              </h4>
              <p className="mt-1 text-sm text-zinc-500">
                Horários livres para {selectedProfissional?.nome}.
              </p>
            </div>

            <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-1">
              {profissionais.map((profissional) => {
                const selected = profissional.id === profissionalId;
                return (
                  <button
                    key={profissional.id}
                    type="button"
                    onClick={() => selectProfissional(profissional.id)}
                    className="w-20 shrink-0 text-center"
                  >
                    <span
                      className={`relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border text-sm font-black ${
                        selected
                          ? "border-zinc-950 bg-amber-50 text-amber-800"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400"
                      }`}
                    >
                      {profissional.fotoUrl ? (
                        <img
                          src={profissional.fotoUrl}
                          alt={profissional.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profissional.nome.slice(0, 1).toUpperCase()
                      )}
                      {selected ? (
                        <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-white">
                          <Check size={12} />
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`mt-2 block truncate text-xs font-bold ${
                        selected ? "text-zinc-950" : "text-zinc-500"
                      }`}
                    >
                      {profissional.nome}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h5 className="text-xl font-black capitalize text-zinc-950">
                  {monthLabel}
                </h5>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canGoPreviousMonth}
                    onClick={() =>
                      setMonthCursor((current) => addMonths(current, -1))
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMonthCursor((current) => addMonths(current, 1))
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-zinc-500">
                {["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sab."].map(
                  (day) => (
                    <span key={day}>{day}</span>
                  )
                )}
              </div>

              {loadingAvailability ? (
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-semibold text-zinc-600">
                  Carregando horários disponíveis...
                </div>
              ) : friendlyAvailabilityError ? (
                <div className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <div className="font-black">Não encontramos horários para esta escolha.</div>
                  <p className="leading-6">{friendlyAvailabilityError}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("servico")}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-900 shadow-sm"
                    >
                      Trocar serviço
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("profissional")}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-900 shadow-sm"
                    >
                      Trocar profissional
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) =>
                    day.currentMonth ? (
                      <button
                        key={day.key}
                        type="button"
                        disabled={!day.available}
                        onClick={() => {
                          const nextDay = diasDisponiveis.find(
                            (item) => item.data === day.date
                          );
                          setSelectedDate(day.date);
                          setSelectedTime(nextDay?.horarios[0]?.horaInicio || "");
                        }}
                        className={`relative aspect-square rounded-full border text-sm font-semibold transition ${
                          selectedDate === day.date
                            ? "border-cyan-700 bg-cyan-50 text-zinc-950 ring-2 ring-cyan-700"
                            : day.available
                              ? "border-zinc-100 bg-zinc-100 text-zinc-900"
                              : "border-zinc-100 bg-white text-zinc-300"
                        }`}
                      >
                        {day.label}
                        {day.available ? (
                          <span
                            className={`absolute bottom-2 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full ${
                              selectedDate === day.date
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                        ) : null}
                      </button>
                    ) : (
                      <span key={day.key} />
                    )
                  )}
                </div>
              )}
            </div>

            <div className="border-y border-zinc-200 py-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-600">
                <Clock3 size={16} />
                {selectedDayLabel || "Escolha um dia"}
              </div>
              {horariosDoDiaSelecionado.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {horariosDoDiaSelecionado.map((horario) => (
                    <button
                      key={`${selectedDate}-${horario.horaInicio}`}
                      type="button"
                      onClick={() => setSelectedTime(horario.horaInicio)}
                      className={`h-14 rounded-2xl border px-5 text-lg font-black shadow-sm transition ${
                        selectedTime === horario.horaInicio
                          ? "border-cyan-700 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-700"
                          : "border-zinc-100 bg-zinc-100 text-zinc-900 hover:border-zinc-300"
                      }`}
                    >
                      {horario.horaInicio}
                    </button>
                  ))}
                </div>
              ) : friendlyAvailabilityError ? (
                <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                  Ajuste o profissional ou o serviço para ver horários livres.
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                  Ainda não há horários disponíveis para os próximos dias.
                  Tente outro profissional ou fale com o salão.
                  {servicoId && profissionalId ? (
                    <button
                      type="submit"
                      formAction={joinClienteWaitlistAction}
                      className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-black text-white"
                    >
                      Avisar quando liberar
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-[1.4rem] bg-zinc-50 p-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-zinc-500">
                      1 serviço
                      {selectedServico?.duracaoMinutos
                        ? ` - ${selectedServico.duracaoMinutos}min`
                        : ""}
                    </div>
                    <div className="mt-1 text-3xl font-black text-zinc-950">
                      {selectedServico?.exigeAvaliacao
                        ? "A avaliar"
                        : formatCurrency(selectedServico?.preco)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-950">
                      {selectedServico?.nome || "Serviço"}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {selectedTime || "--:--"}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  {sugestoesAdicionais.length ? (
                    <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-left">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                        Combine com
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        Marque adicionais para o salão já receber seu interesse junto com a reserva.
                      </p>
                      <div className="mt-3 grid gap-2">
                        {sugestoesAdicionais.map((servico) => {
                          const selected = adicionaisSelecionados.includes(servico.id);
                          return (
                            <button
                              key={servico.id}
                              type="button"
                              onClick={() => toggleAdicional(servico.id)}
                              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                                selected
                                  ? "border-zinc-950 bg-white text-zinc-950"
                                  : "border-amber-100 bg-white/75 text-zinc-700"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-black">
                                  {servico.ehCombo ? "Combo: " : ""}
                                  {servico.nome}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-zinc-500">
                                  {servico.exigeAvaliacao
                                    ? "A avaliar"
                                    : formatCurrency(servico.preco)}
                                </span>
                              </span>
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                                  selected
                                    ? "border-zinc-950 bg-zinc-950 text-white"
                                    : "border-zinc-200 bg-white text-zinc-400"
                                }`}
                              >
                                {selected ? <Check size={13} /> : "+"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <SubmitButton disabled={!canSubmit} />
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
                  Seus dados pessoais serão usados apenas para processar este
                  agendamento com o salão.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {state.error}
          </div>
        ) : null}
      </div>
    </form>
  );
}
