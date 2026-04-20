import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AcaoCaixa =
  | "abrir_caixa"
  | "fechar_caixa"
  | "lancar_movimentacao"
  | "adicionar_pagamento"
  | "remover_pagamento"
  | "finalizar_comanda"
  | "cancelar_comanda";

export type CaixaProcessarBody = {
  idSalao?: string | null;
  acao?: AcaoCaixa | null;
  idempotencyKey?: string | null;
  comanda?: {
    idComanda?: string | null;
  } | null;
  sessao?: {
    idSessao?: string | null;
    valorAbertura?: number | null;
    valorFechamento?: number | null;
    observacoes?: string | null;
  } | null;
  movimento?: {
    tipo?: string | null;
    valor?: number | null;
    descricao?: string | null;
    idProfissional?: string | null;
    idComanda?: string | null;
    formaPagamento?: string | null;
  } | null;
  pagamento?: {
    idPagamento?: string | null;
    formaPagamento?: string | null;
    valorBase?: number | null;
    parcelas?: number | null;
    observacoes?: string | null;
  } | null;
  motivo?: string | null;
};

export type CaixaProcessarContext = {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idUsuario: string;
};
