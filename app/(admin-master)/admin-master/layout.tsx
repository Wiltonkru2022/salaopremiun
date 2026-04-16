import AdminMasterShell from "@/components/admin-master/AdminMasterShell";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

export const dynamic = "force-dynamic";

export default async function AdminMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminMasterUser("dashboard_ver");

  return (
    <AdminMasterShell
      adminName={admin.usuario.nome}
      adminEmail={admin.usuario.email}
      perfil={admin.usuario.perfil}
      permissions={admin.permissions}
    >
      {children}
    </AdminMasterShell>
  );
}
