import Link from "next/link";
import {
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  ChevronRight,
  CreditCard,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const configCards = [
  {
    href: "/configuracoes/usuarios",
    title: "Usuarios do sistema",
    description:
      "Controle quem acessa o painel, niveis de permissao e limite de contas do plano.",
    icon: Users,
    area: "Conta",
    tone: "bg-zinc-950 text-white",
  },
  {
    href: "/configuracoes/agenda-horarios",
    title: "Agenda e horarios",
    description:
      "Defina funcionamento, intervalos e regras que deixam a agenda fiel ao salao.",
    icon: CalendarClock,
    area: "Agenda",
    tone: "bg-[var(--app-accent)] text-zinc-950",
  },
  {
    href: "/configuracoes/notificacoes",
    title: "Notificacoes e push",
    description:
      "Ajuste alertas, push no celular e avisos importantes para equipe e clientes.",
    icon: BellRing,
    area: "Comunicacao",
    tone: "bg-emerald-600 text-white",
  },
  {
    href: "/configuracoes/caixa-taxas",
    title: "Caixa e taxas",
    description:
      "Organize taxas de pagamento, repasses e regras financeiras do caixa.",
    icon: CreditCard,
    area: "Financeiro",
    tone: "bg-sky-600 text-white",
  },
  {
    href: "/configuracoes/rateio",
    title: "Rateio e impressao",
    description:
      "Configure documentos, rateios e detalhes usados no fechamento de comissoes.",
    icon: BadgeDollarSign,
    area: "Comissoes",
    tone: "bg-amber-500 text-zinc-950",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-zinc-950 p-6 text-white sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
              <SlidersHorizontal size={14} />
              Central de configuracoes
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-3xl font-black tracking-[-0.04em] sm:text-[2.6rem]">
              Configuracoes do salao
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Ajuste acessos, horarios, notificacoes, caixa e regras de repasse
              com seguranca.
            </p>
          </div>

          <div className="bg-gradient-to-br from-zinc-50 via-white to-amber-50 p-5 sm:p-6">
            <div className="grid h-full content-center gap-3">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Modulos
              </div>
              {configCards.slice(0, 4).map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon size={16} />
                    </span>
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {configCards.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon size={20} />
                </div>
                <ChevronRight
                  size={18}
                  className="mt-2 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-700"
                />
              </div>

              <div className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                {item.area}
              </div>
              <h2 className="mt-2 font-display text-xl font-black tracking-[-0.03em] text-zinc-950">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {item.description}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
