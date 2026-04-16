export type UserNivel =
  | "admin"
  | "gerente"
  | "profissional"
  | "recepcao";

export type PermissionKey =
  | "dashboard_ver"
  | "agenda_ver"
  | "clientes_ver"
  | "profissionais_ver"
  | "servicos_ver"
  | "produtos_ver"
  | "estoque_ver"
  | "comandas_ver"
  | "vendas_ver"
  | "caixa_ver"
  | "caixa_editar"
  | "caixa_operar"
  | "caixa_finalizar"
  | "caixa_pagamentos"
  | "comissoes_ver"
  | "relatorios_ver"
  | "marketing_ver"
  | "suporte_ver"
  | "perfil_salao_ver"
  | "configuracoes_ver"
  | "assinatura_ver";

export const PERMISSIONS: Record<PermissionKey, UserNivel[]> = {
  dashboard_ver: ["admin", "gerente", "recepcao"],
  agenda_ver: ["admin", "gerente", "profissional", "recepcao"],
  clientes_ver: ["admin", "gerente", "recepcao"],
  profissionais_ver: ["admin", "gerente"],
  servicos_ver: ["admin", "gerente"],
  produtos_ver: ["admin", "gerente"],
  estoque_ver: ["admin", "gerente"],
  comandas_ver: ["admin", "gerente", "recepcao"],
  vendas_ver: ["admin", "gerente", "recepcao"],
  caixa_ver: ["admin", "gerente"],
  comissoes_ver: ["admin", "gerente"],
  relatorios_ver: ["admin"],
  marketing_ver: ["admin", "gerente"],
  suporte_ver: ["admin", "gerente", "profissional", "recepcao"],
  perfil_salao_ver: ["admin"],
  configuracoes_ver: ["admin"],
  assinatura_ver: ["admin"],
  caixa_editar: ["admin", "gerente"],
  caixa_operar: ["admin", "gerente"],
  caixa_finalizar: ["admin", "gerente"],
  caixa_pagamentos: ["admin", "gerente"],
};
