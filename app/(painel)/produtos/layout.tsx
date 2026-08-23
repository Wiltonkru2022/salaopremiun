import type { ReactNode } from "react";
import ProdutosFeatureGate from "@/components/produtos/ProdutosFeatureGate";

export default function ProdutosLayout({ children }: { children: ReactNode }) {
  return <ProdutosFeatureGate>{children}</ProdutosFeatureGate>;
}
