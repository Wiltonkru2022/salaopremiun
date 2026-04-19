import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterRecursosPage() {
  const data = await getAdminMasterSection("recursos");
  return <AdminSectionView data={data} />;
}
