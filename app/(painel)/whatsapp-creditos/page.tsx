import { redirect } from "next/navigation";
import WhatsAppCreditosClient from "@/components/whatsapp-creditos/WhatsappCreditosClient";
import WhatsappRecargaStatusBanner from "@/components/whatsapp-creditos/WhatsappRecargaStatusBanner";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { getWhatsappCreditosPainelData } from "@/services/whatsappCreditosService";

export const dynamic = "force-dynamic";

export default async function WhatsAppCreditosPage() {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!usuario?.id_salao) {
    redirect("/dashboard");
  }

  if (String(usuario.nivel || "") !== "admin") {
    redirect("/dashboard?motivo=permissao_whatsapp_creditos");
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);

  if (!access.recursos.whatsapp) {
    redirect("/meu-plano?motivo=recurso_whatsapp_bloqueado");
  }

  const data = await getWhatsappCreditosPainelData(usuario.id_salao);

  return (
    <div className="space-y-4">
      <WhatsappRecargaStatusBanner />
      <WhatsAppCreditosClient data={data} />
    </div>
  );
}
