import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ConfiguracoesNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const CONFIGURACOES_MENU: ConfiguracoesNavItem[] = [
  {
    href: "/configuracoes/usuarios",
    label: "Usuarios",
    description: "Equipe, perfis e acesso",
    icon: Users,
  },
  {
    href: "/configuracoes/caixa-taxas",
    label: "Caixa e taxas",
    description: "Recebimento e repasse",
    icon: CreditCard,
  },
  {
    href: "/configuracoes/rateio",
    label: "Rateio",
    description: "Impressao de comissões",
    icon: BadgeDollarSign,
  },
  {
    href: "/configuracoes/agenda-horarios",
    label: "Agenda",
    description: "Dias e horários",
    icon: CalendarClock,
  },
  {
    href: "/configuracoes/notificacoes",
    label: "Notificacoes",
    description: "Push e avisos",
    icon: BellRing,
  },
];

export function ConfiguracoesHero({
  activeHref,
  title,
  description,
  children,
}: {
  activeHref: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white text-zinc-950 shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 md:px-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              <Sparkles size={14} />
              Central de configurações
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-[-0.04em] text-zinc-950 md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              {description}
            </p>
          </div>

          <div className="grid min-w-[190px] gap-1.5 rounded-[18px] border border-zinc-200 bg-white p-2.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
              <ShieldCheck size={14} />
              Operacao
            </div>
            <div className="text-sm font-bold text-zinc-900">
              Mudancas salvas por salão
            </div>
            <div className="text-xs leading-5 text-zinc-500">
              Ajuste com calma: cada módulo mexe em uma parte especifica do painel.
            </div>
          </div>
        </div>
      </div>

      <ConfiguracoesTopNav activeHref={activeHref} />

      {children ? <div className="border-t border-zinc-100 p-3 md:p-4">{children}</div> : null}
    </section>
  );
}

export function ConfiguracoesTopNav({ activeHref }: { activeHref: string }) {
  return (
    <div className="grid gap-2 p-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {CONFIGURACOES_MENU.map((item) => {
        const Icon = item.icon;
        const active = activeHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex min-h-[86px] items-start gap-3 rounded-[20px] border p-3 transition ${
              active
                ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                active
                  ? "bg-white text-zinc-950"
                  : "bg-zinc-100 text-zinc-700 group-hover:bg-white"
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">{item.label}</span>
              <span
                className={`mt-1 block text-xs leading-5 ${
                  active ? "text-white/70" : "text-zinc-500"
                }`}
              >
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function ConfigMetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
          {label}
        </div>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-zinc-950">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{detail}</div>
    </div>
  );
}
