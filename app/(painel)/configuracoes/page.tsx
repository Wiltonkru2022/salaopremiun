import Link from "next/link";
import {
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Users,
} from "lucide-react";
import { PainelPageHeader } from "@/components/painel-ui";

const configCards = [
  {
    href: "/configuracoes/usuarios",
    title: "Usuários do sistema",
    description:
      "Controle quem acessa o painel, níveis de permissão e limite de contas do plano.",
    icon: Users,
    area: "Conta",
    tone: "bg-zinc-950 text-white",
  },
  {
    href: "/configuracoes/agenda-horarios",
    title: "Agenda e horários",
    description:
      "Defina funcionamento, intervalos e regras que deixam a agenda fiel ao salão.",
    icon: CalendarClock,
    area: "Agenda",
    tone: "bg-[var(--app-accent)] text-zinc-950",
  },
  {
    href: "/configuracoes/notificacoes",
    title: "Notificações e push",
    description:
      "Ajuste alertas, push no celular e avisos importantes para equipe e clientes.",
    icon: BellRing,
    area: "Comunicação",
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
    title: "Rateio e impressão",
    description:
      "Configure documentos, rateios e detalhes usados no fechamento de comissões.",
    icon: BadgeDollarSign,
    area: "Comissões",
    tone: "bg-amber-500 text-zinc-950",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-5">
      <PainelPageHeader
        eyebrow="Central de configuracoes"
        title="Configuracoes do salao"
        description="Ajuste acessos, horarios, notificacoes, caixa e regras de repasse com seguranca. Cada card abre uma area especifica."
        actions={
          <div className="grid grid-cols-3 gap-2">
            <HeaderMetric label="Modulos" value={String(configCards.length)} />
            <HeaderMetric label="Menu" value="Claro" />
            <HeaderMetric label="Areas" value="100%" />
          </div>
        }
      />

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

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-right">
      <div className="text-sm font-black text-zinc-950">{value}</div>
      <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </div>
    </div>
  );
}
