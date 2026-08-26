import { redirect } from "next/navigation";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

export default async function AdminMasterLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = sanitizeAdminMasterNextPath(rawNext) || ADMIN_MASTER_HOME_PATH;
  const query = new URLSearchParams({ next: nextPath });

  redirect(`/admin-master/clerk-login?${query.toString()}`);
}
