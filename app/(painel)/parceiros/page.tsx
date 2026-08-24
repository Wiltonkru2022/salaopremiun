import PartnerOffersGrid from "@/components/parcerias/PartnerOffersGrid";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

export const metadata = { title: "Parceiros e benefícios" };

export default async function ParceirosPainelPage() {
  const { usuario } = await getPainelUserContext();
  const idSalao = usuario?.id_salao ? String(usuario.id_salao) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Salão Premium</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-zinc-950">Parceiros e benefícios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Ofertas de empresas parceiras selecionadas para salões e profissionais. Esta área reúne as campanhas sem ocupar o restante do painel com vários anúncios.</p>
      </section>
      <PartnerOffersGrid publico="salao" idSalao={idSalao} />
    </div>
  );
}
