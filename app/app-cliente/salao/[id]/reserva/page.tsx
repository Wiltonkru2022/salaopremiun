import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientBookingPersonStep from "@/components/client-app/ClientBookingPersonStep";
import { resetBookingPersonAction } from "@/app/app-cliente/salao/[id]/reserva/person-actions";
import { getClientAppSalonDetail, listClienteAppAvailableCoupons } from "@/lib/client-app/queries";
import { getCampaignAvailability, loadPublicCampaign } from "@/lib/campanhas/public";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";
import { bookingPersonCookieName, parseBookingPersonSelection } from "@/lib/client-app/booking-person-selection";

const ClientBookingForm = dynamic(() => import("@/components/client-app/ClientBookingForm"), {
  loading: () => (
    <div className="mx-auto max-w-md px-5 py-8">
      <div className="animate-pulse rounded-[1.5rem] border border-white/10 bg-[#111214] p-5">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-5 h-14 rounded-2xl bg-white/10" />
        <div className="mt-3 h-14 rounded-2xl bg-white/10" />
        <div className="mt-6 h-48 rounded-2xl bg-white/10" />
      </div>
    </div>
  ),
});

export const metadata = { title: "Reserva online" };

export default async function ClienteSalonReservaPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cupom?: string | string[]; campanha?: string | string[]; pessoa_erro?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const cupomInicial = String(Array.isArray(query.cupom) ? query.cupom[0] : query.cupom || "").trim().toUpperCase();
  const campanhaSlug = String(Array.isArray(query.campanha) ? query.campanha[0] : query.campanha || "").trim();

  try {
    const salao = await getClientAppSalonDetail(id);
    const session = await validateClienteAppSession();
    const store = await cookies();
    const pessoaSelecionada = parseBookingPersonSelection(store.get(bookingPersonCookieName(salao.id))?.value);
    const salaoPublicPath = buildSalaoPublicPath(salao.appClienteSlug || salao.id);
    const reservaPath = `${salaoPublicPath}/reserva`;
    const cuponsDisponiveis = session.context ? await listClienteAppAvailableCoupons({ idConta: session.context.idConta, idSalao: salao.id }) : [];
    const campanha = campanhaSlug ? await loadPublicCampaign(campanhaSlug).catch(() => null) : null;
    const campanhaOk = campanha && campanha.idSalao === salao.id && getCampaignAvailability(campanha).ok;
    const servicosCampanhaIds = new Set(campanhaOk ? campanha.services.map((servico) => servico.id) : []);
    const servicosReserva = campanhaOk && servicosCampanhaIds.size ? salao.servicos.filter((servico) => servicosCampanhaIds.has(servico.id)) : salao.servicos;

    return (
      <ClientAppFrame title={salao.nome} subtitle="Reserva online">
        <section className="mx-auto max-w-4xl bg-[#050505] text-white">
          {salao.appClientePausado ? (
            <div className="min-h-dvh px-5 py-10">
              <div className="rounded-[1.5rem] border border-[#f6b93f]/40 bg-[#111214] p-5 text-[#f6b93f]">
                <h2 className="text-xl font-black">Salão pausado no momento</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-200">{salao.appClientePausaMensagem || "Assim que a agenda voltar, você poderá reservar por aqui."}</p>
              </div>
            </div>
          ) : !pessoaSelecionada ? (
            <ClientBookingPersonStep idSalao={salao.id} error={Boolean(query.pessoa_erro)} cupom={cupomInicial} campanha={campanhaSlug} />
          ) : (
            <>
              <div className="mx-auto max-w-md px-5 pt-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111214] px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Pessoa atendida</div>
                    <div className="mt-1 truncate font-black text-white">{pessoaSelecionada.tipo === "outra_pessoa" ? pessoaSelecionada.nome : "Você"}</div>
                    {pessoaSelecionada.tipo === "outra_pessoa" ? <div className="mt-0.5 text-xs text-zinc-400">WhatsApp informado para este atendimento</div> : null}
                  </div>
                  <form action={resetBookingPersonAction}>
                    <input type="hidden" name="salao" value={salao.id} />
                    <input type="hidden" name="cupom" value={cupomInicial} />
                    <input type="hidden" name="campanha" value={campanhaSlug} />
                    <button type="submit" className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#f6b93f]">Trocar</button>
                  </form>
                </div>
              </div>
              <ClientBookingForm idSalao={salao.id} servicos={servicosReserva} profissionais={salao.profissionais} intervaloMinutos={salao.intervaloAgendaMinutos} isAuthenticated={Boolean(session.context)} returnPath={reservaPath} cuponsDisponiveis={cuponsDisponiveis} cupomInicial={cupomInicial} />
            </>
          )}
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
