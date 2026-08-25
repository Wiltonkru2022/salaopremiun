import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  Bell,
  Heart,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import HomeLanding from "@/components/site/HomeLanding";

const appPortalEntries: Array<{
  title: string;
  description: string;
  action: string;
  href: string;
  eyebrow: string;
  icon: LucideIcon;
}> = [
  {
    title: "App Cliente",
    description:
      "Agende serviços, acompanhe seus horários e aproveite seus benefícios.",
    action: "Entrar como cliente",
    href: "/app-cliente/meuapp",
    eyebrow: "Para clientes",
    icon: Heart,
  },
  {
    title: "App Profissional",
    description:
      "Gerencie agenda, clientes, comandas e sua rotina de trabalho em um só lugar.",
    action: "Entrar como profissional",
    href: "/app-profissional/inicio",
    eyebrow: "Para profissionais",
    icon: Scissors,
  },
];

const appPortalFeatures: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
}> = [
  {
    title: "Instalável",
    text: "Use como app no celular.",
    icon: Smartphone,
  },
  {
    title: "Notificações",
    text: "Receba avisos importantes.",
    icon: Bell,
  },
  {
    title: "Acesso seguro",
    text: "Ambientes separados por perfil.",
    icon: ShieldCheck,
  },
];

function normalizeHost(value: string | null) {
  return String(value || "").split(":")[0].toLowerCase();
}

function AppPortalHome() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[#f5bd42]/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-220px] right-[-160px] h-[460px] w-[460px] rounded-full bg-[#f5bd42]/5 blur-[130px]"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-8 lg:px-10 lg:pb-10 lg:pt-10">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f5bd42]/25 bg-[#f5bd42]/10 text-[#f5bd42] shadow-[0_0_30px_rgba(245,189,66,0.08)]">
              <Sparkles size={21} strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5bd42]">
                Salão Premium
              </p>
              <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                Central de aplicativos
              </p>
            </div>
          </div>

          <span className="hidden rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-[11px] font-bold text-zinc-400 sm:inline-flex">
            Acesso oficial
          </span>
        </header>

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#f5bd42]/20 bg-[#f5bd42]/8 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f5bd42]">
              <Sparkles size={14} />
              Salão Premium Apps
            </div>

            <h1 className="mt-6 text-[2.7rem] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Escolha seu acesso.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              Entre no aplicativo ideal para você. Uma experiência rápida,
              segura e feita para funcionar bem no celular e no computador.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5 lg:mt-12">
            {appPortalEntries.map(
              ({ title, description, action, href, eyebrow, icon: Icon }) => (
                <Link
                  key={title}
                  href={href}
                  className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121315] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] outline-none transition duration-300 hover:-translate-y-1 hover:border-[#f5bd42]/35 hover:bg-[#151618] hover:shadow-[0_28px_90px_rgba(0,0,0,0.46)] focus-visible:border-[#f5bd42]/60 focus-visible:ring-2 focus-visible:ring-[#f5bd42]/30 sm:min-h-[270px] sm:p-7"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#f5bd42]/0 blur-3xl transition duration-300 group-hover:bg-[#f5bd42]/8"
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f5bd42]/20 bg-[#2b2618] text-[#f5bd42] transition duration-300 group-hover:border-[#f5bd42]/35 group-hover:bg-[#342c19]">
                      <Icon size={27} strokeWidth={2.15} />
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                      {eyebrow}
                    </span>
                  </div>

                  <div className="relative mt-auto pt-10">
                    <h2 className="text-2xl font-black tracking-[-0.035em] text-white sm:text-[1.75rem]">
                      {title}
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400 sm:text-[15px]">
                      {description}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/8 pt-5">
                      <span className="text-sm font-black text-[#f5bd42]">
                        {action}
                      </span>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5bd42] text-black transition duration-300 group-hover:translate-x-1">
                        <ArrowRight size={19} strokeWidth={2.6} />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>

          <div className="mt-5 grid overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/[0.025] sm:grid-cols-3">
            {appPortalFeatures.map(({ title, text, icon: Icon }, index) => (
              <div
                key={title}
                className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${
                  index > 0
                    ? "border-t border-white/8 sm:border-l sm:border-t-0"
                    : ""
                }`}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5bd42]/10 text-[#f5bd42]">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-zinc-200">{title}</h3>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex items-center justify-center border-t border-white/6 pt-5 text-center text-[11px] font-semibold text-zinc-600">
          Salão Premium · beleza, gestão e tecnologia no mesmo ecossistema
        </footer>
      </div>
    </main>
  );
}

export default async function HomePage() {
  const headerStore = await headers();
  const host = normalizeHost(
    headerStore.get("x-forwarded-host") || headerStore.get("host")
  );

  if (host === "app.salaopremiun.com.br") {
    return <AppPortalHome />;
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SalãoPremium",
    url: "https://salaopremiun.com.br",
    logo: "https://salaopremiun.com.br/logo.png",
    sameAs: ["https://salaopremiun.com.br"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SalãoPremium",
    url: "https://salaopremiun.com.br",
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <HomeLanding />
    </>
  );
}
