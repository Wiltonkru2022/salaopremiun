import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminMasterTrialCoherencePanel } from "@/components/admin-master/AdminMasterGovernanceEditor";
import { AdminMasterResourceMatrixEditor } from "@/components/admin-master/AdminMasterPlanEditor";
import { getAdminMasterSection } from "@/lib/admin-master/data";
import { getAdminMasterGovernanceEditorData } from "@/lib/admin-master/governance-editor";
import { getAdminMasterPlanEditorData } from "@/lib/admin-master/plan-editor";
import { salvarRecursoPlanoAdminMaster } from "@/app/(admin-master)/admin-master/planos/actions";

export const dynamic = "force-dynamic";

export default async function AdminMasterRecursosPage() {
  const [data, editorData, governanceData] = await Promise.all([
    getAdminMasterSection("recursos"),
    getAdminMasterPlanEditorData(),
    getAdminMasterGovernanceEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={data} />
      <AdminMasterTrialCoherencePanel data={governanceData} />
      <AdminMasterResourceMatrixEditor
        data={editorData}
        salvarRecurso={salvarRecursoPlanoAdminMaster}
      />
    </div>
  );
}
