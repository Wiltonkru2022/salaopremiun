import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterSuportePage() {
  const data = await getAdminMasterSection("suporte");
  return <AdminMasterSectionSimple data={{ ...data, title: "Visão do suporte", description: "Backlog, prioridades e sinais do atendimento. Use Tickets para trabalhar cada solicitação." }} />;
}
