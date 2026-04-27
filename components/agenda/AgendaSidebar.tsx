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

export type AgendaSidebarPanel = {
  title: string;
  subtitle: string;
  content: ReactNode;
  onBack: () => void;
};

type Props = {
  open: boolean;
  view: AgendaSidebarView;
  panel?: AgendaSidebarPanel | null;
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
  onSetView: (view: AgendaSidebarView) => void;
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
    panel,
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
    onSetView,
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

  const headerTitle = panel
    ? panel.title
    : view === "clientSearch"
      ? "Buscar cliente"
      : view === "waitlist"
        ? "Lista de espera"
        : "Agenda";
  const headerSubtitle = panel
    ? panel.subtitle
    : view === "clientSearch"
      ? "Busque no cadastro e abra a ficha da cliente."
      : view === "waitlist"
        ? "Fila rapida de clientes e atendimentos pendentes."
        : "Visao geral do periodo";

  const showBackButton = Boolean(panel) || view !== "overview";

  return (
    <aside className="w-full min-h-0 lg:h-full lg:max-w-[436px] lg:min-w-[436px] xl:max-w-[456px] xl:min-w-[456px]">
      <div className="flex h-full min-h-0 flex-col rounded-[34px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,251,255,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showBackButton ? (
              <button
                type="button"
                onClick={panel ? panel.onBack : onBackToOverview}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>
            ) : null}

            <h2 className="text-[2rem] font-semibold tracking-[-0.065em] text-slate-900">
              {headerTitle}
            </h2>
            <p className="mt-1 max-w-[26rem] text-sm leading-6 text-zinc-500">
              {headerSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50 hover:text-zinc-900"
            title="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>

        {!panel ? (
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-[24px] border border-zinc-200/80 bg-zinc-50/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <SidebarNavButton
              active={view === "overview"}
              onClick={() => onSetView("overview")}
            >
              Resumo
            </SidebarNavButton>
            <SidebarNavButton
              active={view === "clientSearch"}
              onClick={onOpenClientSearch}
            >
              Clientes
            </SidebarNavButton>
            <SidebarNavButton
              active={view === "waitlist"}
              onClick={onOpenWaitlist}
            >
              Espera
            </SidebarNavButton>
          </div>
        ) : null}

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {panel ? (
            <div className="h-full">{panel.content}</div>
          ) : view === "clientSearch" ? (
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
            <div className="space-y-3.5">
              <section className="rounded-[26px] border border-zinc-200/80 bg-white/98 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-[1px] hover:shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-950">Valor total</p>
                    <p className="mt-1.5 truncate text-[1.82rem] font-semibold tracking-[-0.05em] text-emerald-600">
                      {potentialValueVisible ? totalValueLabel : "R$ ******"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTogglePotentialValueVisible}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50/80 text-zinc-600 transition duration-200 hover:-translate-y-[1px] hover:bg-white"
                    title={potentialValueVisible ? "Ocultar valor" : "Mostrar valor"}
                  >
                    <Eye size={18} />
                  </button>
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  {totalValueCaption}
                </div>
              </section>

              <section className="rounded-[26px] border border-zinc-200/80 bg-white/98 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-[1px] hover:shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="truncate text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-900 capitalize">
                    {currentMonthLabel}
                  </span>
                  <ChevronDown size={18} className="shrink-0 text-zinc-500" />
                </button>

                <div className="mt-3 grid grid-cols-2 gap-3">
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

              <section className="rounded-[26px] border border-zinc-200/80 bg-white/98 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-[1px] hover:shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
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

              <section className="rounded-[26px] border border-zinc-200/80 bg-white/98 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-[1px] hover:shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
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

              <section className="rounded-[26px] border border-zinc-200/80 bg-white/98 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-[1px] hover:shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
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

function SidebarNavButton({
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
          ? "rounded-[16px] bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-[0_10px_24px_rgba(124,58,237,0.14)] transition duration-200"
          : "rounded-[16px] px-3 py-2 text-sm font-medium text-zinc-600 transition duration-200 hover:bg-white/70"
      }
    >
      {children}
    </button>
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
      <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Filtro da cliente
        </label>
        <div className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50 px-3 py-3">
          <Search size={16} className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Digite o nome ou whatsapp"
            className="w-full bg-transparent text-sm text-zinc-900 outline-none"
          />
        </div>
      </section>

      <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
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
                className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-white px-3.5 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_16px_32px_rgba(15,23,42,0.07)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900">
                    {client.nome}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {client.whatsapp || "Sem whatsapp cadastrado"}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-violet-600">
                  Abrir
                </span>
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
      <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
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
                className="rounded-[20px] border border-zinc-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_16px_32px_rgba(15,23,42,0.07)]"
              >
                <div className="truncate text-sm font-semibold text-zinc-900">
                  {item.clientName}
                </div>
                <div className="mt-1 truncate text-xs text-zinc-500">
                  {item.serviceName}
                </div>
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
    <div className="rounded-[20px] border border-zinc-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses}`}
        >
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
    <div className={`rounded-[18px] px-3.5 py-2.5 transition duration-200 ${toneClasses}`}>
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
          ? "rounded-2xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)] transition duration-200"
          : "rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50"
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
          ? "flex items-center justify-center gap-2 rounded-[20px] border border-violet-300 bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700 shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition duration-200"
          : "flex items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-700 transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50"
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
      className="flex min-w-0 items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-3.5 py-3 text-left text-[13px] font-medium text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50/80 hover:shadow-[0_16px_35px_rgba(15,23,42,0.08)]"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
        {icon}
      </span>
      <span className="min-w-0 break-words leading-tight">{label}</span>
    </button>
  );
}
