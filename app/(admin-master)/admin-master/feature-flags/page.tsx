import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterFeatureFlagsPage() {
  const data = await getAdminMasterSection("feature-flags");
  return <AdminSectionView data={data} />;
}
