import type { ReactNode } from "react";
import ClientesMigrationShortcut from "@/components/clientes/ClientesMigrationShortcut";

export default function ClientesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ClientesMigrationShortcut />
      {children}
    </>
  );
}
