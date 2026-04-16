import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterLogsPage() {
  const data = await getAdminMasterSection("logs");
  return <AdminSectionView data={data} />;
}
