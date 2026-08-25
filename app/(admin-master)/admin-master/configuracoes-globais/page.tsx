import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { AdminMasterGlobalConfigsEditor } from "@/components/admin-master/AdminMasterGovernanceEditor";
import { salvarConfiguracaoGlobalAdminMaster } from "@/app/(admin-master)/admin-master/configuracoes-globais/actions";
import { getAdminMasterSection } from "@/lib/admin-master/data";
import { getAdminMasterGovernanceEditorData } from "@/lib/admin-master/governance-editor";

export const dynamic = "force-dynamic";

export default async function AdminMasterConfiguracoesGlobaisPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("configuracoes-globais"),
    getAdminMasterGovernanceEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminMasterSectionSimple data={{ ...data, title: "Configurações da plataforma", description: "Preferências globais organizadas em uma área de Produto. Alterações sensíveis continuam auditadas no servidor." }} />
      <AdminMasterGlobalConfigsEditor data={editorData} salvarConfiguracao={salvarConfiguracaoGlobalAdminMaster} />
    </div>
  );
}
