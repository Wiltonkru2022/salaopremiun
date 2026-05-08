"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPainelPageMeta } from "@/components/layout/navigation";

const SYSTEM_NAME = "SalaoPremium";

const exactTitles: Record<string, string> = {
  "/": "Inicio",
  "/login": "Login",
  "/cadastro-salao": "Cadastro do Salão",
  "/recuperar-senha": "Recuperar Senha",
  "/atualizar-senha": "Atualizar Senha",
  "/quem-somos": "Quem Somos",
  "/politica-de-privacidade": "Politica de Privacidade",
  "/termos-de-uso": "Termos de Uso",
  "/blog": "Blog",
  "/admin-master": "Admin Master",
  "/admin-master/login": "Login Admin Master",
  "/app-cliente": "App Cliente",
  "/app-cliente/inicio": "Saloes",
  "/app-cliente/login": "Login do Cliente",
  "/app-cliente/cadastro": "Cadastro do Cliente",
  "/app-cliente/agendamentos": "Meus Agendamentos",
  "/app-cliente/perfil": "Perfil do Cliente",
  "/app-cliente/perfil/editar": "Editar Perfil",
  "/app-cliente/recuperar-acesso": "Recuperar Acesso",
  "/app-profissional": "App Profissional",
  "/app-profissional/login": "Login Profissional",
  "/app-profissional/inicio": "Inicio Profissional",
  "/app-profissional/agenda": "Agenda Profissional",
  "/app-profissional/clientes": "Clientes Profissional",
  "/app-profissional/comandas": "Comandas Profissional",
  "/app-profissional/comissao": "Comissão Profissional",
  "/app-profissional/perfil": "Perfil Profissional",
  "/app-profissional/avaliacoes": "Avaliacoes Recebidas",
  "/app-profissional/suporte": "Suporte Profissional",
  "/app-profissional/recuperar-senha": "Recuperar Senha Profissional",
};

const prefixTitles: Array<[string, string]> = [
  ["/blog/", "Blog"],
  ["/salao/", "Salao"],
  ["/s/", "Salao"],
  ["/admin-master/blog", "Blog Admin"],
  ["/admin-master/saloes", "Salões Admin"],
  ["/admin-master/tickets", "Tickets Admin"],
  ["/admin-master/assinaturas", "Assinaturas Admin"],
  ["/admin-master/whatsapp", "WhatsApp Admin"],
  ["/admin-master/webhooks", "Webhooks Admin"],
  ["/admin-master/", "Admin Master"],
  ["/app-cliente/agendamentos/", "Avaliação do Atendimento"],
  ["/app-cliente/recuperar-acesso/", "Novo Acesso"],
  ["/app-cliente/salao/", "Salao"],
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
    const applyTitle = () => {
      const pageTitle = resolvePageTitle(pathname || "/");
      document.title =
        pageTitle === SYSTEM_NAME ? SYSTEM_NAME : `${pageTitle} | ${SYSTEM_NAME}`;
    };

    applyTitle();
    const immediateTimer = window.setTimeout(applyTitle, 0);
    const settledTimer = window.setTimeout(applyTitle, 250);

    return () => {
      window.clearTimeout(immediateTimer);
      window.clearTimeout(settledTimer);
    };
  }, [pathname]);

  return null;
}
