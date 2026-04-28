import type { ReactNode } from "react";
import { CalendarClock, CircleDollarSign, ReceiptText } from "lucide-react";

type Props = {
  agendamentosPendentes: number;
  comandasAtivas: number;
  comandasFechadasHoje: number;
  totalEmAberto: number;
};

export default function CaixaHeader({
  agendamentosPendentes,
  comandasAtivas,
  comandasFechadasHoje,
  totalEmAberto,
}: Props) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="px-5 py-4 text-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Workspace do caixa
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[1.95rem] font-semibold leading-none text-slate-900">
                Caixa
              </h1>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                Operacao rapida
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-5 text-zinc-500">
              Receba, revise e feche vendas com foco na fila, comanda e fechamento.
            </p>
          </div>

          <div className="min-w-[170px] rounded-[20px] border border-zinc-200 bg-white px-4 py-3 text-right shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Em andamento
            </div>
            <div className="mt-1 text-2xl font-bold leading-none text-zinc-950">{totalEmAberto}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<CircleDollarSign size={16} />}
            label="Em andamento agora"
            value={totalEmAberto}
            tone="sky"
          />
          <StatCard
            icon={<ReceiptText size={16} />}
            label="Comandas ativas"
            value={comandasAtivas}
            tone="zinc"
          />
          <StatCard
            icon={<CalendarClock size={16} />}
            label="Agenda sem comanda"
            value={agendamentosPendentes}
            tone="amber"
          />
          <StatCard
            icon={<CircleDollarSign size={16} />}
            label="Fechadas hoje"
            value={comandasFechadasHoje}
            tone="emerald"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "amber" | "emerald" | "sky" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-900"
      : "border-zinc-200 bg-zinc-50 text-zinc-900";

  return (
    <div className={`rounded-[20px] border px-3.5 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}
