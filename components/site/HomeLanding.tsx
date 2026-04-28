import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  BellRing,
  Bot,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  LayoutGrid,
  Monitor,
  PackageSearch,
  Receipt,
  Scissors,
  Settings2,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";

const heroBadges = [
  "Agenda, caixa, comandas e comissoes",
  "App profissional no celular",
  "Assinatura e cobranca online",
];

const featureHighlights = [
  {
    icon: CalendarDays,
    title: "Agenda visual",
    text: "Controle da agenda com status, horarios, profissional e abertura rapida para comanda.",
  },
  {
    icon: Receipt,
    title: "Caixa com fechamento real",
    text: "Pagamentos, taxa, comissao, itens e fechamento em um fluxo operacional unico.",
  },
  {
    icon: BadgeDollarSign,
    title: "Comissao por regra",
    text: "Servico, profissional e assistente com calculo consistente e controle de repasse.",
  },
  {
    icon: FileBarChart2,
    title: "Visao do negocio",
    text: "Relatorios, desempenho da operacao e leitura clara do que esta acontecendo no salao.",
  },
];

const platformModules = [
  { icon: CalendarDays, title: "Agenda", text: "Visual diario com horarios, status, profissional e envio rapido para o caixa." },
  { icon: Users, title: "Clientes", text: "Cadastro centralizado com historico, dados e relacao continua com o atendimento." },
  { icon: Scissors, title: "Servicos", text: "Preco, duracao, consumo, regras por profissional e estrutura de atendimento." },
  { icon: ClipboardList, title: "Comandas", text: "Itens, servicos, extras, produtos e consumo organizados ate o fechamento." },
  { icon: CreditCard, title: "Caixa e vendas", text: "Pagamentos, taxa, fechamento, reabertura e trilha operacional da venda." },
  { icon: BadgeDollarSign, title: "Comissoes", text: "Lancamentos por item, assistente, taxa e status de pagamento sem conta manual." },
  { icon: PackageSearch, title: "Estoque", text: "Entradas, saidas, consumo de produtos e mais seguranca para a rotina." },
  { icon: FileBarChart2, title: "Relatorios", text: "Leitura de caixa, operacao, equipe, vendas e desempenho do salao." },
  { icon: Settings2, title: "Configuracoes", text: "Taxas, usuarios, parametros e regras que adaptam o sistema ao jeito do negocio." },
];

const productShots = [
  {
    title: "Agenda do salao",
    eyebrow: "Recepcao e operacao",
    accent: "bg-emerald-500",
    stats: [
      { label: "Confirmados", value: "18" },
      { label: "Em atendimento", value: "6" },
      { label: "Fila do caixa", value: "4" },
    ],
    lines: [
      { time: "09:00", client: "Marina Costa", detail: "Coloracao + corte", tone: "bg-emerald-50 text-emerald-700" },
      { time: "10:30", client: "Bianca Alves", detail: "Escova", tone: "bg-amber-50 text-amber-700" },
      { time: "11:15", client: "Paula Reis", detail: "Unhas gel", tone: "bg-sky-50 text-sky-700" },
    ],
  },
  {
    title: "Caixa e fechamento",
    eyebrow: "Venda pronta",
    accent: "bg-violet-500",
    stats: [
      { label: "Subtotal", value: "R$ 420" },
      { label: "Taxa", value: "R$ 12" },
      { label: "Total", value: "R$ 408" },
    ],
    lines: [
      { time: "Servico", client: "Loiro premium", detail: "Profissional: Wilton", tone: "bg-violet-50 text-violet-700" },
      { time: "Produto", client: "Mascara reconstrutora", detail: "1 unidade", tone: "bg-zinc-100 text-zinc-700" },
      { time: "Pagamento", client: "Credito 2x", detail: "Com taxa calculada", tone: "bg-emerald-50 text-emerald-700" },
    ],
  },
  {
    title: "Comissoes e repasses",
    eyebrow: "Controle financeiro da equipe",
    accent: "bg-cyan-500",
    stats: [
      { label: "Pendente", value: "R$ 2.840" },
      { label: "Pago", value: "R$ 6.120" },
      { label: "Vales", value: "R$ 320" },
    ],
    lines: [
      { time: "Wilton", client: "Coloracao", detail: "34% aplicado", tone: "bg-cyan-50 text-cyan-700" },
      { time: "Michele", client: "Unhas premium", detail: "Assistente validado", tone: "bg-emerald-50 text-emerald-700" },
      { time: "Fernanda", client: "Escova modelada", detail: "Aguardando pagamento", tone: "bg-amber-50 text-amber-700" },
    ],
  },
];

const professionalMoments = [
  "Agenda do dia com horario e cliente",
  "Comissao do periodo direto no celular",
  "Novo agendamento sem depender da recepcao",
  "Comanda da cliente durante o atendimento",
  "Perfil e suporte inteligente",
];

const commercialSteps = [
  "Landing com CTA direto para plano",
  "Cadastro guiado do salao",
  "Login com continuidade da jornada",
  "Checkout com PIX, boleto e cartao",
  "Historico, regularizacao e assinatura ativa",
];

const faqItems = [
  {
    question: "O sistema principal funciona no celular?",
    answer:
      "Nao. A operacao principal foi desenhada para computador, com foco em recepcao, caixa, agenda e gestao completa.",
  },
  {
    question: "O que o profissional usa no celular?",
    answer:
      "O app profissional em formato web app, com agenda, comanda, comissao, cadastro basico de cliente e suporte.",
  },
  {
    question: "Precisa publicar em loja de app?",
    answer:
      "Nao. O app profissional pode ser instalado na tela inicial do celular direto pelo navegador.",
  },
  {
    question: "O suporte inteligente altera dados sozinho?",
    answer:
      "Nao. Ele orienta o uso do sistema e explica fluxos, mas nao agenda, nao cria cliente e nao muda dados por conta propria.",
  },
];

const plans = [
  {
    name: "Essencial",
    slug: "basico",
    price: "R$ 39,90",
    subtitle: "Para organizar a operacao desde o primeiro mes",
    featured: false,
    items: [
      "Sistema para PC",
      "Agenda e clientes",
      "Servicos e vendas",
      "Controle operacional inicial",
    ],
  },
  {
    name: "Profissional",
    slug: "pro",
    price: "R$ 79,90",
    subtitle: "Para salao que quer caixa, comissao e app profissional",
    featured: true,
    items: [
      "Tudo do Essencial",
      "Comandas, caixa e estoque",
      "Comissoes e relatorios",
      "App profissional",
    ],
  },
  {
    name: "Premium",
    slug: "premium",
    price: "R$ 149,90",
    subtitle: "Para estrutura completa, escala e mais controle",
    featured: false,
    items: [
      "Tudo do Profissional",
      "Mais usuarios e governanca",
      "Gestao ampliada da operacao",
      "Prioridade operacional",
    ],
  },
];

export default function HomeLanding() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <SiteHeader />
      <HeroSection />
      <ProductProofSection />
      <ModulesSection />
      <ProfessionalSection />
      <CommercialSection />
      <PlansSection />
      <FAQSection />
      <FinalSection />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="overflow-hidden bg-[linear-gradient(180deg,#fff_0%,#faf7fd_42%,#f4eef9_100%)]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800">
              <Sparkles size={16} />
              Plataforma de gestao para saloes com operacao real
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-zinc-950 lg:text-6xl">
              O sistema que organiza agenda, caixa, comandas e comissoes sem deixar a operacao solta.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
              O SalaoPremium junta o sistema principal no computador, o app profissional no celular e a jornada comercial pronta para vender assinatura com mais clareza.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {heroBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="#planos"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-4 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Ver planos
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#produto"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Ver o sistema por dentro
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featureHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <Icon size={20} />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-zinc-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-10 top-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />
            <div className="absolute bottom-4 right-8 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative rounded-[32px] border border-zinc-200 bg-white p-4 shadow-[0_28px_90px_rgba(40,18,71,0.14)]">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-zinc-200 bg-zinc-950 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">
                        Painel do salao
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">Recepcao, agenda e caixa</h2>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-100">
                      Operacao ao vivo
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      ["Hoje", "42 atendimentos"],
                      ["Caixa", "R$ 5.420"],
                      ["Comissao", "R$ 1.860"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                        <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[24px] bg-white p-4 text-zinc-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">Linha de atendimento</p>
                        <p className="text-xs text-zinc-500">Agenda com abertura para comanda e caixa</p>
                      </div>
                      <CalendarClock className="text-violet-700" size={18} />
                    </div>

                    <div className="mt-4 space-y-3">
                      {[
                        {
                          hour: "09:00",
                          client: "Marina Costa",
                          service: "Coloracao premium",
                          tag: "Confirmado",
                          tone: "bg-emerald-50 text-emerald-700",
                        },
                        {
                          hour: "10:30",
                          client: "Bianca Alves",
                          service: "Escova + finalizacao",
                          tag: "Em atendimento",
                          tone: "bg-amber-50 text-amber-700",
                        },
                        {
                          hour: "11:15",
                          client: "Paula Reis",
                          service: "Manicure gel",
                          tag: "Pronto para caixa",
                          tone: "bg-violet-50 text-violet-700",
                        },
                      ].map((row) => (
                        <div
                          key={`${row.hour}-${row.client}`}
                          className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-2xl border border-zinc-200 px-3 py-3"
                        >
                          <p className="text-sm font-semibold text-zinc-700">{row.hour}</p>
                          <div>
                            <p className="text-sm font-semibold text-zinc-950">{row.client}</p>
                            <p className="text-xs text-zinc-500">{row.service}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.tone}`}>
                            {row.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[28px] border border-zinc-200 bg-[#fcfbff] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">App profissional</p>
                        <p className="text-xs text-zinc-500">Agenda, comanda e comissao</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-zinc-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Hoje</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-950">Wilton</p>
                      <div className="mt-4 space-y-2">
                        {["08:30 Corte", "10:00 Coloracao", "13:30 Escova", "16:00 Hidratacao"].map((item) => (
                          <div key={item} className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">Assinatura ativa</p>
                        <p className="text-xs text-zinc-500">Cadastro, login e cobranca</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {["Cadastro guiado", "Checkout com PIX", "Historico de cobranca", "Regularizacao online"].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-3 py-3">
                          <BadgeCheck className="text-emerald-600" size={16} />
                          <span className="text-sm font-medium text-zinc-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductProofSection() {
  return (
    <section id="produto" className="border-y border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-700">
            Veja o sistema por dentro
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            A pagina principal agora pode vender o produto mostrando o que a operacao realmente enxerga.
          </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Em vez de prometer de forma abstrata, a home pode mostrar agenda, caixa, fechamento e comissoes com cara de sistema pronto para uso.
          </p>
        </div>

        <div className="mt-12 grid gap-6 xl:grid-cols-3">
          {productShots.map((shot) => (
            <article
              key={shot.title}
              className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {shot.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-zinc-950">{shot.title}</h3>
                </div>
                <div className={`h-3 w-3 rounded-full ${shot.accent}`} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {shot.stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-zinc-100 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{stat.label}</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {shot.lines.map((line) => (
                  <div
                    key={`${line.time}-${line.client}`}
                    className="grid grid-cols-[74px_1fr] gap-3 rounded-2xl border border-zinc-200 px-3 py-3"
                  >
                    <div className={`rounded-xl px-2 py-1 text-center text-xs font-semibold ${line.tone}`}>
                      {line.time}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{line.client}</p>
                      <p className="text-xs text-zinc-500">{line.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section id="sistema" className="bg-[#faf8fc] py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-700">
              Sistema principal
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
              O coracao da operacao fica no computador, onde agenda, caixa e equipe se encontram.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              A home precisa vender essa ideia logo no primeiro scroll: o produto nao e so agenda, e uma estrutura de gestao do atendimento ao fechamento.
            </p>

            <div className="mt-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-950">Estrutura de operacao</p>
                  <p className="text-sm text-zinc-500">Tudo conectado no mesmo fluxo</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Agenda leva para comanda",
                  "Comanda leva para caixa",
                  "Caixa gera comissao",
                  "Configuracao define regras",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
                    <Check size={16} className="text-violet-700" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {platformModules.map((module) => {
              const Icon = module.icon;
              return (
                <article
                  key={module.title}
                  className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-zinc-950">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{module.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfessionalSection() {
  return (
    <section id="app-profissional" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-700">
              App profissional
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
              O profissional nao precisa do sistema inteiro no celular. Precisa do que faz a rotina andar.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              Agenda, comanda, comissao, perfil e suporte em um web app leve, instalavel e direto para o uso diario.
            </p>

            <div className="mt-8 space-y-3">
              {professionalMoments.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <Check size={16} />
                  </div>
                  <p className="text-sm font-medium text-zinc-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[30px] border border-zinc-200 bg-zinc-950 p-4 text-white shadow-lg">
              <div className="rounded-[26px] bg-white p-4 text-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Hoje no app</p>
                    <p className="text-xs text-zinc-500">Profissional em movimento</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {["09:00 Marina", "10:30 Bianca", "13:30 Paula", "16:00 Luciana"].map((item) => (
                    <div key={item} className="rounded-2xl bg-zinc-100 px-3 py-3 text-sm font-medium text-zinc-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-zinc-200 bg-[#f5f1fa] p-6">
              <h3 className="text-xl font-semibold text-zinc-950">Instalavel na tela principal</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Sem loja de app, sem camada extra e sem confundir o profissional com funcoes que sao da recepcao.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Instalacao pelo navegador",
                  "Acesso rapido",
                  "Agenda do dia",
                  "Comissao do periodo",
                  "Cadastro basico de cliente",
                  "Suporte orientado",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white bg-white px-4 py-4 text-sm font-medium text-zinc-700 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommercialSection() {
  return (
    <section id="comercial" className="border-y border-zinc-200 bg-zinc-950 py-20 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-200">
              Jornada comercial
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
              Site, cadastro, login e checkout ja aparecem como uma plataforma que sabe vender.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              A home precisa empurrar o visitante para um fluxo simples: entender o produto, escolher plano, entrar no cadastro e seguir ate a assinatura.
            </p>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold text-white">O que vale destacar na home</p>
              <div className="mt-4 space-y-3">
                {[
                  "Sistema principal no computador",
                  "App profissional no celular",
                  "Fluxo comercial ativo com cobranca online",
                  "Suporte inteligente dentro da plataforma",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-200">
                    <BadgeCheck size={16} className="text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {commercialSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/5 px-5 py-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-zinc-950">
                  <span className="text-sm font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-white">{step}</p>
                </div>
                <BellRing size={18} className="text-violet-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section id="planos" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-700">
            Planos
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            Um posicionamento mais forte para vender o plano certo com menos atrito.
          </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            A pagina principal pode conduzir o visitante para o cadastro com mais conviccao quando mostra produto, fluxo e valor de forma concreta.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[30px] border p-7 shadow-sm ${
                plan.featured
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm leading-6 ${plan.featured ? "text-zinc-300" : "text-zinc-500"}`}>
                    {plan.subtitle}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">
                    Mais escolhido
                  </span>
                ) : null}
              </div>

              <div className="mt-8">
                <p className="text-4xl font-bold">{plan.price}</p>
                <p className={`mt-2 text-sm ${plan.featured ? "text-zinc-300" : "text-zinc-500"}`}>por mes</p>
              </div>

              <div className="mt-8 space-y-4">
                {plan.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                        plan.featured ? "bg-white/10 text-white" : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      <Check size={14} />
                    </div>
                    <p className={`text-sm leading-6 ${plan.featured ? "text-zinc-100" : "text-zinc-700"}`}>{item}</p>
                  </div>
                ))}
              </div>

              <Link
                href={`/cadastro-salao?plano=${plan.slug}`}
                className={`mt-10 inline-flex w-full items-center justify-center rounded-full px-5 py-4 text-sm font-semibold transition ${
                  plan.featured
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "bg-zinc-950 text-white hover:opacity-95"
                }`}
              >
                Assinar plano
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="bg-[#f7f4fa] py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-700">
            Duvidas frequentes
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            O visitante entende melhor quando a mensagem e direta.
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqItems.map((faq) => (
            <details
              key={faq.question}
              className="rounded-[24px] border border-zinc-200 bg-white px-6 py-5 shadow-sm"
            >
              <summary className="cursor-pointer list-none text-lg font-semibold text-zinc-950">
                {faq.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-zinc-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section id="cta-final" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="rounded-[36px] border border-zinc-200 bg-zinc-950 px-8 py-10 text-white shadow-[0_24px_80px_rgba(19,7,37,0.18)] lg:px-12 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-200">
                Comece agora
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
                Uma home mais bonita precisa parecer produto de verdade, nao folder.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
                Com essa estrutura, o visitante enxerga o que o sistema faz, onde ele opera e por que vale entrar no cadastro agora.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/cadastro-salao"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  Criar conta do salao
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Entrar no sistema
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Monitor, title: "Sistema no PC", text: "Agenda, caixa, comanda, configuracao e leitura da operacao." },
                { icon: Smartphone, title: "App profissional", text: "Agenda, comissao e comanda para o dia a dia do profissional." },
                { icon: CreditCard, title: "Assinatura online", text: "Fluxo comercial pronto com checkout e continuidade de acesso." },
                { icon: Bot, title: "Suporte inteligente", text: "Ajuda guiada para menus, fluxos e duvidas de uso." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-zinc-950">
                      <Icon size={18} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
