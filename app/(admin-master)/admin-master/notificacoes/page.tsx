import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterNotificacoesPage() {
  const data = await getAdminMasterSection("notificacoes");
  return (
    <AdminMasterSectionSimple
      data={{
        ...data,
        title: "Notificações",
        description: "Envios, histórico e falhas de comunicação em uma subárea de Campanhas.",
      }}
    />
  );
}
