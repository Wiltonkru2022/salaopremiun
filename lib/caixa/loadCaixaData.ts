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
import {
  SELECT_COMANDAS,
  SELECT_COMANDA_ITENS,
  SELECT_COMANDA_PAGAMENTOS,
  SELECT_USUARIOS_PERMISSOES,
} from "@/lib/db/selects";
import type { PainelSessionSnapshot } from "@/lib/painel/session-snapshot";
import { createClient } from "@/lib/db/client";

type CaixaDatabaseClient = ReturnType<typeof createClient>;

type UsuarioCaixa = {
  id: string;
  id_salao: string;
  nivel?: string | null;
  status?: string | null;
};

type CatalogoServicoRow = CatalogoServico;

const CAIXA_CANCELADAS_RECENTES_LIMIT = 120;
const CAIXA_FILA_OPERACIONAL_LIMIT = 80;
const CAIXA_HISTORICO_DIA_LIMIT = 60;
const SELECT_COMANDA_ITENS_FALLBACK =
  "ativo, created_at, custo_total, descricao, id, id_agendamento, id_assistente, id_comanda, id_item_extra, id_produto, id_profissional, id_salao, id_servico, observacoes, origem, quantidade, tipo, tipo_item, updated_at, valor_total, valor_unitario";

export async function carregarAcessoCaixa(
  database: CaixaDatabaseClient,
  sessionSnapshot?: PainelSessionSnapshot | null
) {
  if (sessionSnapshot?.idSalao && sessionSnapshot?.permissoes) {
    if (sessionSnapshot.planoRecursos?.caixa === false) {
      throw new Error("Caixa não está liberado no plano atual.");
    }

    return {
      precisaLogin: false as const,
      usuario: {
        id: sessionSnapshot.idUsuario,
        id_salao: sessionSnapshot.idSalao,
        nivel: sessionSnapshot.nivel,
        status: "ativo",
      } as UsuarioCaixa,
      permissoes: sessionSnapshot.permissoes as Permissoes,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await database.auth.getUser();

  if (authError || !user) {
    return {
      precisaLogin: true as const,
    };
  }

  const { data: usuario, error: usuarioError } = await database
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

  const { data: permissoesDb } = await database
    .from("usuarios_permissoes")
    .select(SELECT_USUARIOS_PERMISSOES)
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
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const { data, error } = await database
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
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const [servicosRes, produtosRes, extrasRes, profissionaisRes, assistentesRes] = await Promise.all([
    database
      .from("servicos")
      .select("ativo, atualizado_em, base_calculo, categoria, combo_resumo, comissao_assistente_percentual, comissao_percentual, comissao_percentual_padrao, created_at, criado_em, custo_produto, desconta_taxa_maquininha, descricao, duracao, duracao_minutos, eh_combo, exige_avaliacao, gatilho_retorno_dias, id, id_categoria, id_salao, nome, pausa_minutos, preco, preco_minimo, preco_padrao, preco_variavel, recurso_nome, status, updated_at")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),

    database
      .from("produtos")
      .select("ativo, categoria, codigo_barras, comissao_revenda_percentual, created_at, custo_por_dose, custo_real, custos_extras, data_validade, destinacao, dose_padrao, estoque_atual, estoque_maximo, estoque_minimo, fornecedor_contato_nome, fornecedor_nome, fornecedor_telefone, fornecedor_whatsapp, foto_url, id, id_salao, linha, lote, marca, margem_lucro_percentual, nome, observacoes, prazo_medio_entrega_dias, preco_custo, preco_venda, quantidade_por_embalagem, sku, status, unidade_dose, unidade_medida, updated_at")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),

    database
      .from("itens_extras")
      .select("ativo, atualizado_em, categoria, comissao_percentual, comissionavel, controla_estoque, criado_em, custo, descricao, estoque_atual, estoque_minimo, id, id_salao, nome, preco_venda, unidade_medida")
      .eq("id_salao", idSalao)
      .order("nome", { ascending: true }),

    database
      .from("profissionais")
      .select("id, nome, comissao_percentual, tipo_profissional")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),

    database
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
    servicosCatalogo: (servicosRes.data as CatalogoServicoRow[]) || [],
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
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const { data, error } = await database
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
        id,
        nome,
        cashback
      )
    `)
    .eq("id_salao", idSalao)
    .in("status", ["aberta", "em_atendimento", "aguardando_pagamento"])
    .order("aberta_em", { ascending: true })
    .limit(CAIXA_FILA_OPERACIONAL_LIMIT);

  if (error) {
    console.error(error);
    throw new Error("Erro ao carregar fila de comandas.");
  }

  return sortComandasFila((data as ComandaFila[]) || []);
}

async function carregarAgendamentosSemComanda(
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const { data, error } = await database
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
    .order("hora_inicio", { ascending: true })
    .limit(CAIXA_FILA_OPERACIONAL_LIMIT);

  if (error) {
    console.error("Erro Neon agendamentos sem comanda:", error);
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
    const { data: clientesData, error: clientesError } = await database
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
    const { data: profissionaisData, error: profissionaisError } = await database
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
    const { data: servicosData, error: servicosError } = await database
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
          nome: mapaServicos.get(item.servico_id)?.nome || "Serviço",
          preco: mapaServicos.get(item.servico_id)?.preco || 0,
        }
      : null,
  })) as AgendamentoFila[];
}

async function carregarFechadasHoje(
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  const { data, error } = await database
    .from("comandas")
    .select(`
      id,
      numero,
      status,
      fechada_em,
      total,
      id_cliente,
      clientes (
        id,
        nome,
        cashback
      )
    `)
    .eq("id_salao", idSalao)
    .eq("status", "fechada")
    .gte("fechada_em", inicio.toISOString())
    .lte("fechada_em", fim.toISOString())
    .order("fechada_em", { ascending: false })
    .limit(CAIXA_HISTORICO_DIA_LIMIT);

  if (error) {
    console.error(error);
    return [];
  }

  return (data as ComandaFila[]) || [];
}

async function carregarCanceladas(
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const { data, error } = await database
    .from("comandas")
    .select(`
      id,
      numero,
      status,
      cancelada_em,
      total,
      id_cliente,
      clientes (
        id,
        nome,
        cashback
      )
    `)
    .eq("id_salao", idSalao)
    .eq("status", "cancelada")
    .order("cancelada_em", { ascending: false })
    .limit(CAIXA_CANCELADAS_RECENTES_LIMIT);

  if (error) {
    console.error(error);
    return [];
  }

  return (data as ComandaFila[]) || [];
}

async function carregarItensComandaDetalhe(
  database: CaixaDatabaseClient,
  idSalao: string,
  idComanda: string
) {
  const selecoes = [SELECT_COMANDA_ITENS, SELECT_COMANDA_ITENS_FALLBACK];
  let ultimoErro: unknown = null;

  for (const [indice, select] of selecoes.entries()) {
    const { data, error } = await database
      .from("comanda_itens")
      .select(select)
      .eq("id_salao", idSalao)
      .eq("id_comanda", idComanda)
      .eq("ativo", true);

    if (!error) {
      if (indice > 0) {
        console.warn(
          "[caixa] itens da comanda carregados pelo fallback compacto.",
          { idSalao, idComanda }
        );
      }

      return ((data || []) as unknown as ComandaItem[]) || [];
    }

    ultimoErro = error;
    console.error(
      indice === 0
        ? "Erro Neon comanda_itens (detalhado):"
        : "Erro Neon comanda_itens (fallback):",
      error
    );
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error("Erro ao carregar itens da comanda.");
}

export async function carregarListasCaixa(
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const [
    { comandasFila, agendamentosFila },
    { comandasFechadas, comandasCanceladas },
  ] = await Promise.all([
    carregarFilaOperacionalCaixa(database, idSalao),
    carregarHistoricoCaixa(database, idSalao),
  ]);

  return {
    agendamentosFila,
    comandasCanceladas,
    comandasFechadas,
    comandasFila,
  };
}

export async function carregarFilaOperacionalCaixa(
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const [comandasFila, agendamentosFila] = await Promise.all([
    carregarFilaComandas(database, idSalao),
    carregarAgendamentosSemComanda(database, idSalao),
  ]);

  return {
    agendamentosFila,
    comandasFila,
  };
}

export async function carregarHistoricoCaixa(
  database: CaixaDatabaseClient,
  idSalao: string
) {
  const [comandasFechadas, comandasCanceladas] = await Promise.all([
    carregarFechadasHoje(database, idSalao),
    carregarCanceladas(database, idSalao),
  ]);

  return {
    comandasCanceladas,
    comandasFechadas,
  };
}

export async function carregarComandaDetalhe(
  database: CaixaDatabaseClient,
  idComanda: string
) {
  const { data: comandaData, error: comandaError } = await database
    .from("comandas")
    .select(`
      ${SELECT_COMANDAS},
      clientes (
        id,
        nome,
        cashback
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

  const itensData = await carregarItensComandaDetalhe(
    database,
    idSalao,
    idComanda
  );

  const { data: pagamentosData, error: pagamentosError } = await database
    .from("comanda_pagamentos")
    .select(SELECT_COMANDA_PAGAMENTOS)
    .eq("id_salao", idSalao)
    .eq("id_comanda", idComanda);

  if (pagamentosError) {
    console.error("Erro Neon comanda_pagamentos:", pagamentosError);
    throw new Error("Erro ao carregar pagamentos da comanda.");
  }

  const { data: cupomUsoData } = await (database as any)
    .from("cupom_salao_usos")
    .select("codigo, valor_desconto, status, cupons_salao(nome)")
    .eq("id_salao", idSalao)
    .eq("id_comanda", idComanda)
    .neq("status", "cancelado")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
    const { data: profissionaisData, error: profissionaisError } = await database
      .from("profissionais")
      .select("id, nome")
      .eq("id_salao", idSalao)
      .in("id", idsProfissionais);

    if (profissionaisError) {
      console.error("Erro Neon profissionais:", profissionaisError);
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

  const detalhe = {
    ...(comandaData as ComandaDetalhe),
    cupom_aplicado: cupomUsoData
      ? {
          codigo: String((cupomUsoData as any).codigo || ""),
          nome: String(
            Array.isArray((cupomUsoData as any).cupons_salao)
              ? (cupomUsoData as any).cupons_salao[0]?.nome || ""
              : (cupomUsoData as any).cupons_salao?.nome || ""
          ),
          valor_desconto: Number((cupomUsoData as any).valor_desconto || 0),
          status: String((cupomUsoData as any).status || ""),
        }
      : null,
  } as ComandaDetalhe;

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
    pagamentos: ((pagamentosData as unknown) as ComandaPagamento[]) || [],
  };
}
