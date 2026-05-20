import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  MapPin,
  MonitorSmartphone,
  Scissors,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import WhatsAppSupportForm from "@/components/site/WhatsAppSupportForm";

const LOGIN_SALAO_URL = "https://login.salaopremiun.com.br/login";
const CADASTRO_SALAO_URL = "https://cadastro.salaopremiun.com.br/cadastro-salao";
const APP_CLIENTE_URL = "https://app.salaopremiun.com.br/app-cliente/login";
const APP_PROFISSIONAL_URL =
  "https://app.salaopremiun.com.br/app-profissional/login";

const proofStats = [
  { label: "Painel web", value: "Agenda, caixa e relatórios" },
  { label: "App profissional", value: "Celular da equipe" },
  { label: "App cliente", value: "Reserva online" },
];

const modules = [
  { icon: CalendarDays, title: "Agenda", text: "Dia, semana, profissional, status e horários em uma visão clara." },
  { icon: CreditCard, title: "Caixa", text: "Comandas, pagamento, desconto, crédito e fechamento na recepção." },
  { icon: Wallet, title: "Comissões", text: "Rateio por profissional, assistente, serviço e período." },
  { icon: Users, title: "Clientes", text: "Cadastro, WhatsApp, histórico e retorno sem duplicar ficha." },
  { icon: Scissors, title: "Serviços", text: "Preços, duração, visibilidade no app cliente e regras do salão." },
  { icon: MapPin, title: "Explorar", text: "Salões por cidade ou proximidade, sem mapa pesado para o cliente." },
];

const plans = [
  {
    name: "Básico",
    slug: "basico",
    price: "R$ 5,00",
    note: "lançamento",
    description: "Para começar com agenda, clientes, serviços, caixa e comandas.",
    items: ["Agenda e clientes", "Caixa e comandas", "Serviços do salão"],
  },
  {
    name: "Pro",
    slug: "pro",
    price: "R$ 29,90",
    note: "mais vendido",
    description: "Para salão com equipe, comissões, relatórios e app profissional.",
    featured: true,
    items: ["Tudo do Básico", "App profissional", "Comissões e relatórios"],
  },
  {
    name: "Premium",
    slug: "premium",
    price: "R$ 59,90",
    note: "completo",
    description: "Para publicar o salão no app cliente e vender agendamento online.",
    items: ["Tudo do Pro", "App cliente publicado", "Explorar e reserva online"],
  },
];

const desktopShots = [
  {
    title: "Agenda em tela cheia",
    text: "Visão por equipe, semana e resumo do período.",
    src: "/site/home/painel-agenda.png",
    alt: "Painel web do SalãoPremium mostrando agenda semanal do salão",
  },
  {
    title: "Caixa da recepção",
    text: "Triagem, comanda selecionada e operação do caixa.",
    src: "/site/home/painel-caixa.png",
    alt: "Painel web do SalãoPremium mostrando fechamento do caixa",
  },
  {
    title: "Comissões",
    text: "Rateio e conferência por profissional.",
    src: "/site/home/painel-comissoes.png",
    alt: "Painel web do SalãoPremium mostrando tela de comissões",
  },
];

const professionalShots = [
  {
    title: "Início",
    src: "/site/home/app-profissional-inicio.jpeg",
    alt: "App profissional do SalãoPremium na tela inicial",
  },
  {
    title: "Agenda",
    src: "/site/home/app-profissional-agenda.jpeg",
    alt: "App profissional do SalãoPremium mostrando calendário",
  },
  {
    title: "Clientes",
    src: "/site/home/app-profissional-clientes.jpeg",
    alt: "App profissional do SalãoPremium mostrando clientes",
  },
];

const clientShots = [
  {
    title: "Meu app",
    src: "/site/home/app-cliente-meuapp.jpeg",
    alt: "App cliente do SalãoPremium na tela Meu app",
  },
  {
    title: "Explorar",
    src: "/site/home/app-cliente-explorar.jpeg",
    alt: "App cliente do SalãoPremium mostrando salões próximos",
  },
  {
    title: "Salão",
    src: "/site/home/app-cliente-salao.jpeg",
    alt: "App cliente do SalãoPremium mostrando página do salão",
  },
];

export default function HomeLanding() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] text-zinc-950">
      <SiteHeader />
      <HeroSection />
      <OperatingSystemSection />
      <MobileAppsSection />
      <ModulesSection />
      <GoogleSection />
      <PlansSection />
      <SupportSection />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-zinc-950 text-white">
      <Image
        src="/site/home/painel-agenda.png"
        alt=""
        width={1366}
        height={597}
        priority
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40 saturate-150 contrast-125 brightness-110"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(9,9,11,0.94)_0%,rgba(9,9,11,0.8)_42%,rgba(9,9,11,0.38)_100%)]" />

      <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-10 px-5 py-10 md:px-8 lg:grid-cols-[0.96fr_1.04fr] lg:px-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
            <Sparkles size={16} />
            SalãoPremium para salões modernos
          </div>

          <h1 className="mt-5 max-w-2xl text-[2.35rem] font-black leading-[1.02] tracking-tight md:text-[4rem]">
            Painel do salão, app profissional e app cliente em um só sistema.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-200 md:text-lg">
            Um painel no computador para a recepção, um app profissional para a
            equipe atender pelo celular e um app cliente para encontrar salões,
            reservar horários e acompanhar tudo sem complicação.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-zinc-950 shadow-[0_18px_42px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5 hover:bg-[#f7f1df]"
              href={CADASTRO_SALAO_URL}
            >
              Cadastrar meu salão
              <ArrowRight size={18} />
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/15"
              href={LOGIN_SALAO_URL}
            >
              Entrar no painel
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {proofStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e8c56b]">
                  {stat.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-200">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto hidden h-[560px] w-full max-w-[620px] md:block">
          <div className="absolute inset-x-10 bottom-8 top-8 rounded-[34px] border border-white/10 bg-white/5 shadow-[0_40px_120px_rgba(0,0,0,0.35)]" />
          <div className="absolute inset-0 flex items-center justify-center gap-8">
            <ProfessionalPhoneMock className="home-float-slow w-[40%]" />
            <ClientPhoneMock className="home-float-medium w-[40%]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfessionalPhoneMock({ className }: { className?: string }) {
  return (
    <div className={`relative aspect-[390/844] overflow-hidden rounded-[34px] border border-white/20 bg-white p-2 text-zinc-950 shadow-2xl ${className || ""}`}>
      <div className="h-full rounded-[26px] bg-[#f3f4f6] p-4">
        <div className="flex items-center justify-between text-[9px] font-black text-zinc-900">
          <span>14:24</span>
          <span className="text-[8px]">●●● 21</span>
        </div>
        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-[#a66a12]">Salão Premium Profissional</p>
        <div className="mt-1 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black leading-none">Início</h3>
            <p className="mt-1 text-[11px] font-semibold text-zinc-500">Boa noite, Wilton Krusciako</p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
            <Sparkles size={14} />
          </span>
        </div>

        <div className="mt-7 rounded-[24px] bg-[#09090b] p-4 text-white shadow-lg">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f1d88b]">
            <Sparkles size={11} />
            Acesso ativo
          </div>
          <h4 className="mt-4 text-xl font-black leading-tight">Wilton Krusciako</h4>
          <p className="mt-3 text-[11px] leading-5 text-zinc-300">Seu dia no salão, pronto para atender, abrir comandas e seguir a agenda sem perder tempo.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Próximo", "Livre"],
              ["Hoje", "0"],
              ["Mês", "2"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/10 p-2">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                <p className="mt-1 text-xs font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-white p-4 shadow-sm">
          <h4 className="text-sm font-black">Ações rápidas</h4>
          <p className="mt-1 text-[11px] font-semibold text-zinc-500">Tudo o que você mais usa no dia a dia.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {["Cadastrar cliente", "Novo horário", "Nova comanda", "Comissões"].map((item) => (
              <div key={item} className="rounded-2xl border border-zinc-200 p-3">
                <div className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-[#f7f1df] text-[#b3832f]">
                  <Sparkles size={14} />
                </div>
                <p className="text-[10px] font-black leading-tight">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-2 left-3 right-3 grid grid-cols-5 rounded-[24px] bg-white/95 px-2 py-2 text-center text-[8px] font-black shadow-sm">
          {["Início", "Clientes", "Agenda", "Comandas", "Perfil"].map((item, index) => (
            <span key={item} className={index === 0 ? "rounded-2xl bg-zinc-950 px-1 py-2 text-white" : "px-1 py-2 text-zinc-700"}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientPhoneMock({ className }: { className?: string }) {
  return (
    <div className={`relative aspect-[390/844] overflow-hidden rounded-[34px] border border-white/20 bg-white p-2 text-zinc-950 shadow-2xl ${className || ""}`}>
      <div className="h-full rounded-[26px] bg-white">
        <div className="p-4">
          <div className="mb-5 flex items-center justify-between text-[9px] font-black text-zinc-900">
            <span>14:24</span>
            <span className="text-[8px]">●●● 21</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#a66a12]">Salão Premium Cliente</p>
          <h3 className="mt-2 text-xl font-black leading-none">Explorar</h3>
          <p className="mt-1 text-[11px] font-semibold text-zinc-500">Encontre salões e serviços perto de você.</p>
        </div>

        <div className="bg-[#101719] px-4 pb-5 pt-7 text-white">
          <h4 className="text-center text-xl font-black">SalãoPremium</h4>
          <div className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-white px-4 text-zinc-500 shadow-lg">
            <Search size={18} />
            <span className="text-[12px] font-semibold leading-tight">Pesquise serviços ou salões</span>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Barbeiros", "from-[#2b1515] to-[#111827]"],
              ["Cabeleireiro", "from-[#3b342a] to-[#111827]"],
              ["Manicure", "from-[#3b2633] to-[#111827]"],
            ].map(([item, gradient]) => (
              <div key={item} className="text-center">
                <div className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${gradient} ring-1 ring-white/10`} />
                <p className="mt-2 text-[9px] font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-2">
            <span className="rounded-2xl bg-zinc-100 px-3 py-2 text-[11px] font-black">Filtros</span>
            <span className="rounded-2xl bg-zinc-100 px-3 py-2 text-[11px] font-black">Recomendado</span>
          </div>
          <h4 className="mt-5 text-xl font-black">Resultados (1)</h4>
          <div className="mt-4 overflow-hidden rounded-[20px] border border-zinc-200 bg-white">
            <div className="relative h-24 bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300">
              <span className="absolute right-3 top-3 rounded-2xl bg-zinc-950 px-3 py-1 text-[10px] font-black text-white">Novo</span>
            </div>
            <div className="p-3">
              <p className="text-xs font-black text-zinc-500">Recomendado pelo Salão Premium</p>
              <h5 className="mt-2 text-lg font-black leading-tight">Studio Mãos de fadas</h5>
              <p className="mt-1 text-xs font-semibold text-zinc-500">Jardim Brasília - Três Lagoas - MS</p>
              <button className="mt-3 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Reservar</button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 left-3 right-3 grid grid-cols-4 rounded-[24px] bg-white/95 px-2 py-2 text-center text-[8px] font-black shadow-sm">
          {["Meu app", "Explorar", "Agenda", "Perfil"].map((item, index) => (
            <span key={item} className={index === 1 ? "rounded-2xl bg-zinc-100 px-1 py-2 text-zinc-950" : "px-1 py-2 text-zinc-700"}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CashPanelMock({ className }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[24px] border border-white/20 bg-white p-2 text-zinc-950 shadow-2xl ${className || ""}`}>
      <div className="h-full rounded-[18px] bg-[#f6f7f9] p-3">
        <div className="grid grid-cols-5 gap-2">
          {[
            ["Agora", "1", "emerald"],
            ["Ativas", "1", "zinc"],
            ["Sem comanda", "0", "amber"],
            ["Fechadas", "0", "sky"],
            ["Caixa", "Fechado", "zinc"],
          ].map(([label, value, color]) => (
            <div key={label} className={`rounded-xl border bg-white p-2 ${color === "emerald" ? "border-emerald-200 bg-emerald-50" : color === "amber" ? "border-amber-200 bg-amber-50" : color === "sky" ? "border-sky-200 bg-sky-50" : "border-zinc-200"}`}>
              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-1 text-base font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[0.7fr_1.6fr_0.8fr] gap-3">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">Triagem</p>
            <h4 className="mt-1 text-base font-black">Fila</h4>
            <div className="mt-3 rounded-xl border border-zinc-200 p-2">
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">Comanda #1</p>
              <p className="mt-1 text-xs font-black">Anny Sales</p>
              <p className="mt-1 text-[10px] text-zinc-500">Aberta</p>
              <p className="mt-2 text-xs font-black">R$ 119,90</p>
            </div>
          </div>
          <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white p-5">
            <div className="text-center">
              <CreditCard className="mx-auto text-zinc-400" size={24} />
              <h4 className="mt-2 text-lg font-black">Selecione uma comanda</h4>
              <p className="mt-1 text-xs text-zinc-500">Escolha uma comanda da fila.</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">Operação</p>
            <h4 className="mt-1 text-base font-black">Caixa</h4>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["Total", "Status", "Pago", "Falta"].map((item, index) => (
                <div key={item} className="rounded-xl border border-zinc-200 p-2">
                  <p className="text-[7px] font-black uppercase tracking-[0.1em] text-zinc-400">{item}</p>
                  <p className="mt-1 text-[10px] font-black">{index === 1 ? "Sem venda" : "R$ 0,00"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OperatingSystemSection() {
  return (
    <section id="sistema" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <SectionIntro
          eyebrow="Painel web"
          title="Agenda, caixa e comissões com cara de sistema profissional."
          text="As telas grandes ficam com espaço de trabalho: agenda em tela cheia, caixa em tela cheia e indicadores do salão sem apertar a operação."
        />

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {desktopShots.map((shot) => (
            <article key={shot.title} className="overflow-hidden rounded-[26px] border border-zinc-200 bg-[#f8fafc] shadow-sm">
              <div className="relative aspect-[1366/597] border-b border-zinc-200 bg-zinc-100">
                <Image src={shot.src} alt={shot.alt} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-black">{shot.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{shot.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileAppsSection() {
  return (
    <section id="apps" className="bg-[#f6f7f9] py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <AppExperience
            eyebrow="App profissional"
            title="A equipe atende pelo celular sem depender da recepção."
            text="Início, clientes, agenda, comandas e perfil ficam no layout de app: topbar fixa, menu inferior e conteúdo trocando no meio."
            href={APP_PROFISSIONAL_URL}
            icon={MonitorSmartphone}
            shots={professionalShots}
          />
          <AppExperience
            eyebrow="App cliente"
            title="O cliente encontra o salão e agenda online."
            text="O app cliente mostra recomendados, busca salões, abre a página do salão e inicia a reserva sem mapa pesado na tela."
            href={APP_CLIENTE_URL}
            icon={Smartphone}
            shots={clientShots}
          />
        </div>
      </div>
    </section>
  );
}

function AppExperience({
  eyebrow,
  title,
  text,
  href,
  icon: Icon,
  shots,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  icon: LucideIcon;
  shots: { title: string; src: string; alt: string }[];
}) {
  return (
    <article className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a681d]">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">{title}</h2>
          <p className="mt-3 text-base leading-7 text-zinc-600">{text}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
          <Icon size={22} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {shots.map((shot) => (
          <div key={shot.title}>
            <div className="home-screenshot-lift overflow-hidden rounded-[20px] border border-zinc-200 bg-zinc-100">
              <Image src={shot.src} alt={shot.alt} width={740} height={1600} className="h-auto w-full" />
            </div>
            <p className="mt-2 text-center text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{shot.title}</p>
          </div>
        ))}
      </div>

      <a href={href} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white">
        Acessar {eyebrow.toLowerCase()}
        <ArrowRight size={17} />
      </a>
    </article>
  );
}

function ModulesSection() {
  return (
    <section id="comercial" className="bg-zinc-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <SectionIntro
          eyebrow="Fluxo completo"
          title="Do primeiro cadastro ao fechamento financeiro."
          text="O SalãoPremium conecta cliente, profissional e recepção para reduzir retrabalho e deixar cada etapa no lugar certo."
          dark
        />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <Icon size={22} className="text-[#e8c56b]" />
                <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GoogleSection() {
  return (
    <section id="google" className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div>
          <SectionIntro
            eyebrow="Google e privacidade"
            title="Integrações descritas do jeito que o Google precisa aprovar."
            text="A página explica login com Google, Google Calendar, uso de dados e geolocalização de forma transparente. Assim o revisor entende o que o sistema acessa, por que acessa e onde o usuário controla isso."
          />
          <Link
            href="/politica-de-privacidade"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-900"
          >
            Ver política de privacidade
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoTile icon={ShieldCheck} title="Login com Google" text="Usa nome, e-mail, foto e identificador da conta apenas para autenticar o usuário no painel." />
          <InfoTile icon={CalendarDays} title="Google Calendar" text="Quando o salão ativa a integração, o sistema cria e atualiza eventos dos atendimentos confirmados." />
          <InfoTile icon={MapPin} title="Endereço vira localização" text="O dono preenche endereço normal. A latitude e longitude são geradas no backend, sem expor chave do Google no app cliente." />
          <InfoTile icon={Search} title="Explorar salões próximos" text="Se o cliente permitir localização, os salões aparecem por distância. Se negar, o app mostra recomendados ou cidade." />
        </div>
      </div>
    </section>
  );
}

function InfoTile({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-[24px] border border-zinc-200 bg-[#f8fafc] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
        <Icon size={18} />
      </div>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{text}</p>
    </article>
  );
}

function PlansSection() {
  return (
    <section id="planos" className="bg-[#f6f7f9] py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <SectionIntro
          eyebrow="Planos"
          title="Escolha o tamanho certo para colocar o salão no digital."
          text="Comece pelo essencial e evolua para app profissional e app cliente conforme a operação crescer."
        />
        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.slug} className={`rounded-[28px] border p-6 ${plan.featured ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-950"}`}>
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${plan.featured ? "bg-white text-zinc-950" : "bg-zinc-100 text-zinc-600"}`}>
                {plan.note}
              </span>
              <h3 className="mt-5 text-3xl font-black">{plan.name}</h3>
              <p className={`mt-3 text-sm leading-6 ${plan.featured ? "text-zinc-300" : "text-zinc-600"}`}>{plan.description}</p>
              <p className="mt-7 text-4xl font-black">{plan.price}</p>
              <p className={`mt-1 text-sm ${plan.featured ? "text-zinc-400" : "text-zinc-500"}`}>por mês</p>
              <div className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <p key={item} className={`flex items-center gap-2 text-sm font-semibold ${plan.featured ? "text-zinc-100" : "text-zinc-700"}`}>
                    <Check size={15} className="text-emerald-500" />
                    {item}
                  </p>
                ))}
              </div>
              <a href={`${CADASTRO_SALAO_URL}?plano=${plan.slug}`} className={`mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black ${plan.featured ? "bg-white text-zinc-950" : "bg-zinc-950 text-white"}`}>
                Começar com {plan.name}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportSection() {
  return (
    <section id="suporte" className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:px-8 lg:grid-cols-[1fr_0.82fr] lg:px-10">
        <SectionIntro
          eyebrow="Suporte humano"
          title="Quer tirar dúvida antes de cadastrar?"
          text="Fale direto pelo WhatsApp. A mensagem já chega organizada com seu nome e a dúvida para agilizar o atendimento."
        />
        <WhatsAppSupportForm />
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  title,
  text,
  dark,
}: {
  eyebrow: string;
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className={`text-sm font-black uppercase tracking-[0.2em] ${dark ? "text-[#e8c56b]" : "text-[#9a681d]"}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-3 text-3xl font-black tracking-tight md:text-5xl ${dark ? "text-white" : "text-zinc-950"}`}>
        {title}
      </h2>
      <p className={`mt-4 text-base leading-8 ${dark ? "text-zinc-300" : "text-zinc-600"}`}>
        {text}
      </p>
    </div>
  );
}
