import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterCobrancasPage() {
  const data = await getAdminMasterSection("cobrancas");
  return <AdminMasterSectionSimple data={data} />;
}
