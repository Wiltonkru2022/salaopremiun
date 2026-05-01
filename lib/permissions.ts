export type UserNivel =
  | "admin"
  | "gerente"
  | "profissional"
  | "recepcao";

export type PermissionKey =
  | "dashboard_ver"
  | "agenda_ver"
  | "agenda_criar"
  | "agenda_editar"
  | "agenda_excluir"
  | "agenda_operar"
  | "clientes_ver"
  | "clientes_criar"
  | "clientes_editar"
  | "clientes_excluir"
  | "profissionais_ver"
  | "profissionais_criar"
  | "profissionais_editar"
  | "profissionais_excluir"
  | "servicos_ver"
  | "servicos_criar"
  | "servicos_editar"
  | "servicos_excluir"
  | "produtos_ver"
  | "produtos_criar"
  | "produtos_editar"
  | "produtos_excluir"
  | "estoque_ver"
  | "estoque_operar"
  | "estoque_financeiro"
  | "comandas_ver"
  | "comandas_criar"
  | "comandas_editar"
  | "comandas_excluir"
  | "comandas_operar"
  | "vendas_ver"
  | "vendas_criar"
  | "vendas_reabrir"
  | "vendas_editar"
  | "vendas_excluir"
  | "vendas_financeiro"
  | "caixa_ver"
  | "caixa_criar"
  | "caixa_editar"
  | "caixa_excluir"
  | "caixa_operar"
  | "caixa_financeiro"
  | "caixa_finalizar"
  | "caixa_pagamentos"
  | "comissoes_ver"
  | "comissoes_editar"
  | "comissoes_financeiro"
  | "relatorios_ver"
  | "relatorios_financeiro"
  | "marketing_ver"
  | "marketing_criar"
  | "marketing_editar"
  | "suporte_ver"
  | "suporte_operar"
  | "perfil_salao_ver"
  | "perfil_salao_editar"
  | "configuracoes_ver"
  | "configuracoes_editar"
  | "assinatura_ver";

export const PERMISSIONS: Record<PermissionKey, UserNivel[]> = {
  dashboard_ver: ["admin", "gerente", "recepcao"],
  agenda_ver: ["admin", "gerente", "profissional", "recepcao"],
  agenda_criar: ["admin", "gerente", "profissional", "recepcao"],
  agenda_editar: ["admin", "gerente", "profissional", "recepcao"],
  agenda_excluir: ["admin", "gerente"],
  agenda_operar: ["admin", "gerente", "profissional", "recepcao"],
  clientes_ver: ["admin", "gerente", "recepcao"],
  clientes_criar: ["admin", "gerente", "recepcao"],
  clientes_editar: ["admin", "gerente", "recepcao"],
  clientes_excluir: ["admin", "gerente"],
  profissionais_ver: ["admin", "gerente"],
  profissionais_criar: ["admin", "gerente"],
  profissionais_editar: ["admin", "gerente"],
  profissionais_excluir: ["admin"],
  servicos_ver: ["admin", "gerente"],
  servicos_criar: ["admin", "gerente"],
  servicos_editar: ["admin", "gerente"],
  servicos_excluir: ["admin", "gerente"],
  produtos_ver: ["admin", "gerente"],
  produtos_criar: ["admin", "gerente"],
  produtos_editar: ["admin", "gerente"],
  produtos_excluir: ["admin", "gerente"],
  estoque_ver: ["admin", "gerente"],
  estoque_operar: ["admin", "gerente"],
  estoque_financeiro: ["admin", "gerente"],
  comandas_ver: ["admin", "gerente", "recepcao"],
  comandas_criar: ["admin", "gerente", "recepcao"],
  comandas_editar: ["admin", "gerente", "recepcao"],
  comandas_excluir: ["admin", "gerente"],
  comandas_operar: ["admin", "gerente", "recepcao"],
  vendas_ver: ["admin", "gerente", "recepcao"],
  vendas_criar: ["admin", "gerente", "recepcao"],
  vendas_reabrir: ["admin", "gerente"],
  vendas_editar: ["admin", "gerente"],
  vendas_excluir: ["admin"],
  vendas_financeiro: ["admin", "gerente"],
  caixa_ver: ["admin", "gerente"],
  comissoes_ver: ["admin", "gerente"],
  comissoes_editar: ["admin", "gerente"],
  comissoes_financeiro: ["admin", "gerente"],
  relatorios_ver: ["admin"],
  relatorios_financeiro: ["admin"],
  marketing_ver: ["admin", "gerente"],
  marketing_criar: ["admin", "gerente"],
  marketing_editar: ["admin", "gerente"],
  suporte_ver: ["admin", "gerente", "profissional", "recepcao"],
  suporte_operar: ["admin", "gerente", "profissional", "recepcao"],
  perfil_salao_ver: ["admin"],
  perfil_salao_editar: ["admin"],
  configuracoes_ver: ["admin"],
  configuracoes_editar: ["admin"],
  assinatura_ver: ["admin"],
  caixa_criar: ["admin", "gerente"],
  caixa_editar: ["admin", "gerente"],
  caixa_excluir: ["admin"],
  caixa_operar: ["admin", "gerente"],
  caixa_financeiro: ["admin", "gerente"],
  caixa_finalizar: ["admin", "gerente"],
  caixa_pagamentos: ["admin", "gerente"],
};
