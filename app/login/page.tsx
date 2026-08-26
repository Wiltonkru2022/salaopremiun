import { redirect } from "next/navigation";

function safeReturnTo(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard?boot=1";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo || params.next);
  const query = new URLSearchParams();
  query.set("returnTo", returnTo);
  if (typeof params.motivo === "string") query.set("motivo", params.motivo);
  if (typeof params.context === "string") query.set("context", params.context);
  redirect(`https://login.salaopremiun.com.br/login-clerk?${query.toString()}`);
}
