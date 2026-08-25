import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterAlertasPage() {
  const data = await getAdminMasterSection("alertas");
  return <AdminMasterSectionSimple data={{ ...data, title: "Alertas que exigem ação", description: "Fila operacional de problemas que precisam de acompanhamento. A visão geral da estabilidade fica em Saúde do sistema." }} />;
}
