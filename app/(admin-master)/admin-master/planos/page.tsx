import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminMasterPlanEditor } from "@/components/admin-master/AdminMasterPlanEditor";
import { getAdminMasterSection } from "@/lib/admin-master/data";
import { getAdminMasterPlanEditorData } from "@/lib/admin-master/plan-editor";
import { salvarPlanoAdminMaster } from "@/app/(admin-master)/admin-master/planos/actions";

export const dynamic = "force-dynamic";

export default async function AdminMasterPlanosPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("planos"),
    getAdminMasterPlanEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={data} />
      <AdminMasterPlanEditor
        data={editorData}
        salvarPlano={salvarPlanoAdminMaster}
      />
    </div>
  );
}
