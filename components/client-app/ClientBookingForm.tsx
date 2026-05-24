"use client";

import {
  ArrowLeft,
  Bell,
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

export type ClientBookingCoupon = {
  codigo: string;
  nome: string;
  descricao: string | null;
  descontoLabel: string;
  diasInativo: number | null;
  tipoDesconto: "percentual" | "valor_fixo";
  valorDesconto: number;
  validoAte: string | null;
};

type StepKey = "profissional" | "servico" | "horario" | "resumo";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(date.getFullYear(), date.getMonth(), 1));
}

function formatFullDate(value: string) {
  if (!value) return "Data";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function buildCalendarDays(diasDisponiveis: AvailabilityDay[], monthCursor: Date) {
  const availableDates = new Set(diasDisponiveis.map((dia) => dia.data));
  const todayKey = formatDateInput(new Date());
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
    selectable: boolean;
  }> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({
      key: `blank-${index}`,
      label: "",
      date: "",
      currentMonth: false,
      available: false,
      selectable: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const iso = formatDateInput(date);
    cells.push({
      key: iso,
      label: String(day),
      date: iso,
      currentMonth: true,
      available: availableDates.has(iso),
      selectable: iso >= todayKey,
    });
  }

  return cells;
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#f6b93f] text-lg font-black text-black disabled:opacity-50"
    >
      <CalendarDays size={23} />
      {pending ? "Confirmando..." : "Confirmar agendamento"}
    </button>
  );
}

function Stepper({ step }: { step: StepKey }) {
  const current = step === "profissional" ? 1 : step === "servico" ? 2 : 3;
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-[#101113] px-5 py-4">
      <div className="relative grid grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-6 h-px bg-[#f6b93f]" />
        {[
          ["1", "Profissional"],
          ["2", "Serviço"],
          ["3", "Horário"],
        ].map(([number, label], index) => {
          const active = current === index + 1;
          return (
            <div key={number} className="relative z-10 text-center">
              <span
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-black ${
                  active
                    ? "bg-[#f6b93f] text-black"
                    : "bg-[#1b1c1f] text-zinc-300"
                }`}
              >
                {number}
              </span>
              <span
                className={`mt-2 block text-sm ${
                  active ? "font-bold text-[#f6b93f]" : "text-zinc-400"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientBookingForm({
  idSalao,
  servicos,
  profissionais,
  cuponsDisponiveis = [],
  cupomInicial = "",
}: {
  idSalao: string;
  servicos: ClientAppServiceListItem[];
  profissionais: ClientAppProfessionalListItem[];
  intervaloMinutos: number;
  cuponsDisponiveis?: ClientBookingCoupon[];
  cupomInicial?: string;
}) {
  const initialState: ClienteBookingState = { error: null };
  const [state, formAction] = useActionState<ClienteBookingState, FormData>(
    createClienteBookingAction,
    initialState
  );
  const [step, setStep] = useState<StepKey>("profissional");
  const [profissionalId, setProfissionalId] = useState("");
  const [servicoIds, setServicoIds] = useState<string[]>([]);
  const [buscaProfissional, setBuscaProfissional] = useState("");
  const [buscaServico, setBuscaServico] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [diasDisponiveis, setDiasDisponiveis] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [codigoCupom, setCodigoCupom] = useState(
    cupomInicial || cuponsDisponiveis[0]?.codigo || ""
  );

  const selectedServices = useMemo(
    () =>
      servicoIds
        .map((id) => servicos.find((servico) => servico.id === id))
        .filter((servico): servico is ClientAppServiceListItem => Boolean(servico)),
    [servicoIds, servicos]
  );
  const primaryService = selectedServices[0] || null;
  const selectedProfissional =
    profissionais.find((profissional) => profissional.id === profissionalId) || null;
  const categorias = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(servicos.map((servico) => servico.categoriaNome || "Outros"))
      ),
    ],
    [servicos]
  );
  const profissionaisFiltrados = useMemo(() => {
    const term = normalize(buscaProfissional);
    return profissionais.filter((profissional) =>
      !term
        ? true
        : normalize(
            [profissional.nome, profissional.especialidade].filter(Boolean).join(" ")
          ).includes(term)
    );
  }, [buscaProfissional, profissionais]);
  const servicosFiltrados = useMemo(() => {
    const term = normalize(buscaServico);
    return servicos.filter((servico) => {
      if (categoriaAtiva !== "Todos" && servico.categoriaNome !== categoriaAtiva) {
        return false;
      }
      if (!term) return true;
      return normalize([servico.nome, servico.descricao].filter(Boolean).join(" ")).includes(
        term
      );
    });
  }, [buscaServico, categoriaAtiva, servicos]);
  const profissionaisCompativeis = useMemo(
    () =>
      selectedServices.length
        ? profissionais.filter((profissional) =>
            selectedServices.every((servico) => {
              if (!servico.profissionaisPermitidos.length) return true;
              return servico.profissionaisPermitidos.includes(profissional.id);
            })
          )
        : profissionais,
    [profissionais, selectedServices]
  );
  const totalDuration = selectedServices.reduce(
    (sum, servico) => sum + (servico.duracaoMinutos || 0),
    0
  );
  const totalValue = selectedServices.reduce(
    (sum, servico) => sum + (servico.preco || 0),
    0
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(diasDisponiveis, monthCursor),
    [diasDisponiveis, monthCursor]
  );
  const horariosDoDia = useMemo(
    () => diasDisponiveis.find((dia) => dia.data === selectedDate)?.horarios || [],
    [diasDisponiveis, selectedDate]
  );

  useEffect(() => {
    if (!primaryService?.id || !profissionalId) return;
    const controller = new AbortController();
    async function loadAvailability() {
      try {
        setLoadingAvailability(true);
        setAvailabilityError(null);
        const params = new URLSearchParams({
          salao: idSalao,
          servico: primaryService?.id || "",
          profissional: profissionalId,
          inicio: formatDateInput(monthCursor),
        });
        for (const id of servicoIds) params.append("servicos", id);
        const response = await fetch(
          `/api/app-cliente/disponibilidade?${params.toString()}`,
          { signal: controller.signal, credentials: "same-origin" }
        );
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Não foi possível carregar horários.");
        }
        const dias = Array.isArray(payload.dias)
          ? (payload.dias as AvailabilityDay[])
          : [];
        setDiasDisponiveis(dias);
        setSelectedDate((current) => current || dias[0]?.data || "");
        setSelectedTime((current) => current || dias[0]?.horarios[0]?.horaInicio || "");
      } catch (error) {
        if (controller.signal.aborted) return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar horários."
        );
        setDiasDisponiveis([]);
      } finally {
        if (!controller.signal.aborted) setLoadingAvailability(false);
      }
    }
    void loadAvailability();
    return () => controller.abort();
  }, [idSalao, monthCursor, primaryService?.id, profissionalId, servicoIds]);

  function toggleServico(id: string) {
    setServicoIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 8)
    );
    setSelectedDate("");
    setSelectedTime("");
  }

  const canSubmit = Boolean(primaryService && selectedProfissional && selectedDate && selectedTime);

  return (
    <form action={formAction} className="min-h-dvh bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white">
      <input type="hidden" name="salao" value={idSalao} />
      <input type="hidden" name="servico" value={primaryService?.id || ""} />
      {servicoIds.map((id) => (
        <input key={id} type="hidden" name="servicos" value={id} />
      ))}
      <input type="hidden" name="profissional" value={profissionalId} />
      <input type="hidden" name="data" value={selectedDate} />
      <input type="hidden" name="hora_inicio" value={selectedTime} />
      <input type="hidden" name="pessoa_tipo" value="mim" />
      <input type="hidden" name="cupom" value={codigoCupom} />

      <div className="mx-auto max-w-md">
        <header className="mb-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step === "resumo") setStep("horario");
              else if (step === "horario") setStep("servico");
              else if (step === "servico") setStep("profissional");
              else history.back();
            }}
            className="flex h-12 w-12 items-center justify-center text-white"
            aria-label="Voltar"
          >
            <ArrowLeft size={34} />
          </button>
          <h1 className="text-[1.65rem] font-black leading-tight tracking-[-0.03em]">
            {step === "resumo" ? "Confirmar agendamento" : "Reserva online"}
          </h1>
          <a
            href="/app-cliente/notificacoes"
            className="flex h-12 w-12 items-center justify-center text-[#f6b93f]"
            aria-label="Notificações"
          >
            <Bell size={31} />
          </a>
        </header>

        {step !== "resumo" ? <Stepper step={step} /> : null}

        {step === "profissional" ? (
          <section className="mt-8">
            <h2 className="text-[1.75rem] font-black tracking-[-0.03em]">
              Escolha seu atendimento
            </h2>
            <p className="mt-3 text-lg leading-snug text-zinc-300">
              Primeiro o profissional, depois o serviço e por último data e hora.
            </p>
            <div className="mt-6 space-y-3">
              {[
                ["1. Profissional", "Escolha quem vai te atender"],
                ["2. Serviço", "Escolha o serviço desejado"],
                ["3. Horário", "Escolha a data e horário"],
              ].map(([title, subtitle], index) => (
                <div
                  key={title}
                  className={`flex items-center gap-4 rounded-[1.1rem] border p-4 ${
                    index === 0
                      ? "border-[#b88918] bg-[#111214]"
                      : "border-white/8 bg-[#111214] text-zinc-400"
                  }`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e1f22] text-xl font-black text-[#f6b93f]">
                    {index === 0 ? <UserRound size={28} /> : index + 1}
                  </span>
                  <span className="flex-1">
                    <strong className="block text-lg text-white">{title}</strong>
                    <span className="mt-1 block text-sm">{subtitle}</span>
                  </span>
                  <ChevronRight size={24} className="text-[#f6b93f]" />
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="flex items-center gap-4 text-xl font-black">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e1f22] text-[#f6b93f]">
                  <UserRound size={28} />
                </span>
                Escolha o profissional
              </h3>
              <p className="ml-20 mt-1 text-base text-zinc-400">
                Digite o nome ou toque em uma opção para continuar.
              </p>
              <label className="mt-5 flex h-16 items-center gap-3 rounded-2xl border border-white/10 bg-[#111214] px-4 text-zinc-400">
                <Search size={28} />
                <input
                  value={buscaProfissional}
                  onChange={(event) => setBuscaProfissional(event.target.value)}
                  placeholder="Buscar profissional"
                  className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none"
                />
              </label>
              <div className="mt-4 space-y-3">
                {profissionaisFiltrados.map((profissional) => (
                  <button
                    key={profissional.id}
                    type="button"
                    onClick={() => {
                      setProfissionalId(profissional.id);
                      setStep("servico");
                    }}
                    className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 rounded-[1.15rem] border border-white/8 bg-[#111214] p-4 text-left"
                  >
                    <span className="h-[72px] w-[72px] overflow-hidden rounded-full bg-zinc-800">
                      {profissional.fotoUrl ? (
                        <img
                          src={profissional.fotoUrl}
                          alt={profissional.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl font-black">
                          {profissional.nome.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span>
                      <strong className="block text-xl text-white">
                        {profissional.nome}
                      </strong>
                      <span className="mt-1 block text-base text-zinc-400">
                        {profissional.especialidade || "Atendimento do salão"}
                      </span>
                    </span>
                    <ChevronRight size={30} className="text-[#f6b93f]" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {step === "servico" ? (
          <section className="mt-8 pb-52">
            <h2 className="text-[1.8rem] font-black tracking-[-0.03em]">
              Escolha o serviço
            </h2>
            <p className="mt-2 text-lg leading-snug text-zinc-300">
              Selecione um ou mais serviços que deseja realizar.
            </p>
            <label className="mt-6 flex h-16 items-center gap-3 rounded-2xl bg-[#151618] px-4 text-zinc-400">
              <Search size={28} />
              <input
                value={buscaServico}
                onChange={(event) => setBuscaServico(event.target.value)}
                placeholder="Buscar serviços"
                className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none"
              />
            </label>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => setCategoriaAtiva(categoria)}
                  className={`h-12 shrink-0 rounded-2xl px-5 text-lg font-bold ${
                    categoriaAtiva === categoria
                      ? "bg-[#f6b93f] text-black"
                      : "bg-[#151618] text-white"
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>
            <h3 className="mt-8 text-[1.8rem] font-black">
              {categoriaAtiva === "Todos" ? "Serviços populares" : categoriaAtiva}
            </h3>
            <div className="mt-5 space-y-3">
              {servicosFiltrados.map((servico) => {
                const selected = servicoIds.includes(servico.id);
                return (
                  <button
                    key={servico.id}
                    type="button"
                    onClick={() => toggleServico(servico.id)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-[1.15rem] border p-4 text-left ${
                      selected
                        ? "border-[#f6b93f] bg-[#111214]"
                        : "border-white/8 bg-[#111214]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1e21] text-[#f6b93f]">
                          <Scissors size={22} />
                        </span>
                        <strong className="block min-w-0 break-words text-[1.45rem] font-black leading-tight text-white">
                          {servico.nome}
                        </strong>
                      </span>
                      <span className="mt-2 line-clamp-2 block text-[0.98rem] leading-6 text-zinc-400">
                        {servico.descricao || "Atendimento premium do salão."}
                      </span>
                      <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.98rem] text-zinc-400">
                        <Clock3 size={18} />
                        <span className="font-medium">
                          {servico.duracaoMinutos || 60} min
                        </span>
                        <span className="h-5 w-px bg-white/20" />
                        <span>A partir de</span>
                        <strong className="font-black text-[#f6b93f]">
                          {formatCurrency(servico.preco)}
                        </strong>
                      </span>
                    </span>
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-[#f6b93f] bg-[#f6b93f] text-black"
                          : "border-zinc-400 text-zinc-400"
                      }`}
                    >
                      {selected ? <Check size={26} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {!profissionaisCompativeis.some((item) => item.id === profissionalId) && servicoIds.length ? (
              <p className="mt-3 rounded-2xl border border-[#f6b93f]/40 bg-[#211805] p-4 text-sm text-[#f6b93f]">
                Nenhum profissional disponível para todos os serviços selecionados.
                Remova um serviço ou escolha outro.
              </p>
            ) : null}
            <div className="pointer-events-none fixed inset-x-0 bottom-[5.15rem] z-40 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent px-5 pb-4 pt-12 md:bottom-0">
              <div className="pointer-events-auto mx-auto max-w-md">
                <button
                  type="button"
                  disabled={
                    !servicoIds.length ||
                    !profissionaisCompativeis.some(
                      (item) => item.id === profissionalId
                    )
                  }
                  onClick={() => setStep("horario")}
                  className="h-14 w-full rounded-2xl bg-[#f6b93f] text-lg font-black text-black shadow-[0_18px_40px_rgba(246,185,63,0.32)] disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {step === "horario" ? (
          <section className="mt-8">
            <h2 className="text-3xl font-black tracking-[-0.04em]">
              Escolha o horário
            </h2>
            <p className="mt-3 text-xl leading-snug text-zinc-300">
              Selecione a data e o horário que deseja realizar seu agendamento.
            </p>
            <div className="mt-7 rounded-[1.35rem] border border-white/10 bg-[#111214] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black capitalize">
                  {formatMonthLabel(monthCursor)}
                </h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMonthCursor((current) => addMonths(current, -1))}
                    className="flex h-12 w-12 items-center justify-center"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={30} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthCursor((current) => addMonths(current, 1))}
                    className="flex h-12 w-12 items-center justify-center"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={30} />
                  </button>
                </div>
              </div>
              {loadingAvailability ? (
                <div className="py-16 text-center text-zinc-400">
                  Carregando horários disponíveis...
                </div>
              ) : availabilityError ? (
                <div className="py-16 text-center text-zinc-400">
                  {availabilityError}
                </div>
              ) : (
                <>
                  <div className="mt-7 grid grid-cols-7 text-center text-lg text-zinc-400">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-7 gap-y-5 text-center">
                    {calendarDays.map((day) =>
                      day.currentMonth ? (
                        <button
                          key={day.key}
                          type="button"
                          disabled={!day.available || !day.selectable}
                          onClick={() => {
                            const nextDay = diasDisponiveis.find(
                              (item) => item.data === day.date
                            );
                            setSelectedDate(day.date);
                            setSelectedTime(nextDay?.horarios[0]?.horaInicio || "");
                          }}
                          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                            selectedDate === day.date
                              ? "bg-[#f6b93f] text-black"
                              : day.available
                                ? "text-white"
                                : "text-zinc-600"
                          }`}
                        >
                          {day.label}
                        </button>
                      ) : (
                        <span key={day.key} />
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            <h3 className="mt-8 text-2xl font-black">Horários disponíveis</h3>
            <p className="mt-2 text-xl text-zinc-400">
              {selectedDate ? formatFullDate(selectedDate) : "Escolha uma data"}
            </p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {horariosDoDia.map((horario) => (
                <button
                  key={horario.horaInicio}
                  type="button"
                  onClick={() => setSelectedTime(horario.horaInicio)}
                  className={`h-16 rounded-2xl border text-xl font-black ${
                    selectedTime === horario.horaInicio
                      ? "border-[#f6b93f] bg-[#f6b93f] text-black"
                      : "border-zinc-600 bg-transparent text-white"
                  }`}
                >
                  {horario.horaInicio}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep("resumo")}
              className="mt-7 h-16 w-full rounded-2xl bg-[#f6b93f] text-xl font-black text-black disabled:opacity-50"
            >
              Continuar
            </button>
          </section>
        ) : null}

        {step === "resumo" ? (
          <section className="mt-5">
            <div className="rounded-[1.35rem] border border-[#f6b93f]/60 bg-[#111214] p-8 text-center shadow-[0_0_80px_rgba(246,185,63,0.12)]">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#f6b93f] text-black">
                <Check size={62} strokeWidth={4} />
              </div>
              <h2 className="mt-8 text-5xl font-black tracking-[-0.06em]">
                Quase lá!
              </h2>
              <p className="mt-5 text-2xl leading-snug text-zinc-300">
                Revise os detalhes e confirme seu agendamento.
              </p>
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-[#111214] p-6">
              <h3 className="text-3xl font-black">Resumo do agendamento</h3>
              <div className="mt-6 space-y-5 text-xl">
                {[
                  ["Serviço", selectedServices.map((item) => item.nome).join(", ")],
                  ["Profissional", selectedProfissional?.nome || "Profissional"],
                  ["Data", formatFullDate(selectedDate)],
                  ["Horário", selectedTime],
                  ["Duração", `${totalDuration || 0} min`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[44px_1fr_1.2fr] items-center gap-4 border-b border-white/10 pb-4"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#272116] text-[#f6b93f]">
                      <UserRound size={23} />
                    </span>
                    <span className="text-zinc-300">{label}</span>
                    <strong className="text-right text-white">{value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-[#f6b93f]/50 pt-5 text-2xl font-black">
                <span>Total</span>
                <span className="text-4xl text-[#f6b93f]">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>

            {cuponsDisponiveis.length ? (
              <select
                value={codigoCupom}
                onChange={(event) => setCodigoCupom(event.target.value)}
                className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-[#111214] px-4 text-white"
              >
                <option value="">Sem cupom</option>
                {cuponsDisponiveis.map((cupom) => (
                  <option key={cupom.codigo} value={cupom.codigo}>
                    {cupom.nome}
                  </option>
                ))}
              </select>
            ) : null}

            <SubmitButton disabled={!canSubmit} />
            {state.error ? (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">
                {state.error}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </form>
  );
}
