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
    <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-white px-6 py-6 text-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Operacao do salao
            </div>
            <h1 className="mt-2 text-3xl font-bold">Caixa</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Atendimento, cobranca, pagamento e fechamento em um fluxo mais claro.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Movimento agora
            </div>
            <div className="mt-1 text-2xl font-bold">{totalEmAberto}</div>
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
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}
