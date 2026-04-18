import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Boxes,
  Scissors,
  CreditCard,
  PackageSearch,
  Settings2,
  FileBarChart2,
  Check,
  ArrowRight,
  Monitor,
  Smartphone,
  Bot,
  BadgeDollarSign,
  ClipboardList,
  UserPlus,
  Receipt,
  Crown,
  BellRing,
} from "lucide-react";

const saasModules = [
  { icon: CalendarDays, title: "Agenda", text: "Controle completo da agenda do salão com horários, status, organização e visão operacional no computador." },
  { icon: Users, title: "Clientes", text: "Cadastro, histórico e gestão dos clientes em uma área centralizada e profissional." },
  { icon: Boxes, title: "Produtos", text: "Cadastre produtos usados no atendimento e vendidos no salão com organização." },
  { icon: Scissors, title: "Serviços", text: "Gerencie serviços com nome, duração, valor e estrutura do atendimento." },
  { icon: Scissors, title: "Serviços extra", text: "Adicione serviços complementares para ampliar o ticket e melhorar o fechamento." },
  { icon: BadgeDollarSign, title: "Comissão", text: "Acompanhe repasses, desempenho e controle de comissão dos profissionais." },
  { icon: FileBarChart2, title: "Relatórios", text: "Tenha visão do negócio com relatórios de desempenho, operação e resultados." },
  { icon: CreditCard, title: "Vendas", text: "Registre vendas e movimentações com mais controle sobre o financeiro do salão." },
  { icon: Crown, title: "Assinatura", text: "Gerencie plano, recursos liberados, vencimentos e evolução do cliente no SaaS." },
  { icon: PackageSearch, title: "Estoque", text: "Acompanhe entradas, saídas e organização do estoque com mais segurança." },
  { icon: Settings2, title: "Configuração", text: "Defina parâmetros do sistema, regras da operação e personalizações do salão." },
  { icon: ClipboardList, title: "Comandas", text: "Tenha mais controle sobre itens, serviços, consumo e fechamento do atendimento." },
  { icon: Bot, title: "Suporte ChatGPT", text: "Ajuda guiada para o salão entender o sistema e usar cada função corretamente." },
];

const professionalAppModules = [
  "Agenda",
  "Relatório de comissão",
  "Agendamento",
  "Cadastro básico de cliente",
  "Comanda",
  "Perfil",
  "Suporte ChatGPT",
];

const commercialFlowModules = [
  "Planos com CTA direto por subdomínio",
  "Cadastro guiado do salão",
  "Login com continuidade do plano",
  "Checkout com PIX, boleto e cartão",
  "Histórico e regularização de cobrança",
];

const plans = [
  {
    name: "Essencial",
    slug: "basico",
    price: "R$ 39,90",
    subtitle: "Para começar com organização",
    highlight: false,
    items: [
      "Sistema SaaS para PC",
      "Agenda e clientes",
      "Serviços e vendas",
      "Controle básico",
      "Acesso inicial ao sistema",
      "Suporte padrão",
    ],
  },
  {
    name: "Profissional",
    slug: "pro",
    price: "R$ 79,90",
    subtitle: "Mais gestão e crescimento",
    highlight: true,
    items: [
      "Tudo do Essencial",
      "Comissão e relatórios",
      "Estoque e comandas",
      "App profissional",
      "Checkout e assinatura online",
      "Mais recursos e operação completa",
    ],
  },
  {
    name: "Premium",
    slug: "premium",
    price: "R$ 149,90",
    subtitle: "Estrutura completa para escalar",
    highlight: false,
    items: [
      "Tudo do Profissional",
      "Mais usuários e recursos",
      "Gestão avançada",
      "Mais controle da assinatura",
      "Prioridade operacional",
      "Estrutura premium do produto",
    ],
  },
];

const faqItems = [
  {
    question: "O sistema principal funciona no celular?",
    answer:
      "Não. O sistema SaaS principal do SalaoPremium foi pensado para uso em computador, com foco em gestão completa, visão ampla e operação mais profissional.",
  },
  {
    question: "O que funciona no celular?",
    answer:
      "Hoje, no celular, funciona o app do profissional em formato web app. A experiência do cliente final ainda está em evolução e não faz parte da entrega principal atual.",
  },
  {
    question: "Precisa publicar na Play Store ou App Store?",
    answer:
      "Não. O app do profissional funciona como web app e pode ser instalado na tela inicial do celular sem depender de loja de aplicativos.",
  },
  {
    question: "O suporte com ChatGPT faz agendamento ou cria cliente?",
    answer:
      "Não. O suporte inteligente apenas orienta e explica como usar o sistema. Ele não cria cliente, não agenda e não altera dados sozinho.",
  },
];

export default function HomeLanding() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <SiteHeader />
      <Hero />
      <SaaSIntro />
      <SaaSModulesSection />
      <ProfessionalAppSection />
      <CommercialFlowSection />
      <WebAppSection />
      <SupportAISection />
      <PlansSection />
      <FAQSection />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2 lg:px-10 lg:py-24">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center rounded-full border border-[#dccbed] bg-white px-4 py-2 text-sm font-medium text-[#5a267f] shadow-sm">
            Sistema SaaS para PC + web app profissional + checkout de assinatura
          </span>

          <h2 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-zinc-950 lg:text-6xl">
            Gestão completa para salão no computador. Mobilidade para o profissional e venda pronta para assinatura.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            O SalaoPremium reúne um sistema robusto para operação do salão no PC, um web app profissional para a rotina e um fluxo comercial completo para cadastro, login e assinatura.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="#planos"
              className="inline-flex items-center gap-2 rounded-full bg-[#2c0a45] px-7 py-4 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5"
            >
              Conhecer planos
              <ArrowRight size={18} />
            </Link>

            <Link
              href="#sistema"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-7 py-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
            >
              Ver estrutura da plataforma
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#f2ecf8] p-2 text-[#5a267f]">
                  <Monitor size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Sistema do salão</p>
                  <p className="text-xs text-zinc-500">Uso principal no PC</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#f2ecf8] p-2 text-[#5a267f]">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">App profissional</p>
                  <p className="text-xs text-zinc-500">Web app no celular</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#f2ecf8] p-2 text-[#5a267f]">
                  <Crown size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Cadastro e assinatura</p>
                  <p className="text-xs text-zinc-500">Fluxo comercial ativo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute -left-6 top-10 hidden h-24 w-24 rounded-full bg-[#7a3cb5]/15 blur-2xl lg:block" />
          <div className="absolute -right-8 bottom-8 hidden h-28 w-28 rounded-full bg-[#2c0a45]/15 blur-2xl lg:block" />

          <div className="relative w-full rounded-[34px] border border-white/70 bg-white p-5 shadow-[0_22px_80px_rgba(34,10,54,0.12)] lg:p-6">
            <div className="rounded-[28px] border border-zinc-200 bg-[#fbf9fd] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.20em] text-[#6b2c98]">
                    Plataforma integrada
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-zinc-950">
                    Uma estrutura com 3 frentes
                  </h3>
                </div>
                <div className="rounded-full bg-[#2c0a45] px-3 py-1 text-xs font-bold text-white">
                  Premium
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-[#2c0a45] p-3 text-white">
                      <Monitor size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-950">Sistema SaaS do salão</p>
                      <p className="text-sm text-zinc-500">Gestão completa para computador</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {["Agenda", "Clientes", "Vendas", "Comandas", "Estoque", "Relatórios"].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-zinc-200 bg-[#faf7fd] px-4 py-3 font-medium text-zinc-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="rounded-2xl bg-[#f2ecf8] p-3 text-[#5a267f]">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-950">Profissional</p>
                        <p className="text-xs text-zinc-500">Web app</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-600">
                      <p>Agenda</p>
                      <p>Comissão</p>
                      <p>Comanda</p>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="rounded-2xl bg-[#f2ecf8] p-3 text-[#5a267f]">
                        <Crown size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-950">Comercial</p>
                        <p className="text-xs text-zinc-500">Fluxo em produção</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-600">
                      <p>Cadastro</p>
                      <p>Login</p>
                      <p>Assinatura</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  "Subdomínios dedicados",
                  "Checkout online",
                  "Instalável na tela inicial",
                  "Suporte inteligente",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[#efe5f8] px-4 py-2 text-xs font-semibold text-[#5a267f]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SaaSIntro() {
  return (
    <section id="sistema" className="border-y border-zinc-200 bg-white/70">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
            Sistema principal do salão
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            O coração da operação do salão está no computador
          </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            O sistema principal foi desenvolvido para uso em PC, com foco em gestão completa, visual profissional, produtividade e mais controle da operação do salão.
          </p>
        </div>
      </div>
    </section>
  );
}

function SaaSModulesSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
          Recursos do sistema SaaS
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
          Tudo que o salão precisa para operar com mais controle
        </h2>
        <p className="mt-5 text-lg leading-8 text-zinc-600">
          Estrutura pensada para apresentar claramente os módulos do sistema e reforçar o valor da plataforma já na página principal.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {saasModules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.title}
              className="rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f2ecf8] text-[#5a267f]">
                <Icon size={24} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-zinc-950">{module.title}</h3>
              <p className="mt-3 leading-7 text-zinc-600">{module.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProfessionalAppSection() {
  return (
    <section id="app-profissional" className="bg-white py-20 text-zinc-950">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">
            App do profissional
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
            O profissional acompanha a rotina direto do celular
          </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Acesso objetivo para o dia a dia do profissional, com foco nas funções que realmente importam na rotina de trabalho.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {professionalAppModules.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4">
                <div className="mt-0.5 rounded-full bg-zinc-100 p-1.5">
                  <Check size={14} />
                </div>
                <p className="text-zinc-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[34px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="rounded-[28px] bg-white p-6 text-zinc-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-[#2c0a45] p-3 text-white">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="font-bold">Web app do profissional</p>
                  <p className="text-sm text-zinc-500">Leve, direto e focado na rotina</p>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  "Agenda do dia",
                  "Comissão",
                  "Novo agendamento",
                  "Cadastro básico do cliente",
                  "Comanda",
                  "Perfil",
                  "Suporte",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-zinc-200 bg-[#faf7fd] px-4 py-3 text-sm font-medium text-zinc-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-5 hidden rounded-2xl bg-white p-4 shadow-xl lg:block">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#f2ecf8] p-3 text-[#5a267f]">
                <Receipt size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Função prática</p>
                <p className="font-semibold text-zinc-900">Comanda e comissão</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommercialFlowSection() {
  return (
    <section id="comercial" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
          Fluxo comercial
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
          Jornada pronta para vender assinatura sem atrito
        </h2>
        <p className="mt-5 text-lg leading-8 text-zinc-600">
          Do primeiro clique até a cobrança, o sistema mantém a jornada do salão organizada entre site, cadastro, login e assinatura.
        </p>
      </div>

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          {[
            { icon: Crown, label: "Escolher plano ideal" },
            { icon: UserPlus, label: "Cadastro guiado do salão" },
            { icon: ClipboardList, label: "Login com continuidade do plano" },
            { icon: CreditCard, label: "Checkout com cobrança online" },
            { icon: BellRing, label: "Histórico e regularização" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-[22px] border border-zinc-200 bg-white px-5 py-5 shadow-sm"
              >
                <div className="rounded-2xl bg-[#f2ecf8] p-3 text-[#5a267f]">
                  <Icon size={22} />
                </div>
                <p className="text-lg font-semibold text-zinc-900">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[34px] border border-zinc-200 bg-white p-6 shadow-[0_20px_70px_rgba(34,10,54,0.10)]">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-[#2c0a45] p-3 text-white">
                <Crown size={20} />
              </div>
              <div>
                <p className="font-bold text-zinc-950">Onboarding e assinatura</p>
                <p className="text-sm text-zinc-500">Fluxo real e já disponível em produção</p>
              </div>
            </div>

            <div className="grid gap-3">
              {commercialFlowModules.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              Login, cadastro e assinatura rodam hoje com subdomínios dedicados e webhook financeiro integrado.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WebAppSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
              Instalação simples no celular
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
              App profissional leve, rápido e sem depender de loja
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              O app do profissional funciona como web app no celular e pode ser instalado na tela principal, sem precisar publicar na Apple Store ou na Play Store.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Instala pela tela do navegador",
              "Atalho direto na tela principal",
              "Sem depender de loja de apps",
              "Abertura rápida no celular",
              "Experiência leve e prática",
              "Uso diário do profissional",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-zinc-200 bg-[#faf7fd] px-5 py-6 shadow-sm"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2c0a45] text-white">
                  <Smartphone size={20} />
                </div>
                <p className="font-semibold text-zinc-900">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportAISection() {
  return (
    <section id="suporte" className="bg-white py-20 text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">
              Suporte inteligente
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
              ChatGPT para orientar, explicar e guiar o uso da plataforma
            </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            O suporte inteligente ajuda o salão e o profissional a entender menus, funções, recursos e fluxos do sistema com mais autonomia.
          </p>
          </div>

          <div className="rounded-[34px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {[
                "Explica onde encontrar cada função",
                "Orienta o uso do sistema e dos apps",
                "Tira dúvidas operacionais",
                "Ajuda no entendimento das telas",
                "Não faz agendamento",
                "Não cria cliente",
                "Não altera dados sozinho",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`flex items-start gap-3 rounded-2xl px-4 py-4 ${
                    index < 4 ? "bg-emerald-50" : "bg-zinc-50"
                  }`}
                >
                  <div className="mt-0.5 rounded-full bg-white p-1.5 ring-1 ring-zinc-200">
                    <Check size={14} />
                  </div>
                  <p className="text-zinc-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section id="planos" className="py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
            Planos e preços
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            Escolha o plano ideal para o seu negócio
          </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Estrutura pronta para vender o sistema com clareza, destacando o SaaS do salão, o app profissional e o fluxo comercial integrado.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[32px] border p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.highlight
                  ? "border-zinc-950 bg-white text-zinc-950 ring-2 ring-zinc-950/5"
                  : "border-zinc-200 bg-white text-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {plan.subtitle}
                  </p>
                </div>

                {plan.highlight && (
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                    Mais escolhido
                  </span>
                )}
              </div>

              <div className="mt-8">
                <p className="text-4xl font-extrabold">{plan.price}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  por mês
                </p>
              </div>

              <div className="mt-8 space-y-4">
                {plan.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                        plan.highlight ? "bg-zinc-100" : "bg-[#ede3f7]"
                      }`}
                    >
                      <Check size={14} />
                    </div>
                    <p className="text-zinc-700">{item}</p>
                  </div>
                ))}
              </div>

              <Link
                href={`/cadastro-salao?plano=${plan.slug}`}
                className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-6 py-4 text-sm font-bold text-white transition hover:opacity-95"
              >
                Assinar plano
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="bg-[#f0ebf5] py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b2c98]">
            Dúvidas frequentes
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 lg:text-5xl">
            Informações importantes para o visitante entender a plataforma
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqItems.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <summary className="cursor-pointer list-none text-lg font-bold text-zinc-950">
                {faq.question}
              </summary>
              <p className="mt-4 leading-7 text-zinc-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section id="cta-final" className="bg-white py-20 text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="overflow-hidden rounded-[36px] border border-zinc-200 bg-white p-10 shadow-sm lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">
                Comece agora
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight lg:text-5xl">
                Tenha uma plataforma completa para salão, com gestão no PC, app profissional e assinatura online pronta para vender
              </h2>


              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="#planos"
                  className="rounded-full bg-zinc-950 px-7 py-4 text-sm font-bold text-white transition hover:opacity-95"
                >
                  Ver planos
                </Link>
                <Link
                  href="#sistema"
                  className="rounded-full border border-zinc-300 bg-white px-7 py-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Explorar plataforma
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-zinc-200 bg-zinc-50 p-7">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
                    <Monitor size={22} />
                  </div>
                  <div>
                    <p className="font-bold">Sistema para o salão</p>
                    <p className="text-sm text-zinc-500">Gestão principal no computador</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <p className="font-bold">App profissional e assinatura online</p>
                    <p className="text-sm text-zinc-500">Web app mobile e checkout integrado</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
                    <Bot size={22} />
                  </div>
                  <div>
                    <p className="font-bold">Suporte inteligente</p>
                    <p className="text-sm text-zinc-500">Ajuda guiada dentro da plataforma</p>
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
