import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Search,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { validateClienteAppSession } from "@/lib/client-context.server";
import {
  getClienteAppProfileData,
  listClienteAppAppointments,
  listVisibleClientAppSaloes,
} from "@/lib/client-app/queries";

export const metadata = {
  title: "Meu App | Salão Premium",
};

function formatDate(date: string) {
  if (!date) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function statusLabel(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "confirmado") return "Confirmado";
  if (normalized === "pendente") return "Aguardando";
  if (normalized === "atendido") return "Finalizado";
  if (normalized === "cancelado") return "Cancelado";
  return "Em andamento";
}

export default async function AppClienteIndexPage() {
  const session = await validateClienteAppSession();
  const isLoggedIn = Boolean(session.context);
  const [appointments, saloes, profile] = await Promise.all([
    session.context
      ? listClienteAppAppointments({
          idConta: session.context.idConta,
          limit: 4,
        })
      : Promise.resolve([]),
    listVisibleClientAppSaloes({ limit: 6 }),
    session.context
      ? getClienteAppProfileData({ idConta: session.context.idConta })
      : Promise.resolve(null),
  ]);

  const nextAppointment =
    appointments.find((item) =>
      ["pendente", "confirmado"].includes(String(item.status).toLowerCase())
    ) || null;

  return (
    <ClientAppFrame
      title="Meu app"
      subtitle={
        isLoggedIn
          ? "Sua experiência no Salão Premium."
          : "Entre para acompanhar seus agendamentos."
      }
    >
      <section className="mx-auto max-w-5xl space-y-5 px-4 py-2 md:px-6">
        <div className="rounded-[2rem] bg-zinc-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200">
            <Sparkles size={16} />
            Salão Premium
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {isLoggedIn
              ? `Oi, ${profile?.nome || session.context?.nome || "cliente"}`
              : "Bem-vindo ao seu app de beleza"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
            Encontre salões, acompanhe seus horários, veja créditos e volte para
            seus atendimentos sem se perder.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/app-cliente/inicio"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-zinc-950"
            >
              <Search size={18} />
              Explorar salões
            </Link>
            {!isLoggedIn ? (
              <Link
                href="/app-cliente/login?next=/app-cliente"
                className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-5 text-sm font-black text-white"
              >
                Entrar na conta
              </Link>
            ) : null}
          </div>
        </div>

        {nextAppointment ? (
          <Link
            href="/app-cliente/agendamentos"
            className="block rounded-[1.7rem] border border-zinc-100 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">
                  {statusLabel(nextAppointment.status)}
                </span>
                <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-zinc-950">
                  {nextAppointment.servicoNome}
                </h3>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  com {nextAppointment.profissionalNome}
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  {nextAppointment.salaoNome}
                </p>
              </div>
              <div className="shrink-0 rounded-3xl border border-zinc-100 px-4 py-3 text-center">
                <div className="text-sm font-bold text-zinc-500">
                  {formatDate(nextAppointment.data)}
                </div>
                <div className="mt-1 text-2xl font-black text-zinc-950">
                  {nextAppointment.horaInicio.slice(0, 5)}
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[1.7rem] border border-zinc-100 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950">
                <CalendarDays size={22} />
              </span>
              <div>
                <h3 className="text-lg font-black text-zinc-950">
                  Ainda não há agendamento ativo
                </h3>
                <p className="text-sm text-zinc-500">
                  Escolha um salão e reserve quando quiser.
                </p>
              </div>
            </div>
          </div>
        )}

        {profile?.creditos.length ? (
          <div className="rounded-[1.7rem] border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-amber-900">
              <WalletCards size={18} />
              Crédito disponível
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {profile.creditos.slice(0, 4).map((item) => (
                <div
                  key={item.idSalao}
                  className="rounded-2xl bg-white px-4 py-3 text-sm"
                >
                  <div className="truncate font-bold text-zinc-900">
                    {item.salaoNome}
                  </div>
                  <div className="mt-1 font-black text-amber-900">
                    {item.credito.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xl font-black tracking-[-0.03em] text-zinc-950">
              Recomendados
            </h3>
            <Link
              href="/app-cliente/inicio"
              className="inline-flex items-center gap-1 text-sm font-black text-zinc-700"
            >
              Ver todos
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saloes.slice(0, 3).map((salao) => (
              <Link
                key={salao.id}
                href={`/app-cliente/salao/${salao.id}`}
                className="rounded-[1.5rem] border border-zinc-100 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-black text-zinc-950">
                      {salao.nome}
                    </h4>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {[salao.bairro, salao.cidade].filter(Boolean).join(", ") ||
                        "Salão parceiro"}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-900">
                    <Star size={13} fill="currentColor" />
                    {salao.notaMedia ? salao.notaMedia.toFixed(1) : "Novo"}
                  </div>
                </div>
                <div className="mt-5 inline-flex min-h-10 items-center rounded-full bg-zinc-950 px-4 text-sm font-black text-white">
                  Reservar
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ClientAppFrame>
  );
}
