import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterNovaNotificacaoPage() {
  const data = await getAdminMasterSection("notificacoes");
  return <AdminSectionView data={{ ...data, title: "Nova notificacao global" }} />;
}
