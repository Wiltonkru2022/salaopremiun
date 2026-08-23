import type { Metadata } from "next";
import { DOMINIO_CADASTRO } from "@/lib/proxy/domain-config";

const canonicalUrl = `https://${DOMINIO_CADASTRO}/cadastro-salao`;

export const metadata: Metadata = {
  title: "Cadastro do Salão",
  description:
    "Crie sua conta no SalãoPremium e comece a organizar agenda, clientes, profissionais, caixa e gestão do salão.",
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: "Cadastro do Salão",
    description:
      "Crie sua conta no SalãoPremium e comece a organizar agenda, clientes, profissionais, caixa e gestão do salão.",
    url: canonicalUrl,
    siteName: "SalãoPremium",
  },
};

const MOBILE_CONTINUE_SCRIPT = `
(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const original = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    if (query === '(max-width: 1023px)' || query === '(pointer: coarse)') {
      const result = original(query);
      return new Proxy(result, {
        get(target, prop) {
          if (prop === 'matches') return false;
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    }
    return original(query);
  };
})();`;

export default function CadastroSalaoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOBILE_CONTINUE_SCRIPT }} />
      {children}
    </>
  );
}
