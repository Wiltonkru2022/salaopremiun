import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  MonitorSmartphone,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";

const trustItems = [
  "Agenda visual por profissional",
  "Caixa com fechamento e taxas",
  "Comissoes com regras por servico",
  "App profissional no celular",
];

const highlights = [
  {
    icon: CalendarDays,
    title: "Agenda que puxa a operacao",
    text: "Atendimento, status, profissional e abertura para comanda no mesmo fluxo.",
  },
  {
    icon: CreditCard,
    title: "Caixa com venda real",
    text: "Pagamento, taxa, desconto, acrescimo e fechamento sem gambiarra manual.",
  },
  {
    icon: Wallet,
    title: "Comissao que fecha certo",
    text: "Profissional, assistente e regras por servico com calculo consistente.",
  },
  {
    icon: BarChart3,
    title: "Leitura do negocio",
    text: "Vendas, relatorios, historico operacional e visao do que esta acontecendo.",
  },
];

const modules = [
  { icon: CalendarDays, title: "Agenda", text: "Horario, status, fila e passagem rapida para a venda." },
  { icon: Users, title: "Clientes", text: "Cadastro, historico e continuidade do relacionamento." },
  { icon: Scissors, title: "Servicos", text: "Preco, duracao, combos e regras por profissional." },
  { icon: CreditCard, title: "Caixa", text: "Pagamentos, taxas, fechamento, reabertura e trilha de venda." },
  { icon: Wallet, title: "Comissoes", text: "Lancamentos por item, assistente e status de pagamento." },
  { icon: BarChart3, title: "Relatorios", text: "Leitura operacional e financeira sem depender de planilha." },
];

const professionalFeatures = [
  "Agenda do dia no celular",
  "Comissao por periodo",
  "Comanda durante o atendimento",
  "Cadastro rapido de cliente",
  "Suporte dentro do app",
];

const plans = [
  {
    name: "Essencial",
    slug: "basico",
    price: "R$ 39,90",
    description: "Para comecar a organizar a recepcao e a agenda.",
    featured: false,
    items: ["Agenda e clientes", "Servicos e vendas", "Painel principal no PC"],
  },
  {
    name: "Profissional",
    slug: "pro",
    price: "R$ 79,90",
    description: "Para operar caixa, comanda, comissao e equipe com mais controle.",
    featured: true,
    items: ["Tudo do Essencial", "Caixa e comandas", "Comissoes e relatorios", "App profissional"],
  },
  {
    name: "Premium",
    slug: "premium",
    price: "R$ 149,90",
    description: "Para saloes que precisam de operacao mais completa e mais governanca.",
    featured: false,
    items: ["Tudo do Profissional", "Estrutura ampliada", "Mais controle operacional"],
  },
];

const faqItems = [
  {
    question: "Funciona melhor no computador ou no celular?",
    answer:
      "A operacao principal foi feita para computador. O celular fica com o app profissional, pensado para a rotina da equipe.",
  },
  {
    question: "O profissional precisa instalar app de loja?",
    answer:
      "Nao. O acesso pode ser instalado direto pela tela inicial do navegador, como web app.",
  },
  {
    question: "O sistema controla comissao de assistente?",
    answer:
      "Sim. O calculo respeita as regras do servico, do profissional e do vinculo do assistente.",
  },
];

export default function HomeLanding() {
  return (
    <main className="min-h-screen bg-[#f5f1eb] text-zinc-950">
      <SiteHeader />
      <HeroSection />
      <ProofSection />
      <ModulesSection />
      <ProfessionalSection />
      <PlansSection />
      <FaqSection />
      <FinalSection />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="overflow-hidden border-b border-zinc-200 bg-[#f5f1eb]">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pb-24 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700">
              <Sparkles size={16} />
              Sistema para salao com operacao completa
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-zinc-950 lg:text-6xl">
              Agenda, caixa, comanda e comissao em uma operacao que parece premium de verdade.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
              O SalaoPremium organiza a rotina da recepcao no computador e entrega ao profissional um app leve no celular para agenda, comissao e atendimento.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cadastro-salao"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-4 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Criar conta
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#produto"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Ver o sistema
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-4 text-sm font-medium text-zinc-700 shadow-sm"
                >
                  <BadgeCheck size={16} className="text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 top-6 h-32 rounded-full bg-[#d6c6b0]/45 blur-3xl" />
            <div className="absolute bottom-10 right-6 h-36 w-36 rounded-full bg-[#d9a67a]/25 blur-3xl" />

            <div className="relative rounded-[36px] border border-zinc-200 bg-[#171717] p-4 shadow-[0_32px_100px_rgba(32,22,10,0.18)]">
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] bg-[#fbfaf8] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Agenda do dia
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                        Recepcao no controle
                      </h2>
                    </div>
                    <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                      Ao vivo
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      ["Confirmados", "18"],
                      ["Em atendimento", "6"],
                      ["Fila do caixa", "4"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-white px-3 py-3 ring-1 ring-zinc-200">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                        <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        hour: "09:00",
                        client: "Marina Costa",
                        service: "Coloracao premium",
                        professional: "Wilton",
                        tone: "bg-emerald-50 text-emerald-700",
                        tag: "Confirmado",
                      },
                      {
                        hour: "10:30",
                        client: "Bianca Alves",
                        service: "Escova + finalizacao",
                        professional: "Camila",
                        tone: "bg-amber-50 text-amber-700",
                        tag: "Em atendimento",
                      },
                      {
                        hour: "11:40",
                        client: "Paula Reis",
                        service: "Combo corte + hidratacao",
                        professional: "Michele",
                        tone: "bg-violet-50 text-violet-700",
                        tag: "Pronto para caixa",
                      },
                    ].map((row) => (
                      <div
                        key={`${row.hour}-${row.client}`}
                        className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3"
                      >
                        <p className="text-sm font-semibold text-zinc-700">{row.hour}</p>
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">{row.client}</p>
                          <p className="text-xs text-zinc-500">
                            {row.service} · {row.professional}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.tone}`}>
                          {row.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[28px] bg-[#222222] p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Fechamento de venda</p>
                        <p className="text-xs text-zinc-400">Servico, produto, taxa e pagamento</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        ["Subtotal", "R$ 420,00"],
                        ["Taxa", "R$ 12,00"],
                        ["Total", "R$ 408,00"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                          <span className="text-sm text-zinc-300">{label}</span>
                          <span className="text-sm font-semibold text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-[#efe8dc] p-4 text-zinc-950">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">App profissional</p>
                        <p className="text-xs text-zinc-600">Agenda e comissao no celular</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] bg-white px-4 py-4 ring-1 ring-zinc-200">
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Hoje</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-950">Wilton</p>
                      <div className="mt-3 space-y-2">
                        {["08:30 Corte", "10:00 Coloracao", "13:30 Escova", "16:00 Hidratacao"].map((item) => (
                          <div key={item} className="rounded-2xl bg-zinc-100 px-3 py-3 text-sm font-medium text-zinc-700">
                            {item}
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
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section id="produto" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              O que o cliente compra
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
              Um sistema que segura a rotina inteira do salao, do agendamento ao fechamento.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              Em vez de parecer site genérico de software, a home precisa mostrar tela, contexto e fluxo operacional.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[28px] border border-zinc-200 bg-[#faf7f2] p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-zinc-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section className="border-y border-zinc-200 bg-[#171717] py-20 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Plataforma completa
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
            Feita para salao que precisa operar bem, cobrar bem e acompanhar bem.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-950">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-300">{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProfessionalSection() {
  return (
    <section className="bg-[#f5f1eb] py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              App profissional
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
              O profissional acessa o que importa no celular sem baguncar a operacao da recepcao.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              Agenda do dia, comissao, comanda e suporte em um web app simples de instalar e rapido para usar.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {professionalFeatures.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm font-medium text-zinc-700 shadow-sm"
                >
                  <Check size={16} className="text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-[32px] border border-zinc-200 bg-zinc-950 p-4 shadow-lg">
              <div className="rounded-[28px] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">Rotina no app</p>
                    <p className="text-xs text-zinc-500">Dia do profissional</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {["09:00 Marina", "10:30 Bianca", "13:30 Paula", "17:10 Luciana"].map((item) => (
                    <div key={item} className="rounded-2xl bg-zinc-100 px-3 py-3 text-sm font-medium text-zinc-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe8dc] text-zinc-950">
                  <MonitorSmartphone size={20} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-zinc-950">PC para recepcao, celular para equipe</p>
                  <p className="text-sm text-zinc-500">Cada tela com a responsabilidade certa</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: LayoutGrid, title: "Sistema principal", text: "Agenda, clientes, comandas, caixa e configuracao." },
                  { icon: Smartphone, title: "App profissional", text: "Agenda, comissao, atendimento e suporte." },
                  { icon: ShieldCheck, title: "Mais controle", text: "Menos risco de misturar permissao e operacao." },
                  { icon: Bot, title: "Suporte guiado", text: "Ajuda de uso dentro do fluxo do profissional." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className="rounded-2xl bg-zinc-100 px-4 py-4">
                      <Icon size={18} className="text-zinc-700" />
                      <h3 className="mt-3 text-sm font-semibold text-zinc-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Planos
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            Escolha o plano que acompanha o tamanho da sua operacao.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[32px] border p-7 shadow-sm ${
                plan.featured
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-[#faf7f2] text-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className={`mt-3 text-sm leading-6 ${plan.featured ? "text-zinc-300" : "text-zinc-600"}`}>
                    {plan.description}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-950">
                    Recomendado
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
                        plan.featured ? "bg-white/10 text-white" : "bg-zinc-950 text-white"
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
                Comecar agora
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="border-y border-zinc-200 bg-[#171717] py-20 text-white">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Duvidas frequentes
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
            O visitante precisa bater o olho e entender o produto.
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqItems.map((faq) => (
            <details
              key={faq.question}
              className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-5"
            >
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">
                {faq.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-zinc-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="bg-[#f5f1eb] py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="rounded-[40px] border border-zinc-200 bg-white px-8 py-10 shadow-[0_26px_80px_rgba(40,28,12,0.1)] lg:px-12 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Comece agora
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
                Um sistema bonito ajuda. Um sistema claro, forte e vendavel ajuda muito mais.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
                Entre no cadastro do salao e veja a operacao funcionando com agenda, caixa, equipe, venda e comissao no mesmo produto.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/cadastro-salao"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-4 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Criar conta do salao
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Entrar no sistema
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: LayoutGrid, title: "Sistema no PC", text: "Recepcao, agenda, caixa, relatorios e configuracao." },
                { icon: Smartphone, title: "App da equipe", text: "Agenda, comissao e atendimento no celular." },
                { icon: CreditCard, title: "Assinatura online", text: "Cadastro e continuidade comercial mais organizada." },
                { icon: ShieldCheck, title: "Fluxo consistente", text: "Menos improviso operacional e mais previsibilidade." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[26px] bg-[#faf7f2] p-5 ring-1 ring-zinc-200">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                      <Icon size={18} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-zinc-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
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
