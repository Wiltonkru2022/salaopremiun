import { redirect } from "next/navigation";
import { getLoginUrl } from "@/lib/site-urls";

function safeNext(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const adminMaster = params.mode === "admin-master";
  const path = adminMaster ? "/admin-master/login" : "/login";
  redirect(getLoginUrl(`${path}?next=${encodeURIComponent(next)}`));
}
