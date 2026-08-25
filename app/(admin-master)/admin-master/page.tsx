import AdminMasterDashboardSimple from "@/components/admin-master/AdminMasterDashboardSimple";
import { getAdminMasterDashboard } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterPage() {
  const data = await getAdminMasterDashboard();

  return (
    <AdminMasterDashboardSimple
      kpis={data.kpis}
      recentes={data.recentes}
      planos={data.planos}
      operational={data.operational}
      digitalizacao={data.digitalizacao}
      insights={data.insights}
      revenueTrend={data.revenueTrend}
    />
  );
}
