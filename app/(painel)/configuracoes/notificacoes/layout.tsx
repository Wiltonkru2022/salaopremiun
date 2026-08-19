import type { ReactNode } from "react";
import { requirePagePermission } from "@/lib/auth/require-page-permission";

export default async function ConfiguracoesNotificacoesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePagePermission("configuracoes_ver");
  return children;
}
