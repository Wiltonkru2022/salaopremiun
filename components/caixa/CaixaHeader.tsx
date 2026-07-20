import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Home,
  Lock,
  ReceiptText,
  WalletCards,
} from "lucide-react";

type Props = {
  agendamentosPendentes: number;
  comandasAtivas: number;
  comandasFechadasHoje: number;
  totalEmAberto: number;
  caixaAberto: boolean;
  onAbrirSessao: () => void;
};

export default function CaixaHeader({
  agendamentosPendentes,
  comandasAtivas,
  comandasFechadasHoje,
  totalEmAberto,
  caixaAberto,
  onAbrirSessao,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
          <Home size={14} />
        </span>
        <ChevronRight size={14} className="text-slate-300" />
        <span>Operacoes</span>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="font-semibold text-slate-900">Caixa</span>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[2.5rem] font-bold tracking-[-0.03em] text-slate-950">
              Caixa
            </h1>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                caixaAberto
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  caixaAberto ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
            </span>
          </div>
          <p className="max-w-3xl text-[13px] text-slate-500">
            Triagem, pagamento e fechamento da comanda em uma tela mais direta.
          </p>
        </div>

        <button
          type="button"
          onClick={onAbrirSessao}
          className="inline-flex h-11 items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <WalletCards size={16} />
          Sessao do caixa
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={<CircleDollarSign size={18} />}
          label="Em andamento"
          value={totalEmAberto}
          suffix="comandas"
          tone="emerald"
        />
        <StatCard
          icon={<ReceiptText size={18} />}
          label="Comandas ativas"
          value={comandasAtivas}
          suffix="comandas"
          tone="teal"
        />
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Agenda sem comanda"
          value={agendamentosPendentes}
          suffix="agendamentos"
          tone="amber"
        />
        <StatCard
          icon={<Lock size={18} />}
          label="Fechadas hoje"
          value={comandasFechadasHoje}
          suffix="vendas"
          tone="blue"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix: string;
  tone: "amber" | "blue" | "emerald" | "teal";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] text-amber-700"
      : tone === "blue"
        ? "border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] text-sky-700"
        : tone === "teal"
          ? "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] text-emerald-700"
          : "border-emerald-200 bg-[linear-gradient(135deg,rgba(240,253,244,0.96),rgba(255,255,255,0.98))] text-emerald-700";

  return (
    <div
      className={`rounded-[24px] border p-4 shadow-[0_14px_30px_rgba(148,163,184,0.08)] ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-current/10 bg-white/80">
          {icon}
        </div>
        <ChevronRight size={18} className="text-slate-400" />
      </div>

      <div className="mt-4 text-base font-semibold text-slate-700">{label}</div>
      <div className="mt-1.5 flex items-end gap-2">
        <span className="text-4xl font-bold leading-none tracking-[-0.05em] text-slate-950">
          {value}
        </span>
        <span className="pb-0.5 text-sm text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}
