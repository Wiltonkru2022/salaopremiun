import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterFinanceiroPage() {
  const data = await getAdminMasterSection("financeiro");
  return <AdminMasterSectionSimple data={data} />;
}
