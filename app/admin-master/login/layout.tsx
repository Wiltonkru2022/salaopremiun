import { redirect } from "next/navigation";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";

export default function AdminMasterLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (getAuthProviderForSurface("admin-master") === "clerk") {
    redirect("/admin-master/clerk-login");
  }

  return children;
}
