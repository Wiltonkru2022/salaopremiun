"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Eye,
  Lock,
  MonitorUp,
  Search,
  Sparkles,
  UserRoundSearch,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { AgendaDensityMode, Cliente, ViewMode } from "@/types/agenda";

export type AgendaSidebarView = "overview" | "clientSearch" | "waitlist";

export type AgendaWaitlistItem = {
  id: string;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  statusLabel: string;
};

type Props = {
  open: boolean;
  view: AgendaSidebarView;
  currentMonthLabel: string;
  totalValueLabel: string;
  potentialValueVisible: boolean;
  totalValueCaption: string;
  appointmentsCount: number;
  waitingPaymentCount: number;
  blockedCount: number;
  attendedCount: number;
  statusCounts: {
    confirmado: number;
    pendente: number;
    atendido: number;
    aguardandoPagamento: number;
    cancelado: number;
  };
  viewMode: ViewMode;
  densityMode: AgendaDensityMode;
  clientSearchQuery: string;
  clientResults: Cliente[];
  waitlistItems: AgendaWaitlistItem[];
  onToggleOpen: () => void;
  onBackToOverview: () => void;
  onChangeView: (view: ViewMode) => void;
  onChangeDensityMode: (mode: AgendaDensityMode) => void;
  onToday: () => void;
  onTogglePotentialValueVisible: () => void;
  onOpenCreate: () => void;
  onOpenBlock: () => void;
  onOpenCredit: () => void;
  onOpenCashier: () => void;
  onOpenClientSearch: () => void;
  onOpenWaitlist: () => void;
  onClientSearchQueryChange: (value: string) => void;
  onCreateClient: () => void;
  onOpenClient: (clientId: string) => void;
};

export default function AgendaSidebar(props: Props) {
  const {
    open,
    view,
    currentMonthLabel,
    totalValueLabel,
    potentialValueVisible,
    totalValueCaption,
    appointmentsCount,
    waitingPaymentCount,
    blockedCount,
    attendedCount,
    statusCounts,
    viewMode,
    densityMode,
    clientSearchQuery,
    clientResults,
    waitlistItems,
    onToggleOpen,
    onBackToOverview,
    onChangeView,
    onChangeDensityMode,
    onToday,
    onTogglePotentialValueVisible,
    onOpenCreate,
    onOpenBlock,
    onOpenCredit,
    onOpenCashier,
    onOpenClientSearch,
    onOpenWaitlist,
    onClientSearchQueryChange,
    onCreateClient,
    onOpenClient,
  } = props;

  if (!open) {
    return null;
  }

  const headerTitle =
    view === "clientSearch"
      ? "Buscar cliente"
      : view === "waitlist"
        ? "Lista de espera"
        : "Agenda";
  const headerSubtitle =
    view === "clientSearch"
      ? "Busque no cadastro e abra a ficha da cliente."
      : view === "waitlist"
        ? "Fila rapida de clientes e atendimentos pendentes."
        : "Visao geral do periodo";

  return (
    <aside className="w-full min-h-0 lg:h-full lg:max-w-[344px] lg:min-w-[344px]">
      <div className="flex h-full min-h-0 flex-col rounded-[30px] border border-white/80 bg-white/96 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {view !== "overview" ? (
              <button
                type="button"
                onClick={onBackToOverview}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>
            ) : null}

            <h2 className="text-[1.9rem] font-semibold tracking-[-0.06em] text-slate-900">
              {headerTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{headerSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:text-zinc-900"
            title="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 pr-0.5">
          {view === "clientSearch" ? (
            <ClientSearchView
              query={clientSearchQuery}
              results={clientResults}
              onQueryChange={onClientSearchQueryChange}
              onCreateClient={onCreateClient}
              onOpenClient={onOpenClient}
            />
          ) : view === "waitlist" ? (
            <WaitlistView items={waitlistItems} />
          ) : (
            <div className="space-y-2.5">
              <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-950">Valor total</p>
                    <p className="mt-1.5 truncate text-[1.7rem] font-semibold tracking-[-0.05em] text-emerald-600">
                      {potentialValueVisible ? totalValueLabel : "R$ ******"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTogglePotentialValueVisible}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50/80 text-zinc-600"
                    title={potentialValueVisible ? "Ocultar valor" : "Mostrar valor"}
                  >
                    <Eye size={18} />
                  </button>
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  {totalValueCaption}
                </div>
              </section>

              <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-[1.4rem] font-semibold tracking-[-0.05em] text-slate-900 capitalize">
                    {currentMonthLabel}
                  </span>
                  <ChevronDown size={18} className="text-zinc-500" />
                </button>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricCard
                    icon={<UserRoundSearch size={16} />}
                    label="Atendimentos"
                    value={appointmentsCount}
                    tone="emerald"
                  />
                  <MetricCard
                    icon={<Wallet size={16} />}
                    label="Aguardando caixa"
                    value={waitingPaymentCount}
                    tone="amber"
                  />
                  <MetricCard
                    icon={<Lock size={16} />}
                    label="Bloqueios"
                    value={blockedCount}
                    tone="violet"
                  />
                  <MetricCard
                    icon={<CalendarDays size={16} />}
                    label="Atendidos"
                    value={attendedCount}
                    tone="sky"
                  />
                </div>
              </section>

              <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <h3 className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-900">
                  Status dos atendimentos
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatusCard label="Confirmados" value={statusCounts.confirmado} tone="emerald" />
                  <StatusCard label="Pendentes" value={statusCounts.pendente} tone="amber" />
                  <StatusCard
                    label="Em caixa"
                    value={statusCounts.aguardandoPagamento}
                    tone="violet"
                  />
                  <StatusCard label="Atendidos" value={statusCounts.atendido} tone="sky" />
                </div>
              </section>

              <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <h3 className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-900">
                  Visualizacao
                </h3>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <ToggleButton active={false} onClick={onToday}>
                    Hoje
                  </ToggleButton>
                  <ToggleButton active={viewMode === "day"} onClick={() => onChangeView("day")}>
                    Dia
                  </ToggleButton>
                  <ToggleButton active={viewMode === "week"} onClick={() => onChangeView("week")}>
                    Semana
                  </ToggleButton>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ModeButton
                    active={densityMode === "reception"}
                    label="Recepcao"
                    icon={<Sparkles size={17} />}
                    onClick={() => onChangeDensityMode("reception")}
                  />
                  <ModeButton
                    active={densityMode === "standard"}
                    label="Conforto"
                    icon={<MonitorUp size={17} />}
                    onClick={() => onChangeDensityMode("standard")}
                  />
                </div>
              </section>

              <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <h3 className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-900">
                  Acoes rapidas
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <QuickAction
                    icon={<CalendarDays size={16} />}
                    label="Novo agendamento"
                    onClick={onOpenCreate}
                  />
                  <QuickAction
                    icon={<Lock size={16} />}
                    label="Bloquear horario"
                    onClick={onOpenBlock}
                  />
                  <QuickAction
                    icon={<Search size={16} />}
                    label="Buscar cliente"
                    onClick={onOpenClientSearch}
                  />
                  <QuickAction
                    icon={<Users size={16} />}
                    label="Lista de espera"
                    onClick={onOpenWaitlist}
                  />
                  <QuickAction
                    icon={<CreditCard size={16} />}
                    label="Abrir credito"
                    onClick={onOpenCredit}
                  />
                  <QuickAction
                    icon={<Wallet size={16} />}
                    label="Ver caixas"
                    onClick={onOpenCashier}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function ClientSearchView({
  query,
  results,
  onQueryChange,
  onCreateClient,
  onOpenClient,
}: {
  query: string;
  results: Cliente[];
  onQueryChange: (value: string) => void;
  onCreateClient: () => void;
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Filtro da cliente
        </label>
        <div className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50 px-3 py-3">
          <Search size={16} className="text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Digite o nome ou whatsapp"
            className="w-full bg-transparent text-sm text-zinc-900 outline-none"
          />
        </div>
      </section>

      <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-900">
          Resultado
        </div>

        {results.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {results.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => onOpenClient(client.id)}
                className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-white px-3.5 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900">
                    {client.nome}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {client.whatsapp || "Sem whatsapp cadastrado"}
                  </div>
                </div>
                <span className="text-xs font-semibold text-violet-600">Abrir</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4">
            <div className="text-sm font-semibold text-zinc-900">Nao encontrado</div>
            <p className="mt-1 text-sm text-zinc-500">
              Deseja criar novo cliente?
            </p>
            <button
              type="button"
              onClick={onCreateClient}
              className="mt-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Criar novo cliente
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function WaitlistView({ items }: { items: AgendaWaitlistItem[] }) {
  return (
    <div className="space-y-3">
      <section className="rounded-[22px] border border-zinc-200/80 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-900">
          Clientes aguardando
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Lista rapida para acompanhar encaixes e pendencias da agenda.
        </p>

        {items.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[20px] border border-zinc-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
              >
                <div className="text-sm font-semibold text-zinc-900">{item.clientName}</div>
                <div className="mt-1 text-xs text-zinc-500">{item.serviceName}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                    {item.dateLabel}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                    {item.timeLabel}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                    {item.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
            Nenhuma cliente na lista de espera agora.
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "amber" | "violet" | "sky";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "violet"
          ? "bg-violet-50 text-violet-700"
          : "bg-sky-50 text-sky-700";

  return (
    <div className="rounded-[18px] border border-zinc-200 bg-white p-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] leading-tight text-zinc-600">{label}</div>
          <div className="mt-1 text-[1.35rem] font-semibold tracking-[-0.05em] text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "violet" | "sky";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "violet"
          ? "bg-violet-50 text-violet-700"
          : "bg-sky-50 text-sky-700";

  return (
    <div className={`rounded-[18px] px-3.5 py-2.5 ${toneClasses}`}>
      <div className="text-[12px] font-medium leading-tight">{label}</div>
      <div className="mt-1 text-[1.3rem] font-semibold tracking-[-0.05em]">{value}</div>
    </div>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)]"
          : "rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700"
      }
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center justify-center gap-2 rounded-[20px] border border-violet-300 bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700 shadow-[0_12px_30px_rgba(124,58,237,0.12)]"
          : "flex items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-700"
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-3.5 py-3 text-left text-[13px] font-medium text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:-translate-y-[1px] hover:shadow-[0_16px_35px_rgba(15,23,42,0.08)]"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
        {icon}
      </span>
      <span className="min-w-0 leading-tight">{label}</span>
    </button>
  );
}
