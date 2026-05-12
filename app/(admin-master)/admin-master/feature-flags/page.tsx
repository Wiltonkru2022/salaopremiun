import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminMasterFeatureFlagsEditor } from "@/components/admin-master/AdminMasterGovernanceEditor";
import {
  salvarFeatureFlagAdminMaster,
  salvarFeatureFlagSalaoAdminMaster,
} from "@/app/(admin-master)/admin-master/feature-flags/actions";
import { getAdminMasterSection } from "@/lib/admin-master/data";
import { getAdminMasterGovernanceEditorData } from "@/lib/admin-master/governance-editor";

export const dynamic = "force-dynamic";

export default async function AdminMasterFeatureFlagsPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("feature-flags"),
    getAdminMasterGovernanceEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={data} />
      <AdminMasterFeatureFlagsEditor
        data={editorData}
        salvarFeatureFlag={salvarFeatureFlagAdminMaster}
        salvarLiberacaoSalao={salvarFeatureFlagSalaoAdminMaster}
      />
    </div>
  );
}
