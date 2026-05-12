import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminMasterResourceMatrixEditor } from "@/components/admin-master/AdminMasterPlanEditor";
import { getAdminMasterSection } from "@/lib/admin-master/data";
import { getAdminMasterPlanEditorData } from "@/lib/admin-master/plan-editor";
import { salvarRecursoPlanoAdminMaster } from "@/app/(admin-master)/admin-master/planos/actions";

export const dynamic = "force-dynamic";

export default async function AdminMasterRecursosPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("recursos"),
    getAdminMasterPlanEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={data} />
      <AdminMasterResourceMatrixEditor
        data={editorData}
        salvarRecurso={salvarRecursoPlanoAdminMaster}
      />
    </div>
  );
}
