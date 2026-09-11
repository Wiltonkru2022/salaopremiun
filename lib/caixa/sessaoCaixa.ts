import { createClient } from "@/lib/supabase/client";

type CaixaSupabaseClient = ReturnType<typeof createClient>;

export type CaixaSessaoStatus = "aberto" | "fechado";
export type CaixaFechamentoTipo = "confere" | "sobra" | "quebra";

const CAIXA_SESSAO_SELECT =
  "aberto_em, created_at, fechado_em, id, id_salao, id_usuario_abertura, id_usuario_fechamento, observacoes, status, tipo_fechamento, updated_at, valor_abertura, valor_diferenca_fechamento, valor_fechamento_informado, valor_previsto_fechamento";

export type CaixaSessao = {
  id: string;
  id_salao: string;
  id_usuario_abertura?: string | null;
  id_usuario_fechamento?: string | null;
  status: CaixaSessaoStatus;
  tipo_fechamento?: CaixaFechamentoTipo | null;
  valor_abertura: number;
  valor_previsto_fechamento?: number | null;
  valor_diferenca_fechamento?: number | null;
  valor_fechamento_informado?: number | null;
  observacoes?: string | null;
  aberto_em?: string | null;
  fechado_em?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CaixaMovimentacaoTipo =
  | "sangria"
  | "suprimento"
  | "venda"
  | "vale_profissional"
  | "ajuste";

export type CaixaMovimentacao = {
  id: string;
  id_salao: string;
  id_sessao: string;
  id_usuario?: string | null;
  id_comanda?: string | null;
  id_profissional?: string | null;
  tipo: CaixaMovimentacaoTipo;
  forma_pagamento?: string | null;
  valor: number;
  descricao?: string | null;
  created_at?: string | null;
};

export type CaixaSessaoLoadResult = {
  schemaReady: boolean;
  sessao: CaixaSessao | null;
  ultimaSessaoFechada: CaixaSessao | null;
  movimentacoes: CaixaMovimentacao[];
  error?: string;
};

function isMissingOperationalSchema(error: unknown) {
  const candidate = error as
    | { code?: string | null; message?: string | null }
    | null
    | undefined;
  const code = String(candidate?.code || "");
  const message = String(candidate?.message || "").toLowerCase();

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("caixa_sessoes") ||
    message.includes("caixa_movimentacoes") ||
    message.includes("profissionais_vales") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
}

export async function carregarSessaoCaixa(
  supabase: CaixaSupabaseClient,
  idSalao: string
): Promise<CaixaSessaoLoadResult> {
  const { data: sessao, error } = await supabase
    .from("caixa_sessoes")
    .select(CAIXA_SESSAO_SELECT)
    .eq("id_salao", idSalao)
    .eq("status", "aberto")
    .order("aberto_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOperationalSchema(error)) {
      return {
        schemaReady: false,
        sessao: null,
        ultimaSessaoFechada: null,
        movimentacoes: [],
        error:
          "A migration de caixa operacional ainda nao foi aplicada no Supabase.",
      };
    }

    throw error;
  }

  if (!sessao?.id) {
    return carregarUltimaSessaoFechada(supabase, idSalao);
  }

  const { data: movimentacoes, error: movimentacoesError } = await supabase
    .from("caixa_movimentacoes")
    .select("created_at, descricao, forma_pagamento, id, id_comanda, id_profissional, id_salao, id_sessao, id_usuario, idempotency_key, tipo, valor")
    .eq("id_salao", idSalao)
    .eq("id_sessao", sessao.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (movimentacoesError) {
    if (isMissingOperationalSchema(movimentacoesError)) {
      return {
        schemaReady: false,
        sessao: null,
        ultimaSessaoFechada: null,
        movimentacoes: [],
        error:
          "A migration de caixa operacional ainda nao foi aplicada no Supabase.",
      };
    }

    throw movimentacoesError;
  }

  return {
    schemaReady: true,
    sessao: sessao as CaixaSessao,
    ultimaSessaoFechada: null,
    movimentacoes: (movimentacoes as CaixaMovimentacao[]) || [],
  };
}

async function carregarUltimaSessaoFechada(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const { data, error } = await supabase
    .from("caixa_sessoes")
    .select(CAIXA_SESSAO_SELECT)
    .eq("id_salao", idSalao)
    .eq("status", "fechado")
    .order("fechado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOperationalSchema(error)) {
      return {
        schemaReady: false as const,
        sessao: null,
        ultimaSessaoFechada: null,
        movimentacoes: [],
        error:
          "A migration de caixa operacional ainda nao foi aplicada no Supabase.",
      };
    }

    throw error;
  }

  return {
    schemaReady: true as const,
    sessao: null,
    ultimaSessaoFechada: (data as CaixaSessao | null) || null,
    movimentacoes: [],
  };
}

export async function abrirSessaoCaixa({
  supabase,
  idSalao,
  idUsuario,
  valorAbertura,
  observacoes,
}: {
  supabase: CaixaSupabaseClient;
  idSalao: string;
  idUsuario?: string | null;
  valorAbertura: number;
  observacoes?: string | null;
}) {
  const { data, error } = await supabase
    .from("caixa_sessoes")
    .insert({
      id_salao: idSalao,
      id_usuario_abertura: idUsuario || null,
      valor_abertura: valorAbertura,
      observacoes: observacoes || null,
      status: "aberto",
    })
    .select(CAIXA_SESSAO_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data as CaixaSessao;
}

export async function fecharSessaoCaixa({
  supabase,
  idSessao,
  idUsuario,
  valorFechamento,
  observacoes,
}: {
  supabase: CaixaSupabaseClient;
  idSessao: string;
  idUsuario?: string | null;
  valorFechamento: number;
  observacoes?: string | null;
}) {
  const { data, error } = await supabase
    .from("caixa_sessoes")
    .update({
      id_usuario_fechamento: idUsuario || null,
      valor_fechamento_informado: valorFechamento,
      observacoes: observacoes || null,
      status: "fechado",
      fechado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", idSessao)
    .eq("status", "aberto")
    .select(CAIXA_SESSAO_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data as CaixaSessao | null;
}

export async function lancarMovimentacaoCaixa({
  supabase,
  idSalao,
  idSessao,
  idUsuario,
  tipo,
  valor,
  descricao,
  idProfissional,
  idComanda,
  formaPagamento,
}: {
  supabase: CaixaSupabaseClient;
  idSalao: string;
  idSessao: string;
  idUsuario?: string | null;
  tipo: CaixaMovimentacaoTipo;
  valor: number;
  descricao?: string | null;
  idProfissional?: string | null;
  idComanda?: string | null;
  formaPagamento?: string | null;
}) {
  if (tipo === "vale_profissional" && !idProfissional) {
    throw new Error("Selecione o profissional para lancar o vale.");
  }

  const { data: movimento, error } = await supabase
    .from("caixa_movimentacoes")
    .insert({
      id_salao: idSalao,
      id_sessao: idSessao,
      id_usuario: idUsuario || null,
      id_comanda: idComanda || null,
      id_profissional: idProfissional || null,
      tipo,
      forma_pagamento: formaPagamento || null,
      valor,
      descricao: descricao || null,
    })
    .select("created_at, descricao, forma_pagamento, id, id_comanda, id_profissional, id_salao, id_sessao, id_usuario, idempotency_key, tipo, valor")
    .maybeSingle();

  if (error) throw error;

  if (tipo === "vale_profissional") {
    if (!idProfissional) {
      throw new Error("Profissional obrigatorio para lancar vale.");
    }

    const { error: valeError } = await supabase
      .from("profissionais_vales")
      .insert({
        id_salao: idSalao,
        id_profissional: idProfissional,
        id_usuario: idUsuario || null,
        id_sessao: idSessao,
        id_movimentacao: movimento?.id || null,
        valor,
        descricao: descricao || null,
        status: "aberto",
      });

    if (valeError) {
      if (movimento?.id) {
        await supabase
          .from("caixa_movimentacoes")
          .delete()
          .eq("id", movimento.id)
          .eq("id_salao", idSalao);
      }

      throw valeError;
    }
  }

  return movimento as CaixaMovimentacao;
}
