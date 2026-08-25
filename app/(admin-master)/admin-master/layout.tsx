import type { Metadata } from "next";
import AdminMasterShell from "@/components/admin-master/AdminMasterShell";
import { getAdminMasterShellDataCached } from "@/lib/admin-master/shell-data-cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import "./admin-master-polish.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminMasterUser("dashboard_ver");
  const shellData = await getAdminMasterShellDataCached();

  return (
    <div className="admin-master-root">
      <AdminMasterShell
        adminId={admin.usuario.id}
        adminName={admin.usuario.nome}
        adminEmail={admin.usuario.email}
        perfil={admin.usuario.perfil}
        permissions={admin.permissions}
        shellData={shellData}
      >
        {children}
      </AdminMasterShell>
    </div>
  );
}
