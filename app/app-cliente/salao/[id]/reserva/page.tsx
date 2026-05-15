import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientBookingForm from "@/components/client-app/ClientBookingForm";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import {
  getClientAppSalonDetail,
  listClienteAppAvailableCoupons,
} from "@/lib/client-app/queries";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export const metadata = {
  title: "Reserva online",
};

export default async function ClienteSalonReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cupom?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const cupomInicial = String(
    Array.isArray(query.cupom) ? query.cupom[0] : query.cupom || ""
  ).trim().toUpperCase();

  try {
    const salao = await getClientAppSalonDetail(id);
    const session = await validateClienteAppSession();
    const salaoPublicPath = buildSalaoPublicPath(
      salao.appClienteSlug || salao.id
    );
    const cuponsDisponiveis = session.context
      ? await listClienteAppAvailableCoupons({
          idConta: session.context.idConta,
          idSalao: salao.id,
        })
      : [];

    return (
      <ClientAppFrame title={salao.nome} subtitle="Reserva online">
        <ClientSalonSectionTabs salonId={id} active="reserva" />
        <section className="mx-auto max-w-4xl px-4 py-5 md:px-6">
          <Link
            href={`/app-cliente/salao/${id}`}
            className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </Link>

          {salao.appClientePausado ? (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <h2 className="text-xl font-black">Salão pausado no momento</h2>
              <p className="mt-2 text-sm leading-6">
                {salao.appClientePausaMensagem ||
                  "Assim que a agenda voltar, você poderá reservar por aqui."}
              </p>
            </div>
          ) : session.context ? (
            <ClientBookingForm
              idSalao={salao.id}
              servicos={salao.servicos}
              profissionais={salao.profissionais}
              intervaloMinutos={salao.intervaloAgendaMinutos}
              cuponsDisponiveis={cuponsDisponiveis}
              cupomInicial={cupomInicial}
            />
          ) : (
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                Reserva online
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-zinc-950">
                Entre para escolher seu horário
              </h1>
              <p className="mt-3 text-base leading-7 text-zinc-500">
                Sua conta guarda agendamentos, confirmações, cupons e avaliações
                em um lugar só.
              </p>
              <Link
                href={`/app-cliente/login?salao=${encodeURIComponent(
                  salao.appClienteSlug || salao.id
                )}&next=${encodeURIComponent(salaoPublicPath)}`}
                className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white"
              >
                Entrar ou criar conta
              </Link>
            </div>
          )}
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
