import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import PartnerOffersGrid from "@/components/parcerias/PartnerOffersGrid";

export const metadata = { title: "Parceiros e benefícios" };

export default function ParceirosClientePage() {
  return (
    <ClientAppFrame title="Parceiros e benefícios" subtitle="Cupons e ofertas selecionadas para você.">
      <div className="px-4 pb-6 md:px-6">
        <PartnerOffersGrid publico="cliente" />
      </div>
    </ClientAppFrame>
  );
}
