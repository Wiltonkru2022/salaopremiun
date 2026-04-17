import { AdminDashboardView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterDashboard } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterPage() {
  const data = await getAdminMasterDashboard();

  return (
    <AdminDashboardView
      kpis={data.kpis}
      recentes={data.recentes}
      planos={data.planos}
      operational={data.operational}
    />
  );
}
