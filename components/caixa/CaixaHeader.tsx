import type { ReactNode } from "react";
import {
  CalendarDays,
  CircleDollarSign,
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
      <div className="flex flex-col gap-2 rounded-[20px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(148,163,184,0.07)] xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[1.65rem] font-bold tracking-[-0.04em] text-slate-950">
            Caixa
          </h1>
          <span
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${
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

        <button
          type="button"
          onClick={onAbrirSessao}
          className="inline-flex h-8 items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
        >
          <WalletCards size={13} />
          Sessao do caixa
        </button>
      </div>

      <div className="grid gap-2 xl:grid-cols-4">
        <StatChip
          icon={<CircleDollarSign size={13} />}
          label="Em andamento"
          value={totalEmAberto}
          suffix="comandas"
          tone="emerald"
        />
        <StatChip
          icon={<ReceiptText size={13} />}
          label="Comandas ativas"
          value={comandasAtivas}
          suffix="comandas"
          tone="teal"
        />
        <StatChip
          icon={<CalendarDays size={13} />}
          label="Agenda sem comanda"
          value={agendamentosPendentes}
          suffix="agendamentos"
          tone="amber"
        />
        <StatChip
          icon={<Lock size={13} />}
          label="Fechadas hoje"
          value={comandasFechadasHoje}
          suffix="vendas"
          tone="blue"
        />
      </div>
    </div>
  );
}

function StatChip({
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
      ? "border-amber-200 bg-amber-50/70 text-amber-700"
      : tone === "blue"
        ? "border-sky-200 bg-sky-50/70 text-sky-700"
        : tone === "teal"
          ? "border-emerald-200 bg-emerald-50/60 text-emerald-700"
          : "border-emerald-200 bg-emerald-50/70 text-emerald-700";

  return (
    <div
      className={`flex min-h-[68px] items-center gap-3 rounded-[18px] border px-3 py-2.5 ${toneClass}`}
    >
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/10 bg-white/90">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 flex items-end gap-1.5">
          <span className="text-[1.35rem] font-bold leading-none tracking-[-0.04em] text-slate-950">
            {value}
          </span>
          <span className="truncate pb-0.5 text-[11px] text-slate-500">
            {suffix}
          </span>
        </div>
      </div>
    </div>
  );
}
