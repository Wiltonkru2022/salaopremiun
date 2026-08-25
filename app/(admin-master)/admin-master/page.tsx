import AdminMasterDashboardSimple from "@/components/admin-master/AdminMasterDashboardSimple";
import AdminMasterSmartActionsPanel from "@/components/admin-master/AdminMasterSmartActionsPanel";
import { getAdminMasterDashboard } from "@/lib/admin-master/data";
import { getAdminMasterSmartActions } from "@/lib/admin-master/smart-actions";

export const dynamic = "force-dynamic";

export default async function AdminMasterPage() {
  const [data, smartActions] = await Promise.all([
    getAdminMasterDashboard(),
    getAdminMasterSmartActions(),
  ]);

  return (
    <div className="space-y-6">
      <AdminMasterSmartActionsPanel actions={smartActions} />
      <AdminMasterDashboardSimple
        kpis={data.kpis}
        recentes={data.recentes}
        planos={data.planos}
        operational={data.operational}
        digitalizacao={data.digitalizacao}
        insights={data.insights}
        revenueTrend={data.revenueTrend}
      />
    </div>
  );
}
