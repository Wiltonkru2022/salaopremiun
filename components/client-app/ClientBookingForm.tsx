"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  Scissors,
  UserRound,
  UsersRound,
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

type StepKey =
  | "servicos"
  | "selecionados"
  | "pessoa"
  | "profissional"
  | "data"
  | "horario"
  | "resumo";

const STEP_LABELS: Record<StepKey, string> = {
  servicos: "Serviços",
  selecionados: "Selecionados",
  pessoa: "Pessoa",
  profissional: "Profissional",
  data: "Data",
  horario: "Horário",
  resumo: "Resumo",
};

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

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

function buildCalendarDays(diasDisponiveis: AvailabilityDay[], monthCursor: Date) {
  const availableDates = new Set(diasDisponiveis.map((dia) => dia.data));
  const todayKey = formatDateInput(getTodayDate());
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
      className="h-14 w-full rounded-2xl bg-zinc-950 text-base font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Confirmando..." : "Confirmar agendamento"}
    </button>
  );
}

function StepPill({
  step,
  active,
  done,
}: {
  step: StepKey;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-black ${
        active
          ? "bg-zinc-950 text-white"
          : done
            ? "bg-emerald-50 text-emerald-700"
            : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {STEP_LABELS[step]}
    </span>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center text-sm leading-6 text-zinc-500">
      {children}
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
  const [step, setStep] = useState<StepKey>("servicos");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [buscaServico, setBuscaServico] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todos");
  const [pessoaTipo, setPessoaTipo] = useState<"mim" | "outra_pessoa">("mim");
  const [pessoaNome, setPessoaNome] = useState("");
  const [pessoaWhatsapp, setPessoaWhatsapp] = useState("");
  const [pessoaObservacao, setPessoaObservacao] = useState("");
  const [diasDisponiveis, setDiasDisponiveis] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [codigoCupom, setCodigoCupom] = useState(
    cupomInicial || cuponsDisponiveis[0]?.codigo || ""
  );
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const selectedServices = useMemo(
    () =>
      selectedServiceIds
        .map((id) => servicos.find((servico) => servico.id === id))
        .filter((servico): servico is ClientAppServiceListItem => Boolean(servico)),
    [selectedServiceIds, servicos]
  );
  const primaryServiceId = selectedServiceIds[0] || "";

  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    for (const servico of servicos) {
      const nome = servico.categoriaNome || "Outros serviços";
      map.set(nome, nome);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [servicos]);

  const servicesByCategory = useMemo(() => {
    const term = normalizeSearch(buscaServico);
    return servicos.filter((servico) => {
      const categoryOk =
        categoriaAtiva === "todos" || servico.categoriaNome === categoriaAtiva;
      if (!categoryOk) return false;
      if (!term) return true;
      return normalizeSearch(
        [servico.nome, servico.descricao, servico.categoriaNome].filter(Boolean).join(" ")
      ).includes(term);
    });
  }, [buscaServico, categoriaAtiva, servicos]);

  const profissionaisCompativeis = useMemo(() => {
    if (!selectedServices.length) return [];
    return profissionais.filter((profissional) =>
      selectedServices.every((servico) => {
        if (!servico.profissionaisPermitidos.length) return true;
        return servico.profissionaisPermitidos.includes(profissional.id);
      })
    );
  }, [profissionais, selectedServices]);

  const selectedProfissional = useMemo(
    () =>
      profissionaisCompativeis.find((profissional) => profissional.id === profissionalId) ||
      null,
    [profissionaisCompativeis, profissionalId]
  );

  const totalDuration = selectedServices.reduce(
    (sum, servico) => sum + (Number(servico.duracaoMinutos || 0) || 0),
    0
  );
  const hasUnknownPrice = selectedServices.some(
    (servico) => servico.preco === null || servico.exigeAvaliacao
  );
  const subtotalEstimado = hasUnknownPrice
    ? null
    : selectedServices.reduce((sum, servico) => sum + Number(servico.preco || 0), 0);
  const selectedCoupon = useMemo(
    () =>
      cuponsDisponiveis.find(
        (cupom) => codigoCupom.trim().toUpperCase() === cupom.codigo
      ) || null,
    [codigoCupom, cuponsDisponiveis]
  );
  const descontoEstimado =
    selectedCoupon && subtotalEstimado
      ? selectedCoupon.tipoDesconto === "valor_fixo"
        ? Math.min(subtotalEstimado, selectedCoupon.valorDesconto)
        : Math.min(subtotalEstimado, subtotalEstimado * (selectedCoupon.valorDesconto / 100))
      : 0;
  const totalEstimado =
    subtotalEstimado === null ? null : Math.max(0, subtotalEstimado - descontoEstimado);

  const horariosDoDiaSelecionado = useMemo(
    () => diasDisponiveis.find((dia) => dia.data === selectedDate)?.horarios || [],
    [diasDisponiveis, selectedDate]
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(diasDisponiveis, monthCursor),
    [diasDisponiveis, monthCursor]
  );
  const canGoPreviousMonth = monthCursor > new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canSubmit = Boolean(
    selectedServiceIds.length &&
      profissionalId &&
      selectedDate &&
      selectedTime &&
      (pessoaTipo === "mim" || (pessoaNome.trim() && pessoaWhatsapp.trim()))
  );

  useEffect(() => {
    if (!selectedServiceIds.length) {
      setProfissionalId("");
      return;
    }
    if (profissionalId && !profissionaisCompativeis.some((item) => item.id === profissionalId)) {
      setProfissionalId("");
      setSelectedDate("");
      setSelectedTime("");
      setDiasDisponiveis([]);
    }
  }, [profissionaisCompativeis, profissionalId, selectedServiceIds.length]);

  useEffect(() => {
    setDiasDisponiveis([]);
    setSelectedDate("");
    setSelectedTime("");
    setAvailabilityError(null);

    if (!primaryServiceId || !profissionalId) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      salao: idSalao,
      servico: primaryServiceId,
      profissional: profissionalId,
      inicio: formatDateInput(monthCursor),
    });
    selectedServiceIds.forEach((id) => params.append("servicos", id));

    setLoadingAvailability(true);
    fetch(`/api/app-cliente/disponibilidade?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Não foi possível carregar os horários agora.");
        }

        const dias = Array.isArray(payload.dias) ? (payload.dias as AvailabilityDay[]) : [];
        setDiasDisponiveis(dias);
        setSelectedDate(dias[0]?.data || "");
        setSelectedTime(dias[0]?.horarios[0]?.horaInicio || "");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAvailabilityError(
          error instanceof Error ? error.message : "Não foi possível carregar os horários agora."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAvailability(false);
      });

    return () => controller.abort();
  }, [idSalao, monthCursor, primaryServiceId, profissionalId, selectedServiceIds]);

  useEffect(() => {
    if (!horariosDoDiaSelecionado.some((item) => item.horaInicio === selectedTime)) {
      setSelectedTime(horariosDoDiaSelecionado[0]?.horaInicio || "");
    }
  }, [horariosDoDiaSelecionado, selectedTime]);

  function toggleService(id: string) {
    setSelectedServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 8
          ? current
          : [...current, id]
    );
  }

  function goNextFromServices(id?: string) {
    if (id && !selectedServiceIds.includes(id)) {
      setSelectedServiceIds((current) => [...current, id]);
    }
    setStep("selecionados");
  }

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-[1.8rem] border border-zinc-200 bg-white shadow-[0_20px_56px_rgba(15,23,42,0.1)]"
    >
      <input type="hidden" name="salao" value={idSalao} />
      <input type="hidden" name="servico" value={primaryServiceId} />
      {selectedServiceIds.map((id) => (
        <input key={id} type="hidden" name="servicos" value={id} />
      ))}
      <input type="hidden" name="profissional" value={profissionalId} />
      <input type="hidden" name="data" value={selectedDate} />
      <input type="hidden" name="hora_inicio" value={selectedTime} />
      <input type="hidden" name="pessoa_tipo" value={pessoaTipo} />

      <div className="border-b border-zinc-100 bg-white p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-600">
          <CalendarDays size={14} />
          Reservar Online
        </div>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-zinc-950">
          Escolha seus serviços
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Selecione um ou mais serviços. Depois o app mostra somente profissionais compatíveis.
        </p>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {(Object.keys(STEP_LABELS) as StepKey[]).map((item) => (
            <StepPill
              key={item}
              step={item}
              active={step === item}
              done={
                (item === "servicos" && selectedServiceIds.length > 0) ||
                (item === "profissional" && Boolean(profissionalId)) ||
                (item === "data" && Boolean(selectedDate)) ||
                (item === "horario" && Boolean(selectedTime))
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {step === "servicos" ? (
          <section className="space-y-4">
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
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() => setCategoriaAtiva("todos")}
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  categoriaAtiva === "todos"
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                Todos
              </button>
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => setCategoriaAtiva(categoria)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    categoriaAtiva === categoria
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {servicesByCategory.length ? (
                servicesByCategory.map((servico) => {
                  const selected = selectedServiceIds.includes(servico.id);
                  return (
                    <article
                      key={servico.id}
                      className={`rounded-2xl border p-4 transition ${
                        selected
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p
                            className={`text-[11px] font-black uppercase tracking-[0.14em] ${
                              selected ? "text-zinc-300" : "text-amber-700"
                            }`}
                          >
                            {servico.categoriaNome}
                          </p>
                          <h4 className="mt-1 text-lg font-black">{servico.nome}</h4>
                          {servico.descricao ? (
                            <p
                              className={`mt-1 text-sm leading-6 ${
                                selected ? "text-zinc-300" : "text-zinc-500"
                              }`}
                            >
                              {servico.descricao}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-black">
                            {servico.exigeAvaliacao
                              ? "A avaliar"
                              : formatCurrency(servico.preco)}
                          </div>
                          {servico.duracaoMinutos ? (
                            <div
                              className={`mt-1 text-xs ${
                                selected ? "text-zinc-300" : "text-zinc-500"
                              }`}
                            >
                              {servico.duracaoMinutos} min
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleService(servico.id)}
                          className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black ${
                            selected
                              ? "bg-white text-zinc-950"
                              : "bg-zinc-100 text-zinc-950"
                          }`}
                        >
                          {selected ? <Check size={16} /> : <Plus size={16} />}
                          {selected ? "Selecionado" : "Adicionar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => goNextFromServices(servico.id)}
                          className={`inline-flex h-11 items-center rounded-xl px-4 text-sm font-black ${
                            selected
                              ? "border border-white/20 text-white"
                              : "bg-zinc-950 text-white"
                          }`}
                        >
                          Agendar
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyBox>Nenhum serviço encontrado nessa categoria.</EmptyBox>
              )}
            </div>
          </section>
        ) : null}

        {step === "selecionados" ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("servicos")}
              className="inline-flex items-center gap-2 text-sm font-black text-zinc-700"
            >
              <ArrowLeft size={16} />
              Adicionar mais serviços
            </button>
            <div className="rounded-[1.5rem] bg-zinc-50 p-4">
              <h4 className="text-xl font-black text-zinc-950">
                Serviços selecionados
              </h4>
              <div className="mt-4 grid gap-2">
                {selectedServices.length ? (
                  selectedServices.map((servico) => (
                    <div
                      key={servico.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
                    >
                      <div>
                        <div className="text-sm font-black text-zinc-950">
                          {servico.nome}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {servico.duracaoMinutos || 0} min
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleService(servico.id)}
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-black text-zinc-700"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyBox>Escolha pelo menos um serviço para continuar.</EmptyBox>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Duração
                  </div>
                  <div className="mt-1 text-xl font-black text-zinc-950">
                    {totalDuration || 0} min
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Valor
                  </div>
                  <div className="mt-1 text-xl font-black text-zinc-950">
                    {formatCurrency(totalEstimado)}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={!selectedServices.length}
              onClick={() => setStep("pessoa")}
              className="h-14 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white disabled:opacity-50"
            >
              Continuar
            </button>
          </section>
        ) : null}

        {step === "pessoa" ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("selecionados")}
              className="inline-flex items-center gap-2 text-sm font-black text-zinc-700"
            >
              <ArrowLeft size={16} />
              Serviços
            </button>
            <div className="grid gap-3">
              {[
                { value: "mim", label: "A reserva é para mim", icon: UserRound },
                {
                  value: "outra_pessoa",
                  label: "A reserva é para outra pessoa",
                  icon: UsersRound,
                },
              ].map((option) => {
                const Icon = option.icon;
                const selected = pessoaTipo === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPessoaTipo(option.value as typeof pessoaTipo)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${
                      selected
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-950"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-black">{option.label}</span>
                  </button>
                );
              })}
            </div>

            {pessoaTipo === "outra_pessoa" ? (
              <div className="space-y-3 rounded-[1.5rem] bg-zinc-50 p-4">
                <input
                  name="pessoa_nome"
                  value={pessoaNome}
                  onChange={(event) => setPessoaNome(event.target.value)}
                  placeholder="Nome da pessoa"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-950"
                />
                <input
                  name="pessoa_whatsapp"
                  value={pessoaWhatsapp}
                  onChange={(event) => setPessoaWhatsapp(event.target.value)}
                  placeholder="WhatsApp da pessoa"
                  inputMode="tel"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-950"
                />
                <textarea
                  name="pessoa_observacao"
                  value={pessoaObservacao}
                  onChange={(event) => setPessoaObservacao(event.target.value)}
                  placeholder="Observação opcional"
                  className="min-h-24 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </div>
            ) : null}

            <button
              type="button"
              disabled={
                pessoaTipo === "outra_pessoa" &&
                (!pessoaNome.trim() || !pessoaWhatsapp.trim())
              }
              onClick={() => setStep("profissional")}
              className="h-14 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white disabled:opacity-50"
            >
              Escolher profissional
            </button>
          </section>
        ) : null}

        {step === "profissional" ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("pessoa")}
              className="inline-flex items-center gap-2 text-sm font-black text-zinc-700"
            >
              <ArrowLeft size={16} />
              Para quem é
            </button>
            <h4 className="text-xl font-black text-zinc-950">
              Profissionais compatíveis
            </h4>
            {profissionaisCompativeis.length ? (
              <div className="grid gap-2">
                {profissionaisCompativeis.map((profissional) => {
                  const selected = profissional.id === profissionalId;
                  return (
                    <button
                      key={profissional.id}
                      type="button"
                      onClick={() => {
                        setProfissionalId(profissional.id);
                        setStep("data");
                      }}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${
                        selected
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-900"
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
                        <div className={`mt-0.5 text-xs ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
                          {profissional.especialidade || "Atendimento do salão"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyBox>
                Nenhum profissional disponível para todos os serviços selecionados.
                Remova um serviço ou escolha outro.
              </EmptyBox>
            )}
          </section>
        ) : null}

        {step === "data" ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("profissional")}
              className="inline-flex items-center gap-2 text-sm font-black text-zinc-700"
            >
              <ArrowLeft size={16} />
              Profissional
            </button>
            <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h5 className="text-xl font-black capitalize text-zinc-950">
                  {formatMonthLabel(monthCursor)}
                </h5>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canGoPreviousMonth}
                    onClick={() => setMonthCursor((current) => addMonths(current, -1))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 disabled:opacity-40"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthCursor((current) => addMonths(current, 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              {loadingAvailability ? (
                <EmptyBox>Carregando horários disponíveis...</EmptyBox>
              ) : availabilityError ? (
                <EmptyBox>{availabilityError}</EmptyBox>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-zinc-500">
                    {["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {calendarDays.map((day) =>
                      day.currentMonth ? (
                        <button
                          key={day.key}
                          type="button"
                          disabled={!day.available || !day.selectable}
                          onClick={() => {
                            const nextDay = diasDisponiveis.find((item) => item.data === day.date);
                            setSelectedDate(day.date);
                            setSelectedTime(nextDay?.horarios[0]?.horaInicio || "");
                            setStep("horario");
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
                            <span className="absolute bottom-2 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-emerald-500" />
                          ) : null}
                        </button>
                      ) : (
                        <span key={day.key} />
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        {step === "horario" ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("data")}
              className="inline-flex items-center gap-2 text-sm font-black text-zinc-700"
            >
              <ArrowLeft size={16} />
              Data
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-600">
              <Clock3 size={16} />
              Escolha o horário
            </div>
            {horariosDoDiaSelecionado.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {horariosDoDiaSelecionado.map((horario) => (
                  <button
                    key={`${selectedDate}-${horario.horaInicio}`}
                    type="button"
                    onClick={() => {
                      setSelectedTime(horario.horaInicio);
                      setStep("resumo");
                    }}
                    className={`h-14 rounded-2xl border px-5 text-lg font-black shadow-sm transition ${
                      selectedTime === horario.horaInicio
                        ? "border-cyan-700 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-700"
                        : "border-zinc-100 bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    {horario.horaInicio}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyBox>Não há horários livres para essa combinação.</EmptyBox>
            )}
          </section>
        ) : null}

        {step === "resumo" ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("horario")}
              className="inline-flex items-center gap-2 text-sm font-black text-zinc-700"
            >
              <ArrowLeft size={16} />
              Horário
            </button>
            <div className="rounded-[1.5rem] bg-zinc-950 p-5 text-white">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                <Scissors size={15} />
                Resumo
              </div>
              <h4 className="mt-3 text-2xl font-black">Confirmar agendamento</h4>
              <div className="mt-5 space-y-3 text-sm">
                <p>
                  <strong>{selectedServices.length}</strong> serviço(s) com{" "}
                  <strong>{selectedProfissional?.nome || "profissional"}</strong>
                </p>
                <p>
                  {selectedDate || "Data"} às {selectedTime || "--:--"}.
                </p>
                <p>
                  Duração total: <strong>{totalDuration || 0} min</strong>.
                </p>
                <p>
                  Valor estimado: <strong>{formatCurrency(totalEstimado)}</strong>.
                </p>
                <p>
                  Reserva para:{" "}
                  <strong>
                    {pessoaTipo === "mim" ? "mim" : pessoaNome || "outra pessoa"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-3 text-left">
              <label
                htmlFor="cliente-booking-cupom"
                className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500"
              >
                Cupom
              </label>
              {cuponsDisponiveis.length ? (
                <div className="mb-3 mt-2 space-y-2">
                  {cuponsDisponiveis.map((cupom) => {
                    const selected = codigoCupom.trim().toUpperCase() === cupom.codigo;
                    return (
                      <button
                        key={cupom.codigo}
                        type="button"
                        onClick={() => setCodigoCupom(cupom.codigo)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          selected
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                            : "border-zinc-200 bg-zinc-50 text-zinc-800"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black">{cupom.nome}</span>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-emerald-700">
                            {cupom.codigo}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-zinc-600">
                          {cupom.descontoLabel}.
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <input
                id="cliente-booking-cupom"
                name="cupom"
                value={codigoCupom}
                onChange={(event) => setCodigoCupom(event.target.value.toUpperCase())}
                placeholder="Ex.: SAUDADES"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-bold uppercase outline-none focus:border-zinc-950"
              />
            </div>

            <SubmitButton disabled={!canSubmit} />
            {state.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {state.error}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </form>
  );
}
