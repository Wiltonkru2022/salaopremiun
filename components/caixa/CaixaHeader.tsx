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
    <div className="space-y-2">
      <div className="hidden flex-wrap items-center gap-1.5 text-[11px] text-slate-500 xl:flex">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
          <Home size={11} />
        </span>
        <ChevronRight size={12} className="text-slate-300" />
        <span>Operacoes</span>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="font-semibold text-slate-900">Caixa</span>
      </div>

      <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[1.8rem] font-bold tracking-[-0.03em] text-slate-950 xl:text-[1.7rem]">
              Caixa
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                caixaAberto
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  caixaAberto ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
            </span>
          </div>
          <p className="max-w-3xl text-[11px] text-slate-500 xl:max-w-2xl">
            Triagem, pagamento e fechamento da comanda em uma tela mais direta.
          </p>
        </div>

        <button
          type="button"
          onClick={onAbrirSessao}
          className="inline-flex h-9 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <WalletCards size={14} />
          Sessao do caixa
        </button>
      </div>

      <div className="grid gap-2 xl:grid-cols-4">
        <StatCard
          icon={<CircleDollarSign size={14} />}
          label="Em andamento"
          value={totalEmAberto}
          suffix="comandas"
          tone="emerald"
        />
        <StatCard
          icon={<ReceiptText size={14} />}
          label="Comandas ativas"
          value={comandasAtivas}
          suffix="comandas"
          tone="teal"
        />
        <StatCard
          icon={<CalendarDays size={14} />}
          label="Agenda sem comanda"
          value={agendamentosPendentes}
          suffix="agendamentos"
          tone="amber"
        />
        <StatCard
          icon={<Lock size={14} />}
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
      className={`rounded-[18px] border px-3 py-2.5 shadow-[0_8px_18px_rgba(148,163,184,0.06)] ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/10 bg-white/80">
          {icon}
        </div>
        <ChevronRight size={14} className="text-slate-400" />
      </div>

      <div className="mt-2 text-[13px] font-semibold text-slate-700">{label}</div>
      <div className="mt-0.5 flex items-end gap-1.5">
        <span className="text-[1.5rem] font-bold leading-none tracking-[-0.05em] text-slate-950 xl:text-[1.55rem]">
          {value}
        </span>
        <span className="pb-0.5 text-[11px] text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}
