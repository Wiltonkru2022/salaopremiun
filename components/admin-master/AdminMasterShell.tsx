import type { ReactNode } from "react";
import type { AdminMasterPermissions } from "@/lib/admin-master/auth/adminMasterPermissions";
import type { AdminMasterShellData } from "@/lib/admin-master/data";
import AdminMasterShellClient from "@/components/admin-master/AdminMasterShellClient";

type Props = {
  children: ReactNode;
  adminName: string;
  adminEmail: string;
  perfil: string;
  permissions: AdminMasterPermissions;
  shellData: AdminMasterShellData;
};

export default function AdminMasterShell(props: Props) {
  return <AdminMasterShellClient {...props} />;
}
