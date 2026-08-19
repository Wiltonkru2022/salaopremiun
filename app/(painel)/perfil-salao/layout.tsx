import type { ReactNode } from "react";
import PerfilSalaoOrganizer from "@/components/perfil-salao/PerfilSalaoOrganizer";

export default function PerfilSalaoLayout({ children }: { children: ReactNode }) {
  return <PerfilSalaoOrganizer>{children}</PerfilSalaoOrganizer>;
}
