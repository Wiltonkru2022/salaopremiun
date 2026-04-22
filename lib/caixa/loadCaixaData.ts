import { buildPermissoesByNivel, sanitizePermissoesDb, type Permissoes } from "@/lib/auth/permissions";
import type {
  AgendamentoFila,
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ComandaDetalhe,
  ComandaFila,
  ComandaItem,
  ComandaPagamento,
  ConfigCaixaSalao,
  ProfissionalResumo,
} from "@/components/caixa/types";
import { createClient } from "@/lib/supabase/client";

type CaixaSupabaseClient = ReturnType<typeof createClient>;

type UsuarioCaixa = {
  id: string;
  id_salao: string;
  nivel?: string | null;
  status?: string | null;
};

export async function carregarAcessoCaixa(supabase: CaixaSupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      precisaLogin: true as const,
    };
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, id_salao, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario?.id || !usuario?.id_salao) {
    throw new Error("Nao foi possivel identificar o salao do usuario.");
  }

  if (usuario.status && usuario.status !== "ativo") {
    throw new Error("Usuario inativo.");
  }

  const { data: permissoesDb } = await supabase
    .from("usuarios_permissoes")
    .select("agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, vendas_excluir, vendas_reabrir, vendas_ver")
    .eq("id_usuario", usuario.id)
    .eq("id_salao", usuario.id_salao)
    .maybeSingle();

  const nivelNormalizado = String(usuario.nivel || "").toLowerCase();
  const permissoesBase = buildPermissoesByNivel(nivelNormalizado);
  const permissoesSobrescritas = sanitizePermissoesDb(
    (permissoesDb as Record<string, unknown> | null) || null
  );

  const permissoes: Permissoes = {
    ...permissoesBase,
    ...permissoesSobrescritas,
  };

  return {
    precisaLogin: false as const,
    usuario: usuario as UsuarioCaixa,
    permissoes,
  };
}

export async function carregarConfiguracoesCaixa(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const { data, error } = await supabase
    .from("configuracoes_salao")
    .select(`
      id_salao,
      exigir_cliente_na_venda,
      repassa_taxa_cliente,
      taxa_maquininha_credito,
      taxa_maquininha_debito,
      taxa_maquininha_pix,
      taxa_maquininha_transferencia,
      taxa_maquininha_boleto,
      taxa_maquininha_outro,
      taxa_credito_1x,
      taxa_credito_2x,
      taxa_credito_3x,
      taxa_credito_4x,
      taxa_credito_5x,
      taxa_credito_6x,
      taxa_credito_7x,
      taxa_credito_8x,
      taxa_credito_9x,
      taxa_credito_10x,
      taxa_credito_11x,
      taxa_credito_12x
    `)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar configuracoes do caixa:", error);
    return null;
  }

  return (data as ConfigCaixaSalao) || null;
}

export async function carregarCatalogosCaixa(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const [servicosRes, produtosRes, extrasRes, profissionaisRes, assistentesRes] = await Promise.all([
    supabase
      .from("servicos")
      .select("ativo, atualizado_em, base_calculo, categoria, comissao_assistente_percentual, comissao_percentual, comissao_percentual_padrao, created_at, criado_em, custo_produto, desconta_taxa_maquininha, descricao, duracao, duracao_minutos, exige_avaliacao, gatilho_retorno_dias, id, id_categoria, id_salao, nome, pausa_minutos, preco, preco_minimo, preco_padrao, preco_variavel, recurso_nome, status, updated_at")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),

    supabase
      .from("produtos")
      .select("ativo, categoria, codigo_barras, comissao_revenda_percentual, created_at, custo_por_dose, custo_real, custos_extras, data_validade, destinacao, dose_padrao, estoque_atual, estoque_maximo, estoque_minimo, fornecedor_contato_nome, fornecedor_nome, fornecedor_telefone, fornecedor_whatsapp, foto_url, id, id_salao, linha, lote, marca, margem_lucro_percentual, nome, observacoes, prazo_medio_entrega_dias, preco_custo, preco_venda, quantidade_por_embalagem, sku, status, unidade_dose, unidade_medida, updated_at")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),

    supabase
      .from("itens_extras")
      .select("ativo, atualizado_em, categoria, comissao_percentual, comissionavel, controla_estoque, criado_em, custo, descricao, estoque_atual, estoque_minimo, id, id_salao, nome, preco_venda, unidade_medida")
      .eq("id_salao", idSalao)
      .order("nome", { ascending: true }),

    supabase
      .from("profissionais")
      .select("id, nome, comissao_percentual, tipo_profissional")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),

    supabase
      .from("profissional_assistentes")
      .select("id_profissional, id_assistente")
      .eq("id_salao", idSalao)
      .eq("ativo", true),
  ]);

  if (servicosRes.error) {
    console.error("Erro ao carregar servicos do caixa:", servicosRes.error);
  }

  if (produtosRes.error) {
    console.error("Erro ao carregar produtos do caixa:", produtosRes.error);
  }

  if (extrasRes.error) {
    console.error("Erro ao carregar extras do caixa:", extrasRes.error);
  }

  if (profissionaisRes.error) {
    console.error("Erro ao carregar profissionais do caixa:", profissionaisRes.error);
  }

  if (assistentesRes.error) {
    console.error("Erro ao carregar assistentes vinculados do caixa:", assistentesRes.error);
  }

  const assistentesPorProfissional = new Map<string, string[]>();
  ((assistentesRes.data || []) as {
    id_profissional: string | null;
    id_assistente: string | null;
  }[]).forEach((vinculo) => {
    if (!vinculo.id_profissional || !vinculo.id_assistente) return;
    const lista = assistentesPorProfissional.get(vinculo.id_profissional) || [];
    lista.push(vinculo.id_assistente);
    assistentesPorProfissional.set(vinculo.id_profissional, lista);
  });

  const profissionaisCatalogo = ((profissionaisRes.data || []) as ProfissionalResumo[]).map(
    (profissional) => ({
      ...profissional,
      assistentes_ids: assistentesPorProfissional.get(profissional.id) || [],
    })
  );

  return {
    extrasCatalogo: (extrasRes.data as CatalogoExtra[]) || [],
    produtosCatalogo: (produtosRes.data as CatalogoProduto[]) || [],
    profissionaisCatalogo,
    servicosCatalogo: (servicosRes.data as CatalogoServico[]) || [],
  };
}

function sortComandasFila(data: ComandaFila[]) {
  return [...data].sort((a, b) => {
    const peso = (status: string) => {
      if (status === "aguardando_pagamento") return 1;
      if (status === "em_atendimento") return 2;
      if (status === "aberta") return 3;
      return 4;
    };

    return peso(a.status) - peso(b.status);
  });
}

async function carregarFilaComandas(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const { data, error } = await supabase
    .from("comandas")
    .select(`
      id,
      numero,
      status,
      aberta_em,
      subtotal,
      desconto,
      acrescimo,
      total,
      id_cliente,
      clientes (
        nome
      )
    `)
    .eq("id_salao", idSalao)
    .in("status", ["aberta", "em_atendimento", "aguardando_pagamento"])
    .order("aberta_em", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Erro ao carregar fila de comandas.");
  }

  return sortComandasFila((data as ComandaFila[]) || []);
}

async function carregarAgendamentosSemComanda(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const { data, error } = await supabase
    .from("agendamentos")
    .select(`
      id,
      data,
      hora_inicio,
      hora_fim,
      status,
      id_comanda,
      cliente_id,
      profissional_id,
      servico_id
    `)
    .eq("id_salao", idSalao)
    .is("id_comanda", null)
    .eq("status", "aguardando_pagamento")
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error("Erro Supabase agendamentos sem comanda:", error);
    throw new Error("Erro ao carregar agendamentos sem comanda.");
  }

  const agendamentosBase = (data as AgendamentoFila[]) || [];

  const clienteIds = Array.from(
    new Set(agendamentosBase.map((item) => item.cliente_id).filter(Boolean))
  ) as string[];

  const profissionalIds = Array.from(
    new Set(agendamentosBase.map((item) => item.profissional_id).filter(Boolean))
  ) as string[];

  const servicoIds = Array.from(
    new Set(agendamentosBase.map((item) => item.servico_id).filter(Boolean))
  ) as string[];

  let mapaClientes = new Map<string, { id: string; nome: string }>();
  let mapaProfissionais = new Map<string, { id: string; nome: string }>();
  let mapaServicos = new Map<string, { id: string; nome: string; preco?: number | null }>();

  if (clienteIds.length > 0) {
    const { data: clientesData, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", clienteIds);

    if (clientesError) {
      console.error("Erro ao buscar clientes dos agendamentos:", clientesError);
      throw new Error("Erro ao carregar clientes dos agendamentos.");
    }

    mapaClientes = new Map(
      (((clientesData as { id: string; nome: string }[]) || [])).map((item) => [
        item.id,
        item,
      ])
    );
  }

  if (profissionalIds.length > 0) {
    const { data: profissionaisData, error: profissionaisError } = await supabase
      .from("profissionais")
      .select("id, nome")
      .in("id", profissionalIds);

    if (profissionaisError) {
      console.error("Erro ao buscar profissionais dos agendamentos:", profissionaisError);
      throw new Error("Erro ao carregar profissionais dos agendamentos.");
    }

    mapaProfissionais = new Map(
      (((profissionaisData as { id: string; nome: string }[]) || [])).map((item) => [
        item.id,
        item,
      ])
    );
  }

  if (servicoIds.length > 0) {
    const { data: servicosData, error: servicosError } = await supabase
      .from("servicos")
      .select("id, nome, preco")
      .in("id", servicoIds);

    if (servicosError) {
      console.error("Erro ao buscar servicos dos agendamentos:", servicosError);
      throw new Error("Erro ao carregar servicos dos agendamentos.");
    }

    mapaServicos = new Map(
      (((servicosData as { id: string; nome: string; preco?: number | null }[]) || [])).map(
        (item) => [item.id, item]
      )
    );
  }

  return agendamentosBase.map((item) => ({
    ...item,
    clientes: item.cliente_id
      ? { nome: mapaClientes.get(item.cliente_id)?.nome || "Sem cliente" }
      : null,
    profissionais: item.profissional_id
      ? { nome: mapaProfissionais.get(item.profissional_id)?.nome || "Sem profissional" }
      : null,
    servicos: item.servico_id
      ? {
          nome: mapaServicos.get(item.servico_id)?.nome || "Servico",
          preco: mapaServicos.get(item.servico_id)?.preco || 0,
        }
      : null,
  })) as AgendamentoFila[];
}

async function carregarFechadasHoje(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("comandas")
    .select(`
      id,
      numero,
      status,
      fechada_em,
      total,
      id_cliente,
      clientes (
        nome
      )
    `)
    .eq("id_salao", idSalao)
    .eq("status", "fechada")
    .gte("fechada_em", inicio.toISOString())
    .lte("fechada_em", fim.toISOString())
    .order("fechada_em", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data as ComandaFila[]) || [];
}

async function carregarCanceladas(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const { data, error } = await supabase
    .from("comandas")
    .select(`
      id,
      numero,
      status,
      cancelada_em,
      total,
      id_cliente,
      clientes (
        nome
      )
    `)
    .eq("id_salao", idSalao)
    .eq("status", "cancelada")
    .order("cancelada_em", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data as ComandaFila[]) || [];
}

export async function carregarListasCaixa(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const [comandasFila, agendamentosFila, comandasFechadas, comandasCanceladas] =
    await Promise.all([
      carregarFilaComandas(supabase, idSalao),
      carregarAgendamentosSemComanda(supabase, idSalao),
      carregarFechadasHoje(supabase, idSalao),
      carregarCanceladas(supabase, idSalao),
    ]);

  return {
    agendamentosFila,
    comandasCanceladas,
    comandasFechadas,
    comandasFila,
  };
}

export async function carregarComandaDetalhe(
  supabase: CaixaSupabaseClient,
  idComanda: string
) {
  const { data: comandaData, error: comandaError } = await supabase
    .from("comandas")
    .select(`
      *,
      clientes (
        nome
      )
    `)
    .eq("id", idComanda)
    .maybeSingle();

  if (comandaError || !comandaData) {
    throw new Error("Nao foi possivel abrir a comanda.");
  }

  const idSalao = String(
    (comandaData as { id_salao?: string | null }).id_salao || ""
  );

  if (!idSalao) {
    throw new Error("Nao foi possivel identificar o salao da comanda.");
  }

  const { data: itensData, error: itensError } = await supabase
    .from("comanda_itens")
    .select("ativo, base_calculo_aplicada, comissao_assistente_percentual_aplicada, comissao_assistente_valor_aplicado, comissao_percentual_aplicada, comissao_valor_aplicado, created_at, custo_total, desconta_taxa_maquininha_aplicada, descricao, id, id_agendamento, id_assistente, id_comanda, id_item_extra, id_produto, id_profissional, id_salao, id_servico, idempotency_key, observacoes, origem, quantidade, tipo, tipo_item, updated_at, valor_total, valor_unitario")
    .eq("id_salao", idSalao)
    .eq("id_comanda", idComanda)
    .eq("ativo", true);

  if (itensError) {
    console.error("Erro Supabase comanda_itens:", itensError);
    throw new Error("Erro ao carregar itens da comanda.");
  }

  const { data: pagamentosData, error: pagamentosError } = await supabase
    .from("comanda_pagamentos")
    .select("created_at, forma_pagamento, id, id_comanda, id_movimentacao, id_salao, idempotency_key, observacoes, pago_em, parcelas, taxa, taxa_maquininha_percentual, taxa_maquininha_valor, valor")
    .eq("id_salao", idSalao)
    .eq("id_comanda", idComanda);

  if (pagamentosError) {
    console.error("Erro Supabase comanda_pagamentos:", pagamentosError);
    throw new Error("Erro ao carregar pagamentos da comanda.");
  }

  const itensBase = (itensData as ComandaItem[]) || [];
  const idsProfissionais = Array.from(
    new Set(
      itensBase
        .flatMap((item) => [item.id_profissional, item.id_assistente])
        .filter(Boolean)
    )
  ) as string[];

  let mapaProfissionais = new Map<string, { id: string; nome: string }>();

  if (idsProfissionais.length > 0) {
    const { data: profissionaisData, error: profissionaisError } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("id_salao", idSalao)
      .in("id", idsProfissionais);

    if (profissionaisError) {
      console.error("Erro Supabase profissionais:", profissionaisError);
      throw new Error("Erro ao carregar profissionais da comanda.");
    }

    mapaProfissionais = new Map(
      ((profissionaisData as { id: string; nome: string }[]) || []).map((prof) => [
        prof.id,
        prof,
      ])
    );
  }

  const itens = itensBase.map((item) => ({
    ...item,
    profissionais: item.id_profissional
      ? { nome: mapaProfissionais.get(item.id_profissional)?.nome || "-" }
      : null,
    assistente_ref: item.id_assistente
      ? { nome: mapaProfissionais.get(item.id_assistente)?.nome || "-" }
      : null,
  })) as ComandaItem[];

  const detalhe = comandaData as ComandaDetalhe;

  return {
    acrescimoInput: Number(detalhe.acrescimo || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    comandaSelecionada: detalhe,
    descontoInput: Number(detalhe.desconto || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    itens,
    pagamentos: (pagamentosData as ComandaPagamento[]) || [],
  };
}
