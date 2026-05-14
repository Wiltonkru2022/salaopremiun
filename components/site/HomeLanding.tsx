import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CreditCard,
  LayoutGrid,
  MonitorSmartphone,
  Scissors,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import WhatsAppSupportForm from "@/components/site/WhatsAppSupportForm";

const modules = [
  { icon: CalendarDays, title: "Agenda cheia", text: "Dia por profissional, status, horários e passagem para comanda." },
  { icon: CreditCard, title: "Caixa e vendas", text: "Pagamento, desconto, taxa, produto e fechamento no mesmo fluxo." },
  { icon: Wallet, title: "Comissões", text: "Cálculo por profissional, assistente, serviço e período." },
  { icon: Users, title: "Clientes", text: "Cadastro, histórico e retorno para manter o relacionamento." },
  { icon: Scissors, title: "Serviços", text: "Preços, duração, combos e regras da operação." },
  { icon: BarChart3, title: "Relatórios", text: "Leitura simples para saber o que entrou, saiu e vendeu." },
];

const plans = [
  {
    name: "Básico",
    slug: "basico",
    price: "R$ 5,00",
    note: "desconto de lançamento",
    description: "Para começar com agenda, clientes, serviços, caixa e vendas.",
    items: ["Agenda e clientes", "Caixa e comandas", "Vendas e comissão basica"],
  },
  {
    name: "Pro",
    slug: "pro",
    price: "R$ 29,90",
    note: "mais vendido",
    description: "Para salão com equipe, estoque, relatórios e app profissional.",
    featured: true,
    items: ["Tudo do Básico", "Estoque e relatórios", "App profissional"],
  },
  {
    name: "Premium",
    slug: "premium",
    price: "R$ 59,90",
    note: "completo",
    description: "Para liberar a vitrine do app cliente, campanhas e estrutura completa.",
    items: ["Tudo do Pro", "App cliente publicado", "WhatsApp e campanhas"],
  },
];

export default function HomeLanding() {
  return (
    <main className="min-h-screen bg-slate-50 text-zinc-950">
      <SiteHeader />
      <HeroSection />
      <SystemScreensSection />
      <AppsSection />
      <GoogleSection />
      <ModulesSection />
      <PlansSection />
      <SupportSection />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section id="inicio" className="overflow-hidden border-b border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 md:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:py-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-zinc-700">
            <Sparkles size={16} />
            Sistema completo para salão de beleza
          </div>

          <h1 className="mt-5 max-w-3xl text-[2.3rem] font-bold leading-[1.04] tracking-tight text-zinc-950 md:text-[4.2rem]">
            Agenda, caixa, app cliente e app profissional em um só lugar.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            O SalãoPremium organiza a recepção no painel do salão, entrega agenda
            e comissão para o profissional no celular e permite que o cliente veja
            salões, acompanhe agendamentos e mantenha o perfil atualizado.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white" href="/cadastro-salao">
              Cadastrar meu salão
              <ArrowRight size={18} />
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-900" href="/login">
              Login do salão
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-900" href="/app-cliente/login">
              App cliente
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-900" href="/app-profissional/login">
              App profissional
            </Link>
          </div>
        </div>

        <ProductFrame />
      </div>
    </section>
  );
}

function ProductFrame() {
  return (
    <div className="rounded-[30px] border border-zinc-200 bg-zinc-950 p-3 shadow-[0_28px_90px_rgba(15,23,42,0.2)]">
      <div className="rounded-[24px] bg-slate-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Painel do salão</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Operação de hoje</h2>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Agenda cheia
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Atendimentos", "32"],
            ["Vendas", "R$ 4.860"],
            ["Comissão", "R$ 1.214"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
              <p className="mt-2 text-lg font-black text-zinc-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            {[
              ["08:30", "Amanda Souza", "Corte + escova", "Confirmado"],
              ["09:40", "Bianca Lima", "Coloração premium", "Em atendimento"],
              ["11:10", "Marina Costa", "Hidratação + finalização", "Aguardando caixa"],
              ["13:20", "Paula Reis", "Manicure + pedicure", "Confirmado"],
            ].map(([hora, cliente, servico, status]) => (
              <div key={`${hora}-${cliente}`} className="grid grid-cols-[54px_1fr] gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
                <p className="text-sm font-bold text-zinc-700">{hora}</p>
                <div>
                  <p className="text-sm font-bold text-zinc-950">{cliente}</p>
                  <p className="text-xs text-zinc-500">{servico}</p>
                  <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-zinc-700">{status}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Caixa</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">R$ 1.780,00</p>
              <p className="mt-1 text-sm text-zinc-500">Aberto agora</p>
            </div>
            <div className="rounded-2xl bg-zinc-950 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">App cliente</p>
              <p className="mt-2 text-sm font-semibold">3 novos agendamentos online</p>
              <p className="mt-1 text-xs text-zinc-400">Perfil, histórico e salões favoritos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemScreensSection() {
  return (
    <section id="sistema" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Imagens do sistema</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Telas com dados de rotina real: agenda, caixa, vendas e comissões.
          </h2>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          <DashboardShot />
          <CashShot />
          <CommissionShot />
        </div>
      </div>
    </section>
  );
}

function DashboardShot() {
  return (
    <article className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <LayoutGrid size={18} />
        <h3 className="font-bold">Agenda do dia</h3>
      </div>
      <div className="mt-4 space-y-2">
        {["08:00 Camila - Luzes", "09:30 Rodrigo - Barba", "10:00 Fernanda - Unhas", "11:30 Julia - Corte", "14:00 Priscila - Coloração"].map((item, index) => (
          <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-100">
            <span className={index === 1 ? "text-amber-600" : "text-emerald-600"}>{index === 1 ? "Em atendimento" : "Confirmado"}</span>
            <span className="ml-2">{item}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function CashShot() {
  return (
    <article className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <CreditCard size={18} />
        <h3 className="font-bold">Caixa e vendas</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ["Pix", "R$ 920"],
          ["Cartão", "R$ 1.430"],
          ["Dinheiro", "R$ 310"],
          ["Produtos", "R$ 580"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-zinc-100">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-1 text-lg font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-zinc-950 p-4 text-white">
        <p className="text-sm text-zinc-300">Total vendido hoje</p>
        <p className="mt-1 text-3xl font-black">R$ 3.240</p>
      </div>
    </article>
  );
}

function CommissionShot() {
  return (
    <article className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <Wallet size={18} />
        <h3 className="font-bold">Comissões</h3>
      </div>
      <div className="mt-4 space-y-3">
        {[
          ["Camila", "R$ 430", "8 serviços"],
          ["Marcos", "R$ 290", "5 serviços"],
          ["Julia", "R$ 510", "9 serviços"],
        ].map(([nome, valor, servicos]) => (
          <div key={nome} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-zinc-100">
            <div>
              <p className="font-bold">{nome}</p>
              <p className="text-xs text-zinc-500">{servicos}</p>
            </div>
            <p className="font-black text-emerald-700">{valor}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function AppsSection() {
  return (
    <section id="apps" className="border-y border-zinc-200 bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 md:px-8 lg:grid-cols-2 lg:px-10">
        <AppCard
          title="App cliente"
          href="/app-cliente/login"
          icon={Smartphone}
          text="O cliente entra pelo celular para acessar perfil, salões, agendamentos e acompanhar a própria rotina."
          items={["Perfil do cliente", "Salões publicados", "Agendamentos", "Histórico e acesso rápido"]}
        />
        <AppCard
          title="App profissional"
          href="/app-profissional/login"
          icon={MonitorSmartphone}
          text="O profissional consulta agenda, atendimento, comissões e suporte sem precisar mexer no painel do salão."
          items={["Agenda no celular", "Comandas", "Comissões", "Suporte da equipe"]}
        />
      </div>
    </section>
  );
}

function AppCard({
  title,
  href,
  icon: Icon,
  text,
  items,
}: {
  title: string;
  href: string;
  icon: LucideIcon;
  text: string;
  items: string[];
}) {
  return (
    <article className="rounded-[30px] border border-zinc-200 bg-slate-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 p-3 text-white">
          <Icon size={22} />
        </div>
        <Link href={href} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 ring-1 ring-zinc-200">
          Acessar
        </Link>
      </div>
      <h2 className="mt-5 text-3xl font-black text-zinc-950">{title}</h2>
      <p className="mt-3 text-base leading-7 text-zinc-600">{text}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-100">
            <Check size={15} className="text-emerald-600" />
            {item}
          </div>
        ))}
      </div>
    </article>
  );
}

function GoogleSection() {
  return (
    <section id="google" className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 md:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">
            Integrações Google
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Login com Google e agenda externa com uso transparente dos dados.
          </h2>
          <p className="mt-4 text-base leading-8 text-zinc-600">
            O SalãoPremium solicita dados do Google apenas quando o usuário ativa
            a integração no Perfil do Salão. A conexão é opcional, pode ser
            removida pelo próprio usuário e serve somente para autenticação ou
            sincronização dos atendimentos confirmados.
          </p>
          <Link
            href="/politica-de-privacidade"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-900"
          >
            Ver política de privacidade
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-[28px] border border-zinc-200 bg-slate-50 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <Sparkles size={18} />
            </div>
            <h3 className="mt-5 text-xl font-black text-zinc-950">Login com Google</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Usa nome, e-mail, identificador da conta e foto, quando fornecida
              pelo Google, para autenticar o usuário do painel do salão.
            </p>
          </article>

          <article className="rounded-[28px] border border-zinc-200 bg-slate-50 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <CalendarDays size={18} />
            </div>
            <h3 className="mt-5 text-xl font-black text-zinc-950">Google Calendar</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Usa a permissão de eventos do calendário para criar, atualizar ou
              recriar eventos dos atendimentos confirmados do salão.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section id="comercial" className="bg-zinc-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">Tudo conectado</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Um painel para vender, atender, receber e entender o salão.
          </h2>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <Icon size={22} className="text-emerald-300" />
                <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section id="planos" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Preços de lançamento para colocar o salão no digital agora.
          </h2>
        </div>
        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.slug} className={`rounded-[30px] border p-6 ${plan.featured ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-slate-50 text-zinc-950"}`}>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${plan.featured ? "bg-white text-zinc-950" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>
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
              <Link href={`/cadastro-salao?plano=${plan.slug}`} className={`mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-bold ${plan.featured ? "bg-white text-zinc-950" : "bg-zinc-950 text-white"}`}>
                Começar com {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportSection() {
  return (
    <section id="suporte" className="bg-slate-50 py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:px-8 lg:grid-cols-[1fr_0.82fr] lg:px-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Suporte humano</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Quer tirar dúvida antes de cadastrar?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
            Fale direto pelo WhatsApp. A mensagem já chega organizada com seu nome
            e a dúvida para agilizar o atendimento.
          </p>
        </div>
        <WhatsAppSupportForm />
      </div>
    </section>
  );
}
