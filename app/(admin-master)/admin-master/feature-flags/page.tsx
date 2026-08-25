import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
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
      <AdminMasterSectionSimple data={{ ...data, description: "Liberações controladas por escopo. Use os controles visuais abaixo e deixe detalhes técnicos para investigação." }} />
      <AdminMasterFeatureFlagsEditor
        data={editorData}
        salvarFeatureFlag={salvarFeatureFlagAdminMaster}
        salvarLiberacaoSalao={salvarFeatureFlagSalaoAdminMaster}
      />
    </div>
  );
}
