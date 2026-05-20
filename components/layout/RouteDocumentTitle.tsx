"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPainelPageMeta } from "@/components/layout/navigation";

const SYSTEM_NAME = "SalãoPremium";

const exactTitles: Record<string, string> = {
  "/": "Início",
  "/login": "Login",
  "/cadastro-salao": "Cadastro do Salão",
  "/recuperar-senha": "Recuperar Senha",
  "/atualizar-senha": "Atualizar Senha",
  "/quem-somos": "Quem Somos",
  "/politica-de-privacidade": "Política de Privacidade",
  "/termos-de-uso": "Termos de Uso",
  "/blog": "Blog",
  "/admin-master": "Admin Master",
  "/admin-master/login": "Login Admin Master",
  "/app-cliente": "App Cliente",
  "/app-cliente/meuapp": "Meu App",
  "/app-cliente/explorar": "Explorar",
  "/app-cliente/inicio": "Salões",
  "/app-cliente/login": "Login do Cliente",
  "/app-cliente/cadastro": "Cadastro do Cliente",
  "/app-cliente/agenda": "Agenda",
  "/app-cliente/agendamentos": "Meus Agendamentos",
  "/app-cliente/perfil": "Perfil do Cliente",
  "/app-cliente/perfil/editar": "Editar Perfil",
  "/app-cliente/recuperar-acesso": "Recuperar Acesso",
  "/app-profissional": "App Profissional",
  "/app-profissional/login": "Login Profissional",
  "/app-profissional/inicio": "Início Profissional",
  "/app-profissional/agenda": "Agenda Profissional",
  "/app-profissional/clientes": "Clientes Profissional",
  "/app-profissional/comandas": "Comandas Profissional",
  "/app-profissional/comissao": "Comissão Profissional",
  "/app-profissional/perfil": "Perfil Profissional",
  "/app-profissional/avaliacoes": "Avaliações Recebidas",
  "/app-profissional/suporte": "Suporte Profissional",
  "/app-profissional/recuperar-senha": "Recuperar Senha Profissional",
};

const prefixTitles: Array<[string, string]> = [
  ["/blog/", "Blog"],
  ["/salao/", "Salão"],
  ["/s/", "Salão"],
  ["/admin-master/blog", "Blog Admin"],
  ["/admin-master/saloes", "Salões Admin"],
  ["/admin-master/tickets", "Tickets Admin"],
  ["/admin-master/assinaturas", "Assinaturas Admin"],
  ["/admin-master/whatsapp", "WhatsApp Admin"],
  ["/admin-master/webhooks", "Webhooks Admin"],
  ["/admin-master/", "Admin Master"],
  ["/app-cliente/agendamentos/", "Avaliação do Atendimento"],
  ["/app-cliente/recuperar-acesso/", "Novo Acesso"],
  ["/app-cliente/salao/", "Salão"],
  ["/app-profissional/agenda/", "Detalhe do Atendimento"],
  ["/app-profissional/clientes/", "Cliente Profissional"],
  ["/app-profissional/comandas/", "Comanda Profissional"],
];

function resolvePageTitle(pathname: string) {
  const normalized = pathname || "/";
  const exact = exactTitles[normalized];
  if (exact) return exact;

  const prefix = prefixTitles.find(([path]) => normalized.startsWith(path));
  if (prefix) return prefix[1];

  const painelMeta = getPainelPageMeta(normalized);
  if (painelMeta.title && painelMeta.title !== "Painel") {
    return painelMeta.title;
  }

  return "Painel";
}

export default function RouteDocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const title = resolvePageTitle(pathname || "/");
    document.title = `${title} | ${SYSTEM_NAME}`;
  }, [pathname]);

  return null;
}
