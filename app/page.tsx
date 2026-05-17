import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Heart,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import HomeLanding from "@/components/site/HomeLanding";

const appPortalFeatures: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
}> = [
  {
    title: "Instalável",
    text: "Abra no celular e instale como app.",
    icon: Smartphone,
  },
  {
    title: "Notificações",
    text: "Avisos de agenda, cupom e confirmação.",
    icon: Bell,
  },
  {
    title: "Seguro",
    text: "Acesso separado para cliente e profissional.",
    icon: ShieldCheck,
  },
];

function normalizeHost(value: string | null) {
  return String(value || "").split(":")[0].toLowerCase();
}

function AppPortalHome() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-zinc-950">
      <section className="relative overflow-hidden border-b border-zinc-200 bg-zinc-950 text-white">
        <div className="mx-auto grid min-h-[74vh] max-w-7xl gap-10 px-5 py-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
              <Sparkles size={16} />
              SalãoPremium Apps
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Escolha como quer entrar.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              Um acesso bonito, rápido e direto para cliente agendar e profissional operar o dia sem perder tempo.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/app-cliente"
                className="group flex min-h-[132px] flex-col justify-between rounded-[1.6rem] border border-white/15 bg-white p-5 text-zinc-950 shadow-[0_24px_70px_rgba(0,0,0,0.22)] transition hover:-translate-y-1"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Heart size={21} />
                </span>
                <span>
                  <strong className="block text-2xl font-black">App Cliente</strong>
                  <span className="mt-1 flex items-center gap-2 text-sm font-bold text-zinc-500">
                    Agendar, cupons e salões favoritos
                    <ArrowRight className="transition group-hover:translate-x-1" size={16} />
                  </span>
                </span>
              </Link>

              <Link
                href="/app-profissional/inicio"
                className="group flex min-h-[132px] flex-col justify-between rounded-[1.6rem] border border-amber-300/30 bg-amber-300 p-5 text-zinc-950 shadow-[0_24px_70px_rgba(245,158,11,0.24)] transition hover:-translate-y-1"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Scissors size={21} />
                </span>
                <span>
                  <strong className="block text-2xl font-black">App Profissional</strong>
                  <span className="mt-1 flex items-center gap-2 text-sm font-bold text-zinc-800">
                    Agenda, clientes e comandas
                    <ArrowRight className="transition group-hover:translate-x-1" size={16} />
                  </span>
                </span>
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="rounded-[2.25rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <div className="overflow-hidden rounded-[1.85rem] bg-[#faf8f4] text-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Hoje</p>
                    <h2 className="text-xl font-black">Agenda em movimento</h2>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Bell size={20} />
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    ["09:00", "Corte masculino", "Confirmado"],
                    ["10:30", "Escova com cupom", "Aguardando"],
                    ["14:00", "Manicure", "Cliente chegou"],
                  ].map(([hora, titulo, status]) => (
                    <div key={hora} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-zinc-400">{hora}</p>
                          <p className="mt-1 text-lg font-black">{titulo}</p>
                        </div>
                        <span className="rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-black text-white">
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                      <CalendarCheck className="mx-auto text-emerald-700" size={19} />
                      <strong className="mt-1 block text-lg">8</strong>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 text-center">
                      <Smartphone className="mx-auto text-amber-700" size={19} />
                      <strong className="mt-1 block text-lg">2</strong>
                    </div>
                    <div className="rounded-2xl bg-zinc-100 p-3 text-center">
                      <UserRound className="mx-auto text-zinc-700" size={19} />
                      <strong className="mt-1 block text-lg">14</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:grid-cols-3 md:px-8">
        {appPortalFeatures.map(({ title, text, icon: Icon }) => (
          <div key={title} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <Icon className="text-amber-700" size={22} />
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{text}</p>
          </div>
        ))}
      </section>
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
