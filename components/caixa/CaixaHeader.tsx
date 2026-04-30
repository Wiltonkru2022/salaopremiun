import type { ReactNode } from "react";
import { CalendarClock, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";

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
    <div className="overflow-hidden rounded-[24px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="px-4 py-3 text-zinc-950">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Workspace do caixa
            </div>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <h1 className="text-[1.8rem] font-semibold leading-none text-slate-900">Caixa</h1>
              <p className="text-sm text-zinc-500">
                Operacao rapida para receber, revisar e fechar vendas.
              </p>
            </div>
          </div>

          <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:max-w-[1200px] xl:grid-cols-5">
            <StatCard
              icon={<CircleDollarSign size={15} />}
              label="Em andamento agora"
              value={totalEmAberto}
              tone="emerald"
            />
            <StatCard
              icon={<ReceiptText size={15} />}
              label="Comandas ativas"
              value={comandasAtivas}
              tone="zinc"
            />
            <StatCard
              icon={<CalendarClock size={15} />}
              label="Agenda sem comanda"
              value={agendamentosPendentes}
              tone="amber"
            />
            <StatCard
              icon={<CircleDollarSign size={15} />}
              label="Fechadas hoje"
              value={comandasFechadasHoje}
              tone="sky"
            />
            <ActionCard
              icon={<WalletCards size={15} />}
              label="Sessao do caixa"
              description={
                caixaAberto
                  ? "Abrir, fechar e lancar movimentos."
                  : "Abrir caixa e controlar movimentos."
              }
              onClick={onAbrirSessao}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[18px] border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-xs leading-5 text-zinc-600">{description}</div>
    </button>
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
    <div className={`rounded-[18px] border px-3.5 py-2.5 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}
