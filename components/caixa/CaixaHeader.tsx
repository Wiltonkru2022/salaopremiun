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
    <div className="overflow-hidden rounded-[32px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,251,255,0.96)_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
      <div className="border-b border-zinc-200/80 px-6 py-6 text-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Workspace do caixa
            </div>
            <h1 className="mt-2 text-[2.35rem] font-semibold text-slate-900">
              Caixa
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Receba, revise e feche vendas em uma tela feita para operacao rapida.
            </p>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-3 text-right shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Em andamento agora
            </div>
            <div className="mt-1 text-2xl font-bold text-zinc-950">{totalEmAberto}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
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
  tone: "amber" | "emerald" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-zinc-200 bg-zinc-50 text-zinc-900";

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}
