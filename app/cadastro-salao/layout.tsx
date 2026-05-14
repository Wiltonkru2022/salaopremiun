import type { Metadata } from "next";
import { DOMINIO_CADASTRO } from "@/lib/proxy/domain-config";

const canonicalUrl = `https://${DOMINIO_CADASTRO}/cadastro-salao`;

export const metadata: Metadata = {
  title: "Cadastro do Salão | SalaoPremium",
  description:
    "Crie sua conta no SalaoPremium e comece a organizar agenda, clientes, profissionais, caixa e gestão do salão.",
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: "Cadastro do Salão | SalaoPremium",
    description:
      "Crie sua conta no SalaoPremium e comece a organizar agenda, clientes, profissionais, caixa e gestão do salão.",
    url: canonicalUrl,
    siteName: "SalaoPremium",
  },
};

export default function CadastroSalaoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
