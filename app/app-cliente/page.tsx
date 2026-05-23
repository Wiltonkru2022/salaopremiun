import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock3,
  Gift,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { validateClienteAppSession } from "@/lib/client-context.server";
import {
  getClienteAppProfileData,
  listClienteAppAppointments,
} from "@/lib/client-app/queries";

export const metadata = {
  title: "Início",
};

function formatDay(date: string) {
  if (!date) return "--";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(
    new Date(`${date}T12:00:00`)
  );
}

function formatMonth(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "")
    .toUpperCase();
}

export default async function AppClienteIndexPage() {
  const session = await validateClienteAppSession();
  const [appointments, profile] = await Promise.all([
    session.context
      ? listClienteAppAppointments({
          idConta: session.context.idConta,
          limit: 4,
        })
      : Promise.resolve([]),
    session.context
      ? getClienteAppProfileData({ idConta: session.context.idConta })
      : Promise.resolve(null),
  ]);

  const nextAppointment =
    appointments.find((item) =>
      ["pendente", "confirmado", "reservado_aguardando_pagamento"].includes(
        String(item.status).toLowerCase()
      )
    ) || null;
  const firstName =
    (profile?.nome || session.context?.nome || "Bruna").trim().split(" ")[0] ||
    "Bruna";

  return (
    <ClientAppFrame title="Início" subtitle="Salão Premium">
      <section className="min-h-dvh bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white">
        <div className="mx-auto max-w-md">
          <header className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.24em] text-[#f5c15a]">
              <Sparkles size={22} />
              Salão Premium
            </div>
            <Link
              href="/app-cliente/notificacoes"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#f5c15a]"
              aria-label="Notificações"
            >
              <Bell size={25} />
            </Link>
          </header>

          <h1 className="mt-12 text-[2.55rem] font-black leading-tight tracking-[-0.05em]">
            Olá, {firstName}! 👋
          </h1>
          <p className="mt-4 text-2xl leading-snug text-zinc-300">
            Sua beleza, seu tempo.
            <br />
            Do seu jeito.
          </p>

          <Link
            href="/app-cliente/explorar"
            className="mt-8 flex h-[72px] items-center gap-4 rounded-[1.45rem] bg-[#151618] px-5 text-xl text-zinc-300"
          >
            <Search size={31} />
            Buscar serviços ou salões
          </Link>

          <div className="relative mt-6 h-[356px] overflow-hidden rounded-[1.45rem] bg-zinc-900">
            <img
              src="/app-cliente-hero-woman.jpeg"
              alt="Modelo com cabelo produzido"
              className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
            <div className="absolute left-6 top-16 max-w-[210px]">
              <h2 className="text-[2.05rem] font-black leading-tight tracking-[-0.04em]">
                Seu novo visual, sua melhor versão.
              </h2>
              <Link
                href="/app-cliente/explorar"
                className="mt-8 inline-flex h-16 items-center gap-4 rounded-2xl bg-[#f8bd44] px-7 text-lg font-black text-black"
              >
                Reservar agora
                <ArrowRight size={24} />
              </Link>
            </div>
          </div>

          <h2 className="mt-7 text-2xl font-black">Acesso rápido</h2>
          <div className="mt-4 grid grid-cols-4 rounded-[1.35rem] border border-white/8 bg-[#121315] px-3 py-5 shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
            {[
              {
                href: "/app-cliente/explorar",
                label: "Reservar online",
                icon: CalendarDays,
              },
              {
                href: "/app-cliente/agendamentos",
                label: "Meus agendamentos",
                icon: CalendarDays,
              },
              {
                href: "/app-cliente/perfil/avaliacoes",
                label: "Avaliações",
                icon: Star,
              },
              {
                href: "/app-cliente/cupons",
                label: "Indique e ganhe",
                icon: Gift,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center gap-3 text-center text-sm font-medium leading-tight text-white"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2b2618] text-[#f5bd42]">
                    <Icon size={30} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex items-center gap-2 text-xl font-black text-[#f5bd42]">
            <Clock3 size={21} />
            Próximo agendamento
          </div>

          {nextAppointment ? (
            <Link
              href="/app-cliente/agendamentos"
              className="mt-4 block rounded-[1.35rem] border border-white/8 bg-[#121315] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.35)]"
            >
              <div className="grid grid-cols-[64px_1fr_86px] items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-zinc-800">
                  <img
                    src="/app-cliente-hero-woman.jpeg"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-black">
                    {nextAppointment.servicoNome}
                  </h3>
                  <p className="mt-2 truncate text-base text-zinc-400">
                    com {nextAppointment.profissionalNome}
                  </p>
                </div>
                <div className="border-l border-white/10 pl-5 text-center">
                  <div className="text-4xl font-light">
                    {formatDay(nextAppointment.data)}
                  </div>
                  <div className="text-lg text-zinc-300">
                    {formatMonth(nextAppointment.data)}
                  </div>
                  <div className="mt-1 text-lg font-black">
                    {nextAppointment.horaInicio.slice(0, 5)}
                  </div>
                </div>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4 text-center text-lg font-black text-[#f5bd42]">
                Ver todos os agendamentos <ArrowRight className="inline" size={21} />
              </div>
            </Link>
          ) : (
            <Link
              href="/app-cliente/explorar"
              className="mt-4 block rounded-[1.35rem] border border-white/8 bg-[#121315] p-5 text-zinc-300"
            >
              Ainda não há agendamento ativo. Escolha um salão e reserve quando quiser.
            </Link>
          )}
        </div>
      </section>
    </ClientAppFrame>
  );
}
