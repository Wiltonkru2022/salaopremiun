import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterFinanceiroPage() {
  const data = await getAdminMasterSection("financeiro");
  return <AdminSectionView data={data} />;
}
