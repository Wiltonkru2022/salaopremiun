import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminMasterUsersEditor } from "@/components/admin-master/AdminMasterGovernanceEditor";
import { salvarUsuarioAdminMaster } from "@/app/(admin-master)/admin-master/usuarios-admin/actions";
import { getAdminMasterSection } from "@/lib/admin-master/data";
import { getAdminMasterGovernanceEditorData } from "@/lib/admin-master/governance-editor";

export const dynamic = "force-dynamic";

export default async function AdminMasterUsuariosAdminPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("usuarios-admin"),
    getAdminMasterGovernanceEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={data} />
      <AdminMasterUsersEditor
        data={editorData}
        salvarUsuario={salvarUsuarioAdminMaster}
      />
    </div>
  );
}
