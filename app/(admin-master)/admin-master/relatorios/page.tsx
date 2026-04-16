import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterRelatoriosPage() {
  const data = await getAdminMasterSection("relatorios");
  return <AdminSectionView data={data} />;
}
