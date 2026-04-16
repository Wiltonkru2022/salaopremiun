import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterNovaCampanhaPage() {
  const data = await getAdminMasterSection("campanhas");
  return <AdminSectionView data={{ ...data, title: "Nova campanha" }} />;
}
