"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Eye,
  Lock,
  MonitorUp,
  Search,
  Sparkles,
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
  clientCreateOpen: boolean;
  clientCreateName: string;
  clientCreateWhatsapp: string;
  clientCreateSaving: boolean;
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
  onStartCreateClient: () => void;
  onCancelCreateClient: () => void;
  onCreateClientNameChange: (value: string) => void;
  onCreateClientWhatsappChange: (value: string) => void;
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
    clientCreateOpen,
    clientCreateName,
    clientCreateWhatsapp,
    clientCreateSaving,
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
    onStartCreateClient,
    onCancelCreateClient,
    onCreateClientNameChange,
    onCreateClientWhatsappChange,
    onOpenClient,
  } = props;

  if (!open) return null;

  const title = panel
    ? panel.title
    : view === "clientSearch"
      ? "Clientes"
      : view === "waitlist"
        ? "Lista de espera"
        : "Agenda";
  const subtitle = panel
    ? panel.subtitle
    : view === "clientSearch"
      ? "Busque ou cadastre uma cliente."
      : view === "waitlist"
        ? "Atendimentos aguardando confirmação."
        : "Resumo rápido do período";
  const showBack = Boolean(panel) || view !== "overview";

  return (
    <aside className="min-h-0 w-full lg:h-full lg:min-w-[318px] lg:max-w-[332px] xl:min-w-[332px] xl:max-w-[348px] 2xl:min-w-[360px] 2xl:max-w-[360px]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
        <header className="shrink-0 border-b border-zinc-100 px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {showBack ? (
                <button
                  type="button"
                  onClick={panel ? panel.onBack : onBackToOverview}
                  className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-950"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              ) : null}
              <h2 className="truncate text-[1.05rem] font-bold tracking-[-0.03em] text-zinc-950">{title}</h2>
              <p className="mt-0.5 text-xs leading-4 text-zinc-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onToggleOpen}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
              title="Fechar painel"
            >
              <X size={18} />
            </button>
          </div>

          {!panel ? (
            <div className="mt-3 grid grid-cols-3 rounded-xl bg-zinc-100 p-1">
              <NavButton active={view === "overview"} onClick={() => onSetView("overview")}>Resumo</NavButton>
              <NavButton active={view === "clientSearch"} onClick={onOpenClientSearch}>Clientes</NavButton>
              <NavButton active={view === "waitlist"} onClick={onOpenWaitlist}>Espera</NavButton>
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3 [scrollbar-width:thin]">
          {panel ? (
            panel.content
          ) : view === "clientSearch" ? (
            <ClientSearchView
              query={clientSearchQuery}
              results={clientResults}
              createOpen={clientCreateOpen}
              createName={clientCreateName}
              createWhatsapp={clientCreateWhatsapp}
              createSaving={clientCreateSaving}
              onQueryChange={onClientSearchQueryChange}
              onCreateClient={onCreateClient}
              onStartCreateClient={onStartCreateClient}
              onCancelCreateClient={onCancelCreateClient}
              onCreateNameChange={onCreateClientNameChange}
              onCreateWhatsappChange={onCreateClientWhatsappChange}
              onOpenClient={onOpenClient}
            />
          ) : view === "waitlist" ? (
            <WaitlistView items={waitlistItems} />
          ) : (
            <div className="space-y-4">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">{totalValueCaption}</p>
                    <p className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-zinc-950">
                      {potentialValueVisible ? totalValueLabel : "R$ ••••••"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTogglePotentialValueVisible}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
                    title={potentialValueVisible ? "Ocultar valor" : "Mostrar valor"}
                  >
                    <Eye size={17} />
                  </button>
                </div>
              </section>

              <div className="h-px bg-zinc-100" />

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold capitalize text-zinc-900">{currentMonthLabel}</h3>
                  <span className="text-xs text-zinc-400">{appointmentsCount} agend.</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Confirmados" value={statusCounts.confirmado} />
                  <Metric label="Pendentes" value={statusCounts.pendente} />
                  <Metric label="Atendidos" value={attendedCount} />
                  <Metric label="Em caixa" value={waitingPaymentCount} />
                </div>
                {blockedCount > 0 ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    <span>Horários bloqueados</span><span>{blockedCount}</span>
                  </div>
                ) : null}
              </section>

              <div className="h-px bg-zinc-100" />

              <section>
                <h3 className="mb-2 text-sm font-bold text-zinc-900">Visualização</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  <SmallButton active={false} onClick={onToday}>Hoje</SmallButton>
                  <SmallButton active={viewMode === "day"} onClick={() => onChangeView("day")}>Dia</SmallButton>
                  <SmallButton active={viewMode === "week"} onClick={() => onChangeView("week")}>Semana</SmallButton>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <ModeButton active={densityMode === "reception"} icon={<Sparkles size={15} />} label="Recepção" onClick={() => onChangeDensityMode("reception")} />
                  <ModeButton active={densityMode === "standard"} icon={<MonitorUp size={15} />} label="Conforto" onClick={() => onChangeDensityMode("standard")} />
                </div>
              </section>

              <div className="h-px bg-zinc-100" />

              <section>
                <h3 className="mb-2 text-sm font-bold text-zinc-900">Ações</h3>
                <div className="space-y-1.5">
                  <Action icon={<CalendarDays size={17} />} label="Novo agendamento" primary onClick={onOpenCreate} />
                  <Action icon={<Search size={17} />} label="Buscar cliente" onClick={onOpenClientSearch} />
                  <Action icon={<Lock size={17} />} label="Bloquear horário" onClick={onOpenBlock} />
                  <Action icon={<Users size={17} />} label="Lista de espera" onClick={onOpenWaitlist} />
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <Action icon={<CreditCard size={16} />} label="Crédito" compact onClick={onOpenCredit} />
                    <Action icon={<Wallet size={16} />} label="Caixas" compact onClick={onOpenCashier} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={active ? "rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-zinc-950 shadow-sm" : "rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"}>{children}</button>;
}

function ClientSearchView({ query, results, createOpen, createName, createWhatsapp, createSaving, onQueryChange, onCreateClient, onStartCreateClient, onCancelCreateClient, onCreateNameChange, onCreateWhatsappChange, onOpenClient }: {
  query: string; results: Cliente[]; createOpen: boolean; createName: string; createWhatsapp: string; createSaving: boolean;
  onQueryChange: (value: string) => void; onCreateClient: () => void; onStartCreateClient: () => void; onCancelCreateClient: () => void;
  onCreateNameChange: (value: string) => void; onCreateWhatsappChange: (value: string) => void; onOpenClient: (clientId: string) => void;
}) {
  const hasQuery = query.trim().length > 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <Search size={16} className="text-zinc-400" />
        <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Nome ou WhatsApp" className="w-full bg-transparent text-sm outline-none" />
      </div>

      {!hasQuery ? (
        <p className="py-4 text-center text-sm text-zinc-500">Digite para buscar uma cliente.</p>
      ) : results.length ? (
        <div className="space-y-1.5">
          {results.map((client) => (
            <button key={client.id} type="button" onClick={() => onOpenClient(client.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-left hover:bg-zinc-50">
              <div className="min-w-0"><div className="truncate text-sm font-bold text-zinc-900">{client.nome}</div><div className="truncate text-xs text-zinc-500">{client.whatsapp || "Sem WhatsApp"}</div></div>
              <span className="text-xs font-bold text-zinc-500">Abrir</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 p-3">
          <p className="text-sm font-bold text-zinc-900">Cliente não encontrada</p>
          {!createOpen ? (
            <button type="button" onClick={onStartCreateClient} className="mt-2 w-full rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-bold text-white">Cadastrar cliente</button>
          ) : (
            <div className="mt-3 space-y-2">
              <input value={createName} onChange={(e) => onCreateNameChange(e.target.value)} placeholder="Nome" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" />
              <input value={createWhatsapp} onChange={(e) => onCreateWhatsappChange(e.target.value)} placeholder="WhatsApp" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onCancelCreateClient} className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-bold">Cancelar</button>
                <button type="button" disabled={createSaving} onClick={onCreateClient} className="rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60">{createSaving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WaitlistView({ items }: { items: AgendaWaitlistItem[] }) {
  if (!items.length) return <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-500">Nenhuma cliente aguardando agora.</div>;
  return <div className="space-y-1.5">{items.map((item) => <div key={item.id} className="rounded-xl border border-zinc-200 px-3 py-2.5"><div className="truncate text-sm font-bold text-zinc-900">{item.clientName}</div><div className="mt-0.5 truncate text-xs text-zinc-500">{item.serviceName}</div><div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500"><span>{item.dateLabel}</span><span>•</span><span>{item.timeLabel}</span><span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{item.statusLabel}</span></div></div>)}</div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-zinc-50 px-3 py-2"><div className="text-[11px] text-zinc-500">{label}</div><div className="mt-0.5 text-lg font-black text-zinc-950">{value}</div></div>;
}

function SmallButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={active ? "rounded-xl bg-zinc-950 px-2 py-2 text-xs font-bold text-white" : "rounded-xl bg-zinc-100 px-2 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200"}>{children}</button>;
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={active ? "flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-2 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200" : "flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 px-2 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200"}>{icon}{label}</button>;
}

function Action({ icon, label, onClick, primary = false, compact = false }: { icon: ReactNode; label: string; onClick: () => void; primary?: boolean; compact?: boolean }) {
  return <button type="button" onClick={onClick} className={`${compact ? "justify-center" : "justify-start"} flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${primary ? "bg-zinc-950 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>{icon}<span>{label}</span></button>;
}
