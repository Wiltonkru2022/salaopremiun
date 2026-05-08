import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  CreditCard,
  FileText,
  Layers3,
  Link2,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import {
  getRoadmapByStatus,
  productRoadmap,
  roadmapStatusCopy,
  type RoadmapItem,
  type RoadmapStatus,
} from "@/lib/product-roadmap";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

const statusTone: Record<
  RoadmapStatus,
  {
    icon: ReactNode;
    className: string;
    cardClassName: string;
  }
> = {
  em_implementacao: {
    icon: <Clock3 size={15} />,
    className: "border-amber-200 bg-amber-50 text-amber-900",
    cardClassName: "border-amber-200 bg-amber-50/70",
  },
  planejado: {
    icon: <CircleDot size={15} />,
    className: "border-zinc-200 bg-zinc-50 text-zinc-700",
    cardClassName: "border-zinc-200 bg-white",
  },
  entregue: {
    icon: <CheckCircle2 size={15} />,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    cardClassName: "border-emerald-200 bg-emerald-50/60",
  },
};

const itemIcons: Record<string, React.ReactNode> = {
  "NFS-e": <FileText size={18} />,
  "WhatsApp automatico": <MessageCircle size={18} />,
  "Cobranca de sinal": <CreditCard size={18} />,
  "Google Calendar": <CalendarClock size={18} />,
  "Agendamento em grupo": <Users size={18} />,
  Recorrencia: <Layers3 size={18} />,
  "Linha do tempo do cliente": <Users size={18} />,
  "Link publico direto": <Link2 size={18} />,
  "Bloqueios da agenda": <CalendarClock size={18} />,
};

export const dynamic = "force-dynamic";

export default async function NovidadesPage() {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!usuario?.id_salao) {
    redirect("/dashboard");
  }

  const inProgress = getRoadmapByStatus("em_implementacao");
  const planned = getRoadmapByStatus("planejado");
  const delivered = getRoadmapByStatus("entregue");

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-zinc-950 px-5 py-6 text-white sm:px-6 sm:py-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              <Sparkles size={14} />
              Roadmap do SalãoPremium
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-[-0.04em] sm:text-[2.7rem]">
              O que está entrando no produto
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-[15px]">
              Uma visão direta das entregas que deixam o painel, o app cliente e
              a operação do salão mais fortes. NFS-e e WhatsApp automático ficam
              marcados como novidades em implementação.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <HeroMetric value={inProgress.length} label="em implementação" />
              <HeroMetric value={planned.length} label="planejadas" />
              <HeroMetric value={delivered.length} label="disponiveis" />
            </div>
          </div>

          <div className="grid content-between gap-4 bg-zinc-50 p-5 sm:p-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                Proxima leva
              </div>
              <div className="mt-3 grid gap-3">
                {inProgress.map((item) => (
                  <SpotlightItem key={item.title} item={item} />
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <ArrowUpRight size={17} />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-950">
                    Evolucao com controle
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    Recursos que mexem com agenda, cobrança e mensagem entram em
                    etapas para preservar estabilidade, notificações e dados do
                    salão.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <RoadmapColumn status="em_implementacao" items={inProgress} />
        <RoadmapColumn status="planejado" items={planned} />
        <RoadmapColumn status="entregue" items={delivered} />
      </section>

      <section className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              Lista completa
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
              Prioridades do app, agenda e painel
            </h2>
          </div>
          <div className="text-sm font-semibold text-zinc-500">
            {productRoadmap.length} novidades mapeadas
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {productRoadmap.map((item) => (
            <CompactItem key={item.title} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2">
      <div className="text-xl font-black leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
        {label}
      </div>
    </div>
  );
}

function SpotlightItem({ item }: { item: RoadmapItem }) {
  return (
    <article className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(199,162,92,0.16)] text-[var(--app-accent-strong)]">
          {itemIcons[item.title] || <Sparkles size={18} />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-zinc-950">{item.title}</h3>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {item.impact}
          </p>
        </div>
      </div>
    </article>
  );
}

function RoadmapColumn({
  status,
  items,
}: {
  status: RoadmapStatus;
  items: RoadmapItem[];
}) {
  const copy = roadmapStatusCopy[status];

  return (
    <div className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusBadge status={status} />
          <h2 className="mt-3 font-display text-xl font-bold tracking-[-0.03em] text-zinc-950">
            {copy.label}
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {copy.description}
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-black text-zinc-900">
          {items.length}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article
            key={item.title}
            className={`rounded-[22px] border p-4 ${statusTone[status].cardClassName}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-sm">
                {itemIcons[item.title] || <Sparkles size={18} />}
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-zinc-950">
                  {item.title}
                </div>
                <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                  {item.description}
                </p>
                <div className="mt-3 inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-700">
                  {item.eta}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CompactItem({ item }: { item: RoadmapItem }) {
  return (
    <article className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            {item.category}
          </div>
          <h3 className="mt-1 text-base font-black text-zinc-950">
            {item.title}
          </h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{item.impact}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: RoadmapStatus }) {
  const tone = statusTone[status];
  const copy = roadmapStatusCopy[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${tone.className}`}
    >
      {tone.icon}
      {copy.label}
    </span>
  );
}
