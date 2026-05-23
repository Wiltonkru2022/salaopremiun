import { notFound } from "next/navigation";

import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientBookingForm from "@/components/client-app/ClientBookingForm";
import {
  getClientAppSalonDetail,
  listClienteAppAvailableCoupons,
} from "@/lib/client-app/queries";
import { getCampaignAvailability, loadPublicCampaign } from "@/lib/campanhas/public";
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
  searchParams: Promise<{ cupom?: string | string[]; campanha?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const cupomInicial = String(
    Array.isArray(query.cupom) ? query.cupom[0] : query.cupom || ""
  ).trim().toUpperCase();
  const campanhaSlug = String(
    Array.isArray(query.campanha) ? query.campanha[0] : query.campanha || ""
  ).trim();

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
    const campanha = campanhaSlug
      ? await loadPublicCampaign(campanhaSlug).catch(() => null)
      : null;
    const campanhaOk =
      campanha && campanha.idSalao === salao.id && getCampaignAvailability(campanha).ok;
    const servicosCampanhaIds = new Set(
      campanhaOk ? campanha.services.map((servico) => servico.id) : []
    );
    const servicosReserva =
      campanhaOk && servicosCampanhaIds.size
        ? salao.servicos.filter((servico) => servicosCampanhaIds.has(servico.id))
        : salao.servicos;

    return (
      <ClientAppFrame title={salao.nome} subtitle="Reserva online">
        <section className="mx-auto max-w-4xl bg-[#050505] text-white">
          {salao.appClientePausado ? (
            <div className="min-h-dvh px-5 py-10">
              <div className="rounded-[1.5rem] border border-[#f6b93f]/40 bg-[#111214] p-5 text-[#f6b93f]">
                <h2 className="text-xl font-black">Salão pausado no momento</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-200">
                {salao.appClientePausaMensagem ||
                  "Assim que a agenda voltar, você poderá reservar por aqui."}
                </p>
              </div>
            </div>
          ) : session.context ? (
            <ClientBookingForm
              idSalao={salao.id}
              servicos={servicosReserva}
              profissionais={salao.profissionais}
              intervaloMinutos={salao.intervaloAgendaMinutos}
              cuponsDisponiveis={cuponsDisponiveis}
              cupomInicial={cupomInicial}
            />
          ) : (
            <div className="min-h-dvh px-5 py-10">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#111214] p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                Reserva online
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                Entre para escolher seu horário
              </h1>
              <p className="mt-3 text-base leading-7 text-zinc-300">
                Sua conta guarda agendamentos, confirmações, cupons e avaliações
                em um lugar só.
              </p>
              <a
                href={`/app-cliente/login?salao=${encodeURIComponent(
                  salao.appClienteSlug || salao.id
                )}&next=${encodeURIComponent(salaoPublicPath)}`}
                className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#f6b93f] px-5 text-sm font-black text-black"
              >
                Entrar ou criar conta
              </a>
              </div>
            </div>
          )}
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
