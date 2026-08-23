import type { ReactNode } from "react";
import ProdutosFeatureGate from "@/components/produtos/ProdutosFeatureGate";

export default function EstoqueLayout({ children }: { children: ReactNode }) {
  return <ProdutosFeatureGate>{children}</ProdutosFeatureGate>;
}
